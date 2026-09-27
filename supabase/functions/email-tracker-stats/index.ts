import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin role from auth header
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // Check if user is admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (!roleData) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileData?.role !== 'admin') {
          return new Response(JSON.stringify({ error: 'Admin access required' }), { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }
      }
    }

    // Parse body for POST requests
    let range = '7d';

    if (req.method === 'POST') {
      try {
        const body = await req.json();
        range = body.range || '7d';
      } catch (e) {
        // If body parsing fails, use defaults
      }
    } else {
      const url = new URL(req.url);
      range = url.searchParams.get('range') || '7d';
    }

    const now = new Date();
    let startDate: Date;

    switch (range) {
      case '1d':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Get summary stats
    const [
      todayStats,
      weekStats,
      monthStats,
      recipientData,
      internalCount,
      externalCount,
      dailyStats
    ] = await Promise.all([
      supabase
        .from('email_tracker_logs')
        .select('*', { count: 'exact', head: true })
        .gte('sent_at', todayStart),
      supabase
        .from('email_tracker_logs')
        .select('*', { count: 'exact', head: true })
        .gte('sent_at', weekStart),
      supabase
        .from('email_tracker_logs')
        .select('*', { count: 'exact', head: true })
        .gte('sent_at', monthStart),
      supabase
        .from('email_tracker_logs')
        .select('recipients')
        .gte('sent_at', monthStart),
      supabase
        .from('email_tracker_logs')
        .select('*', { count: 'exact', head: true })
        .eq('is_external', false)
        .gte('sent_at', monthStart),
      supabase
        .from('email_tracker_logs')
        .select('*', { count: 'exact', head: true })
        .eq('is_external', true)
        .gte('sent_at', monthStart),
      supabase
        .from('email_tracker_daily_stats')
        .select('*')
        .gte('stat_date', startDate.toISOString().split('T')[0])
        .order('stat_date', { ascending: true })
    ]);

    // Calculate unique recipients
    const allRecipients = recipientData.data?.flatMap((r: any) => r.recipients) || [];
    const uniqueRecipients = [...new Set(allRecipients)];

    // Get top 10 employees by email volume
    const { data: topEmployees } = await supabase
      .from('email_tracker_employees')
      .select('*')
      .order('emails_sent_month', { ascending: false })
      .limit(10);

    // Get sync status
    const { data: syncConfig } = await supabase
      .from('email_tracker_sync_config')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    // Calculate alerts (employees sending > 100 emails/day)
    const { count: alertCount } = await supabase
      .from('email_tracker_employees')
      .select('*', { count: 'exact', head: true })
      .gt('emails_sent_today', 100);

    const summary = {
      emailsToday: todayStats.count || 0,
      emailsThisWeek: weekStats.count || 0,
      emailsThisMonth: monthStats.count || 0,
      uniqueRecipients: uniqueRecipients.length,
      internalPercent: monthStats.count 
        ? Math.round(((internalCount.count ?? 0) / monthStats.count) * 100) 
        : 0,
      externalPercent: monthStats.count 
        ? Math.round(((externalCount.count ?? 0) / monthStats.count) * 100) 
        : 0,
      alertCount: alertCount || 0,
    };

    const chartData = (dailyStats.data || []).map((stat: any) => ({
      date: stat.stat_date,
      emails: stat.total_emails,
      internal: stat.internal_emails,
      external: stat.external_emails,
    }));

    return new Response(JSON.stringify({
      summary,
      chartData,
      topEmployees: topEmployees || [],
      syncStatus: syncConfig,
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Stats error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
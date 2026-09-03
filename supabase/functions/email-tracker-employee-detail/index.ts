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

    // Verify admin role
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
    let email = '';
    let domainFilter = '';
    let typeFilter = 'all';
    let startDate = '';
    let endDate = '';
    let page = 1;
    let pageSize = 50;

    if (req.method === 'POST') {
      try {
        const body = await req.json();
        email = body.email || '';
        domainFilter = body.domain || '';
        typeFilter = body.type || 'all';
        startDate = body.startDate || '';
        endDate = body.endDate || '';
        page = body.page || 1;
        pageSize = body.pageSize || 50;
      } catch (e) {
        // If body parsing fails, use defaults
      }
    } else {
      const url = new URL(req.url);
      email = url.searchParams.get('email') || '';
      domainFilter = url.searchParams.get('domain') || '';
      typeFilter = url.searchParams.get('type') || 'all';
      startDate = url.searchParams.get('startDate') || '';
      endDate = url.searchParams.get('endDate') || '';
      page = parseInt(url.searchParams.get('page') || '1');
      pageSize = parseInt(url.searchParams.get('pageSize') || '50');
    }

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email parameter is required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Get employee info with all enhanced fields
    const { data: employee } = await supabase
      .from('email_tracker_employees')
      .select('*')
      .eq('email', email)
      .single();

    // Get all logs for this employee (last 30 days by default)
    const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    // Build query for logs with all new fields
    let logsQuery = supabase
      .from('email_tracker_logs')
      .select('*', { count: 'exact' })
      .eq('employee_email', email);

    if (startDate) {
      logsQuery = logsQuery.gte('sent_at', startDate);
    } else {
      logsQuery = logsQuery.gte('sent_at', defaultStartDate);
    }

    if (endDate) {
      logsQuery = logsQuery.lte('sent_at', endDate);
    }

    if (typeFilter === 'internal') {
      logsQuery = logsQuery.eq('is_external', false);
    } else if (typeFilter === 'external') {
      logsQuery = logsQuery.eq('is_external', true);
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    logsQuery = logsQuery.order('sent_at', { ascending: false }).range(from, to);

    const { data: logs, count: logsCount } = await logsQuery;

    // Get all logs for comprehensive analysis (without pagination)
    let allLogsQuery = supabase
      .from('email_tracker_logs')
      .select('recipients, recipient_domains, is_external, cc_recipients, bcc_recipients, attachment_count, attachment_names, attachment_types, attachment_total_size_bytes, has_attachments, ip_address, device_type, location_city, location_country, message_size_bytes, thread_id, labels, is_encrypted, delivery_status')
      .eq('employee_email', email);

    if (startDate) {
      allLogsQuery = allLogsQuery.gte('sent_at', startDate);
    } else {
      allLogsQuery = allLogsQuery.gte('sent_at', defaultStartDate);
    }

    if (endDate) {
      allLogsQuery = allLogsQuery.lte('sent_at', endDate);
    }

    const { data: allLogs } = await allLogsQuery;

    // Get events for this employee
    const { data: events } = await supabase
      .from('email_tracker_events')
      .select('*')
      .eq('employee_email', email)
      .order('event_time', { ascending: false })
      .limit(100);

    // Get attachments for this employee
    const { data: attachments } = await supabase
      .from('email_tracker_attachments')
      .select('*')
      .eq('employee_email', email)
      .order('sent_at', { ascending: false })
      .limit(100);

    // Get domain stats for this employee
    const { data: domainStats } = await supabase
      .from('email_tracker_domain_stats')
      .select('*')
      .eq('employee_email', email)
      .order('emails_sent', { ascending: false })
      .limit(20);

    // Get hourly activity pattern
    const { data: hourlyStats } = await supabase
      .from('email_tracker_hourly_stats')
      .select('hour_of_day, emails_sent, emails_read, emails_replied')
      .eq('employee_email', email)
      .gte('stat_date', startDate || defaultStartDate.split('T')[0]);

    // Get alerts for this employee
    const { data: alerts } = await supabase
      .from('email_tracker_alerts')
      .select('*')
      .eq('employee_email', email)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get threads this employee participated in
    const { data: threads } = await supabase
      .from('email_tracker_threads')
      .select('*')
      .contains('participants', [email])
      .order('last_message_at', { ascending: false })
      .limit(20);

    // Calculate comprehensive insights
    const recipientCounts: Record<string, number> = {};
    const domainCounts: Record<string, number> = {};
    const attachmentTypeCounts: Record<string, number> = {};
    const deviceCounts: Record<string, number> = {};
    const locationCounts: Record<string, number> = {};
    const labelCounts: Record<string, number> = {};
    
    let internalCount = 0;
    let externalCount = 0;
    let totalAttachments = 0;
    let totalAttachmentSize = 0;
    let totalMessageSize = 0;
    let encryptedCount = 0;
    let uniqueThreads = new Set<string>();

    (allLogs || []).forEach((log: any) => {
      // Recipients
      log.recipients?.forEach((r: string) => {
        recipientCounts[r] = (recipientCounts[r] || 0) + 1;
      });
      log.cc_recipients?.forEach((r: string) => {
        recipientCounts[r] = (recipientCounts[r] || 0) + 1;
      });
      
      // Domains
      log.recipient_domains?.forEach((d: string) => {
        domainCounts[d] = (domainCounts[d] || 0) + 1;
      });
      
      // Internal vs External
      if (log.is_external) {
        externalCount++;
      } else {
        internalCount++;
      }

      // Attachments
      totalAttachments += log.attachment_count || 0;
      totalAttachmentSize += log.attachment_total_size_bytes || 0;
      log.attachment_types?.forEach((t: string) => {
        attachmentTypeCounts[t] = (attachmentTypeCounts[t] || 0) + 1;
      });

      // Message size
      totalMessageSize += log.message_size_bytes || 0;

      // Devices
      if (log.device_type) {
        deviceCounts[log.device_type] = (deviceCounts[log.device_type] || 0) + 1;
      }

      // Locations
      if (log.location_country) {
        const location = log.location_city ? `${log.location_city}, ${log.location_country}` : log.location_country;
        locationCounts[location] = (locationCounts[location] || 0) + 1;
      }

      // Labels
      log.labels?.forEach((l: string) => {
        labelCounts[l] = (labelCounts[l] || 0) + 1;
      });

      // Encryption
      if (log.is_encrypted) {
        encryptedCount++;
      }

      // Threads
      if (log.thread_id) {
        uniqueThreads.add(log.thread_id);
      }
    });

    // Calculate hourly activity pattern
    const hourlyActivity: Record<number, { sent: number; read: number; replied: number }> = {};
    (hourlyStats || []).forEach((stat: any) => {
      if (!hourlyActivity[stat.hour_of_day]) {
        hourlyActivity[stat.hour_of_day] = { sent: 0, read: 0, replied: 0 };
      }
      hourlyActivity[stat.hour_of_day].sent += stat.emails_sent || 0;
      hourlyActivity[stat.hour_of_day].read += stat.emails_read || 0;
      hourlyActivity[stat.hour_of_day].replied += stat.emails_replied || 0;
    });

    const topRecipients = Object.entries(recipientCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([email, count]) => ({ email, count }));

    const topDomains = Object.entries(domainCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([domain, count]) => ({ domain, count }));

    const topAttachmentTypes = Object.entries(attachmentTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([type, count]) => ({ type, count }));

    const deviceUsage = Object.entries(deviceCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([device, count]) => ({ device, count }));

    const locationUsage = Object.entries(locationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([location, count]) => ({ location, count }));

    const labelUsage = Object.entries(labelCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([label, count]) => ({ label, count }));

    const totalEmails = (allLogs || []).length;
    const avgEmailsPerDay = totalEmails / 30;

    // Format hourly activity for charts
    const hourlyActivityChart = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      hourLabel: `${i.toString().padStart(2, '0')}:00`,
      sent: hourlyActivity[i]?.sent || 0,
      read: hourlyActivity[i]?.read || 0,
      replied: hourlyActivity[i]?.replied || 0,
    }));

    // Filter logs by domain if specified
    let filteredLogs = logs;
    if (domainFilter) {
      filteredLogs = (logs ?? []).filter((log: any) => 
        log.recipient_domains?.some((d: string) => 
          d.toLowerCase().includes(domainFilter.toLowerCase())
        )
      );
    }

    return new Response(JSON.stringify({
      employee,
      logs: filteredLogs || [],
      logsCount: logsCount || 0,
      page,
      pageSize,
      totalPages: Math.ceil((logsCount || 0) / pageSize),
      
      // Events and activities
      events: events || [],
      attachments: attachments || [],
      domainStats: domainStats || [],
      alerts: alerts || [],
      threads: threads || [],
      
      // Comprehensive insights
      insights: {
        topRecipients,
        topDomains,
        topAttachmentTypes,
        deviceUsage,
        locationUsage,
        labelUsage,
        hourlyActivity: hourlyActivityChart,
        
        internalCount,
        externalCount,
        internalPercent: totalEmails ? Math.round((internalCount / totalEmails) * 100) : 0,
        externalPercent: totalEmails ? Math.round((externalCount / totalEmails) * 100) : 0,
        
        avgEmailsPerDay: Math.round(avgEmailsPerDay * 10) / 10,
        totalEmails,
        totalAttachments,
        totalAttachmentSizeMB: Math.round(totalAttachmentSize / 1024 / 1024 * 100) / 100,
        totalDataSentMB: Math.round(totalMessageSize / 1024 / 1024 * 100) / 100,
        uniqueThreads: uniqueThreads.size,
        encryptedCount,
        encryptedPercent: totalEmails ? Math.round((encryptedCount / totalEmails) * 100) : 0,
      },
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Employee detail error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});

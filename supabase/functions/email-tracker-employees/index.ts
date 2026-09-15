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
    let search = '';
    let filter = 'all';
    let sortBy = 'emails_sent_month';
    let sortOrder = 'desc';
    let page = 1;
    let pageSize = 20;

    if (req.method === 'POST') {
      try {
        const body = await req.json();
        search = body.search || '';
        filter = body.filter || 'all';
        sortBy = body.sortBy || 'emails_sent_month';
        sortOrder = body.sortOrder || 'desc';
        page = body.page || 1;
        pageSize = body.pageSize || 20;
      } catch (e) {
        // If body parsing fails, use defaults
      }
    } else {
      const url = new URL(req.url);
      search = url.searchParams.get('search') || '';
      filter = url.searchParams.get('filter') || 'all';
      sortBy = url.searchParams.get('sortBy') || 'emails_sent_month';
      sortOrder = url.searchParams.get('sortOrder') || 'desc';
      page = parseInt(url.searchParams.get('page') || '1');
      pageSize = parseInt(url.searchParams.get('pageSize') || '20');
    }

    let query = supabase
      .from('email_tracker_employees')
      .select('*', { count: 'exact' });

    // Apply search filter
    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    }

    // Apply internal/external filter
    if (filter === 'internal') {
      query = query.lt('external_email_percent', 50);
    } else if (filter === 'external') {
      query = query.gte('external_email_percent', 50);
    }

    // Apply sorting
    const ascending = sortOrder === 'asc';
    query = query.order(sortBy, { ascending });

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: employees, count, error } = await query;

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({
      employees: employees || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Employees error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
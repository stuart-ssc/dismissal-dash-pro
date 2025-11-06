import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the most recent execution log
    const { data: latestExecution, error } = await supabaseClient
      .from('scheduler_execution_logs')
      .select('*')
      .order('execution_time', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('Error fetching execution logs:', error);
      return new Response(
        JSON.stringify({ 
          status: 'error',
          message: 'Failed to fetch execution logs',
          error: error.message
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // If no executions found
    if (!latestExecution) {
      return new Response(
        JSON.stringify({
          status: 'critical',
          message: 'No scheduler executions found',
          health: 'unhealthy',
          last_execution: null,
          minutes_since_last_execution: null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      );
    }

    // Calculate time since last execution
    const now = new Date();
    const lastExecution = new Date(latestExecution.execution_time);
    const minutesSinceLastExecution = Math.floor((now.getTime() - lastExecution.getTime()) / 1000 / 60);

    // Determine health status
    let status: string;
    let health: string;
    let httpStatus: number;

    if (minutesSinceLastExecution < 5) {
      status = 'healthy';
      health = 'healthy';
      httpStatus = 200;
    } else if (minutesSinceLastExecution < 10) {
      status = 'warning';
      health = 'degraded';
      httpStatus = 200;
    } else {
      status = 'critical';
      health = 'unhealthy';
      httpStatus = 503;
    }

    // Get recent execution stats (last 24 hours)
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentExecutions, error: statsError } = await supabaseClient
      .from('scheduler_execution_logs')
      .select('status, total_schools_processed, successful_schools, failed_schools, execution_duration_ms')
      .gte('execution_time', twentyFourHoursAgo);

    let stats = null;
    if (!statsError && recentExecutions) {
      const totalExecutions = recentExecutions.length;
      const successfulExecutions = recentExecutions.filter(e => e.status === 'success').length;
      const avgDuration = recentExecutions.reduce((sum, e) => sum + e.execution_duration_ms, 0) / totalExecutions;
      const totalSchools = recentExecutions.reduce((sum, e) => sum + e.total_schools_processed, 0);
      const totalSuccessful = recentExecutions.reduce((sum, e) => sum + e.successful_schools, 0);
      const totalFailed = recentExecutions.reduce((sum, e) => sum + e.failed_schools, 0);

      stats = {
        last_24h_executions: totalExecutions,
        success_rate: totalExecutions > 0 ? (successfulExecutions / totalExecutions * 100).toFixed(1) + '%' : 'N/A',
        avg_duration_ms: Math.round(avgDuration),
        total_schools_processed: totalSchools,
        total_successful: totalSuccessful,
        total_failed: totalFailed,
        school_success_rate: totalSchools > 0 ? (totalSuccessful / totalSchools * 100).toFixed(1) + '%' : 'N/A'
      };
    }

    // Get recent errors
    const recentErrors = recentExecutions
      ?.filter(e => e.status !== 'success')
      .slice(0, 5)
      .map(e => ({
        time: e.execution_time,
        status: e.status,
        failed_schools: e.failed_schools
      })) || [];

    return new Response(
      JSON.stringify({
        status,
        health,
        message: status === 'healthy' 
          ? 'Scheduler is running normally'
          : status === 'warning'
          ? 'Scheduler execution delayed'
          : 'Scheduler has not run recently - investigation required',
        last_execution: {
          time: latestExecution.execution_time,
          status: latestExecution.status,
          total_schools: latestExecution.total_schools_processed,
          successful: latestExecution.successful_schools,
          failed: latestExecution.failed_schools,
          duration_ms: latestExecution.execution_duration_ms,
          errors: latestExecution.errors
        },
        minutes_since_last_execution: minutesSinceLastExecution,
        stats,
        recent_errors: recentErrors,
        timestamp: now.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: httpStatus }
    );
  } catch (error) {
    console.error('Error in health check:', error);
    return new Response(
      JSON.stringify({ 
        status: 'error',
        health: 'unhealthy',
        message: 'Health check failed',
        error: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

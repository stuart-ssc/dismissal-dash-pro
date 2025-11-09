import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from 'npm:resend@4.0.0';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import React from 'npm:react@18.3.1';
import { DataQualityAlertEmail } from '../_shared/email-templates/data-quality-alert-email.tsx';

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization');
    const schedulerSecret = Deno.env.get('DATA_QUALITY_ALERT_SECRET');
    
    if (!schedulerSecret || authHeader !== `Bearer ${schedulerSecret}`) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const today = new Date();
    const currentDayOfWeek = today.getDay() || 7; // Convert Sunday (0) to 7

    console.log('[Weekly Summary] Starting weekly summary generation...');

    // Get schools with weekly summaries enabled for today
    const { data: configs, error: configsError } = await supabase
      .from('ic_data_quality_alert_config')
      .select('school_id, alert_email_recipients, schools(school_name)')
      .eq('weekly_summary_enabled', true)
      .eq('weekly_summary_day', currentDayOfWeek);

    if (configsError) {
      throw new Error(`Failed to fetch configs: ${configsError.message}`);
    }

    console.log(`[Weekly Summary] Found ${configs?.length || 0} schools configured for today`);

    let summariesSent = 0;

    for (const config of configs || []) {
      const schoolId = config.school_id;
      const schoolName = config.schools?.school_name || `School ${schoolId}`;

      try {
        // Calculate date range (last 7 days)
        const weekEnd = new Date();
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);

        // Get snapshots from the past week
        const { data: snapshots, error: snapshotsError } = await supabase
          .from('ic_data_quality_snapshots')
          .select('*')
          .eq('school_id', schoolId)
          .gte('snapshot_date', weekStart.toISOString().split('T')[0])
          .lte('snapshot_date', weekEnd.toISOString().split('T')[0])
          .order('snapshot_date', { ascending: true });

        if (snapshotsError || !snapshots || snapshots.length === 0) {
          console.log(`[Weekly Summary] No snapshots for school ${schoolId}, skipping`);
          continue;
        }

        // Calculate summary metrics
        const scores = snapshots.map(s => s.overall_completeness_score);
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const minScore = Math.min(...scores);
        const maxScore = Math.max(...scores);

        // Get current score
        const { data: currentMetrics } = await supabase
          .rpc('calculate_ic_data_quality', { p_school_id: schoolId });

        const currentScore = currentMetrics?.[0]?.overall_completeness_score || 0;
        const currentGrade = currentMetrics?.[0]?.data_quality_grade || 'F';

        // Calculate trend
        const previousScore = snapshots.length >= 2 ? snapshots[snapshots.length - 2].overall_completeness_score : null;

        // Identify top issues
        const latestSnapshot = snapshots[snapshots.length - 1];
        const issues: any[] = [];

        if (latestSnapshot.students_missing_contact_info > 0) {
          issues.push({
            category: 'Students',
            metric: 'Missing Contact Information',
            actual_value: ((latestSnapshot.total_students - latestSnapshot.students_missing_contact_info) / latestSnapshot.total_students * 100),
            threshold: 90,
            severity: 'warning'
          });
        }

        // Get recipients
        const { data: adminProfiles } = await supabase
          .from('profiles')
          .select('email')
          .eq('school_id', schoolId);

        const adminEmails = adminProfiles?.filter(p => p.email).map(p => p.email as string) || [];
        const allRecipients = [...new Set([...adminEmails, ...(config.alert_email_recipients || [])])];

        if (allRecipients.length === 0) {
          console.log(`[Weekly Summary] No recipients for school ${schoolId}`);
          continue;
        }

        // Save summary record
        await supabase
          .from('ic_data_quality_weekly_summaries')
          .upsert({
            school_id: schoolId,
            week_start_date: weekStart.toISOString().split('T')[0],
            week_end_date: weekEnd.toISOString().split('T')[0],
            avg_completeness_score: avgScore,
            min_completeness_score: minScore,
            max_completeness_score: maxScore,
            score_change_from_previous_week: previousScore ? (currentScore - previousScore) : null,
            top_issues: issues,
            sent_at: new Date().toISOString(),
            recipients: allRecipients
          });

        // Send email
        const appUrl = 'https://dismissalpro.lovableproject.com';

        const html = await renderAsync(
          React.createElement(DataQualityAlertEmail, {
            schoolName,
            alertType: 'weekly_summary',
            severity: 'info',
            currentScore,
            currentGrade,
            issues,
            previousScore,
            weekStartDate: weekStart.toLocaleDateString(),
            weekEndDate: weekEnd.toLocaleDateString(),
            appUrl,
          })
        );

        await resend.emails.send({
          from: 'Dismissal Pro <noreply@dismissalpro.io>',
          to: allRecipients,
          subject: `Weekly Data Quality Summary - ${schoolName}`,
          html,
        });

        summariesSent++;
        console.log(`[Weekly Summary] ✓ Summary sent for school ${schoolId}`);

      } catch (error) {
        console.error(`[Weekly Summary] Error for school ${schoolId}:`, error);
      }
    }

    console.log(`[Weekly Summary] Completed: ${summariesSent} summaries sent`);

    return new Response(
      JSON.stringify({ success: true, summariesSent }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('[Weekly Summary] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

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

interface Issue {
  category: string;
  metric: string;
  actual_value: number;
  threshold: number;
  severity: 'warning' | 'critical';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let schoolsProcessed = 0;
  let alertsSent = 0;
  const errors: any[] = [];

  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization');
    const schedulerSecret = Deno.env.get('DATA_QUALITY_ALERT_SECRET');
    
    if (!schedulerSecret || authHeader !== `Bearer ${schedulerSecret}`) {
      console.warn('Unauthorized data quality alert check attempt');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[Data Quality Alert] Starting check for all schools...');

    // Get all schools with active IC connections
    const { data: schools, error: schoolsError } = await supabase
      .from('infinite_campus_connections')
      .select('school_id, schools(school_name)')
      .eq('status', 'active');

    if (schoolsError) {
      throw new Error(`Failed to fetch schools: ${schoolsError.message}`);
    }

    console.log(`[Data Quality Alert] Found ${schools?.length || 0} schools with IC connections`);

    for (const school of schools || []) {
      const schoolId = school.school_id;
      const schoolName = school.schools?.school_name || `School ${schoolId}`;
      
      try {
        schoolsProcessed++;

        // Get or create alert configuration
        let { data: alertConfig, error: configError } = await supabase
          .from('ic_data_quality_alert_config')
          .select('*')
          .eq('school_id', schoolId)
          .maybeSingle();

        if (configError) {
          throw new Error(`Config error for school ${schoolId}: ${configError.message}`);
        }

        // Create default config if none exists
        if (!alertConfig) {
          const { data: newConfig, error: createError } = await supabase
            .from('ic_data_quality_alert_config')
            .insert({ school_id: schoolId })
            .select()
            .single();

          if (createError) {
            throw new Error(`Failed to create config for school ${schoolId}: ${createError.message}`);
          }
          
          alertConfig = newConfig;
        }

        // Skip if alerts are disabled
        if (!alertConfig.alert_enabled) {
          console.log(`[Data Quality Alert] Alerts disabled for school ${schoolId}, skipping`);
          continue;
        }

        // Calculate current data quality
        const { data: qualityMetrics, error: metricsError } = await supabase
          .rpc('calculate_ic_data_quality', { p_school_id: schoolId });

        if (metricsError || !qualityMetrics || qualityMetrics.length === 0) {
          throw new Error(`Failed to calculate quality for school ${schoolId}: ${metricsError?.message}`);
        }

        const metrics = qualityMetrics[0];
        const currentScore = metrics.overall_completeness_score;
        const currentGrade = metrics.data_quality_grade;

        console.log(`[Data Quality Alert] School ${schoolId} (${schoolName}): Score=${currentScore}%, Grade=${currentGrade}`);

        // Check if alert should be triggered
        const { data: shouldAlert, error: alertCheckError } = await supabase
          .rpc('should_trigger_data_quality_alert', {
            p_school_id: schoolId,
            p_current_score: currentScore
          });

        if (alertCheckError) {
          throw new Error(`Alert check failed for school ${schoolId}: ${alertCheckError.message}`);
        }

        if (!shouldAlert) {
          console.log(`[Data Quality Alert] No alert needed for school ${schoolId}`);
          continue;
        }

        // Detect specific issues
        const issues: Issue[] = [];
        
        // Student issues
        const studentContactPct = metrics.total_students > 0
          ? ((metrics.total_students - metrics.students_missing_contact_info) / metrics.total_students * 100)
          : 100;
        if (studentContactPct < alertConfig.student_contact_threshold) {
          issues.push({
            category: 'Students',
            metric: 'Missing Contact Information',
            actual_value: studentContactPct,
            threshold: alertConfig.student_contact_threshold,
            severity: studentContactPct < (alertConfig.student_contact_threshold - 10) ? 'critical' : 'warning'
          });
        }

        const studentParentPct = metrics.total_students > 0
          ? ((metrics.total_students - metrics.students_missing_parent_name) / metrics.total_students * 100)
          : 100;
        if (studentParentPct < alertConfig.student_parent_threshold) {
          issues.push({
            category: 'Students',
            metric: 'Missing Parent/Guardian Names',
            actual_value: studentParentPct,
            threshold: alertConfig.student_parent_threshold,
            severity: studentParentPct < (alertConfig.student_parent_threshold - 10) ? 'critical' : 'warning'
          });
        }

        // Teacher issues
        const teacherEmailPct = metrics.total_teachers > 0
          ? ((metrics.total_teachers - metrics.teachers_missing_email) / metrics.total_teachers * 100)
          : 100;
        if (teacherEmailPct < alertConfig.teacher_email_threshold) {
          issues.push({
            category: 'Teachers',
            metric: 'Missing Email Addresses',
            actual_value: teacherEmailPct,
            threshold: alertConfig.teacher_email_threshold,
            severity: teacherEmailPct < (alertConfig.teacher_email_threshold - 10) ? 'critical' : 'warning'
          });
        }

        // Class issues
        const classCoveragePct = metrics.total_classes > 0
          ? ((metrics.total_classes - metrics.classes_without_teachers) / metrics.total_classes * 100)
          : 100;
        if (classCoveragePct < alertConfig.class_coverage_threshold) {
          issues.push({
            category: 'Classes',
            metric: 'Classes Without Teachers',
            actual_value: classCoveragePct,
            threshold: alertConfig.class_coverage_threshold,
            severity: 'critical'
          });
        }

        // Determine severity
        const severity = currentScore < 60 ? 'critical' : currentScore < 80 ? 'warning' : 'info';

        // Get school admin emails
        const { data: adminProfiles, error: adminsError } = await supabase
          .from('profiles')
          .select('email')
          .eq('school_id', schoolId);

        if (adminsError) {
          throw new Error(`Failed to fetch admins for school ${schoolId}: ${adminsError.message}`);
        }

        const adminEmails = adminProfiles
          ?.filter(p => p.email)
          .map(p => p.email as string) || [];

        // Add additional recipients from config
        const allRecipients = [...new Set([...adminEmails, ...(alertConfig.alert_email_recipients || [])])];

        if (allRecipients.length === 0) {
          console.log(`[Data Quality Alert] No recipients for school ${schoolId}, skipping`);
          continue;
        }

        // Create alert record
        const { data: alert, error: alertError } = await supabase
          .from('ic_data_quality_alerts')
          .insert({
            school_id: schoolId,
            alert_type: 'threshold_breach',
            severity,
            overall_completeness_score: currentScore,
            data_quality_grade: currentGrade,
            issues_detected: issues,
            recipients: allRecipients
          })
          .select()
          .single();

        if (alertError) {
          throw new Error(`Failed to create alert record for school ${schoolId}: ${alertError.message}`);
        }

        // Render and send email
        const appUrl = 'https://dismissalpro.lovableproject.com';

        const html = await renderAsync(
          React.createElement(DataQualityAlertEmail, {
            schoolName,
            alertType: 'threshold_breach',
            severity,
            currentScore,
            currentGrade,
            issues,
            appUrl,
          })
        );

        const { error: sendError } = await resend.emails.send({
          from: 'Dismissal Pro <noreply@dismissalpro.io>',
          to: allRecipients,
          subject: `${severity === 'critical' ? '🚨' : '⚠️'} Data Quality Alert - ${schoolName}`,
          html,
        });

        if (sendError) {
          throw new Error(`Failed to send email for school ${schoolId}: ${sendError.message}`);
        }

        // Update alert as sent
        await supabase
          .from('ic_data_quality_alerts')
          .update({
            notification_sent: true,
            notification_sent_at: new Date().toISOString()
          })
          .eq('id', alert.id);

        alertsSent++;
        console.log(`[Data Quality Alert] ✓ Alert sent to ${allRecipients.length} recipient(s) for school ${schoolId}`);

      } catch (error) {
        console.error(`[Data Quality Alert] Error processing school ${schoolId}:`, error);
        errors.push({
          school_id: schoolId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Data Quality Alert] Completed: ${alertsSent} alerts sent, ${schoolsProcessed} schools processed in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        schoolsProcessed,
        alertsSent,
        duration,
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('[Data Quality Alert] Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        schoolsProcessed,
        alertsSent
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

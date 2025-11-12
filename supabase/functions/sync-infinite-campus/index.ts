import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { OneRosterClient } from '../_shared/oneroster-client.ts';
import { decrypt } from '../_shared/encryption.ts';
import { findStudentMatch, findTeacherMatch } from '../_shared/fuzzy-matcher.ts';

interface SyncRequest {
  schoolId: number;
  syncType: 'manual' | 'scheduled';
  triggeredBy?: string;
  syncConfig?: any; // Sync configuration from ic_sync_configuration table
}

interface SyncStats {
  studentsCreated: number;
  studentsUpdated: number;
  studentsArchived: number;
  teachersCreated: number;
  teachersUpdated: number;
  teachersArchived: number;
  classesCreated: number;
  classesUpdated: number;
  classesArchived: number;
  enrollmentsCreated: number;
  enrollmentsUpdated: number;
}

async function checkRateLimit(
  supabase: SupabaseClient,
  schoolId: number,
  syncType: string
): Promise<{ allowed: boolean; remaining: number }> {
  if (syncType !== 'manual') {
    return { allowed: true, remaining: 3 };
  }

  const today = new Date().toISOString().split('T')[0];

  const { data } = await supabase
    .from('ic_sync_rate_limits')
    .select('sync_count')
    .eq('school_id', schoolId)
    .eq('sync_date', today)
    .maybeSingle();

  const currentCount = data?.sync_count || 0;
  const remaining = Math.max(0, 3 - currentCount);

  if (currentCount >= 3) {
    return { allowed: false, remaining: 0 };
  }

  // Increment counter
  await supabase
    .from('ic_sync_rate_limits')
    .upsert({
      school_id: schoolId,
      sync_date: today,
      sync_count: currentCount + 1,
    });

  return { allowed: true, remaining: remaining - 1 };
}

async function syncAcademicSessions(
  client: OneRosterClient,
  supabase: SupabaseClient,
  schoolId: number
): Promise<void> {
  console.log('Syncing academic sessions...');
  
  const sessions = await client.getAcademicSessions();
  const currentDate = new Date();

  for (const session of sessions) {
    const startDate = new Date(session.startDate);
    const endDate = new Date(session.endDate);
    const isActive = currentDate >= startDate && currentDate <= endDate;

    // Check if session exists
    const { data: existing } = await supabase
      .from('academic_sessions')
      .select('id')
      .eq('school_id', schoolId)
      .eq('ic_external_id', session.sourcedId)
      .maybeSingle();

    if (existing) {
      // Update existing
      await supabase
        .from('academic_sessions')
        .update({
          session_name: session.title,
          start_date: session.startDate,
          end_date: session.endDate,
          is_active: isActive,
          metadata: { schoolYear: session.schoolYear },
        })
        .eq('id', existing.id);
    } else {
      // Create new
      await supabase
        .from('academic_sessions')
        .insert({
          school_id: schoolId,
          session_name: session.title,
          session_code: `SY${session.schoolYear}`,
          start_date: session.startDate,
          end_date: session.endDate,
          is_active: isActive,
          ic_external_id: session.sourcedId,
          session_type: session.type || 'schoolYear',
          metadata: { schoolYear: session.schoolYear },
        });
    }
  }
}

async function syncTeachers(
  client: OneRosterClient,
  supabase: SupabaseClient,
  schoolId: number,
  syncLogId: string
): Promise<{ created: number; updated: number; pending: number }> {
  console.log('Syncing teachers...');
  
  const teachers = await client.getUsers('teacher');
  let created = 0;
  let updated = 0;
  let pending = 0;

  for (const teacher of teachers) {
    if (!teacher.enabledUser) {
      continue; // Skip disabled users
    }

    // Check for existing by ic_external_id
    const { data: existing } = await supabase
      .from('teachers')
      .select('id, email')
      .eq('ic_external_id', teacher.sourcedId)
      .maybeSingle();

    if (existing) {
      // Update existing
      await supabase
        .from('teachers')
        .update({
          first_name: teacher.givenName,
          last_name: teacher.familyName,
          email: teacher.email || existing.email,
        })
        .eq('id', existing.id);
      
      updated++;
    } else {
      // Try fuzzy matching
      const match = await findTeacherMatch(supabase, schoolId, {
        sourcedId: teacher.sourcedId,
        givenName: teacher.givenName,
        familyName: teacher.familyName,
        email: teacher.email,
      });

      if (match.confidence >= 0.95) {
        // High confidence match - update
        await supabase
          .from('teachers')
          .update({
            first_name: teacher.givenName,
            last_name: teacher.familyName,
            email: teacher.email || null,
            ic_external_id: teacher.sourcedId,
          })
          .eq('id', match.existingRecordId);
        
        updated++;
      } else if (match.confidence > 0) {
        // Potential match - create pending merge
        await supabase
          .from('ic_pending_merges')
          .insert({
            school_id: schoolId,
            sync_log_id: syncLogId,
            ic_external_id: teacher.sourcedId,
            ic_data: teacher,
            record_type: 'teacher',
            existing_record_id: match.existingRecordId,
            match_confidence: match.confidence,
            match_criteria: match.criteria,
            status: 'pending',
          });
        
        pending++;
      } else {
        // No match - check if email already exists in another school
        if (teacher.email) {
          const { data: existingUser } = await supabase
            .from('teachers')
            .select('id, user_id, school_id')
            .ilike('email', teacher.email)
            .maybeSingle();

          if (existingUser && existingUser.user_id) {
            // Add this school to user_schools for multi-school support
            await supabase
              .from('user_schools')
              .insert({
                user_id: existingUser.user_id,
                school_id: schoolId,
                is_primary: false,
              })
              .onConflict('user_id,school_id')
              .ignoreDuplicates();

            // Create teacher record for this school
            await supabase
              .from('teachers')
              .insert({
                school_id: schoolId,
                user_id: existingUser.user_id,
                first_name: teacher.givenName,
                last_name: teacher.familyName,
                email: teacher.email,
                ic_external_id: teacher.sourcedId,
              });
            
            created++;
          } else {
            // Create new teacher
            await supabase
              .from('teachers')
              .insert({
                school_id: schoolId,
                first_name: teacher.givenName,
                last_name: teacher.familyName,
                email: teacher.email,
                ic_external_id: teacher.sourcedId,
              });
            
            created++;
          }
        } else {
          // No email - create as new
          await supabase
            .from('teachers')
            .insert({
              school_id: schoolId,
              first_name: teacher.givenName,
              last_name: teacher.familyName,
              ic_external_id: teacher.sourcedId,
            });
          
          created++;
        }
      }
    }
  }

  return { created, updated, pending };
}

async function syncStudents(
  client: OneRosterClient,
  supabase: SupabaseClient,
  schoolId: number,
  syncLogId: string
): Promise<{ created: number; updated: number; pending: number }> {
  console.log('Syncing students...');
  
  const students = await client.getUsers('student');
  let created = 0;
  let updated = 0;
  let pending = 0;

  // Get active session
  const { data: activeSession } = await supabase
    .from('academic_sessions')
    .select('id')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .maybeSingle();

  for (const student of students) {
    if (!student.enabledUser) {
      continue;
    }

    // Check for existing by ic_external_id
    const { data: existing } = await supabase
      .from('students')
      .select('id')
      .eq('ic_external_id', student.sourcedId)
      .maybeSingle();

    if (existing) {
      // Update existing
      await supabase
        .from('students')
        .update({
          first_name: student.givenName,
          last_name: student.familyName,
          grade_level: student.grade ? parseInt(student.grade, 10) : null,
          academic_session_id: activeSession?.id || null,
        })
        .eq('id', existing.id);
      
      updated++;
    } else {
      // Try fuzzy matching
      const match = await findStudentMatch(supabase, schoolId, {
        sourcedId: student.sourcedId,
        givenName: student.givenName,
        familyName: student.familyName,
        grade: student.grade,
      });

      if (match.confidence >= 0.95) {
        // High confidence match - update
        await supabase
          .from('students')
          .update({
            first_name: student.givenName,
            last_name: student.familyName,
            grade_level: student.grade ? parseInt(student.grade, 10) : null,
            ic_external_id: student.sourcedId,
            academic_session_id: activeSession?.id || null,
          })
          .eq('id', match.existingRecordId);
        
        updated++;
      } else if (match.confidence > 0) {
        // Potential match - create pending merge
        await supabase
          .from('ic_pending_merges')
          .insert({
            school_id: schoolId,
            sync_log_id: syncLogId,
            ic_external_id: student.sourcedId,
            ic_data: student,
            record_type: 'student',
            existing_record_id: match.existingRecordId,
            match_confidence: match.confidence,
            match_criteria: match.criteria,
            status: 'pending',
          });
        
        pending++;
      } else {
        // No match - create new
        await supabase
          .from('students')
          .insert({
            school_id: schoolId,
            first_name: student.givenName,
            last_name: student.familyName,
            grade_level: student.grade ? parseInt(student.grade, 10) : null,
            ic_external_id: student.sourcedId,
            academic_session_id: activeSession?.id || null,
          });
        
        created++;
      }
    }
  }

  return { created, updated, pending };
}

/**
 * Extract period number from IC class data
 * Priority: metadata.periodNumber > classCode parsing > null
 */
function extractPeriodNumber(cls: any): number | null {
  // Check metadata
  if (cls.metadata?.periodNumber) {
    const num = parseInt(cls.metadata.periodNumber, 10);
    if (!isNaN(num)) return num;
  }
  
  if (cls.metadata?.period) {
    const num = parseInt(cls.metadata.period, 10);
    if (!isNaN(num)) return num;
  }
  
  // Parse from classCode (e.g., "Math-P3", "3-Math", "P3")
  if (cls.classCode) {
    const match = cls.classCode.match(/[Pp]?(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > 0 && num <= 20) return num; // Reasonable period range
    }
  }
  
  return null;
}

/**
 * Extract period start time from IC class data
 */
function extractPeriodStartTime(cls: any): string | null {
  if (cls.metadata?.startTime) return cls.metadata.startTime;
  if (cls.metadata?.periodStartTime) return cls.metadata.periodStartTime;
  if (cls.metadata?.start_time) return cls.metadata.start_time;
  return null;
}

/**
 * Extract period end time from IC class data
 */
function extractPeriodEndTime(cls: any): string | null {
  if (cls.metadata?.endTime) return cls.metadata.endTime;
  if (cls.metadata?.periodEndTime) return cls.metadata.periodEndTime;
  if (cls.metadata?.end_time) return cls.metadata.end_time;
  return null;
}

/**
 * Extract period name from IC class data
 */
function extractPeriodName(cls: any): string | null {
  if (cls.metadata?.periodName) return cls.metadata.periodName;
  if (cls.metadata?.period_name) return cls.metadata.period_name;
  
  // Generate from period number if available
  const periodNum = extractPeriodNumber(cls);
  if (periodNum) return `Period ${periodNum}`;
  
  return null;
}

async function syncClasses(
  client: OneRosterClient,
  supabase: SupabaseClient,
  schoolId: number
): Promise<{ created: number; updated: number; withPeriods: number; withoutPeriods: number }> {
  console.log('Syncing classes...');
  
  const classes = await client.getClasses();
  let created = 0;
  let updated = 0;
  let withPeriods = 0;
  let withoutPeriods = 0;

  // Get active session
  const { data: activeSession } = await supabase
    .from('academic_sessions')
    .select('id')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .maybeSingle();

  // Log sample class for debugging (first class only)
  if (classes.length > 0) {
    console.log('Sample IC class data:', JSON.stringify(classes[0], null, 2));
  }

  for (const cls of classes) {
    // Check for existing by ic_external_id
    const { data: existing } = await supabase
      .from('classes')
      .select('id')
      .eq('ic_external_id', cls.sourcedId)
      .maybeSingle();

    // Extract period data
    const periodNumber = extractPeriodNumber(cls);
    const periodStartTime = extractPeriodStartTime(cls);
    const periodEndTime = extractPeriodEndTime(cls);
    const periodName = extractPeriodName(cls);

    // Track period data availability
    if (periodNumber !== null) {
      withPeriods++;
    } else {
      withoutPeriods++;
    }

    const classData = {
      school_id: schoolId,
      class_name: cls.title,
      grade_level: cls.grade ? parseInt(cls.grade, 10) : null,
      academic_session_id: activeSession?.id || null,
      period_number: periodNumber,
      period_start_time: periodStartTime,
      period_end_time: periodEndTime,
      period_name: periodName,
    };

    if (existing) {
      // Update existing
      await supabase
        .from('classes')
        .update(classData)
        .eq('id', existing.id);
      
      updated++;
    } else {
      // Create new
      await supabase
        .from('classes')
        .insert({
          ...classData,
          ic_external_id: cls.sourcedId,
        });
      
      created++;
    }
  }

  console.log(`Period data: ${withPeriods} classes with periods, ${withoutPeriods} without periods`);

  return { created, updated, withPeriods, withoutPeriods };
}

async function syncEnrollments(
  client: OneRosterClient,
  supabase: SupabaseClient,
  schoolId: number
): Promise<{ created: number; updated: number }> {
  console.log('Syncing enrollments...');
  
  const enrollments = await client.getEnrollments();
  let created = 0;
  let updated = 0;

  // Get active session
  const { data: activeSession } = await supabase
    .from('academic_sessions')
    .select('id')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .maybeSingle();

  for (const enrollment of enrollments) {
    // Get class by IC external ID
    const { data: classData } = await supabase
      .from('classes')
      .select('id')
      .eq('ic_external_id', enrollment.class.sourcedId)
      .eq('school_id', schoolId)
      .maybeSingle();

    if (!classData) continue;

    if (enrollment.role === 'student') {
      // Get student by IC external ID
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('ic_external_id', enrollment.user.sourcedId)
        .eq('school_id', schoolId)
        .maybeSingle();

      if (!student) continue;

      // Check if enrollment exists
      const { data: existing } = await supabase
        .from('class_rosters')
        .select('id')
        .eq('class_id', classData.id)
        .eq('student_id', student.id)
        .maybeSingle();

      if (!existing) {
        await supabase
          .from('class_rosters')
          .insert({
            class_id: classData.id,
            student_id: student.id,
            academic_session_id: activeSession?.id || null,
          });
        
        created++;
      } else {
        updated++;
      }
    } else if (enrollment.role === 'teacher') {
      // Get teacher by IC external ID
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('ic_external_id', enrollment.user.sourcedId)
        .eq('school_id', schoolId)
        .maybeSingle();

      if (!teacher) continue;

      // Check if teacher assignment exists
      const { data: existing } = await supabase
        .from('class_teachers')
        .select('id')
        .eq('class_id', classData.id)
        .eq('teacher_id', teacher.id)
        .maybeSingle();

      if (!existing) {
        await supabase
          .from('class_teachers')
          .insert({
            class_id: classData.id,
            teacher_id: teacher.id,
          });
        
        created++;
      } else {
        updated++;
      }
    }
  }

  return { created, updated };
}

async function archiveMissing(
  supabase: SupabaseClient,
  schoolId: number,
  icExternalIds: { students: string[]; teachers: string[]; classes: string[] }
): Promise<{ studentsArchived: number; teachersArchived: number; classesArchived: number }> {
  console.log('Archiving missing records...');
  
  const archivedAt = new Date().toISOString();
  const archivedReason = 'Not found in Infinite Campus sync';

  // Archive students
  const { data: studentsToArchive } = await supabase
    .from('students')
    .select('id')
    .eq('school_id', schoolId)
    .not('ic_external_id', 'is', null)
    .not('ic_external_id', 'in', `(${icExternalIds.students.join(',')})`);

  const studentsArchived = studentsToArchive?.length || 0;
  if (studentsArchived > 0) {
    await supabase
      .from('students')
      .update({
        archived: true,
        archived_at: archivedAt,
        archived_reason: archivedReason,
      })
      .in('id', studentsToArchive!.map(s => s.id));
  }

  // Archive teachers
  const { data: teachersToArchive } = await supabase
    .from('teachers')
    .select('id')
    .eq('school_id', schoolId)
    .not('ic_external_id', 'is', null)
    .not('ic_external_id', 'in', `(${icExternalIds.teachers.join(',')})`);

  const teachersArchived = teachersToArchive?.length || 0;
  if (teachersArchived > 0) {
    await supabase
      .from('teachers')
      .update({
        archived: true,
        archived_at: archivedAt,
        archived_reason: archivedReason,
      })
      .in('id', teachersToArchive!.map(t => t.id));
  }

  // Archive classes (soft delete by removing from active session)
  const { data: classesToArchive } = await supabase
    .from('classes')
    .select('id')
    .eq('school_id', schoolId)
    .not('ic_external_id', 'is', null)
    .not('ic_external_id', 'in', `(${icExternalIds.classes.join(',')})`);

  const classesArchived = classesToArchive?.length || 0;

  return { studentsArchived, teachersArchived, classesArchived };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let syncLogId: string | null = null;

  try {
    const body: SyncRequest = await req.json();
    const { schoolId, syncType, triggeredBy, syncConfig } = body;
    
    // Determine what data types to sync based on configuration
    const shouldSyncStudents = syncConfig?.sync_students !== false;
    const shouldSyncTeachers = syncConfig?.sync_teachers !== false;
    const shouldSyncClasses = syncConfig?.sync_classes !== false;
    const shouldSyncEnrollments = syncConfig?.sync_enrollments !== false;
    const shouldSyncAcademicSessions = syncConfig?.sync_academic_sessions !== false;
    const shouldSyncCourses = syncConfig?.sync_courses !== false;
    
    const skippedDataTypes: string[] = [];
    if (!shouldSyncStudents) skippedDataTypes.push('students');
    if (!shouldSyncTeachers) skippedDataTypes.push('teachers');
    if (!shouldSyncClasses) skippedDataTypes.push('classes');
    if (!shouldSyncEnrollments) skippedDataTypes.push('enrollments');
    if (!shouldSyncAcademicSessions) skippedDataTypes.push('academic_sessions');
    if (!shouldSyncCourses) skippedDataTypes.push('courses');

    // Check rate limiting for manual syncs
    const rateLimit = await checkRateLimit(supabaseAdmin, schoolId, syncType);
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded. Manual syncs are limited to 3 per day.',
        remaining: 0,
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get IC connection
    const { data: connection, error: connError } = await supabaseAdmin
      .from('infinite_campus_connections')
      .select('*')
      .eq('school_id', schoolId)
      .single();

    if (connError || !connection) {
      return new Response(JSON.stringify({ error: 'IC connection not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create sync log with configuration snapshot
    const { data: syncLog, error: logError } = await supabaseAdmin
      .from('ic_sync_logs')
      .insert({
        school_id: schoolId,
        connection_id: connection.id,
        sync_type: syncType,
        status: 'running',
        triggered_by: triggeredBy || null,
        config_snapshot: syncConfig || null,
        skipped_data_types: skippedDataTypes.length > 0 ? skippedDataTypes : null,
        sync_reason: syncType === 'manual' ? 'manual' : 'scheduled',
      })
      .select()
      .single();

    if (logError || !syncLog) {
      throw new Error('Failed to create sync log');
    }

    syncLogId = syncLog.id;

    // Decrypt credentials
    const clientKey = await decrypt(connection.client_key);
    const clientSecret = await decrypt(connection.client_secret);

    // Initialize OneRoster client
    const client = new OneRosterClient({
      hostUrl: connection.host_url,
      clientKey,
      clientSecret,
      tokenUrl: connection.token_url,
      version: connection.oneroster_version as '1.1' | '1.2',
    });

    // Authenticate
    await client.authenticate();

    // Conditionally sync based on configuration
    let teacherStats = { created: 0, updated: 0, pending: 0 };
    let studentStats = { created: 0, updated: 0, pending: 0 };
    let classStats = { created: 0, updated: 0, withPeriods: 0, withoutPeriods: 0 };
    let enrollmentStats = { created: 0, updated: 0 };
    
    // Sync academic sessions first if enabled
    if (shouldSyncAcademicSessions) {
      await syncAcademicSessions(client, supabaseAdmin, schoolId);
    }

    // Sync teachers if enabled
    if (shouldSyncTeachers) {
      teacherStats = await syncTeachers(client, supabaseAdmin, schoolId, syncLogId);
    }

    // Sync students if enabled
    if (shouldSyncStudents) {
      studentStats = await syncStudents(client, supabaseAdmin, schoolId, syncLogId);
    }

    // Sync classes if enabled
    if (shouldSyncClasses) {
      classStats = await syncClasses(client, supabaseAdmin, schoolId);
    }

    // Sync enrollments if enabled
    if (shouldSyncEnrollments) {
      enrollmentStats = await syncEnrollments(client, supabaseAdmin, schoolId);
    }

    // Archive missing records
    const students = await client.getUsers('student');
    const teachers = await client.getUsers('teacher');
    const classes = await client.getClasses();

    const archiveStats = await archiveMissing(supabaseAdmin, schoolId, {
      students: students.map(s => s.sourcedId),
      teachers: teachers.map(t => t.sourcedId),
      classes: classes.map(c => c.sourcedId),
    });

    // Update sync log
    const stats: SyncStats = {
      studentsCreated: studentStats.created,
      studentsUpdated: studentStats.updated,
      studentsArchived: archiveStats.studentsArchived,
      teachersCreated: teacherStats.created,
      teachersUpdated: teacherStats.updated,
      teachersArchived: archiveStats.teachersArchived,
      classesCreated: classStats.created,
      classesUpdated: classStats.updated,
      classesArchived: archiveStats.classesArchived,
      enrollmentsCreated: enrollmentStats.created,
      enrollmentsUpdated: enrollmentStats.updated,
    };

    await supabaseAdmin
      .from('ic_sync_logs')
      .update({
        status: 'success',
        completed_at: new Date().toISOString(),
        ...stats,
        details: {
          period_data_available: classStats.withPeriods > 0,
          classes_with_periods: classStats.withPeriods,
          classes_without_periods: classStats.withoutPeriods,
          skipped_data_types: skippedDataTypes.length > 0 ? skippedDataTypes : null,
        },
      })
      .eq('id', syncLogId);

    // Process auto-merge rules after successful sync
    console.log('Processing auto-merge rules...');
    try {
      const { data: autoMergeResult, error: autoMergeError } = await supabaseAdmin.functions.invoke(
        'process-auto-merge-rules',
        {
          body: { schoolId: connection.school_id, syncLogId },
        }
      );
      
      if (autoMergeError) {
        console.error('Auto-merge processing failed:', autoMergeError);
      } else if (autoMergeResult?.autoApprovedCount > 0) {
        console.log(`Auto-approved ${autoMergeResult.autoApprovedCount} merge(s)`);
      }
    } catch (autoMergeError) {
      console.error('Error calling process-auto-merge-rules:', autoMergeError);
      // Don't fail the sync if auto-merge processing fails
    }

    // Update connection
    await supabaseAdmin
      .from('infinite_campus_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: 'success',
        last_sync_error: null,
        sync_count: connection.sync_count + 1,
      })
      .eq('id', connection.id);

    const pendingMerges = studentStats.pending + teacherStats.pending;

    // Capture data quality snapshot after successful sync
    try {
      const { data: qualityMetrics } = await supabaseAdmin
        .rpc('calculate_ic_data_quality', { p_school_id: schoolId });

      if (qualityMetrics && qualityMetrics.length > 0) {
        await supabaseAdmin
          .from('ic_data_quality_snapshots')
          .upsert({
            school_id: schoolId,
            snapshot_date: new Date().toISOString().split('T')[0],
            ...qualityMetrics[0]
          });
      }
    } catch (qualityError) {
      console.error('Error capturing quality snapshot:', qualityError);
      // Don't fail the sync if quality capture fails
    }

    return new Response(JSON.stringify({ 
      success: true,
      stats,
      pendingMerges,
      remainingSyncs: rateLimit.remaining,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Sync error:', error);

    // Update sync log if it was created
    if (syncLogId) {
      await supabaseAdmin
        .from('ic_sync_logs')
        .update({
          status: 'error',
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : 'Unknown error',
          error_details: { stack: error instanceof Error ? error.stack : undefined },
        })
        .eq('id', syncLogId);
    }

    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

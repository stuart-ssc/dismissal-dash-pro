import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { OneRosterClient } from '../_shared/oneroster-client.ts';
import { decrypt } from '../_shared/encryption.ts';
import { findStudentMatch, findTeacherMatch } from '../_shared/fuzzy-matcher.ts';

// Helper to paginate Supabase queries past the 1,000-row PostgREST max_rows cap
async function fetchAllRows<T>(
  buildQuery: () => any,
  chunkSize = 900
): Promise<T[]> {
  let all: T[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await buildQuery().range(offset, offset + chunkSize - 1);
    if (error) { console.error('fetchAllRows error:', error); break; }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < chunkSize) break;
    offset += chunkSize;
  }
  return all;
}

interface SyncRequest {
  schoolId: number;
  syncType: 'manual' | 'scheduled';
  triggeredBy?: string;
  syncConfig?: any;
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

    const { data: existing } = await supabase
      .from('academic_sessions')
      .select('id')
      .eq('school_id', schoolId)
      .eq('ic_external_id', session.sourcedId)
      .maybeSingle();

    if (existing) {
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
  syncLogId: string,
  icSchoolSourcedId: string
): Promise<{ created: number; updated: number; pending: number; sourcedIds: string[] }> {
  console.log('Syncing teachers...');
  
  const teachers = await client.getTeachersForSchool(icSchoolSourcedId);
  let created = 0;
  let updated = 0;
  let pending = 0;
  const sourcedIds: string[] = [];

  // Pre-fetch all existing teachers for this school (paginated to bypass 1000-row cap)
  const existingWithIcId = await fetchAllRows<{ id: string; ic_external_id: string | null; email: string | null }>(
    () => supabase.from('teachers').select('id, ic_external_id, email').eq('school_id', schoolId).not('ic_external_id', 'is', null)
  );

  const icIdMap = new Map<string, { id: string; email: string | null }>();
  for (const t of existingWithIcId || []) {
    if (t.ic_external_id) icIdMap.set(t.ic_external_id, { id: t.id, email: t.email });
  }

  // Pre-fetch teachers WITHOUT ic_external_id (candidates for fuzzy matching)
  const { data: unmatchedTeachers } = await supabase
    .from('teachers')
    .select('id, first_name, last_name, email')
    .eq('school_id', schoolId)
    .is('ic_external_id', null)
    .eq('archived', false);

  const hasUnmatchedTeachers = (unmatchedTeachers?.length || 0) > 0;

  // Filter enabled teachers
  const enabledTeachers = teachers.filter(t => t.enabledUser);

  // Categorize: update existing, fuzzy match, or insert new
  const toUpdate: { id: string; data: any }[] = [];
  const toInsert: any[] = [];
  const pendingMerges: any[] = [];

  for (const teacher of enabledTeachers) {
    sourcedIds.push(teacher.sourcedId);

    const existing = icIdMap.get(teacher.sourcedId);
    if (existing) {
      toUpdate.push({
        id: existing.id,
        data: {
          first_name: teacher.givenName,
          last_name: teacher.familyName,
          email: teacher.email || existing.email,
        },
      });
      updated++;
      continue;
    }

    // Only run fuzzy matching if there are unmatched teachers
    if (hasUnmatchedTeachers) {
      const match = await findTeacherMatch(supabase, schoolId, {
        sourcedId: teacher.sourcedId,
        givenName: teacher.givenName,
        familyName: teacher.familyName,
        email: teacher.email,
      });

      if (match.confidence >= 0.95) {
        toUpdate.push({
          id: match.existingRecordId!,
          data: {
            first_name: teacher.givenName,
            last_name: teacher.familyName,
            email: teacher.email || null,
            ic_external_id: teacher.sourcedId,
          },
        });
        updated++;
        continue;
      } else if (match.confidence > 0) {
        pendingMerges.push({
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
        continue;
      }
    }

    // New teacher - insert
    toInsert.push({
      school_id: schoolId,
      first_name: teacher.givenName,
      last_name: teacher.familyName,
      email: teacher.email || null,
      ic_external_id: teacher.sourcedId,
    });
    created++;
  }

  // Batch insert new teachers (chunks of 50)
  for (let i = 0; i < toInsert.length; i += 50) {
    await supabase.from('teachers').insert(toInsert.slice(i, i + 50));
  }

  // Batch update existing teachers (chunks of 50)
  for (let i = 0; i < toUpdate.length; i += 50) {
    const chunk = toUpdate.slice(i, i + 50);
    await Promise.all(chunk.map(item =>
      supabase.from('teachers').update(item.data).eq('id', item.id)
    ));
  }

  // Batch insert pending merges (chunks of 50)
  for (let i = 0; i < pendingMerges.length; i += 50) {
    await supabase.from('ic_pending_merges').insert(pendingMerges.slice(i, i + 50));
  }

  console.log(`Teachers: ${created} created, ${updated} updated, ${pending} pending`);
  return { created, updated, pending, sourcedIds };
}

async function syncStudents(
  client: OneRosterClient,
  supabase: SupabaseClient,
  schoolId: number,
  syncLogId: string,
  icSchoolSourcedId: string
): Promise<{ created: number; updated: number; pending: number; sourcedIds: string[] }> {
  console.log('Syncing students...');
  
  const students = await client.getStudentsForSchool(icSchoolSourcedId);
  let created = 0;
  let updated = 0;
  let pending = 0;
  const sourcedIds: string[] = [];

  const { data: activeSession } = await supabase
    .from('academic_sessions')
    .select('id')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .maybeSingle();

  // Pre-fetch all existing students with ic_external_id (paginated to bypass 1000-row cap)
  const existingWithIcId = await fetchAllRows<{ id: string; ic_external_id: string | null }>(
    () => supabase.from('students').select('id, ic_external_id').eq('school_id', schoolId).not('ic_external_id', 'is', null)
  );

  const icIdMap = new Map<string, string>();
  for (const s of existingWithIcId || []) {
    if (s.ic_external_id) icIdMap.set(s.ic_external_id, s.id);
  }

  // Pre-fetch students WITHOUT ic_external_id (candidates for fuzzy matching)
  const { data: unmatchedStudents } = await supabase
    .from('students')
    .select('id, first_name, last_name, grade_level')
    .eq('school_id', schoolId)
    .is('ic_external_id', null)
    .eq('archived', false);

  const hasUnmatchedStudents = (unmatchedStudents?.length || 0) > 0;

  // Filter enabled students
  const enabledStudents = students.filter(s => s.enabledUser);

  // Categorize
  const toUpdate: { id: string; data: any }[] = [];
  const toInsert: any[] = [];
  const pendingMerges: any[] = [];

  for (const student of enabledStudents) {
    sourcedIds.push(student.sourcedId);

    const existingId = icIdMap.get(student.sourcedId);
    if (existingId) {
      toUpdate.push({
        id: existingId,
        data: {
          first_name: student.givenName,
          last_name: student.familyName,
          grade_level: student.grades?.[0] || 'Unknown',
          academic_session_id: activeSession?.id || null,
        },
      });
      updated++;
      continue;
    }

    // Only run fuzzy matching if there are unmatched students
    if (hasUnmatchedStudents) {
      const match = await findStudentMatch(supabase, schoolId, {
        sourcedId: student.sourcedId,
        givenName: student.givenName,
        familyName: student.familyName,
        grade: student.grades?.[0],
      });

      if (match.confidence >= 0.95) {
        toUpdate.push({
          id: match.existingRecordId!,
          data: {
            first_name: student.givenName,
            last_name: student.familyName,
            grade_level: student.grades?.[0] || 'Unknown',
            ic_external_id: student.sourcedId,
            academic_session_id: activeSession?.id || null,
          },
        });
        updated++;
        continue;
      } else if (match.confidence > 0) {
        pendingMerges.push({
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
        continue;
      }
    }

    // New student - insert
    toInsert.push({
      school_id: schoolId,
      first_name: student.givenName,
      last_name: student.familyName,
      grade_level: student.grades?.[0] || 'Unknown',
      ic_external_id: student.sourcedId,
      academic_session_id: activeSession?.id || null,
    });
    created++;
  }

  // Batch insert new students (chunks of 50)
  for (let i = 0; i < toInsert.length; i += 50) {
    await supabase.from('students').insert(toInsert.slice(i, i + 50));
  }

  // Batch update existing students (chunks of 50)
  for (let i = 0; i < toUpdate.length; i += 50) {
    const chunk = toUpdate.slice(i, i + 50);
    await Promise.all(chunk.map(item =>
      supabase.from('students').update(item.data).eq('id', item.id)
    ));
  }

  // Batch insert pending merges (chunks of 50)
  for (let i = 0; i < pendingMerges.length; i += 50) {
    await supabase.from('ic_pending_merges').insert(pendingMerges.slice(i, i + 50));
  }

  console.log(`Students: ${created} created, ${updated} updated, ${pending} pending`);
  return { created, updated, pending, sourcedIds };
}

function extractPeriodNumber(cls: any): number | null {
  if (cls.metadata?.periodNumber) {
    const num = parseInt(cls.metadata.periodNumber, 10);
    if (!isNaN(num)) return num;
  }
  if (cls.metadata?.period) {
    const num = parseInt(cls.metadata.period, 10);
    if (!isNaN(num)) return num;
  }
  if (cls.classCode) {
    const match = cls.classCode.match(/[Pp]?(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > 0 && num <= 20) return num;
    }
  }
  return null;
}

function extractPeriodStartTime(cls: any): string | null {
  if (cls.metadata?.startTime) return cls.metadata.startTime;
  if (cls.metadata?.periodStartTime) return cls.metadata.periodStartTime;
  if (cls.metadata?.start_time) return cls.metadata.start_time;
  return null;
}

function extractPeriodEndTime(cls: any): string | null {
  if (cls.metadata?.endTime) return cls.metadata.endTime;
  if (cls.metadata?.periodEndTime) return cls.metadata.periodEndTime;
  if (cls.metadata?.end_time) return cls.metadata.end_time;
  return null;
}

function extractPeriodName(cls: any): string | null {
  if (cls.metadata?.periodName) return cls.metadata.periodName;
  if (cls.metadata?.period_name) return cls.metadata.period_name;
  const periodNum = extractPeriodNumber(cls);
  if (periodNum) return `Period ${periodNum}`;
  return null;
}

async function syncClasses(
  client: OneRosterClient,
  supabase: SupabaseClient,
  schoolId: number,
  icSchoolSourcedId: string
): Promise<{ created: number; updated: number; withPeriods: number; withoutPeriods: number; sourcedIds: string[] }> {
  console.log('Syncing classes (school-scoped)...');
  
  const classes = await client.getClassesForSchool(icSchoolSourcedId);
  let created = 0;
  let updated = 0;
  let withPeriods = 0;
  let withoutPeriods = 0;
  const sourcedIds: string[] = [];

  const { data: activeSession } = await supabase
    .from('academic_sessions')
    .select('id')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .maybeSingle();

  if (classes.length > 0) {
    console.log('Sample IC class data:', JSON.stringify(classes[0], null, 2));
  }

  // Pre-fetch existing classes for this school with ic_external_id (paginated to bypass 1000-row cap)
  const existingClasses = await fetchAllRows<{ id: string; ic_external_id: string | null }>(
    () => supabase.from('classes').select('id, ic_external_id').eq('school_id', schoolId).not('ic_external_id', 'is', null)
  );

  const existingClassMap = new Map<string, string>();
  for (const c of existingClasses || []) {
    if (c.ic_external_id) {
      existingClassMap.set(c.ic_external_id, c.id);
    }
  }

  // Build batch arrays
  const toInsert: any[] = [];
  const toUpdate: { id: string; data: any }[] = [];

  for (const cls of classes) {
    sourcedIds.push(cls.sourcedId);

    const periodNumber = extractPeriodNumber(cls);
    const periodStartTime = extractPeriodStartTime(cls);
    const periodEndTime = extractPeriodEndTime(cls);
    const periodName = extractPeriodName(cls);

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

    const existingId = existingClassMap.get(cls.sourcedId);
    if (existingId) {
      toUpdate.push({ id: existingId, data: classData });
      updated++;
    } else {
      toInsert.push({ ...classData, ic_external_id: cls.sourcedId });
      created++;
    }
  }

  // Batch insert new classes (chunks of 50)
  for (let i = 0; i < toInsert.length; i += 50) {
    const chunk = toInsert.slice(i, i + 50);
    await supabase.from('classes').insert(chunk);
  }

  // Batch update existing classes (chunks of 50)
  for (let i = 0; i < toUpdate.length; i += 50) {
    const chunk = toUpdate.slice(i, i + 50);
    // Updates must be done individually since each has a different id
    await Promise.all(chunk.map(item =>
      supabase.from('classes').update(item.data).eq('id', item.id)
    ));
  }

  console.log(`Period data: ${withPeriods} classes with periods, ${withoutPeriods} without periods`);

  return { created, updated, withPeriods, withoutPeriods, sourcedIds };
}

async function syncEnrollments(
  client: OneRosterClient,
  supabase: SupabaseClient,
  schoolId: number,
  icSchoolSourcedId: string
): Promise<{ created: number; updated: number }> {
  console.log('Syncing enrollments (school-scoped)...');
  
  const enrollments = await client.getEnrollmentsForSchool(icSchoolSourcedId);
  console.log(`Fetched ${enrollments.length} enrollments from OneRoster API`);
  let created = 0;
  let updated = 0;

  const { data: activeSession } = await supabase
    .from('academic_sessions')
    .select('id')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .maybeSingle();

  // Pre-fetch all classes for this school with ic_external_id -> id map (paginated)
  const allClasses = await fetchAllRows<{ id: string; ic_external_id: string | null }>(
    () => supabase.from('classes').select('id, ic_external_id').eq('school_id', schoolId).not('ic_external_id', 'is', null)
  );

  const classMap = new Map<string, string>();
  for (const c of allClasses) {
    if (c.ic_external_id) classMap.set(c.ic_external_id, c.id);
  }

  // Pre-fetch all students for this school with ic_external_id -> id map (paginated)
  const allStudents = await fetchAllRows<{ id: string; ic_external_id: string | null }>(
    () => supabase.from('students').select('id, ic_external_id').eq('school_id', schoolId).not('ic_external_id', 'is', null)
  );

  const studentMap = new Map<string, string>();
  for (const s of allStudents) {
    if (s.ic_external_id) studentMap.set(s.ic_external_id, s.id);
  }

  // Pre-fetch all teachers for this school with ic_external_id -> id map (paginated)
  const allTeachers = await fetchAllRows<{ id: string; ic_external_id: string | null }>(
    () => supabase.from('teachers').select('id, ic_external_id').eq('school_id', schoolId).not('ic_external_id', 'is', null)
  );

  const teacherMap = new Map<string, string>();
  for (const t of allTeachers) {
    if (t.ic_external_id) teacherMap.set(t.ic_external_id, t.id);
  }

  console.log(`Enrollment pre-fetch maps - classes: ${classMap.size}, students: ${studentMap.size}, teachers: ${teacherMap.size}`);

  // Pre-fetch existing enrollments to avoid duplicate checks per-row (paginated)
  const classIds = Array.from(classMap.values());
  const existingRosters = classIds.length > 0 ? await fetchAllRows<{ class_id: string; student_id: string }>(
    () => supabase.from('class_rosters').select('class_id, student_id').in('class_id', classIds)
  ) : [];

  const rosterSet = new Set<string>();
  for (const r of existingRosters) {
    rosterSet.add(`${r.class_id}:${r.student_id}`);
  }

  const existingTeacherAssignments = classIds.length > 0 ? await fetchAllRows<{ class_id: string; teacher_id: string }>(
    () => supabase.from('class_teachers').select('class_id, teacher_id').in('class_id', classIds)
  ) : [];

  const teacherAssignSet = new Set<string>();
  for (const a of existingTeacherAssignments || []) {
    teacherAssignSet.add(`${a.class_id}:${a.teacher_id}`);
  }

  // Build batch inserts
  const rosterInserts: any[] = [];
  const teacherInserts: any[] = [];
  let skippedNoClass = 0;
  let skippedNoStudent = 0;
  let skippedNoTeacher = 0;
  let handledStudentRoles = 0;
  let handledTeacherRoles = 0;
  const unknownRoleCounts = new Map<string, number>();

  // Known teacher-like and student-like role values from OneRoster / Infinite Campus
  const TEACHER_ROLES = new Set(['teacher', 'teacherofrecord', 'primaryteacher', 'aide', 'instructor', 'proctor']);
  const STUDENT_ROLES = new Set(['student', 'pupil', 'learner']);

  function isTeacherRole(role: string): boolean {
    return TEACHER_ROLES.has(role) || role.includes('teacher');
  }

  function isStudentRole(role: string): boolean {
    return STUDENT_ROLES.has(role) || role.includes('student');
  }

  // Log role distribution for diagnostics
  const roleDistribution = new Map<string, number>();
  for (const enrollment of enrollments) {
    const raw = (enrollment.role || '').trim();
    roleDistribution.set(raw, (roleDistribution.get(raw) || 0) + 1);
  }
  console.log(`Enrollment role distribution:`, JSON.stringify(Object.fromEntries(roleDistribution)));

  for (const enrollment of enrollments) {
    const classId = classMap.get(enrollment.class.sourcedId);
    if (!classId) {
      skippedNoClass++;
      continue;
    }

    const normalizedRole = (enrollment.role || '').trim().toLowerCase();

    if (isStudentRole(normalizedRole)) {
      handledStudentRoles++;
      const studentId = studentMap.get(enrollment.user.sourcedId);
      if (!studentId) {
        skippedNoStudent++;
        continue;
      }

      const key = `${classId}:${studentId}`;
      if (rosterSet.has(key)) {
        updated++;
      } else {
        rosterInserts.push({
          class_id: classId,
          student_id: studentId,
          academic_session_id: activeSession?.id || null,
        });
        rosterSet.add(key);
        created++;
      }
    } else if (isTeacherRole(normalizedRole)) {
      handledTeacherRoles++;
      const teacherId = teacherMap.get(enrollment.user.sourcedId);
      if (!teacherId) {
        skippedNoTeacher++;
        continue;
      }

      const key = `${classId}:${teacherId}`;
      if (teacherAssignSet.has(key)) {
        updated++;
      } else {
        teacherInserts.push({
          class_id: classId,
          teacher_id: teacherId,
        });
        teacherAssignSet.add(key);
        created++;
      }
    } else {
      unknownRoleCounts.set(normalizedRole, (unknownRoleCounts.get(normalizedRole) || 0) + 1);
    }
  }

  console.log(`Enrollment maps - classes: ${classMap.size}, students: ${studentMap.size}, teachers: ${teacherMap.size}`);
  console.log(`Enrollment role handling - student roles: ${handledStudentRoles}, teacher roles: ${handledTeacherRoles}`);
  console.log(`Enrollment skips - no class: ${skippedNoClass}, no student: ${skippedNoStudent}, no teacher: ${skippedNoTeacher}`);
  if (unknownRoleCounts.size > 0) {
    console.log(`Unknown enrollment roles:`, JSON.stringify(Object.fromEntries(unknownRoleCounts)));
  }
  console.log(`Enrollments to insert - rosters: ${rosterInserts.length}, teacher assignments: ${teacherInserts.length}`);

  // Batch insert enrollments (chunks of 100)
  for (let i = 0; i < rosterInserts.length; i += 100) {
    const { error } = await supabase.from('class_rosters').insert(rosterInserts.slice(i, i + 100));
    if (error) console.error(`Error inserting class_rosters batch ${i}:`, error.message);
  }
  for (let i = 0; i < teacherInserts.length; i += 100) {
    const { error } = await supabase.from('class_teachers').insert(teacherInserts.slice(i, i + 100));
    if (error) console.error(`Error inserting class_teachers batch ${i}:`, error.message);
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

    let clientId: string;
    let clientSecretDecrypted: string;
    let baseUrl: string;
    let tokenUrlValue: string;
    let onerosterVersion: '1.1' | '1.2';
    let appName: string | undefined;
    let connectionId: string;

    const { data: schoolMapping } = await supabaseAdmin
      .from('ic_school_mappings')
      .select('*, ic_district_connections(*)')
      .eq('school_id', schoolId)
      .maybeSingle();

    if (schoolMapping?.ic_district_connections) {
      const districtConn = schoolMapping.ic_district_connections;
      clientId = await decrypt(districtConn.client_id);
      clientSecretDecrypted = await decrypt(districtConn.client_secret);
      baseUrl = districtConn.base_url;
      tokenUrlValue = districtConn.token_url;
      onerosterVersion = districtConn.oneroster_version as '1.1' | '1.2';
      appName = districtConn.app_name;
      connectionId = districtConn.id;
    } else {
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

      clientId = await decrypt(connection.client_key);
      clientSecretDecrypted = await decrypt(connection.client_secret);
      baseUrl = connection.host_url;
      tokenUrlValue = connection.token_url;
      onerosterVersion = connection.oneroster_version as '1.1' | '1.2';
      connectionId = connection.id;
    }

    // Clean up any stuck syncs older than 10 minutes
    await supabaseAdmin
      .from('ic_sync_logs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: 'Sync timed out - automatically cleaned up',
      })
      .eq('school_id', schoolId)
      .eq('status', 'in_progress')
      .lt('started_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());

    // Create sync log
    const { data: syncLog, error: logError } = await supabaseAdmin
      .from('ic_sync_logs')
      .insert({
        school_id: schoolId,
        sync_type: syncType,
        status: 'in_progress',
        triggered_by: triggeredBy || null,
        metadata: {
          connection_id: connectionId,
          config_snapshot: syncConfig || null,
          skipped_data_types: skippedDataTypes.length > 0 ? skippedDataTypes : null,
          sync_reason: syncType === 'manual' ? 'manual' : 'scheduled',
        },
      })
      .select()
      .single();

    if (logError || !syncLog) {
      throw new Error('Failed to create sync log');
    }

    syncLogId = syncLog.id;

    const client = new OneRosterClient({
      baseUrl,
      clientId,
      clientSecret: clientSecretDecrypted,
      tokenUrl: tokenUrlValue,
      version: onerosterVersion,
      appName,
    });

    await client.authenticate();

    let teacherStats = { created: 0, updated: 0, pending: 0, sourcedIds: [] as string[] };
    let studentStats = { created: 0, updated: 0, pending: 0, sourcedIds: [] as string[] };
    let classStats = { created: 0, updated: 0, withPeriods: 0, withoutPeriods: 0, sourcedIds: [] as string[] };
    let enrollmentStats = { created: 0, updated: 0 };
    
    if (shouldSyncAcademicSessions) {
      await syncAcademicSessions(client, supabaseAdmin, schoolId);
    }

    // Determine IC school sourcedId
    const icSchoolSourcedId = schoolMapping?.ic_school_sourced_id || null;
    if (!icSchoolSourcedId) {
      const schools = await client.getSchools();
      if (schools.length === 0) {
        throw new Error('No schools found in OneRoster API');
      }
      console.log('No ic_school_sourced_id in mapping, using first school from API:', schools[0].sourcedId);
    }
    const effectiveSchoolSourcedId = icSchoolSourcedId || (await client.getSchools())[0]?.sourcedId;
    if (!effectiveSchoolSourcedId) {
      throw new Error('Could not determine IC school sourcedId for school-scoped sync');
    }

    if (shouldSyncTeachers) {
      teacherStats = await syncTeachers(client, supabaseAdmin, schoolId, syncLogId, effectiveSchoolSourcedId);
    }

    if (shouldSyncStudents) {
      studentStats = await syncStudents(client, supabaseAdmin, schoolId, syncLogId, effectiveSchoolSourcedId);
    }

    if (shouldSyncClasses) {
      classStats = await syncClasses(client, supabaseAdmin, schoolId, effectiveSchoolSourcedId);
    }

    if (shouldSyncEnrollments) {
      enrollmentStats = await syncEnrollments(client, supabaseAdmin, schoolId, effectiveSchoolSourcedId);
    }

    // Archive missing records using cached sourcedIds (no duplicate API calls)
    const archiveStats = await archiveMissing(supabaseAdmin, schoolId, {
      students: studentStats.sourcedIds,
      teachers: teacherStats.sourcedIds,
      classes: classStats.sourcedIds,
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
        status: 'completed',
        completed_at: new Date().toISOString(),
        students_created: stats.studentsCreated,
        students_updated: stats.studentsUpdated,
        students_archived: stats.studentsArchived,
        teachers_created: stats.teachersCreated,
        teachers_updated: stats.teachersUpdated,
        teachers_archived: stats.teachersArchived,
        classes_created: stats.classesCreated,
        classes_updated: stats.classesUpdated,
        classes_archived: stats.classesArchived,
        enrollments_created: stats.enrollmentsCreated,
        enrollments_updated: stats.enrollmentsUpdated,
        metadata: {
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
          body: { schoolId, syncLogId },
        }
      );
      
      if (autoMergeError) {
        console.error('Auto-merge processing failed:', autoMergeError);
      } else if (autoMergeResult?.autoApprovedCount > 0) {
        console.log(`Auto-approved ${autoMergeResult.autoApprovedCount} merge(s)`);
      }
    } catch (autoMergeError) {
      console.error('Error calling process-auto-merge-rules:', autoMergeError);
    }

    // Update connection status
    if (schoolMapping?.ic_district_connections) {
      await supabaseAdmin
        .from('ic_district_connections')
        .update({
          last_tested_at: new Date().toISOString(),
          last_test_status: 'success',
        })
        .eq('id', connectionId);
    }
    await supabaseAdmin
      .from('infinite_campus_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: 'success',
        last_sync_error: null,
      })
      .eq('school_id', schoolId);

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

    if (syncLogId) {
      await supabaseAdmin
        .from('ic_sync_logs')
        .update({
          status: 'failed',
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

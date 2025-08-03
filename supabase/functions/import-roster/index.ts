import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RosterRow {
  studentId?: string;
  firstName: string;
  lastName: string;
  gradeLevel: string;
  className: string;
  roomNumber?: string;
  teacherFirstName: string;
  teacherLastName: string;
  teacherEmail: string;
  parentGuardianName?: string;
  contactInfo?: string;
  specialNotes?: string;
  dismissalGroup?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user profile and verify school_admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.school_id) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'school_admin')
      .single();

    if (roleError || !userRole) {
      return new Response(JSON.stringify({ error: 'Unauthorized: School admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const rosterData = JSON.parse(formData.get('rosterData') as string) as RosterRow[];

    if (!file || !rosterData || !Array.isArray(rosterData)) {
      return new Response(JSON.stringify({ error: 'Invalid file or roster data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = {
      studentsCreated: 0,
      teachersCreated: 0,
      classesCreated: 0,
      studentsEnrolled: 0,
      teachersAssigned: 0,
      errors: [] as string[],
    };

    console.log(`Processing ${rosterData.length} roster entries for school ${profile.school_id}`);

    // Track unique classes and teachers to avoid duplicates
    const processedClasses = new Map<string, string>(); // key -> classId
    const processedTeachers = new Map<string, string>(); // email -> userId

    for (let i = 0; i < rosterData.length; i++) {
      const row = rosterData[i];
      
      try {
        // 1. Create or get class
        const classKey = `${row.className}_${row.roomNumber || 'NO_ROOM'}`;
        let classId = processedClasses.get(classKey);
        
        if (!classId) {
          const { data: existingClass } = await supabase
            .from('classes')
            .select('id')
            .eq('class_name', row.className)
            .eq('room_number', row.roomNumber || null)
            .eq('school_id', profile.school_id)
            .single();

          if (existingClass) {
            classId = existingClass.id;
          } else {
            const { data: newClass, error: classError } = await supabase
              .from('classes')
              .insert({
                class_name: row.className,
                room_number: row.roomNumber || null,
                school_id: profile.school_id,
                grade_level: row.gradeLevel,
              })
              .select('id')
              .single();

            if (classError) {
              results.errors.push(`Row ${i + 1}: Failed to create class ${row.className} - ${classError.message}`);
              continue;
            }
            classId = newClass.id;
            results.classesCreated++;
          }
          processedClasses.set(classKey, classId);
        }

        // 2. Process teacher
        let teacherId = processedTeachers.get(row.teacherEmail);
        
        if (!teacherId) {
          // Check if teacher exists in teachers table
          const { data: existingTeacher } = await supabase
            .from('teachers')
            .select('id')
            .eq('email', row.teacherEmail)
            .eq('school_id', profile.school_id)
            .single();

          if (existingTeacher) {
            teacherId = existingTeacher.id;
          } else {
            // Create teacher record
            const { data: newTeacher, error: teacherError } = await supabase
              .from('teachers')
              .insert({
                first_name: row.teacherFirstName,
                last_name: row.teacherLastName,
                email: row.teacherEmail,
                school_id: profile.school_id,
              })
              .select('id')
              .single();

            if (teacherError) {
              results.errors.push(`Row ${i + 1}: Failed to create teacher ${row.teacherFirstName} ${row.teacherLastName} - ${teacherError.message}`);
              continue;
            }
            teacherId = newTeacher.id;
            results.teachersCreated++;
          }
          processedTeachers.set(row.teacherEmail, teacherId);
        }

        // Assign teacher to class
        const { error: assignError } = await supabase
          .from('class_teachers')
          .upsert({
            teacher_id: teacherId,
            class_id: classId,
          });

        if (!assignError) {
          results.teachersAssigned++;
        }

        // 3. Create student
        let studentId: string;
        let existingStudent = null;
        
        // Only check for existing student if student_id is provided
        if (row.studentId) {
          const { data: existing } = await supabase
            .from('students')
            .select('id')
            .eq('student_id', row.studentId)
            .eq('school_id', profile.school_id)
            .single();
          existingStudent = existing;
        }
        
        if (existingStudent) {
          studentId = existingStudent.id;
        } else {
          const { data: newStudent, error: studentError } = await supabase
            .from('students')
            .insert({
              student_id: row.studentId || null,
              first_name: row.firstName,
              last_name: row.lastName,
              grade_level: row.gradeLevel,
              school_id: profile.school_id,
              parent_guardian_name: row.parentGuardianName,
              contact_info: row.contactInfo,
              special_notes: row.specialNotes,
              dismissal_group: row.dismissalGroup,
            })
            .select('id')
            .single();

          if (studentError) {
            results.errors.push(`Row ${i + 1}: Failed to create student ${row.firstName} ${row.lastName} - ${studentError.message}`);
            continue;
          }
          studentId = newStudent.id;
          results.studentsCreated++;
        }

        // 4. Enroll student in class
        const { error: enrollError } = await supabase
          .from('class_rosters')
          .upsert({
            student_id: studentId,
            class_id: classId,
          });

        if (!enrollError) {
          results.studentsEnrolled++;
        }

      } catch (error) {
        results.errors.push(`Row ${i + 1}: Unexpected error - ${error.message}`);
        console.error(`Error processing row ${i + 1}:`, error);
      }
    }

    console.log('Import completed:', results);

    return new Response(JSON.stringify({ 
      success: true, 
      results,
      message: `Successfully processed ${rosterData.length} rows. Created ${results.studentsCreated} students, ${results.teachersCreated} teachers, ${results.classesCreated} classes.`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Import error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
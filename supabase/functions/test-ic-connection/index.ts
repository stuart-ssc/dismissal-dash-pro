import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { OneRosterClient } from '../_shared/oneroster-client.ts';
import { findStudentMatch, findTeacherMatch } from '../_shared/fuzzy-matcher.ts';

interface TestRequest {
  hostUrl: string;
  clientKey: string;
  clientSecret: string;
  tokenUrl: string;
  schoolId: number;
}

interface TestResponse {
  valid: boolean;
  version?: '1.1' | '1.2';
  preview?: {
    orgName: string;
    schoolName: string;
    studentCount: number;
    teacherCount: number;
    classCount: number;
    academicSessions: Array<{ name: string; start: string; end: string; isActive: boolean }>;
    sampleStudents: Array<{ firstName: string; lastName: string; grade: string }>;
    sampleTeachers: Array<{ firstName: string; lastName: string; email: string }>;
    potentialDuplicates: {
      students: number;
      teachers: number;
    };
  };
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body: TestRequest = await req.json();
    const { hostUrl, clientKey, clientSecret, tokenUrl, schoolId } = body;

    // Verify user is school admin for this school
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isSystemAdmin = userRoles?.some(r => r.role === 'system_admin');
    
    if (!isSystemAdmin) {
      const { data: userSchools } = await supabaseAdmin
        .from('user_schools')
        .select('school_id')
        .eq('user_id', user.id);

      const hasAccess = userSchools?.some(us => us.school_id === schoolId);
      
      if (!hasAccess) {
        return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Auto-detect OneRoster version
    console.log('Detecting OneRoster version...');
    const version = await OneRosterClient.detectVersion(hostUrl, clientKey, clientSecret, tokenUrl);
    console.log(`Detected version: ${version}`);

    // Initialize client with detected version
    const client = new OneRosterClient({
      hostUrl,
      clientKey,
      clientSecret,
      tokenUrl,
      version,
    });

    // Test authentication
    await client.authenticate();

    // Fetch preview data
    console.log('Fetching preview data...');
    const [orgs, schools, sessions, students, teachers, classes] = await Promise.all([
      client.getOrgs(),
      client.getSchools(),
      client.getAcademicSessions(),
      client.getUsers('student'),
      client.getUsers('teacher'),
      client.getClasses(),
    ]);

    // Get current date for determining active session
    const currentDate = new Date();

    // Count potential duplicates
    let studentDuplicates = 0;
    let teacherDuplicates = 0;

    // Check first 20 students for duplicates
    const studentsToCheck = students.slice(0, 20);
    for (const student of studentsToCheck) {
      const match = await findStudentMatch(supabaseAdmin, schoolId, {
        sourcedId: student.sourcedId,
        givenName: student.givenName,
        familyName: student.familyName,
        grade: student.grade,
      });
      
      if (match.confidence > 0 && match.confidence < 1.0) {
        studentDuplicates++;
      }
    }

    // Check first 10 teachers for duplicates
    const teachersToCheck = teachers.slice(0, 10);
    for (const teacher of teachersToCheck) {
      const match = await findTeacherMatch(supabaseAdmin, schoolId, {
        sourcedId: teacher.sourcedId,
        givenName: teacher.givenName,
        familyName: teacher.familyName,
        email: teacher.email,
      });
      
      if (match.confidence > 0 && match.confidence < 1.0) {
        teacherDuplicates++;
      }
    }

    const response: TestResponse = {
      valid: true,
      version,
      preview: {
        orgName: orgs[0]?.name || 'Unknown',
        schoolName: schools[0]?.name || 'Unknown',
        studentCount: students.length,
        teacherCount: teachers.length,
        classCount: classes.length,
        academicSessions: sessions.slice(0, 5).map(session => {
          const start = new Date(session.startDate);
          const end = new Date(session.endDate);
          const isActive = currentDate >= start && currentDate <= end;
          
          return {
            name: session.title,
            start: session.startDate,
            end: session.endDate,
            isActive,
          };
        }),
        sampleStudents: students.slice(0, 5).map(s => ({
          firstName: s.givenName,
          lastName: s.familyName,
          grade: s.grade || 'N/A',
        })),
        sampleTeachers: teachers.slice(0, 5).map(t => ({
          firstName: t.givenName,
          lastName: t.familyName,
          email: t.email || 'No email',
        })),
        potentialDuplicates: {
          students: studentDuplicates,
          teachers: teacherDuplicates,
        },
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Test connection error:', error);
    
    const response: TestResponse = {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };

    return new Response(JSON.stringify(response), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { OneRosterClient } from '../_shared/oneroster-client.ts';

interface TestRequest {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  appName: string;
  schoolId: number;
}

interface ICSchool {
  sourcedId: string;
  name: string;
  type: string;
}

interface TestResponse {
  valid: boolean;
  version?: '1.1' | '1.2';
  schools?: ICSchool[];
  suggestedMatch?: {
    sourcedId: string;
    name: string;
    confidence: number;
  };
  preview?: {
    orgName: string;
    studentCount: number;
    teacherCount: number;
    classCount: number;
    academicSessions: Array<{ name: string; start: string; end: string; isActive: boolean }>;
  };
  error?: string;
}

/**
 * Simple fuzzy match score between two strings (0-1)
 */
function fuzzyMatchScore(a: string, b: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const na = normalize(a);
  const nb = normalize(b);
  
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.8;
  
  // Simple word overlap
  const wordsA = a.toLowerCase().split(/\s+/);
  const wordsB = b.toLowerCase().split(/\s+/);
  const common = wordsA.filter(w => wordsB.some(wb => wb.includes(w) || w.includes(wb)));
  const score = (common.length * 2) / (wordsA.length + wordsB.length);
  return score;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const body: TestRequest = await req.json();
    const { baseUrl, clientId, clientSecret, tokenUrl, appName, schoolId } = body;

    // Verify user has access to this school
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isSystemAdmin = userRoles?.some(r => r.role === 'system_admin');
    const isDistrictAdmin = userRoles?.some(r => r.role === 'district_admin');
    
    if (!isSystemAdmin && !isDistrictAdmin) {
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
    console.log(`Input baseUrl: "${baseUrl}", appName: "${appName}", tokenUrl: "${tokenUrl}"`);
    const version = await OneRosterClient.detectVersion(baseUrl, clientId, clientSecret, tokenUrl, appName);
    console.log(`Detected version: ${version}`);

    // Initialize client
    const client = new OneRosterClient({
      baseUrl,
      clientId,
      clientSecret,
      tokenUrl,
      version,
      appName,
    });

    await client.authenticate();
    console.log('Authentication successful');

    // Fetch data for preview
    console.log('Fetching preview data (orgs, schools, sessions)...');
    const [orgs, schools, sessions] = await Promise.all([
      client.getOrgs(),
      client.getSchools(),
      client.getAcademicSessions(),
    ]);
    console.log(`Results: ${orgs.length} orgs, ${schools.length} schools, ${sessions.length} sessions`);

    // Get the registered school name for fuzzy matching
    const { data: registeredSchool } = await supabaseAdmin
      .from('schools')
      .select('school_name')
      .eq('id', schoolId)
      .single();

    const schoolName = registeredSchool?.school_name || '';

    // Find best match among IC schools
    let suggestedMatch: TestResponse['suggestedMatch'] = undefined;
    if (schoolName && schools.length > 0) {
      let bestScore = 0;
      let bestSchool: any = null;
      for (const s of schools) {
        const score = fuzzyMatchScore(schoolName, s.name);
        if (score > bestScore) {
          bestScore = score;
          bestSchool = s;
        }
      }
      if (bestSchool && bestScore > 0.3) {
        suggestedMatch = {
          sourcedId: bestSchool.sourcedId,
          name: bestSchool.name,
          confidence: bestScore,
        };
      }
    }

    const currentDate = new Date();

    const response: TestResponse = {
      valid: true,
      version,
      schools: schools.map(s => ({
        sourcedId: s.sourcedId,
        name: s.name,
        type: s.type,
      })),
      suggestedMatch,
      preview: {
        orgName: orgs[0]?.name || 'Unknown',
        studentCount: 0, // We'll get counts per-school later
        teacherCount: 0,
        classCount: 0,
        academicSessions: sessions.slice(0, 5).map(session => {
          const start = new Date(session.startDate);
          const end = new Date(session.endDate);
          return {
            name: session.title,
            start: session.startDate,
            end: session.endDate,
            isActive: currentDate >= start && currentDate <= end,
          };
        }),
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Test connection error:', error);
    
    return new Response(JSON.stringify({
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

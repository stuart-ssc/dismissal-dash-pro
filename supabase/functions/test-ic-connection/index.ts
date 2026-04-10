import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { OneRosterClient } from '../_shared/oneroster-client.ts';
import { decrypt } from '../_shared/encryption.ts';

interface TestRequest {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  appName: string;
  schoolId: number;
  /** If true, use stored district credentials (for already-connected districts) */
  useStoredCredentials?: boolean;
  districtConnectionId?: string;
}

interface TestResponse {
  valid: boolean;
  version?: '1.1' | '1.2';
  schools?: Array<{ sourcedId: string; name: string; type: string }>;
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
  stage?: string;
  diagnostics?: Record<string, any>;
}

function fuzzyMatchScore(a: string, b: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.8;
  const wordsA = a.toLowerCase().split(/\s+/);
  const wordsB = b.toLowerCase().split(/\s+/);
  const common = wordsA.filter(w => wordsB.some(wb => wb.includes(w) || w.includes(wb)));
  return (common.length * 2) / (wordsA.length + wordsB.length);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Always return 200 with structured JSON — never throw HTTP errors for IC issues
  const jsonResponse = (data: TestResponse, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ valid: false, error: 'Missing authorization', stage: 'auth' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ valid: false, error: 'Unauthorized', stage: 'auth' }, 401);
    }

    const body: TestRequest = await req.json();
    const { schoolId, useStoredCredentials, districtConnectionId } = body;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify permissions
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
        return jsonResponse({
          valid: false,
          error: 'You do not have permission to access this school. Please contact your administrator.',
          stage: 'permission',
          diagnostics: { userId: user.id, schoolId },
        });
      }
    }

    // Resolve credentials — either from request body or from stored district connection
    let baseUrl: string;
    let clientId: string;
    let clientSecret: string;
    let tokenUrl: string;
    let appName: string;

    if (useStoredCredentials && districtConnectionId) {
      console.log(`Using stored credentials for district connection: ${districtConnectionId}`);
      const { data: conn, error: connErr } = await supabaseAdmin
        .from('ic_district_connections')
        .select('*')
        .eq('id', districtConnectionId)
        .single();

      if (connErr || !conn) {
        return jsonResponse({
          valid: false,
          error: 'District connection not found. It may have been removed.',
          stage: 'credential_lookup',
        });
      }

      baseUrl = conn.base_url;
      appName = conn.app_name;
      tokenUrl = conn.token_url;

      try {
        clientId = await decrypt(conn.client_id);
        clientSecret = await decrypt(conn.client_secret);
      } catch (decryptErr) {
        console.error('Decryption error:', decryptErr);
        return jsonResponse({
          valid: false,
          error: 'Failed to decrypt stored credentials. The encryption key may have changed.',
          stage: 'decryption',
        });
      }
    } else {
      // Use credentials from request body (fresh setup)
      baseUrl = body.baseUrl;
      clientId = body.clientId;
      clientSecret = body.clientSecret;
      tokenUrl = body.tokenUrl;
      appName = body.appName;

      // Validate that we're not receiving masked placeholder values
      if (clientId === '••••••••' || clientSecret === '••••••••') {
        return jsonResponse({
          valid: false,
          error: 'Received masked placeholder credentials. This is a bug — please report it.',
          stage: 'validation',
        });
      }
    }

    console.log(`Testing IC connection: baseUrl="${baseUrl}", appName="${appName}", tokenUrl="${tokenUrl}"`);

    // Auto-detect OneRoster version
    let version: '1.1' | '1.2';
    try {
      version = await OneRosterClient.detectVersion(baseUrl, clientId, clientSecret, tokenUrl, appName);
      console.log(`Detected version: ${version}`);
    } catch (versionErr) {
      console.error('Version detection error:', versionErr);
      return jsonResponse({
        valid: false,
        error: `Authentication failed. Please verify your Client ID, Client Secret, and Token URL are correct. Technical: ${versionErr instanceof Error ? versionErr.message : 'Unknown'}`,
        stage: 'authentication',
        diagnostics: { tokenUrl },
      });
    }

    // Initialize client
    const client = new OneRosterClient({ baseUrl, clientId, clientSecret, tokenUrl, version, appName });

    try {
      await client.authenticate();
      console.log('Authentication successful');
    } catch (authErr) {
      console.error('Authentication error:', authErr);
      return jsonResponse({
        valid: false,
        error: `OAuth2 authentication failed. Double-check your Client ID and Client Secret. Technical: ${authErr instanceof Error ? authErr.message : 'Unknown'}`,
        stage: 'authentication',
        diagnostics: { tokenUrl },
      });
    }

    // Fetch data for preview
    let orgs: any[] = [];
    let schools: any[] = [];
    let sessions: any[] = [];

    try {
      console.log('Fetching orgs...');
      orgs = await client.getOrgs();
      console.log(`Got ${orgs.length} orgs`);
    } catch (orgErr) {
      console.error('Orgs fetch error:', orgErr);
      return jsonResponse({
        valid: false,
        error: `Connected successfully but failed to fetch organizations. Your API credentials may lack the required OneRoster permissions. Technical: ${orgErr instanceof Error ? orgErr.message : 'Unknown'}`,
        stage: 'orgs',
      });
    }

    try {
      console.log('Fetching schools...');
      schools = await client.getSchools();
      console.log(`Got ${schools.length} schools`);
    } catch (schoolErr) {
      console.error('Schools fetch error:', schoolErr);
      return jsonResponse({
        valid: false,
        error: `Connected but failed to fetch schools. Technical: ${schoolErr instanceof Error ? schoolErr.message : 'Unknown'}`,
        stage: 'schools',
      });
    }

    // Defer session fetching — will attempt school-scoped fetch after match is identified

    // Get the registered school name for fuzzy matching
    const { data: registeredSchool } = await supabaseAdmin
      .from('schools')
      .select('school_name')
      .eq('id', schoolId)
      .single();

    const schoolName = registeredSchool?.school_name || '';

    // Find best match
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

    // Fetch sessions scoped to the matched/selected school, fallback to all sessions
    const sessionSchoolId = suggestedMatch?.sourcedId;
    if (sessionSchoolId) {
      try {
        console.log(`Fetching sessions for school: ${sessionSchoolId}`);
        sessions = await client.getAcademicSessionsForSchool(sessionSchoolId);
        console.log(`Got ${sessions.length} school-scoped sessions`);
      } catch (scopedErr) {
        console.log('School-scoped sessions failed, falling back to all sessions:', scopedErr);
        try {
          sessions = await client.getAcademicSessions();
          console.log(`Got ${sessions.length} district-wide sessions`);
        } catch (allErr) {
          console.error('All sessions fetch failed:', allErr);
          sessions = [];
        }
      }
    } else {
      try {
        sessions = await client.getAcademicSessions();
        console.log(`Got ${sessions.length} district-wide sessions`);
      } catch (sessionErr) {
        console.error('Sessions fetch error:', sessionErr);
        sessions = [];
      }
    }

    const currentDate = new Date();

    return jsonResponse({
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
        studentCount: 0,
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
    });

  } catch (error) {
    console.error('Test connection unexpected error:', error);
    return jsonResponse({
      valid: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      stage: 'unknown',
    });
  }
});

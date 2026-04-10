import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { OneRosterClient } from '../_shared/oneroster-client.ts';
import { decrypt } from '../_shared/encryption.ts';

/**
 * Fetches IC schools using stored district credentials (server-side).
 * Used when a district is already connected and a new school wants to map itself.
 * Never sends decrypted credentials to the client.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (data: any, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing authorization' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const { districtConnectionId, schoolId } = await req.json();

    if (!districtConnectionId || !schoolId) {
      return json({ error: 'districtConnectionId and schoolId are required' }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user has access
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

      if (!userSchools?.some(us => us.school_id === schoolId)) {
        return json({ error: 'Insufficient permissions' }, 403);
      }
    }

    // Fetch stored district connection
    const { data: conn, error: connErr } = await supabaseAdmin
      .from('ic_district_connections')
      .select('*')
      .eq('id', districtConnectionId)
      .single();

    if (connErr || !conn) {
      return json({ error: 'District connection not found', valid: false }, 404);
    }

    // Decrypt credentials server-side
    let clientId: string;
    let clientSecret: string;
    try {
      clientId = await decrypt(conn.client_id);
      clientSecret = await decrypt(conn.client_secret);
    } catch (e) {
      console.error('Decryption error:', e);
      return json({ error: 'Failed to decrypt stored credentials', valid: false });
    }

    // Connect and fetch schools
    const version = (conn.oneroster_version as '1.1' | '1.2') || '1.2';
    const client = new OneRosterClient({
      baseUrl: conn.base_url,
      clientId,
      clientSecret,
      tokenUrl: conn.token_url,
      version,
      appName: conn.app_name,
    });

    await client.authenticate();
    console.log('Authenticated with stored credentials');

    const [schools, orgs, sessions] = await Promise.all([
      client.getSchools(),
      client.getOrgs(),
      client.getAcademicSessions(),
    ]);

    console.log(`Fetched ${schools.length} schools, ${orgs.length} orgs, ${sessions.length} sessions`);

    // Fuzzy match
    const { data: registeredSchool } = await supabaseAdmin
      .from('schools')
      .select('school_name')
      .eq('id', schoolId)
      .single();

    const schoolName = registeredSchool?.school_name || '';
    let suggestedMatch: any = undefined;

    if (schoolName && schools.length > 0) {
      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
      let bestScore = 0;
      let bestSchool: any = null;

      for (const s of schools) {
        const na = normalize(schoolName);
        const nb = normalize(s.name);
        let score = 0;
        if (na === nb) score = 1.0;
        else if (na.includes(nb) || nb.includes(na)) score = 0.8;
        else {
          const wordsA = schoolName.toLowerCase().split(/\s+/);
          const wordsB = s.name.toLowerCase().split(/\s+/);
          const common = wordsA.filter((w: string) => wordsB.some((wb: string) => wb.includes(w) || w.includes(wb)));
          score = (common.length * 2) / (wordsA.length + wordsB.length);
        }
        if (score > bestScore) {
          bestScore = score;
          bestSchool = s;
        }
      }
      if (bestSchool && bestScore > 0.3) {
        suggestedMatch = { sourcedId: bestSchool.sourcedId, name: bestSchool.name, confidence: bestScore };
      }
    }

    const currentDate = new Date();

    return json({
      valid: true,
      version,
      schools: schools.map(s => ({ sourcedId: s.sourcedId, name: s.name, type: s.type })),
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
    console.error('get-ic-district-schools error:', error);
    return json({
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { encrypt } from '../_shared/encryption.ts';

interface ConnectRequest {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  appName: string;
  version: '1.1' | '1.2';
  districtId: string;
  schoolId: number;
  icSchoolSourcedId: string;
  icSchoolName: string;
  syncConfig?: {
    enabled: boolean;
    interval_type: 'hourly' | 'daily' | 'weekly' | 'custom';
    interval_value: number;
    sync_window_start: string;
    sync_window_end: string;
    timezone: string;
    sync_students: boolean;
    sync_teachers: boolean;
    sync_classes: boolean;
    sync_enrollments: boolean;
    skip_weekends: boolean;
  };
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

    const body: ConnectRequest = await req.json();
    const { baseUrl, clientId, clientSecret, tokenUrl, appName, version, districtId, schoolId, icSchoolSourcedId, icSchoolName, syncConfig } = body;

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
        return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Check if district connection already exists
    const { data: existingConnection } = await supabaseAdmin
      .from('ic_district_connections')
      .select('id')
      .eq('district_id', districtId)
      .maybeSingle();

    let connectionId: string;

    if (existingConnection) {
      // District already connected - just add the school mapping
      connectionId = existingConnection.id;
      console.log('District already connected, adding school mapping...');
    } else {
      // New district connection - encrypt and store credentials
      console.log('Creating new district connection...');
      const encryptedClientId = await encrypt(clientId);
      const encryptedSecret = await encrypt(clientSecret);

      const userRole = isSystemAdmin ? 'system_admin' : isDistrictAdmin ? 'district_admin' : 'school_admin';

      const { data: connection, error: insertError } = await supabaseAdmin
        .from('ic_district_connections')
        .insert({
          district_id: districtId,
          base_url: baseUrl,
          app_name: appName,
          client_id: encryptedClientId,
          client_secret: encryptedSecret,
          token_url: tokenUrl,
          oneroster_version: version,
          status: 'active',
          configured_by: user.id,
          configured_by_role: userRole,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      connectionId = connection.id;
    }

    // Create school mapping
    const { data: mapping, error: mappingError } = await supabaseAdmin
      .from('ic_school_mappings')
      .upsert({
        district_connection_id: connectionId,
        school_id: schoolId,
        ic_school_sourced_id: icSchoolSourcedId,
        ic_school_name: icSchoolName,
        mapped_by: user.id,
        mapped_at: new Date().toISOString(),
        status: 'active',
      }, { onConflict: 'school_id' })
      .select()
      .single();

    if (mappingError) {
      console.error('Mapping error:', mappingError);
      return new Response(JSON.stringify({ error: mappingError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Also create/update the legacy infinite_campus_connections record for backward compatibility
    const encryptedClientIdLegacy = await encrypt(clientId);
    const encryptedSecretLegacy = await encrypt(clientSecret);

    await supabaseAdmin
      .from('infinite_campus_connections')
      .upsert({
        school_id: schoolId,
        host_url: baseUrl,
        client_key: encryptedClientIdLegacy,
        client_secret: encryptedSecretLegacy,
        token_url: tokenUrl,
        oneroster_version: version,
        status: 'active',
        created_by: user.id,
        configured_by_role: isSystemAdmin ? 'system_admin' : isDistrictAdmin ? 'district_admin' : 'school_admin',
      }, { onConflict: 'school_id' });

    // Create sync configuration if provided
    if (syncConfig) {
      console.log('Creating sync configuration...');
      await supabaseAdmin
        .from('ic_sync_configuration')
        .upsert({
          school_id: schoolId,
          enabled: syncConfig.enabled,
          interval_type: syncConfig.interval_type,
          interval_value: syncConfig.interval_value,
          sync_window_start: syncConfig.sync_window_start,
          sync_window_end: syncConfig.sync_window_end,
          timezone: syncConfig.timezone,
          sync_students: syncConfig.sync_students,
          sync_teachers: syncConfig.sync_teachers,
          sync_classes: syncConfig.sync_classes,
          sync_enrollments: syncConfig.sync_enrollments,
          skip_weekends: syncConfig.skip_weekends,
        }, { onConflict: 'school_id' });
    }

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      action: 'ic_district_connection_created',
      table_name: 'ic_district_connections',
      record_id: connectionId,
      details: {
        district_id: districtId,
        school_id: schoolId,
        ic_school_name: icSchoolName,
        app_name: appName,
        existing_connection: !!existingConnection,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      connectionId,
      mappingId: mapping.id,
      isExistingConnection: !!existingConnection,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Connect IC district error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

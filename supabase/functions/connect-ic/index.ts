import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { encrypt } from '../_shared/encryption.ts';

interface SyncConfig {
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
}

interface ConnectRequest {
  hostUrl: string;
  clientKey: string;
  clientSecret: string;
  tokenUrl: string;
  version: '1.1' | '1.2';
  schoolId: number;
  syncConfig?: SyncConfig;
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

    // Parse request
    const body: ConnectRequest = await req.json();
    const { hostUrl, clientKey, clientSecret, tokenUrl, version, schoolId, syncConfig } = body;

    // Verify permissions
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

    // Encrypt credentials
    console.log('Encrypting credentials...');
    const encryptedKey = await encrypt(clientKey);
    const encryptedSecret = await encrypt(clientSecret);

    // Store connection
    const { data: connection, error: insertError } = await supabaseAdmin
      .from('infinite_campus_connections')
      .insert({
        school_id: schoolId,
        host_url: hostUrl,
        client_key: encryptedKey,
        client_secret: encryptedSecret,
        token_url: tokenUrl,
        oneroster_version: version,
        status: 'active',
        created_by: user.id,
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

    // Create sync configuration if provided
    if (syncConfig) {
      console.log('Creating sync configuration...');
      
      const { data: syncConfigRecord, error: syncConfigError } = await supabaseAdmin
        .from('ic_sync_configuration')
        .insert({
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
        })
        .select()
        .single();

      if (syncConfigError) {
        console.error('Sync config error:', syncConfigError);
        // Don't fail the whole operation if sync config fails
        // The user can configure it later
      } else {
        // Calculate and set next sync time
        const { error: calcError } = await supabaseAdmin.rpc('calculate_next_sync_time', {
          p_school_id: schoolId,
        });

        if (calcError) {
          console.error('Calculate next sync error:', calcError);
        } else {
          console.log('Next sync time calculated successfully');
        }
      }
    }

    // Log audit event
    await supabaseAdmin.from('audit_logs').insert({
      school_id: schoolId,
      user_id: user.id,
      action: 'ic_connection_created',
      entity_type: 'infinite_campus_connection',
      entity_id: connection.id,
      details: {
        host_url: hostUrl,
        version: version,
        sync_config_provided: !!syncConfig,
      },
    });

    return new Response(JSON.stringify({ 
      success: true,
      connectionId: connection.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Connect IC error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

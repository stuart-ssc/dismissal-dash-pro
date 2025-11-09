import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { encrypt } from '../_shared/encryption.ts';

interface ConnectRequest {
  hostUrl: string;
  clientKey: string;
  clientSecret: string;
  tokenUrl: string;
  version: '1.1' | '1.2';
  schoolId: number;
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
    const { hostUrl, clientKey, clientSecret, tokenUrl, version, schoolId } = body;

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

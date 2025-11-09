import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface DisconnectRequest {
  schoolId: number;
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

    const body: DisconnectRequest = await req.json();
    const { schoolId } = body;

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

    // Remove ic_external_id from all students, teachers, and classes
    console.log('Removing IC external IDs...');
    
    await Promise.all([
      supabaseAdmin
        .from('students')
        .update({ ic_external_id: null })
        .eq('school_id', schoolId)
        .not('ic_external_id', 'is', null),
      
      supabaseAdmin
        .from('teachers')
        .update({ ic_external_id: null })
        .eq('school_id', schoolId)
        .not('ic_external_id', 'is', null),
      
      supabaseAdmin
        .from('classes')
        .update({ ic_external_id: null })
        .eq('school_id', schoolId)
        .not('ic_external_id', 'is', null),
    ]);

    // Delete connection record
    const { error: deleteError } = await supabaseAdmin
      .from('infinite_campus_connections')
      .delete()
      .eq('school_id', schoolId);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log audit event
    await supabaseAdmin.from('audit_logs').insert({
      school_id: schoolId,
      user_id: user.id,
      action: 'ic_connection_deleted',
      entity_type: 'infinite_campus_connection',
      details: {
        note: 'IC external IDs removed from all records',
      },
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: 'IC integration disconnected successfully',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Disconnect IC error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

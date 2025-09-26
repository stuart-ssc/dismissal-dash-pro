import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: 'teacher' | 'school_admin' | 'system_admin';
  schoolId?: number | null;
  sendInvite?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: getUserError } = await supabase.auth.getUser(token);
    if (getUserError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get user's roles and profile
    const { data: userRoles, error: userRoleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (userRoleError) {
      return new Response(JSON.stringify({ error: 'Failed to verify user roles' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const isSystemAdmin = userRoles?.some(r => r.role === 'system_admin');

    const { email, firstName, lastName, role, schoolId, sendInvite = true } = await req.json() as CreateUserRequest;

    if (!email || !firstName || !lastName || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if ((role === 'teacher' || role === "school_admin") && !schoolId) {
      return new Response(JSON.stringify({ error: 'schoolId is required for teacher and school_admin roles' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // For school_admin role creation, allow teachers to invite if no admin exists
    if (role === 'school_admin' && !isSystemAdmin) {
      // Get caller's profile to verify school
      const { data: callerProfile, error: callerProfileError } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .single();

      if (callerProfileError || !callerProfile?.school_id) {
        return new Response(JSON.stringify({ error: 'Caller must belong to a school' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Verify school_id matches
      if (callerProfile.school_id !== schoolId) {
        return new Response(JSON.stringify({ error: 'Can only invite admins for your own school' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check if school already has an admin
      const { data: adminUsers, error: adminCheckError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'school_admin');

      if (adminCheckError) {
        return new Response(JSON.stringify({ error: 'Failed to check existing admins' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const adminUserIds = adminUsers?.map(r => r.user_id) || [];
      
      if (adminUserIds.length > 0) {
        const { data: existingAdmins, error: existingAdminsError } = await supabase
          .from('profiles')
          .select('id')
          .eq('school_id', schoolId)
          .in('id', adminUserIds);

        if (existingAdminsError) {
          return new Response(JSON.stringify({ error: 'Failed to check existing school admins' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (existingAdmins && existingAdmins.length > 0) {
          return new Response(JSON.stringify({ error: 'School already has an administrator' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
    } else if (!isSystemAdmin) {
      // For all other roles or non-school-admin creation, require system admin
      return new Response(JSON.stringify({ error: 'Forbidden: system_admin required' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Send invite (recommended) so user sets their password securely
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { first_name: firstName, last_name: lastName, school_id: schoolId ?? null },
    });

    if (inviteError) {
      return new Response(JSON.stringify({ error: inviteError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const newUserId = inviteData.user?.id;
    if (!newUserId) {
      return new Response(JSON.stringify({ error: 'Failed to retrieve created user id' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Upsert profile
    const { error: upsertProfileError } = await supabase.from('profiles').upsert({
      id: newUserId,
      first_name: firstName,
      last_name: lastName,
      email,
      school_id: schoolId ?? null,
    });
    if (upsertProfileError) {
      return new Response(JSON.stringify({ error: upsertProfileError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Set role
    const { error: insertRoleError } = await supabase.from('user_roles').insert({ user_id: newUserId, role });
    if (insertRoleError) {
      return new Response(JSON.stringify({ error: insertRoleError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true, userId: newUserId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('admin-create-user error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

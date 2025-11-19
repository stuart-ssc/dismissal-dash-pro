import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ImpersonateRequest {
  schoolId: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Verify authentication
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Authentication error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is district admin
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "district_admin")
      .single();

    if (rolesError || !roles) {
      console.error("Permission denied: not a district admin");
      return new Response(
        JSON.stringify({ error: "Permission denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { schoolId }: ImpersonateRequest = await req.json();

    if (!schoolId) {
      return new Response(
        JSON.stringify({ error: "Missing schoolId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify school exists and is in district admin's district
    const { data: school, error: schoolError } = await supabase
      .from("schools")
      .select("id, school_name, district_id")
      .eq("id", schoolId)
      .single();

    if (schoolError || !school) {
      console.error("School not found:", schoolError);
      return new Response(
        JSON.stringify({ error: "School not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify school is in admin's district
    const { data: userDistricts, error: userDistrictsError } = await supabase
      .from("user_districts")
      .select("district_id")
      .eq("user_id", user.id);

    if (userDistrictsError || !userDistricts || userDistricts.length === 0) {
      console.error("District admin has no assigned districts");
      return new Response(
        JSON.stringify({ error: "No district assigned" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminDistrictIds = userDistricts.map(d => d.district_id);
    if (!adminDistrictIds.includes(school.district_id)) {
      console.error("School not in admin's district");
      return new Response(
        JSON.stringify({ error: "Cannot impersonate schools outside your district" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete any existing impersonation sessions for this admin
    await supabase
      .from("district_impersonation_sessions")
      .delete()
      .eq("district_admin_user_id", user.id);

    // Create new impersonation session
    const { data: session, error: sessionError } = await supabase
      .from("district_impersonation_sessions")
      .insert({
        district_admin_user_id: user.id,
        impersonated_school_id: schoolId,
        expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour
        ip_address: req.headers.get("x-forwarded-for") || "unknown",
        user_agent: req.headers.get("user-agent") || "unknown",
      })
      .select()
      .single();

    if (sessionError) {
      console.error("Error creating impersonation session:", sessionError);
      return new Response(
        JSON.stringify({ error: "Failed to create impersonation session" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the impersonation start
    await supabase.from("audit_logs").insert({
      table_name: "district_impersonation_sessions",
      record_id: session.id,
      action: "DISTRICT_IMPERSONATION_STARTED",
      user_id: user.id,
      details: {
        impersonated_school_id: schoolId,
        school_name: school.school_name,
      },
    });

    console.log(`District admin ${user.id} started impersonating school ${schoolId}`);

    return new Response(
      JSON.stringify({ success: true, session }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in start-district-impersonation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

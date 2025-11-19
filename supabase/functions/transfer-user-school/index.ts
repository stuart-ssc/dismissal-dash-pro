import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface TransferRequest {
  userId: string;
  targetSchoolId: number;
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
    const { userId, targetSchoolId }: TransferRequest = await req.json();

    if (!userId || !targetSchoolId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's current profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*, schools!inner(district_id)")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("User not found:", profileError);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get target school
    const { data: targetSchool, error: targetSchoolError } = await supabase
      .from("schools")
      .select("id, district_id, school_name")
      .eq("id", targetSchoolId)
      .single();

    if (targetSchoolError || !targetSchool) {
      console.error("Target school not found:", targetSchoolError);
      return new Response(
        JSON.stringify({ error: "Target school not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify both schools are in district admin's district
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
    
    // @ts-ignore - TypeScript doesn't know about the joined schools data
    const currentDistrictId = profile.schools?.district_id;
    const targetDistrictId = targetSchool.district_id;

    if (!adminDistrictIds.includes(currentDistrictId) || !adminDistrictIds.includes(targetDistrictId)) {
      console.error("Schools not in admin's district");
      return new Response(
        JSON.stringify({ error: "Cannot transfer users outside your district" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Transfer user
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ school_id: targetSchoolId })
      .eq("id", userId);

    if (updateError) {
      console.error("Error transferring user:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to transfer user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the transfer in audit logs
    await supabase.from("audit_logs").insert({
      table_name: "profiles",
      record_id: userId,
      action: "USER_TRANSFERRED",
      user_id: user.id,
      details: {
        from_school_id: profile.school_id,
        to_school_id: targetSchoolId,
        to_school_name: targetSchool.school_name,
        transferred_by: user.id,
      },
    });

    console.log(`User ${userId} transferred to school ${targetSchoolId}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in transfer-user-school:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

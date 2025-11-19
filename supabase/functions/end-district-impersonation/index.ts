import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    // Get active impersonation session
    const { data: session, error: sessionError } = await supabase
      .from("district_impersonation_sessions")
      .select("*")
      .eq("district_admin_user_id", user.id)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (sessionError && sessionError.code !== "PGRST116") {
      console.error("Error fetching session:", sessionError);
    }

    // Delete all sessions for this admin
    const { error: deleteError } = await supabase
      .from("district_impersonation_sessions")
      .delete()
      .eq("district_admin_user_id", user.id);

    if (deleteError) {
      console.error("Error deleting sessions:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to end impersonation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the impersonation end if there was an active session
    if (session) {
      await supabase.from("audit_logs").insert({
        table_name: "district_impersonation_sessions",
        record_id: session.id,
        action: "DISTRICT_IMPERSONATION_ENDED",
        user_id: user.id,
        details: {
          impersonated_school_id: session.impersonated_school_id,
          duration_minutes: Math.floor((new Date().getTime() - new Date(session.created_at).getTime()) / 60000),
        },
      });

      console.log(`District admin ${user.id} ended impersonation of school ${session.impersonated_school_id}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in end-district-impersonation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

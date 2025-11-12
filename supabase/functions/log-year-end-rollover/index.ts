import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";

interface RolloverLogData {
  school_id: number;
  performed_by: string;
  archived_session_id: string;
  archived_session_name: string;
  new_session_id: string;
  new_session_name: string;
  groups_migrated: number;
  groups_selected: number;
  groups_available: number;
  validation_passed: boolean;
  validation_warnings: any[];
  validation_errors: any[];
  metadata?: any;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Verify the user's JWT
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Invalid authorization token");
    }

    const logData: RolloverLogData = await req.json();

    // Validate required fields
    if (!logData.school_id || !logData.archived_session_name || !logData.new_session_name) {
      throw new Error("Missing required fields");
    }

    // Insert the rollover log
    const { data, error } = await supabaseClient
      .from("year_end_rollover_logs")
      .insert({
        school_id: logData.school_id,
        performed_by: logData.performed_by || user.id,
        archived_session_id: logData.archived_session_id,
        archived_session_name: logData.archived_session_name,
        new_session_id: logData.new_session_id,
        new_session_name: logData.new_session_name,
        groups_migrated: logData.groups_migrated || 0,
        groups_selected: logData.groups_selected || 0,
        groups_available: logData.groups_available || 0,
        validation_passed: logData.validation_passed !== false,
        validation_warnings: logData.validation_warnings || [],
        validation_errors: logData.validation_errors || [],
        metadata: logData.metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error("Error inserting rollover log:", error);
      throw error;
    }

    console.log("Rollover log created:", data.id);

    return new Response(JSON.stringify({ success: true, log_id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in log-year-end-rollover function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

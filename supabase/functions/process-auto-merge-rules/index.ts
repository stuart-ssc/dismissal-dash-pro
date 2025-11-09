import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessAutoMergeRequest {
  schoolId: number;
  syncLogId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { schoolId, syncLogId }: ProcessAutoMergeRequest = await req.json();

    console.log(`Processing auto-merge rules for school ${schoolId}`);

    // Get all enabled rules for the school, ordered by priority
    const { data: rules, error: rulesError } = await supabase
      .from('ic_auto_merge_rules')
      .select('*')
      .eq('school_id', schoolId)
      .eq('enabled', true)
      .order('priority', { ascending: true });

    if (rulesError) {
      throw new Error(`Failed to fetch rules: ${rulesError.message}`);
    }

    if (!rules || rules.length === 0) {
      console.log('No enabled auto-merge rules found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No enabled rules',
          autoApprovedCount: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${rules.length} enabled rule(s)`);

    // Get all pending merges for the school
    const { data: pendingMerges, error: mergesError } = await supabase
      .from('ic_pending_merges')
      .select('*')
      .eq('school_id', schoolId)
      .eq('status', 'pending')
      .is('auto_approved_by_rule_id', null);

    if (mergesError) {
      throw new Error(`Failed to fetch pending merges: ${mergesError.message}`);
    }

    if (!pendingMerges || pendingMerges.length === 0) {
      console.log('No pending merges to process');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No pending merges',
          autoApprovedCount: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${pendingMerges.length} pending merge(s)`);

    let autoApprovedCount = 0;
    const autoApprovals: any[] = [];

    // Process each pending merge
    for (const merge of pendingMerges) {
      // Find the first matching rule
      let matchingRule = null;
      
      for (const rule of rules) {
        // Check if confidence meets threshold
        if (merge.confidence_score < rule.min_confidence_score) {
          continue;
        }

        // Check if match type is allowed
        if (!rule.allowed_match_types.includes(merge.match_type)) {
          continue;
        }

        // Check if record type is allowed
        if (!rule.record_types.includes(merge.record_type)) {
          continue;
        }

        // This rule matches!
        matchingRule = rule;
        break;
      }

      if (matchingRule) {
        console.log(`Auto-approving merge ${merge.id} with rule ${matchingRule.rule_name}`);
        
        // Call the approve-ic-merge function
        const { error: approveError } = await supabase.functions.invoke('approve-ic-merge', {
          body: {
            mergeId: merge.id,
            decision: 'approve',
            autoApprovedByRuleId: matchingRule.id,
          },
        });

        if (approveError) {
          console.error(`Failed to auto-approve merge ${merge.id}:`, approveError);
          continue;
        }

        autoApprovedCount++;
        autoApprovals.push({
          mergeId: merge.id,
          ruleName: matchingRule.rule_name,
          ruleId: matchingRule.id,
        });
      }
    }

    console.log(`Auto-approved ${autoApprovedCount} merge(s)`);

    // Update sync log if provided
    if (syncLogId && autoApprovedCount > 0) {
      await supabase
        .from('ic_sync_logs')
        .update({ 
          notes: `Auto-approved ${autoApprovedCount} merge(s) using auto-merge rules` 
        })
        .eq('id', syncLogId);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        autoApprovedCount,
        autoApprovals,
        message: `Successfully auto-approved ${autoApprovedCount} merge(s)`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing auto-merge rules:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

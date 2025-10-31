import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface CreateSchoolRequest {
  schoolName: string;
  streetAddress?: string;
  city: string;
  state: string;
  zipcode?: string;
  county?: string;
  schoolDistrict?: string;
  phoneNumber?: string;
  creatorEmail: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get IP address and user agent
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const body: CreateSchoolRequest = await req.json();
    
    // Validate required fields
    if (!body.schoolName || body.schoolName.length < 3 || body.schoolName.length > 100) {
      return new Response(
        JSON.stringify({ error: 'School name must be between 3 and 100 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.city || body.city.length < 2) {
      return new Response(
        JSON.stringify({ error: 'City is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.state || body.state.length !== 2) {
      return new Response(
        JSON.stringify({ error: 'Valid 2-letter state code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.creatorEmail || !body.creatorEmail.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'Valid email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting: Check IP
    const { count: ipCount } = await supabaseAdmin
      .from('school_creation_logs')
      .select('*', { count: 'exact', head: true })
      .eq('created_by_ip', ipAddress)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (ipCount && ipCount >= 3) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Too many school creations from this IP address today.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting: Check email
    const { count: emailCount } = await supabaseAdmin
      .from('school_creation_logs')
      .select('*', { count: 'exact', head: true })
      .eq('created_by_email', body.creatorEmail)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    if (emailCount && emailCount >= 1) {
      return new Response(
        JSON.stringify({ error: 'Please wait before creating another school.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for duplicates
    const { data: existingSchools } = await supabaseAdmin
      .from('schools')
      .select('id, school_name')
      .ilike('school_name', body.schoolName)
      .eq('city', body.city)
      .eq('state', body.state)
      .limit(1);

    if (existingSchools && existingSchools.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: 'A school with this name already exists in this location.',
          existingSchoolId: existingSchools[0].id 
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Run auto-flagging checks
    const { data: flagsData } = await supabaseAdmin.rpc('check_suspicious_school', {
      school_name: body.schoolName,
      email: body.creatorEmail,
      ip_address: ipAddress
    });

    const flags = (flagsData || []) as string[];
    const isFlagged = flags.length > 0;

    // Create the school
    const { data: newSchool, error: insertError } = await supabaseAdmin
      .from('schools')
      .insert({
        school_name: body.schoolName,
        street_address: body.streetAddress || null,
        city: body.city,
        state: body.state,
        zipcode: body.zipcode || null,
        county: body.county || null,
        school_district: body.schoolDistrict || null,
        phone_number: body.phoneNumber || null,
        verification_status: isFlagged ? 'flagged' : 'unverified',
        created_at_ip: ipAddress,
        flagged_reason: isFlagged ? flags.join(', ') : null,
      })
      .select('id, school_name')
      .single();

    if (insertError) throw insertError;

    // Log the creation
    const { error: logError } = await supabaseAdmin
      .from('school_creation_logs')
      .insert({
        school_id: newSchool.id,
        created_by_email: body.creatorEmail,
        created_by_ip: ipAddress,
        user_agent: userAgent,
        school_data: body,
        flagged: isFlagged,
        flag_reasons: flags,
      });

    if (logError) {
      console.error('Failed to log school creation:', logError);
    }

    // Send admin notification email (async, don't block response)
    supabaseAdmin.functions.invoke('send-school-creation-notification', {
      body: {
        schoolId: newSchool.id,
        schoolName: newSchool.school_name,
        schoolData: body,
        creatorEmail: body.creatorEmail,
        creatorIp: ipAddress,
        userAgent: userAgent,
        flagged: isFlagged,
        flagReasons: flags,
      }
    }).catch(err => {
      console.error('Failed to send admin notification:', err);
    });

    return new Response(
      JSON.stringify({
        success: true,
        schoolId: newSchool.id,
        schoolName: newSchool.school_name,
        verificationStatus: isFlagged ? 'flagged' : 'unverified',
        flagged: isFlagged,
        flagReasons: flags,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating school:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create school' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ValidationRequest {
  token: string;
}

interface ValidationResponse {
  valid: boolean;
  firstName?: string;
  schoolName?: string;
  error?: string;
}

// Rate limiting: Track attempts by IP address
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_ATTEMPTS = 10;
const RATE_LIMIT_WINDOW_MS = 3600000; // 1 hour

function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
         req.headers.get('x-real-ip') ||
         'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  
  if (record.count >= MAX_ATTEMPTS) {
    console.warn(`Rate limit exceeded for IP: ${ip}`);
    return true;
  }
  
  record.count++;
  return false;
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 300000); // Clean up every 5 minutes

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting check
    const clientIp = getClientIp(req);
    if (isRateLimited(clientIp)) {
      console.warn(`Rate limited validation attempt from ${clientIp}`);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Too many attempts. Please try again later.' 
        } as ValidationResponse),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { token } = await req.json() as ValidationRequest;

    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      console.warn(`Invalid token format from ${clientIp}`);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Invalid request' 
        } as ValidationResponse),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Use secure RPC function instead of direct table access
    // This prevents PII exposure via RLS bypass
    const { data, error } = await supabase
      .rpc('validate_teacher_invitation_token', { token_input: token })
      .single();

    if (error || !data || !data.valid) {
      console.info(`Invalid or expired invitation token attempted from ${clientIp}`);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Invalid or expired invitation' 
        } as ValidationResponse),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Log successful validation (but don't expose sensitive details)
    console.info(`Valid invitation token validated from ${clientIp}`);

    // Return only minimal data - first name and school name
    return new Response(
      JSON.stringify({ 
        valid: true,
        firstName: data.first_name,
        schoolName: data.school_name
      } as ValidationResponse),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    // Log error server-side but return generic message
    console.error("Error validating invitation:", error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: 'Validation failed' 
      } as ValidationResponse),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

serve(handler);

// Note: This function now uses the secure validate_teacher_invitation_token() 
// database function which prevents direct table access and PII exposure

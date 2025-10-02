import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function VerifyEmailChange() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your email change...');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
      return;
    }

    verifyEmailChange(token);
  }, [searchParams]);

  const verifyEmailChange = async (token: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('secure-email-change', {
        body: {
          action: 'verify',
          token,
        },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setStatus('success');
      setMessage('Your email has been successfully changed! You can now sign in with your new email address.');
    } catch (error: any) {
      console.error('Email verification error:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to verify email change. The link may have expired or is invalid.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === 'verifying' && (
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            )}
            {status === 'error' && (
              <XCircle className="h-16 w-16 text-destructive" />
            )}
          </div>
          <CardTitle>
            {status === 'verifying' && 'Verifying Email Change'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
          <CardDescription className="mt-2">
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {status === 'success' && (
            <Button onClick={() => navigate('/auth')} className="w-full">
              Go to Sign In
            </Button>
          )}
          {status === 'error' && (
            <Button onClick={() => navigate('/dashboard')} variant="outline" className="w-full">
              Back to Dashboard
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

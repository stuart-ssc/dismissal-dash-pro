import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

type ModeType = 'classroom' | 'bus' | 'car_line' | 'walker';

interface UseModeLoggerOptions {
  mode: ModeType;
  schoolId: number | null;
  dismissalRunId?: string | null;
  locationId?: string | null;
  locationName?: string | null;
}

export function useModeLogger({
  mode,
  schoolId,
  dismissalRunId,
  locationId,
  locationName,
}: UseModeLoggerOptions) {
  const { user } = useAuth();
  const sessionIdRef = useRef<string | null>(null);
  const isSessionActiveRef = useRef(false);

  // Function to end the current session
  const endSession = async () => {
    if (!sessionIdRef.current || !isSessionActiveRef.current) return;

    try {
      await supabase
        .from('mode_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', sessionIdRef.current);
      
      isSessionActiveRef.current = false;
    } catch (error) {
      console.error('Error ending mode session:', error);
    }
  };

  // Function to start a new session
  const startSession = async () => {
    if (!user || !schoolId || isSessionActiveRef.current) return;

    try {
      const { data, error } = await supabase
        .from('mode_sessions')
        .insert({
          user_id: user.id,
          school_id: schoolId,
          dismissal_run_id: dismissalRunId,
          mode_type: mode,
          location_id: locationId,
          location_name: locationName,
        })
        .select()
        .single();

      if (error) throw error;

      sessionIdRef.current = data.id;
      isSessionActiveRef.current = true;
    } catch (error) {
      console.error('Error starting mode session:', error);
    }
  };

  // Start session when component mounts or dependencies change
  useEffect(() => {
    if (user && schoolId) {
      startSession();
    }

    // Cleanup function to end session
    return () => {
      if (isSessionActiveRef.current) {
        endSession();
      }
    };
  }, [user, schoolId, dismissalRunId, mode, locationId, locationName]);

  // Handle browser close/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isSessionActiveRef.current && sessionIdRef.current) {
        // Use supabase functions invoke
        supabase.functions.invoke('end-mode-session', {
          body: {
            sessionId: sessionIdRef.current,
            endedAt: new Date().toISOString(),
          }
        }).catch(err => {
          console.warn('Failed to end session on unload:', err);
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Update session when location changes for walker/car_line modes
  useEffect(() => {
    if (isSessionActiveRef.current && sessionIdRef.current && (locationId || locationName)) {
      supabase
        .from('mode_sessions')
        .update({
          location_id: locationId,
          location_name: locationName,
        })
        .eq('id', sessionIdRef.current)
        .then(({ error }) => {
          if (error) {
            console.error('Error updating mode session location:', error);
          }
        });
    }
  }, [locationId, locationName]);

  return {
    sessionId: sessionIdRef.current,
    isSessionActive: isSessionActiveRef.current,
    endSession,
    startSession,
  };
}
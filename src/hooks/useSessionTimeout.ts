import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_TIME_MS = 5 * 60 * 1000; // 5 minutes before timeout

export function useSessionTimeout() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = () => {
    lastActivityRef.current = Date.now();
    
    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    if (!user) return;

    // Set warning timer
    warningRef.current = setTimeout(() => {
      toast({
        title: "Session expiring soon",
        description: "Your session will expire in 5 minutes due to inactivity.",
        variant: "destructive",
      });
    }, SESSION_TIMEOUT_MS - WARNING_TIME_MS);

    // Set timeout timer
    timeoutRef.current = setTimeout(async () => {
      toast({
        title: "Session expired",
        description: "You have been signed out due to inactivity.",
        variant: "destructive",
      });
      await signOut();
    }, SESSION_TIMEOUT_MS);
  };

  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      resetTimer();
    };

    // Set up activity listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Initialize timer
    resetTimer();

    return () => {
      // Clean up listeners
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      
      // Clear timers
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [user, signOut, toast]);

  return { resetTimer };
}
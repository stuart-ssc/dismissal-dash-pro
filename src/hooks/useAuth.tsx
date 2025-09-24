import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { isRateLimited, isValidEmail } from '@/lib/security';
import { logger } from '@/lib/logger';
import { handleError } from '@/lib/errorHandler';
import { auditLogger } from '@/lib/auditLogger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  signUp: (email: string, password: string, firstName: string, lastName: string, schoolId: number, role: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAndSetUserRole = async (userId: string) => {
    try {
      const { data: rolesData, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      if (error) throw error;
      const roles = (rolesData ?? []).map((r: any) => r.role as string);
      const effectiveRole =
        roles.includes('system_admin')
          ? 'system_admin'
          : roles.includes('school_admin')
            ? 'school_admin'
            : roles.includes('teacher')
              ? 'teacher'
              : null;
      setUserRole(effectiveRole);
    } catch (err) {
      const secureError = handleError(err, 'user roles fetch');
      logger.error({
        message: 'Failed to fetch user roles',
        error: err instanceof Error ? err : new Error(String(err)),
        userId: user?.id
      });
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setLoading(true);
          // Defer role fetching to avoid deadlocks
          setTimeout(() => {
            fetchAndSetUserRole(session.user!.id);
          }, 0);
        } else {
          setUserRole(null);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setLoading(true);
        fetchAndSetUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, firstName: string, lastName: string, schoolId: number, role: string) => {
    try {
      // Rate limiting check
      const clientId = `${email}-signup`;
      if (isRateLimited(clientId, 3, 300000)) { // 3 attempts per 5 minutes
        const error = { message: 'Too many sign-up attempts. Please try again later.' };
        toast({
          title: "Rate limit exceeded",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      // Input validation
      if (!isValidEmail(email)) {
        const error = { message: 'Please enter a valid email address.' };
        toast({
          title: "Invalid email",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName,
            last_name: lastName,
            school_id: schoolId,
            role: role
          }
        }
      });

      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      // If user is created successfully, create the user role
      if (data.user) {
        // Create user role entry
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: data.user.id,
            role: role as 'school_admin' | 'teacher'
          });

        if (roleError) {
          console.error('Error creating user role:', roleError);
        }

        if (!data.session) {
          toast({
            title: "Check your email",
            description: "Please check your email for a confirmation link.",
          });
        } else {
          toast({
            title: "Account created successfully!",
            description: "Welcome to Dismissal Pro.",
          });
        }
      }

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Rate limiting check
      const clientId = `${email}-signin`;
      if (isRateLimited(clientId, 5, 300000)) { // 5 attempts per 5 minutes
        const error = { message: 'Too many sign-in attempts. Please try again later.' };
        toast({
          title: "Rate limit exceeded",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      // Input validation
      if (!isValidEmail(email)) {
        const error = { message: 'Please enter a valid email address.' };
        toast({
          title: "Invalid email",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Sign in failed",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setUserRole(null);
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        session, 
        userRole, 
        signUp, 
        signIn, 
        signOut, 
        loading 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
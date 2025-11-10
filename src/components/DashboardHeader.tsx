import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { LogOut } from "lucide-react";

export function DashboardHeader() {
  const { user, signOut } = useAuth();
  const [schoolName, setSchoolName] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');

  useEffect(() => {
    const fetchSchoolAndUserData = async () => {
      if (!user) return;
      
      try {
        // Get user's profile to get school_id, first_name, and last_name
        const { data: profile } = await supabase
          .from('profiles')
          .select('school_id, first_name, last_name')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          setFirstName(profile.first_name || '');
          setLastName(profile.last_name || '');

          if (profile.school_id) {
            // Get school name
            const { data: school } = await supabase
              .from('schools')
              .select('school_name')
              .eq('id', profile.school_id)
              .maybeSingle();

            if (school?.school_name) {
              setSchoolName(school.school_name);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching school and user data:', error);
      }
    };

    fetchSchoolAndUserData();
  }, [user]);

  return (
    <header className="min-h-16 flex items-center justify-between px-4 md:px-6 border-b bg-card/50 backdrop-blur-sm">
      <div className="flex items-center gap-2 md:gap-4 flex-wrap min-w-0 flex-1">
        <SidebarTrigger />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg md:text-2xl font-bold truncate max-w-[200px] md:max-w-none">
            {schoolName ? `${schoolName} ` : ''}Dashboard
          </h1>
          <p className="text-sm text-muted-foreground hidden md:block">
            Welcome {firstName} {lastName}
          </p>
        </div>
      </div>
      <Button onClick={signOut} variant="outline" size="sm" className="shrink-0">
        <LogOut className="h-4 w-4 md:hidden" />
        <span className="hidden md:inline">Sign Out</span>
      </Button>
    </header>
  );
}

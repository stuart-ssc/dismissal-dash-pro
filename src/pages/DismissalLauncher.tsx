
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export default function DismissalLauncher() {
  const { signOut, user } = useAuth();

  const [schoolName, setSchoolName] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Launch Dismissal | Dashboard";
  }, []);

  useEffect(() => {
    const fetchSchoolName = async () => {
      if (!user) return;
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('school_id')
          .eq('id', user.id)
          .single();
        if (profile?.school_id) {
          const { data: school } = await supabase
            .from('schools')
            .select('school_name')
            .eq('id', profile.school_id)
            .single();
          if (school?.school_name) setSchoolName(school.school_name);
        }
      } catch (e) {
        console.error('Error fetching school name:', e);
      }
    };
    fetchSchoolName();
  }, [user]);
  return (
    <>
      <header className="h-16 flex items-center justify-between px-6 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-2xl font-bold">{schoolName || '—'}</h1>
        </div>
        <Button onClick={signOut} variant="outline">Sign Out</Button>
      </header>

      <main className="flex-1 p-6">
        <h2 className="text-3xl font-bold mb-6">Launch Dismissal</h2>
        <section aria-labelledby="dismissal-modes" className="max-w-5xl">
          <h2 id="dismissal-modes" className="sr-only">Dismissal Modes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Button
              variant="outline"
              className="h-32 text-lg justify-center"
              onClick={() => navigate("/dashboard/dismissal/classroom")}
            >
              Classroom Mode
            </Button>
            <Button
              variant="outline"
              className="h-32 text-lg justify-center"
              onClick={() => navigate("/dashboard/dismissal/bus")}
            >
              Bus Dismissal Mode
            </Button>
            <Button
              variant="outline"
              className="h-32 text-lg justify-center"
              onClick={() => navigate("/dashboard/dismissal/car-line")}
            >
              Car Line Mode
            </Button>
            <Button
              variant="outline"
              className="h-32 text-lg justify-center"
              onClick={() => navigate("/dashboard/dismissal/walker")}
            >
              Walker Mode
            </Button>
          </div>
        </section>
      </main>
    </>
  );
}

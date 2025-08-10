import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";

export default function DismissalLauncher() {
  const { signOut } = useAuth();

  useEffect(() => {
    document.title = "Launch Dismissal | Dashboard";
  }, []);

  return (
    <>
      <header className="h-16 flex items-center justify-between px-6 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-2xl font-bold">Launch Dismissal</h1>
        </div>
        <Button onClick={signOut} variant="outline">Sign Out</Button>
      </header>

      <main className="flex-1 p-6">
        <section aria-labelledby="dismissal-modes" className="max-w-5xl">
          <h2 id="dismissal-modes" className="sr-only">Dismissal Modes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Button variant="outline" className="h-32 text-lg justify-center">Classroom Mode</Button>
            <Button variant="outline" className="h-32 text-lg justify-center">Bus Dismissal Mode</Button>
            <Button variant="outline" className="h-32 text-lg justify-center">Car Line Mode</Button>
            <Button variant="outline" className="h-32 text-lg justify-center">Walker Mode</Button>
          </div>
        </section>
      </main>
    </>
  );
}

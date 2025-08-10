
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ExitModeButton from "@/components/ExitModeButton";
import { useTodayDismissalRun } from "@/hooks/useTodayDismissalRun";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

type WalkerLocation = { id: string; location_name: string };
type Student = { id: string; first_name: string; last_name: string; grade_level: string };
type ClassItem = { id: string; class_name: string };
type Session = { id: string; finished_at: string | null };

export default function WalkerMode() {
  const { run, schoolId, isLoading } = useTodayDismissalRun();
  const [locations, setLocations] = useState<WalkerLocation[]>([]);
  const [selectedLoc, setSelectedLoc] = useState<string>("");
  const [session, setSession] = useState<Session | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(false);

  const runId = run?.id;

  useEffect(() => {
    const loadLocations = async () => {
      if (!schoolId) return;
      const { data } = await supabase
        .from("walker_locations")
        .select("id,location_name")
        .eq("school_id", schoolId)
        .order("location_name", { ascending: true });
      setLocations((data || []) as any);
    };
    loadLocations();
  }, [schoolId]);

  // Start or reuse session when a location is selected
  const startSession = async (locId: string) => {
    if (!runId || !schoolId) return;

    const { data: existing } = await supabase
      .from("walker_sessions")
      .select("id,finished_at")
      .eq("dismissal_run_id", runId)
      .eq("walker_location_id", locId)
      .is("finished_at", null)
      .limit(1);

    if (existing && existing.length > 0) {
      setSession(existing[0] as any);
      return;
    }

    const { data: inserted, error } = await supabase
      .from("walker_sessions")
      .insert({
        school_id: schoolId,
        dismissal_run_id: runId,
        walker_location_id: locId,
        managed_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select("id,finished_at")
      .single();

    if (!error) setSession(inserted as any);
  };

  // Load students assigned as walkers (optionally by selected location)
  const loadStudents = useMemo(
    () => async () => {
      if (!schoolId) return;
      setLoading(true);

      let query = supabase.from("student_walker_assignments").select("student_id,walker_location_id");
      if (selectedLoc) query = query.eq("walker_location_id", selectedLoc);
      const { data: assigns } = await query;

      const studentIds = (assigns || []).map((a) => a.student_id);
      if (studentIds.length === 0) {
        setStudents([]);
        setClasses([]);
        setLoading(false);
        return;
      }

      const { data: studs } = await supabase
        .from("students")
        .select("id,first_name,last_name,grade_level")
        .in("id", studentIds);

      // map to classes via class_rosters
      const { data: rosters } = await supabase
        .from("class_rosters")
        .select("student_id,class_id")
        .in("student_id", studentIds);

      const classIds = Array.from(new Set((rosters || []).map((r) => r.class_id)));
      let classMap: Record<string, string> = {};
      if (classIds.length) {
        const { data: cls } = await supabase.from("classes").select("id,class_name").in("id", classIds);
        const list = (cls || []) as any as ClassItem[];
        setClasses(list);
        list.forEach((c) => (classMap[c.id] = c.class_name));
      } else {
        setClasses([]);
      }

      const list = (studs || []).map((s: any) => ({
        ...s,
        class_name: (rosters || []).find((r) => r.student_id === s.id)?.class_id
          ? classMap[(rosters || []).find((r) => r.student_id === s.id)!.class_id]
          : undefined,
      }));

      setStudents(list as any);
      setLoading(false);
    },
    [schoolId, selectedLoc]
  );

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const filtered = useMemo(() => {
    let out = [...students];
    if (search) {
      const q = search.toLowerCase();
      out = out.filter(
        (s: any) =>
          s.first_name.toLowerCase().includes(q) ||
          s.last_name.toLowerCase().includes(q) ||
          `${s.last_name}, ${s.first_name}`.toLowerCase().includes(q)
      );
    }
    if (gradeFilter !== "all") {
      out = out.filter((s) => s.grade_level === gradeFilter);
    }
    if (classFilter !== "all") {
      out = out.filter((s: any) => s.class_name === classFilter);
    }
    out.sort((a: any, b: any) => {
      const aName = `${a.last_name} ${a.first_name}`;
      const bName = `${b.last_name} ${b.first_name}`;
      return aName.localeCompare(bName);
    });
    return out;
  }, [students, search, gradeFilter, classFilter]);

  const finishSession = async () => {
    if (!session?.id) return;
    await supabase.from("walker_sessions").update({ finished_at: new Date().toISOString() }).eq("id", session.id);
    setSession((s) => (s ? { ...s, finished_at: new Date().toISOString() } : s));
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Walker</h1>
          <p className="text-muted-foreground mt-2">Manage walkers for today&apos;s dismissal.</p>
        </header>

        <Card>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="w-full sm:w-80">
              <label className="text-sm text-muted-foreground">Walker location</label>
              <Select
                value={selectedLoc}
                onValueChange={(v) => {
                  setSelectedLoc(v);
                  startSession(v);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select walker location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.location_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {session && (
              <div className="text-sm text-muted-foreground">
                Session started • {session.finished_at ? "Finished" : "Active"}
              </div>
            )}
            {session && !session.finished_at && (
              <Button variant="secondary" onClick={finishSession}>
                Mark Dismissal As Finished
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 mb-4">
              <Input
                placeholder="Search students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-80"
              />
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All grades</SelectItem>
                  <SelectItem value="PK">PK</SelectItem>
                  <SelectItem value="K">K</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="6">6</SelectItem>
                  <SelectItem value="7">7</SelectItem>
                  <SelectItem value="8">8</SelectItem>
                </SelectContent>
              </Select>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue placeholder="Filter by class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All classes</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.class_name}>
                      {c.class_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLoading || loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="animate-spin" /> Loading...
              </div>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map((s: any) => (
                  <li key={s.id} className="p-3 rounded-md border bg-card">
                    <div className="font-semibold">
                      {s.last_name}, {s.first_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Grade {s.grade_level}
                      {s.class_name ? ` • ${s.class_name}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <ExitModeButton label="Exit Walker Mode" />
    </div>
  );
}


import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTodayDismissalRun } from "@/hooks/useTodayDismissalRun";
import ExitModeButton from "@/components/ExitModeButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

type CarLine = { id: string; line_name: string };
type Student = { id: string; first_name: string; last_name: string; grade_level: string };
type ClassItem = { id: string; class_name: string };
type Session = { id: string; finished_at: string | null };

export default function CarLineMode() {
  const { run, schoolId, isLoading } = useTodayDismissalRun();
  const [carLines, setCarLines] = useState<CarLine[]>([]);
  const [selectedLine, setSelectedLine] = useState<string>("");
  const [session, setSession] = useState<Session | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(false);

  const runId = run?.id;

  useEffect(() => {
    const loadLines = async () => {
      if (!schoolId) return;
      const { data } = await supabase
        .from("car_lines")
        .select("id,line_name")
        .eq("school_id", schoolId)
        .order("line_name", { ascending: true });
      const lines = (data || []) as any;
      setCarLines(lines);
      
      // Auto-select if there's only one car line and none is selected yet
      if (lines.length === 1 && !selectedLine) {
        setSelectedLine(lines[0].id);
        startSession(lines[0].id);
      }
    };
    loadLines();
  }, [schoolId]);

  // Start or reuse session when a line is selected
  const startSession = async (lineId: string) => {
    if (!runId || !schoolId) return;

    // see if an active session exists for this user/line/run
    const { data: existing } = await supabase
      .from("car_line_sessions")
      .select("id,finished_at")
      .eq("dismissal_run_id", runId)
      .eq("car_line_id", lineId)
      .is("finished_at", null)
      .limit(1);

    if (existing && existing.length > 0) {
      setSession(existing[0] as any);
      return;
    }

    const { data: inserted, error } = await supabase
      .from("car_line_sessions")
      .insert({
        school_id: schoolId,
        dismissal_run_id: runId,
        car_line_id: lineId,
        managed_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select("id,finished_at")
      .single();

    if (!error) setSession(inserted as any);
  };

  // Load students assigned to car lines (optionally filter by selected line)
  const loadStudents = useMemo(
    () => async () => {
      if (!schoolId) return;
      setLoading(true);

      // Get assignments (optionally by selected line)
      let query = supabase.from("student_car_assignments").select("student_id,car_line_id");
      if (selectedLine) query = query.eq("car_line_id", selectedLine);
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

      // map students to class via class_rosters
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
        list.forEach((c) => {
          classMap[c.id] = c.class_name;
        });
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
    [schoolId, selectedLine]
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
    // sort alpha by last, first
    out.sort((a: any, b: any) => {
      const aName = `${a.last_name} ${a.first_name}`;
      const bName = `${b.last_name} ${b.first_name}`;
      return aName.localeCompare(bName);
    });
    return out;
  }, [students, search, gradeFilter, classFilter]);

  const finishSession = async () => {
    if (!session?.id) return;
    await supabase.from("car_line_sessions").update({ finished_at: new Date().toISOString() }).eq("id", session.id);
    // refresh to show finished state
    setSession((s) => (s ? { ...s, finished_at: new Date().toISOString() } : s));
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Car Line</h1>
            <p className="text-muted-foreground mt-2">Manage car riders for today&apos;s dismissal.</p>
          </div>
          <ExitModeButton label="Exit Car Line Mode" />
        </header>

        <Card>
          <CardContent>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="w-full sm:w-80">
                  <label className="text-sm text-muted-foreground">Car line location</label>
                  <Select
                    value={selectedLine}
                    onValueChange={(v) => {
                      setSelectedLine(v);
                      startSession(v);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select car line" />
                    </SelectTrigger>
                    <SelectContent>
                      {carLines.map((cl) => (
                        <SelectItem key={cl.id} value={cl.id}>
                          {cl.line_name}
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
              </div>
              {session && !session.finished_at && (
                <Button variant="secondary" onClick={finishSession}>
                  Mark Dismissal As Finished
                </Button>
              )}
            </div>
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
    </div>
  );
}

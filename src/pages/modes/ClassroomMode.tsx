
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useTodayDismissalRun } from "@/hooks/useTodayDismissalRun";
import ExitModeButton from "@/components/ExitModeButton";
import { Loader2 } from "lucide-react";

type ActiveGroup = {
  id: string;
  dismissal_group_id: string;
  name: string;
  group_type: string | null;
  activated_at: string;
  buses: { id: string; bus_number: string }[];
};

export default function ClassroomMode() {
  const { run, schoolId, isLoading } = useTodayDismissalRun();
  const [groups, setGroups] = useState<ActiveGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  const runId = run?.id;

  const fetchActiveGroups = useMemo(
    () => async () => {
      if (!runId) return;
      setLoadingGroups(true);

      // 1) Get active run groups
      const { data: drg, error: drgErr } = await supabase
        .from("dismissal_run_groups")
        .select("id,dismissal_group_id,activated_at")
        .eq("dismissal_run_id", runId)
        .is("deactivated_at", null)
        .order("activated_at", { ascending: true });

      if (drgErr) {
        console.error(drgErr);
        setLoadingGroups(false);
        return;
      }

      // 2) Fetch groups info
      const groupIds = (drg || []).map((g) => g.dismissal_group_id);
      const groupsInfo = await Promise.all(
        groupIds.map(async (gid) => {
          const { data, error } = await supabase
            .from("dismissal_groups")
            .select("id,name,group_type")
            .eq("id", gid)
            .single();
          if (error) {
            console.error(error);
            return null;
          }
          return data;
        })
      );

      // 3) For bus groups, fetch buses
      const result: ActiveGroup[] = [];
      for (const rg of drg || []) {
        const info = groupsInfo.find((g) => g?.id === rg.dismissal_group_id);
        const groupType = info?.group_type ?? null;

        let buses: { id: string; bus_number: string }[] = [];
        if (groupType && groupType.toLowerCase().includes("bus")) {
          const { data: gb } = await supabase
            .from("dismissal_group_buses")
            .select("bus_id")
            .eq("dismissal_group_id", rg.dismissal_group_id);

          const busIds = (gb || []).map((x) => x.bus_id);
          if (busIds.length > 0) {
            // Only include buses that have been checked in (present) and not departed for this run
            const { data: presentEvents } = await supabase
              .from("bus_run_events")
              .select("bus_id, check_in_time, departed_at")
              .eq("dismissal_run_id", runId!)
              .in("bus_id", busIds)
              .not("check_in_time", "is", null)
              .is("departed_at", null);

            const presentBusIds = (presentEvents || []).map((e) => e.bus_id);

            if (presentBusIds.length > 0) {
              const { data: busList } = await supabase
                .from("buses")
                .select("id,bus_number")
                .in("id", presentBusIds)
                .eq("school_id", schoolId ?? -1);
              buses = (busList || []).map((b) => ({ id: b.id, bus_number: b.bus_number }));
            }
          }
        }

        result.push({
          id: rg.id,
          dismissal_group_id: rg.dismissal_group_id,
          name: info?.name || "Group",
          group_type: groupType,
          activated_at: rg.activated_at,
          buses,
        });
      }

      setGroups(result);
      setLoadingGroups(false);
    },
    [runId, schoolId]
  );

  useEffect(() => {
    fetchActiveGroups();
  }, [fetchActiveGroups]);

  // Realtime updates for live announcements
  useEffect(() => {
    if (!runId) return;
    const channel = supabase
      .channel("dismissal-run-groups-stream")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dismissal_run_groups",
          filter: `dismissal_run_id=eq.${runId}`,
        },
        () => {
          fetchActiveGroups();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [runId, fetchActiveGroups]);

  return (
    <div className="min-h-screen w-full bg-background text-foreground p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            Classroom Announcements
          </h1>
          <p className="text-muted-foreground mt-2">
            Groups currently being dismissed will appear here in real-time.
          </p>
        </header>

        {isLoading || loadingGroups ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="animate-spin" />
            Loading...
          </div>
        ) : groups.length === 0 ? (
          <p className="text-xl text-muted-foreground">No groups are active yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {groups.map((g) => (
              <Card key={g.id} className="border-2">
                <CardHeader>
                  <CardTitle className="text-3xl">
                    {g.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {g.group_type && g.group_type.toLowerCase().includes("bus") ? (
                    <div>
                      <p className="text-muted-foreground mb-2">Buses:</p>
                      <div className="flex flex-wrap gap-2">
                        {g.buses.map((b) => (
                          <span
                            key={b.id}
                            className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-lg"
                          >
                            {b.bus_number}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">This group is now dismissed.</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ExitModeButton label="Exit Classroom Mode" />
    </div>
  );
}

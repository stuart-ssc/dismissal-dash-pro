import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type SchoolSetupStatuses = {
  transportationReady: boolean;
  hasTeacher: boolean;
  hasStudent: boolean;
  hasClass: boolean;
  schoolUpdated: boolean;
};

export const useSchoolSetupStatus = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<SchoolSetupStatuses>({
    transportationReady: false,
    hasTeacher: false,
    hasStudent: false,
    hasClass: false,
    schoolUpdated: false,
  });

  useEffect(() => {
    const run = async () => {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("school_id")
          .eq("id", user.id)
          .maybeSingle();
        if (profileErr) throw profileErr;
        const schoolId = profile?.school_id;
        if (!schoolId) {
          setStatuses({
            transportationReady: false,
            hasTeacher: false,
            hasStudent: false,
            hasClass: false,
            schoolUpdated: false,
          });
          setLoading(false);
          return;
        }

        const [busesRes, carLinesRes, walkersRes, teachersRes, studentsRes, classesRes, schoolRes] = await Promise.all([
          supabase.from("buses").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
          supabase.from("car_lines").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
          supabase.from("walker_locations").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
          supabase.from("teachers").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
          supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
          supabase.from("classes").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
          supabase.from("schools").select("created_at, updated_at").eq("id", schoolId).maybeSingle(),
        ]);

        const transportationReady = (busesRes.count ?? 0) > 0 || (carLinesRes.count ?? 0) > 0 || (walkersRes.count ?? 0) > 0;
        const hasTeacher = (teachersRes.count ?? 0) > 0;
        const hasStudent = (studentsRes.count ?? 0) > 0;
        const hasClass = (classesRes.count ?? 0) > 0;
        const schoolUpdated = schoolRes.data ? new Date(schoolRes.data.updated_at).getTime() > new Date(schoolRes.data.created_at).getTime() : false;

        setStatuses({ transportationReady, hasTeacher, hasStudent, hasClass, schoolUpdated });
      } catch (e: any) {
        console.error("Error computing setup status", e);
        setError(e?.message ?? "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [user]);

  const isReady =
    statuses.transportationReady &&
    statuses.hasTeacher &&
    statuses.hasStudent &&
    statuses.hasClass &&
    statuses.schoolUpdated;

  return { loading, error, statuses, isReady } as const;
};

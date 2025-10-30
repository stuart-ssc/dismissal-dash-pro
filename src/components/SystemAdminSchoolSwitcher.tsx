import { useEffect, useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonation } from "@/hooks/useImpersonation";

interface School { id: number; school_name: string | null }

export default function SystemAdminSchoolSwitcher() {
  const { impersonatedSchoolId, setImpersonatedSchoolId, isLoadingImpersonation } = useImpersonation();
  const [schools, setSchools] = useState<School[]>([]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('id, school_name')
        .order('school_name');
      if (!error) setSchools(data as School[]);
    })();
  }, []);

  const value = useMemo(() => (impersonatedSchoolId ? String(impersonatedSchoolId) : ''), [impersonatedSchoolId]);

  return (
    <div className="w-56">
      <Select
        value={value}
        onValueChange={(v) => {
          if (v === '__none__') { 
            setImpersonatedSchoolId(null); 
            return; 
          }
          const id = Number(v);
          setImpersonatedSchoolId(Number.isNaN(id) ? null : id);
        }}
        disabled={isLoadingImpersonation}
      >
        <SelectTrigger aria-label="Impersonate a school" className="bg-background/80">
          <SelectValue placeholder={isLoadingImpersonation ? "Loading..." : "Impersonate school"} />
        </SelectTrigger>
        <SelectContent className="z-[60] bg-background">
          <SelectItem key="none" value="__none__">Stop impersonating</SelectItem>
          {schools.map((s) => (
            <SelectItem key={s.id} value={String(s.id)}>
              {s.school_name || `School #${s.id}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

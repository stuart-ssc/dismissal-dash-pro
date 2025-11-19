import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDistrictAuth } from "@/hooks/useDistrictAuth";
import { School } from "lucide-react";

export default function DistrictSchoolSwitcher() {
  const { districtSchools, impersonatedSchoolId, switchSchool, isLoading } = useDistrictAuth();

  const value = impersonatedSchoolId ? String(impersonatedSchoolId) : 'all';

  return (
    <div className="w-56">
      <Select
        value={value}
        onValueChange={(v) => {
          if (v === 'all') {
            switchSchool(null);
          } else {
            switchSchool(Number(v));
          }
        }}
        disabled={isLoading}
      >
        <SelectTrigger aria-label="Switch school context" className="bg-background/80">
          <School className="h-4 w-4 mr-2" />
          <SelectValue placeholder={isLoading ? "Loading..." : "All Schools"} />
        </SelectTrigger>
        <SelectContent className="z-[60] bg-background">
          <SelectItem key="all" value="all">All Schools</SelectItem>
          {districtSchools.map((school) => (
            <SelectItem key={school.id} value={String(school.id)}>
              {school.school_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

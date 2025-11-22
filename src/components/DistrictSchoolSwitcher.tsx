import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDistrictAuth } from "@/hooks/useDistrictAuth";
import { School } from "lucide-react";

export default function DistrictSchoolSwitcher() {
  const { districtSchools, impersonatedSchoolId, switchSchool, isLoading } = useDistrictAuth();

  const value = impersonatedSchoolId ? String(impersonatedSchoolId) : '';

  return (
    <div className="w-56">
      <Select
        value={value}
        onValueChange={(v) => {
          if (v === '__none__') {
            switchSchool(null);
          } else {
            switchSchool(Number(v));
          }
        }}
        disabled={isLoading}
      >
        <SelectTrigger aria-label="Switch school context" className="bg-background/80">
          <School className="h-4 w-4 mr-2" />
          <SelectValue placeholder={isLoading ? "Loading..." : "Select school..."} />
        </SelectTrigger>
        <SelectContent className="z-[60] bg-background">
          <SelectItem key="none" value="__none__">All Schools</SelectItem>
          {districtSchools.map((school) => (
            <SelectItem key={school.id} value={String(school.id)}>
              {school.school_name}
              {school.district_name && school.district_state && (
                <span className="text-muted-foreground ml-2">
                  ({school.district_name} - {school.district_state})
                </span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

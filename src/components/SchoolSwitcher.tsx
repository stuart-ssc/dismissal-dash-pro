import { Building2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useMultiSchool } from '@/hooks/useMultiSchool';

export const SchoolSwitcher = () => {
  const { schools, activeSchoolId, switchSchool, isLoading, isPrimarySchool } = useMultiSchool();

  if (schools.length <= 1) {
    return null; // Don't show if user has only one school
  }

  return (
    <div className="w-56">
      <Select
        value={activeSchoolId ? String(activeSchoolId) : ''}
        onValueChange={(v) => switchSchool(Number(v))}
        disabled={isLoading}
      >
        <SelectTrigger aria-label="Switch school" className="bg-background/80 backdrop-blur">
          <Building2 className="h-4 w-4 mr-2" />
          <SelectValue placeholder={isLoading ? "Loading..." : "Select school"} />
        </SelectTrigger>
        <SelectContent className="z-[60] bg-background">
          {schools.map((school) => (
            <SelectItem key={school.id} value={String(school.id)}>
              <div className="flex items-center gap-2">
                <span>{school.school_name}</span>
                {isPrimarySchool(school.id) && (
                  <Badge variant="secondary" className="text-xs">Primary</Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

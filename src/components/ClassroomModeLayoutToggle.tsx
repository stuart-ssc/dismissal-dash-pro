import { Button } from "@/components/ui/button";
import { LayoutGrid, Users, Columns } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ClassroomModeLayoutToggleProps {
  currentLayout: 'group-view' | 'student-view' | 'transportation-view';
  onLayoutChange: (layout: 'group-view' | 'student-view' | 'transportation-view') => void;
}

export function ClassroomModeLayoutToggle({ 
  currentLayout, 
  onLayoutChange 
}: ClassroomModeLayoutToggleProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {currentLayout === 'group-view' ? (
            <>
              <LayoutGrid className="h-4 w-4" />
              Group View
            </>
          ) : currentLayout === 'student-view' ? (
            <>
              <Users className="h-4 w-4" />
              Student View
            </>
          ) : (
            <>
              <Columns className="h-4 w-4" />
              Transportation View
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => onLayoutChange('group-view')}
          className="gap-2"
        >
          <LayoutGrid className="h-4 w-4" />
          Group View
          {currentLayout === 'group-view' && (
            <span className="ml-auto text-primary">✓</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onLayoutChange('student-view')}
          className="gap-2"
        >
          <Users className="h-4 w-4" />
          Student View
          {currentLayout === 'student-view' && (
            <span className="ml-auto text-primary">✓</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onLayoutChange('transportation-view')}
          className="gap-2"
        >
          <Columns className="h-4 w-4" />
          Transportation View
          {currentLayout === 'transportation-view' && (
            <span className="ml-auto text-primary">✓</span>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

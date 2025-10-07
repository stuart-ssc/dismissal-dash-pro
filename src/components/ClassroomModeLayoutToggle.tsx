import { Button } from "@/components/ui/button";
import { LayoutGrid, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ClassroomModeLayoutToggleProps {
  currentLayout: 'group-view' | 'transportation-columns';
  onLayoutChange: (layout: 'group-view' | 'transportation-columns') => void;
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
          ) : (
            <>
              <Users className="h-4 w-4" />
              Student View
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => onLayoutChange('transportation-columns')}
          className="gap-2"
        >
          <Users className="h-4 w-4" />
          Student View
          {currentLayout === 'transportation-columns' && (
            <span className="ml-auto text-primary">✓</span>
          )}
        </DropdownMenuItem>
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

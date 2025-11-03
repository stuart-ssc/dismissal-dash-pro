import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TemporaryTransportationBadgeProps {
  onClick?: () => void;
  tooltipText?: string;
}

export function TemporaryTransportationBadge({ 
  onClick, 
  tooltipText = "Temporary transportation override active" 
}: TemporaryTransportationBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="secondary" 
            className="cursor-pointer hover:bg-accent gap-1 px-2"
            onClick={onClick}
          >
            <Clock className="h-3 w-3" />
            Temp
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

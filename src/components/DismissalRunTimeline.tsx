import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTimelineData } from "@/hooks/useTimelineData";
import { 
  ChevronDown, 
  ChevronUp, 
  Play, 
  Check, 
  CheckCircle,
  Bus, 
  Car, 
  MapPin,
  Clock,
  User
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const getEventIcon = (iconType: string) => {
  switch (iconType) {
    case 'clock':
      return <Clock className="h-4 w-4" />;
    case 'play':
      return <Play className="h-4 w-4" />;
    case 'check':
      return <Check className="h-4 w-4" />;
    case 'check-circle':
      return <CheckCircle className="h-4 w-4" />;
    case 'bus':
      return <Bus className="h-4 w-4" />;
    case 'car':
      return <Car className="h-4 w-4" />;
    case 'map-pin':
      return <MapPin className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

const getEventColor = (type: string) => {
  switch (type) {
    case 'run_scheduled':
      return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-950 dark:text-slate-200 dark:border-slate-800';
    case 'run_preparation':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-200 dark:border-yellow-800';
    case 'run_start':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800';
    case 'run_end':
    case 'bus_departure':
    case 'car_session_end':
    case 'walker_session_end':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800';
    case 'bus_checkin':
      return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800';
    case 'bus_manual_completion':
      return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-200 dark:border-orange-800';
    case 'bus_completed':
    case 'car_completed':
    case 'walker_completed':
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-800';
    case 'car_session_start':
      return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-200 dark:border-purple-800';
    case 'walker_session_start':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-200 dark:border-indigo-800';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-950 dark:text-gray-200 dark:border-gray-800';
  }
};

export const DismissalRunTimeline: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: events = [], isLoading, error } = useTimelineData();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Today's Dismissal Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-muted-foreground">Loading timeline...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Today's Dismissal Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            {error ? 'Failed to load timeline data' : 'No dismissal events recorded for today'}
          </div>
        </CardContent>
      </Card>
    );
  }

  const visibleEvents = isExpanded ? events : events.slice(0, 3);
  const hasMoreEvents = events.length > 3;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Today's Dismissal Timeline
          </div>
          <Badge variant="outline" className="text-xs">
            {events.length} events
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {visibleEvents.map((event, index) => {
            const isLast = index === visibleEvents.length - 1;
            const eventTime = new Date(event.timestamp);
            
            return (
              <div key={event.id} className="relative">
                {/* Timeline line */}
                {!isLast && (
                  <div className="absolute left-4 top-8 w-px h-12 bg-border" />
                )}
                
                <div className={`flex items-start gap-3 ${
                  ['run_end', 'bus_departure', 'car_session_end', 'walker_session_end'].includes(event.type)
                    ? 'bg-emerald-50 border-emerald-200 rounded-lg p-3 dark:bg-emerald-950/50 dark:border-emerald-800'
                    : ''
                }`}>
                  {/* Event icon */}
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border ${getEventColor(event.type)}`}>
                    {getEventIcon(event.icon)}
                  </div>
                  
                  {/* Event content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm">{event.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {formatDistanceToNow(eventTime, { addSuffix: true })}
                        </span>
                        <span>•</span>
                        <span>
                          {eventTime.toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {event.description}
                    </p>
                    
                    {event.user_name && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{event.user_name}</span>
                      </div>
                    )}
                    
                    {event.details && (
                      <div className="mt-2 text-xs">
                        {event.details.bus_number && (
                          <Badge variant="outline" className="text-xs">
                            Bus #{event.details.bus_number}
                          </Badge>
                        )}
                        {event.details.line_name && (
                          <Badge variant="outline" className="text-xs">
                            {event.details.line_name}
                          </Badge>
                        )}
                        {event.details.location_name && (
                          <Badge variant="outline" className="text-xs">
                            {event.details.location_name}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {hasMoreEvents && (
            <div className="flex justify-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Show {events.length - 3} More Events
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bus, Car, Footprints, GraduationCap, LucideIcon, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  destination: string;
  status: 'dismissed' | 'ready-soon' | 'waiting';
  dismissal_time: Date | null;
  group_name: string;
}

interface Destination {
  name: string;
  status: 'dismissed' | 'ready-soon' | 'waiting';
  students: Student[];
}

interface TransportationColumn {
  type: 'bus' | 'car' | 'walker' | 'activity';
  title: string;
  icon: LucideIcon;
  destinations: Destination[];
  totalCount: number;
}

interface TransportationColumnsLayoutProps {
  groups: Array<{
    id: string;
    name: string;
    group_type: string;
    scheduled_release_time: Date;
    actual_release_time?: Date | null;
    status: 'active' | 'delayed' | 'completed' | 'pending';
    students: Array<{
      id: string;
      first_name: string;
      last_name: string;
      destination?: string;
    }>;
  }>;
  currentTime: Date;
  className?: string;
}

export function TransportationColumnsLayout({ groups, currentTime, className }: TransportationColumnsLayoutProps) {
  const columns = useMemo(() => {
    const transportationMap: Record<string, TransportationColumn> = {
      bus: { type: 'bus', title: 'Bus Riders', icon: Bus, destinations: [], totalCount: 0 },
      car: { type: 'car', title: 'Car Riders', icon: Car, destinations: [], totalCount: 0 },
      walker: { type: 'walker', title: 'Walkers', icon: Footprints, destinations: [], totalCount: 0 },
      activity: { type: 'activity', title: 'Activities', icon: GraduationCap, destinations: [], totalCount: 0 },
    };

    groups.forEach((group) => {
      const column = transportationMap[group.group_type];
      if (!column) return;

      // Determine status based on group status and timing
      let groupStatus: 'dismissed' | 'ready-soon' | 'waiting' = 'waiting';
      
      if (group.status === 'completed' || group.actual_release_time) {
        groupStatus = 'dismissed';
      } else if (group.scheduled_release_time) {
        const minutesUntil = (group.scheduled_release_time.getTime() - currentTime.getTime()) / 1000 / 60;
        if (minutesUntil <= 2 && minutesUntil > 0) {
          groupStatus = 'ready-soon';
        } else if (minutesUntil <= 0) {
          groupStatus = 'dismissed';
        }
      }

      const students: Student[] = group.students.map(s => ({
        id: s.id,
        first_name: s.first_name,
        last_name: s.last_name,
        destination: s.destination || group.name,
        status: groupStatus,
        dismissal_time: group.actual_release_time || group.scheduled_release_time,
        group_name: group.name,
      }));

      // Find or create destination
      let destination = column.destinations.find(d => d.name === group.name);
      if (!destination) {
        destination = {
          name: group.name,
          status: groupStatus,
          students: [],
        };
        column.destinations.push(destination);
      }

      destination.students.push(...students);
      destination.students.sort((a, b) => a.last_name.localeCompare(b.last_name));
      column.totalCount += students.length;
    });

    // Always show all 4 transportation columns, even if empty
    return Object.values(transportationMap);
  }, [groups, currentTime]);

  const getStatusBadge = (status: 'dismissed' | 'ready-soon' | 'waiting') => {
    switch (status) {
      case 'dismissed':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Dismissed
          </Badge>
        );
      case 'ready-soon':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
            <Clock className="h-3 w-3 mr-1" />
            Ready Soon
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-600">
            Waiting
          </Badge>
        );
    }
  };

  const getStatusClasses = (status: 'dismissed' | 'ready-soon' | 'waiting') => {
    switch (status) {
      case 'dismissed':
        return 'bg-green-50 border-green-200 animate-in fade-in duration-300';
      case 'ready-soon':
        return 'bg-yellow-50 border-yellow-200 animate-pulse';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (columns.length === 0) {
    return (
      <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground text-lg">
            No students assigned to dismissal groups yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("grid gap-6", className)}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {columns.map((column) => {
          const Icon = column.icon;
          return (
            <Card key={column.type} className="shadow-elevated border-0 bg-card/80 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Icon className="h-6 w-6 text-primary" />
                  {column.title}
                  <Badge variant="secondary" className="ml-auto">
                    {column.totalCount}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {column.destinations.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">
                    No students in this category
                  </p>
                ) : (
                  column.destinations.map((destination) => (
                  <div
                    key={destination.name}
                    className={cn(
                      "rounded-lg border-2 p-3 transition-all",
                      getStatusClasses(destination.status)
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-sm">{destination.name}</h3>
                      {getStatusBadge(destination.status)}
                    </div>
                    <ul className="space-y-1">
                      {destination.students.map((student) => (
                        <li
                          key={student.id}
                          className={cn(
                            "text-sm py-1 px-2 rounded transition-colors",
                            student.status === 'dismissed' && "font-semibold text-green-900",
                            student.status === 'ready-soon' && "font-medium text-yellow-900",
                            student.status === 'waiting' && "text-gray-700"
                          )}
                        >
                          {student.last_name}, {student.first_name}
                        </li>
                      ))}
                    </ul>
                  </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

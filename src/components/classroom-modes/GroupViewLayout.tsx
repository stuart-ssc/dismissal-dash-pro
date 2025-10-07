import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, AlertCircle, Bus, Users } from "lucide-react";

interface ActiveGroup {
  id: string;
  name: string;
  group_type: string;
  scheduled_release_time: Date;
  actual_release_time?: Date | null;
  release_offset_minutes: number;
  status: 'active' | 'delayed' | 'completed' | 'pending';
  delay_reason?: string;
  buses: Array<{
    id: string;
    bus_number: string;
    driver_name?: string;
    checked_in: boolean;
    departed?: boolean;
  }>;
  students: Array<{
    id: string;
    first_name: string;
    last_name: string;
    destination?: string;
  }>;
}

interface GroupViewLayoutProps {
  groups: ActiveGroup[];
  currentTime: Date;
  dismissalPlanName?: string;
  className?: string;
}

export function GroupViewLayout({ groups, currentTime, dismissalPlanName, className }: GroupViewLayoutProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'delayed':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'active':
        return <Clock className="h-5 w-5 text-blue-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
      case 'delayed':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Delayed</Badge>;
      case 'active':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Active</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const formatTime = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className={className}>
      {groups.length === 0 ? (
        <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No dismissal groups for your class at this time.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <Card 
              key={group.id} 
              className="shadow-elevated border-0 bg-card/80 backdrop-blur hover:shadow-lg transition-all"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl flex items-center gap-2">
                      {getStatusIcon(group.status)}
                      {group.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {group.group_type === 'bus' && 'Bus Dismissal'}
                      {group.group_type === 'car_line' && 'Car Line'}
                      {group.group_type === 'walker' && 'Walker Dismissal'}
                      {group.group_type === 'after_school' && 'After School Activity'}
                    </p>
                  </div>
                  {getStatusBadge(group.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Scheduled Time:</span>
                    <span className="font-medium">{formatTime(group.scheduled_release_time)}</span>
                  </div>
                  {group.actual_release_time && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Actual Time:</span>
                      <span className="font-medium text-green-600">
                        {formatTime(group.actual_release_time)}
                      </span>
                    </div>
                  )}
                  {group.delay_reason && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Delay Reason:</span>
                      <p className="text-yellow-600 mt-1">{group.delay_reason}</p>
                    </div>
                  )}
                </div>

                {group.buses && group.buses.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Bus className="h-4 w-4" />
                      Buses ({group.buses.length})
                    </h4>
                    <div className="space-y-2">
                      {group.buses.map((bus) => (
                        <div key={bus.id} className="flex items-center justify-between text-sm">
                          <span>Bus {bus.bus_number}</span>
                          <div className="flex items-center gap-2">
                            {bus.departed ? (
                              <Badge className="bg-green-100 text-green-800 text-xs">Departed</Badge>
                            ) : bus.checked_in ? (
                              <Badge className="bg-blue-100 text-blue-800 text-xs">Checked In</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Waiting</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {group.students && group.students.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Your Students ({group.students.length})
                    </h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {group.students.map((student) => (
                        <div key={student.id} className="text-sm py-1 px-2 rounded hover:bg-accent/50">
                          {student.first_name} {student.last_name}
                          {student.destination && (
                            <span className="text-muted-foreground text-xs ml-2">
                              → {student.destination}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

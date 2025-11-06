import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Download, Search, X, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useDetailedAuditData, ActivityType } from '@/hooks/useDetailedAuditData';
import { useSEO } from '@/hooks/useSEO';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ACTIVITY_TYPE_OPTIONS: { value: ActivityType; label: string; color: string }[] = [
  { value: 'dismissal', label: 'Dismissal', color: 'bg-primary text-primary-foreground' },
  { value: 'absence', label: 'Absence', color: 'bg-destructive text-destructive-foreground' },
  { value: 'coverage', label: 'Coverage', color: 'bg-success text-success-foreground' },
  { value: 'mode_usage', label: 'Mode Usage', color: 'bg-warning text-warning-foreground' },
  { value: 'system', label: 'System', color: 'bg-muted text-muted-foreground' }
];

export default function DismissalDetailReport() {
  useSEO({
    title: 'Dismissal Detail Report',
    description: 'View every logged interaction for a day with filtering and search capabilities'
  });

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>(['dismissal', 'absence', 'coverage', 'mode_usage', 'system']);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const { events, isLoading, error } = useDetailedAuditData({
    date: selectedDate,
    activityTypes,
    searchQuery
  });

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setIsCalendarOpen(false);
    }
  };

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const toggleActivityType = (type: ActivityType) => {
    setActivityTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const clearFilters = () => {
    setActivityTypes(['dismissal', 'absence', 'coverage', 'mode_usage', 'system']);
    setSearchQuery('');
  };

  const exportToCSV = () => {
    if (events.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Time', 'Activity Type', 'Action', 'Student/Teacher', 'Details', 'Performed By'];
    const csvData = [
      headers.join(','),
      ...events.map(event => {
        const time = format(new Date(event.timestamp), 'h:mm a');
        const name = event.studentName || event.teacherName || '';
        return [
          time,
          event.activityType,
          event.action.replace(/_/g, ' '),
          `"${name}"`,
          `"${event.details.replace(/"/g, '""')}"`,
          event.performedByName || 'System'
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dismissal-detail-report-${format(selectedDate, 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Report exported successfully');
  };

  const getActivityBadgeClass = (type: ActivityType) => {
    const option = ACTIVITY_TYPE_OPTIONS.find(opt => opt.value === type);
    return option?.color || 'bg-muted text-muted-foreground';
  };

  const allTypes: ActivityType[] = ['dismissal', 'absence', 'coverage', 'mode_usage', 'system'];
  const hasActiveFilters = activityTypes.length !== allTypes.length || searchQuery.trim().length > 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dismissal Detail Report</h1>
          <p className="text-muted-foreground mt-1">
            View every logged interaction for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <Button onClick={exportToCSV} variant="outline" disabled={events.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Filters</CardTitle>
                <CardDescription>Filter and search through daily activities</CardDescription>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  <ChevronDown className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    isFiltersOpen && "transform rotate-180"
                  )} />
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
          {/* Date Selection */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" size="sm" onClick={goToPreviousDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex-1 justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  {format(selectedDate, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Activity Type Filters */}
          <div className="space-y-2">
            <Label>Activity Types</Label>
            <div className="flex flex-wrap gap-2">
              {ACTIVITY_TYPE_OPTIONS.map(option => (
                <div key={option.value} className="flex items-center gap-2">
                  <Checkbox
                    id={option.value}
                    checked={activityTypes.includes(option.value)}
                    onCheckedChange={() => toggleActivityType(option.value)}
                  />
                  <Label htmlFor={option.value} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="space-y-2">
            <Label>Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear All Filters
            </Button>
          )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>
            {isLoading ? 'Loading...' : `${events.length} ${events.length === 1 ? 'event' : 'events'} found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-center py-8 text-destructive">
              <p>Error loading data: {error}</p>
            </div>
          )}

          {isLoading && (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-16 w-20" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && !error && events.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {hasActiveFilters
                  ? 'No activities match your filters. Try adjusting your search criteria.'
                  : 'No activities found for this date.'}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          )}

          {!isLoading && !error && events.length > 0 && (
            <div className="space-y-4">
              {events.map(event => (
                <div
                  key={event.id}
                  className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  {/* Time */}
                  <div className="text-sm font-medium text-muted-foreground min-w-[80px]">
                    {format(new Date(event.timestamp), 'h:mm a')}
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={cn('text-xs', getActivityBadgeClass(event.activityType))}>
                        {ACTIVITY_TYPE_OPTIONS.find(opt => opt.value === event.activityType)?.label}
                      </Badge>
                      <span className="text-sm font-medium">
                        {event.action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>

                    {(event.studentName || event.teacherName) && (
                      <div className="text-sm font-semibold text-foreground">
                        {event.studentName || event.teacherName}
                      </div>
                    )}

                    <div className="text-sm text-muted-foreground">{event.details}</div>

                    <div className="text-xs text-muted-foreground">
                      Performed by: {event.performedByName || 'System'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

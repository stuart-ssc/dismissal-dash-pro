import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { GitMerge, Loader2, ChevronDown, ChevronUp, AlertCircle, CheckSquare, XSquare, Search, Calendar, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const ICPendingMerges = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [schoolId, setSchoolId] = useState<number | null>(null);
  const [pendingMerges, setPendingMerges] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState('all');
  const [selectedMerges, setSelectedMerges] = useState<Set<string>>(new Set());
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState<'all' | 'high' | 'medium' | 'low' | 'very-low'>('all');
  const [matchTypeFilter, setMatchTypeFilter] = useState<'all' | string>('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  useEffect(() => {
    if (!loading && (!user || userRole !== 'school_admin')) {
      navigate('/dashboard');
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    fetchSchoolId();
  }, [user]);

  useEffect(() => {
    if (schoolId) {
      fetchPendingMerges();
    }
  }, [schoolId]);

  const fetchSchoolId = async () => {
    if (!user) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single();
    
    if (profile?.school_id) {
      setSchoolId(profile.school_id);
    }
  };

  const fetchPendingMerges = async () => {
    if (!schoolId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ic_pending_merges')
        .select('*')
        .eq('school_id', schoolId)
        .eq('status', 'pending')
        .order('match_confidence', { ascending: false });

      if (error) throw error;
      
      setPendingMerges(data || []);
    } catch (error) {
      console.error('Error fetching pending merges:', error);
      toast.error('Failed to load pending merges');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecision = async (mergeId: string, decision: 'approve' | 'reject') => {
    try {
      const { error } = await supabase.functions.invoke('approve-ic-merge', {
        body: { mergeId, decision },
      });

      if (error) throw error;

      toast.success(
        decision === 'approve' 
          ? 'Record merged successfully' 
          : 'Created as new record'
      );
      
      fetchPendingMerges();
    } catch (error: any) {
      console.error('Error processing decision:', error);
      toast.error(error.message || 'Failed to process decision');
    }
  };

  const toggleRowExpansion = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const getConfidenceLevel = (confidence: number): 'high' | 'medium' | 'low' | 'very-low' => {
    if (confidence >= 90) return 'high';
    if (confidence >= 70) return 'medium';
    if (confidence >= 50) return 'low';
    return 'very-low';
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMerges(new Set(filteredAndSearchedMerges.map(m => m.id)));
    } else {
      setSelectedMerges(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedMerges);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedMerges(newSelected);
  };

  const handleBulkAction = async (decision: 'approve' | 'reject') => {
    if (selectedMerges.size === 0) return;

    setIsProcessingBulk(true);
    try {
      const { data, error } = await supabase.functions.invoke('approve-ic-merge', {
        body: { 
          mergeIds: Array.from(selectedMerges), 
          decision 
        },
      });

      if (error) throw error;

      const { successCount, failCount } = data;
      
      if (failCount > 0) {
        toast.warning(
          `Processed ${successCount} of ${successCount + failCount} records. ${failCount} failed.`
        );
      } else {
        toast.success(
          decision === 'approve' 
            ? `Successfully merged ${successCount} record(s)` 
            : `Successfully created ${successCount} new record(s)`
        );
      }
      
      setSelectedMerges(new Set());
      fetchPendingMerges();
    } catch (error: any) {
      console.error('Error processing bulk action:', error);
      toast.error(error.message || 'Failed to process bulk action');
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const filteredAndSearchedMerges = useMemo(() => {
    let results = pendingMerges;
    
    // Filter by record type (existing tabs)
    if (filterType !== 'all') {
      results = results.filter(m => m.record_type === filterType);
    }
    
    // Filter by search query (name search)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(m => {
        const firstName = m.ic_data.firstName?.toLowerCase() || '';
        const lastName = m.ic_data.lastName?.toLowerCase() || '';
        const email = m.ic_data.email?.toLowerCase() || '';
        const icId = m.ic_external_id?.toLowerCase() || '';
        
        return firstName.includes(query) || 
               lastName.includes(query) || 
               email.includes(query) ||
               icId.includes(query);
      });
    }
    
    // Filter by confidence level
    if (confidenceFilter !== 'all') {
      results = results.filter(m => {
        const level = getConfidenceLevel(m.match_confidence || 0);
        return level === confidenceFilter;
      });
    }
    
    // Filter by match type
    if (matchTypeFilter !== 'all') {
      results = results.filter(m => m.match_criteria === matchTypeFilter);
    }
    
    // Filter by date range
    if (dateRange.from || dateRange.to) {
      results = results.filter(m => {
        const createdDate = new Date(m.created_at);
        if (dateRange.from && createdDate < dateRange.from) return false;
        if (dateRange.to && createdDate > dateRange.to) return false;
        return true;
      });
    }
    
    return results;
  }, [pendingMerges, filterType, searchQuery, confidenceFilter, matchTypeFilter, dateRange]);

  const studentCount = pendingMerges.filter(m => m.record_type === 'student').length;
  const teacherCount = pendingMerges.filter(m => m.record_type === 'teacher').length;

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GitMerge className="h-8 w-8" />
            Pending Merges
          </h1>
          <p className="text-muted-foreground">Review potential duplicate records from Infinite Campus sync</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/dashboard/settings')}>
          ← Back to Settings
        </Button>
      </div>

      {filteredAndSearchedMerges.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Action Required</AlertTitle>
          <AlertDescription>
            {filteredAndSearchedMerges.length} record(s) require your review before they can be added to the system
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or IC ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-7 w-7 p-0"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Confidence Level Filter */}
            <Select value={confidenceFilter} onValueChange={(value: any) => setConfidenceFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Confidence Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Confidence Levels</SelectItem>
                <SelectItem value="high">High (90-100%)</SelectItem>
                <SelectItem value="medium">Medium (70-89%)</SelectItem>
                <SelectItem value="low">Low (50-69%)</SelectItem>
                <SelectItem value="very-low">Very Low (&lt;50%)</SelectItem>
              </SelectContent>
            </Select>

            {/* Match Type Filter */}
            <Select value={matchTypeFilter} onValueChange={setMatchTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Match Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Match Types</SelectItem>
                {Array.from(new Set(pendingMerges.map(m => m.match_criteria).filter(Boolean))).map(criteria => (
                  <SelectItem key={criteria} value={criteria}>{criteria}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <Calendar className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
                      </>
                    ) : (
                      format(dateRange.from, "MMM d, yyyy")
                    )
                  ) : (
                    <span>Pick date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="range"
                  selected={dateRange as any}
                  onSelect={setDateRange as any}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Active Filters Summary & Clear Button */}
          {(searchQuery || confidenceFilter !== 'all' || matchTypeFilter !== 'all' || dateRange.from || dateRange.to) && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex gap-2 flex-wrap">
                {searchQuery && (
                  <Badge variant="secondary">
                    Search: {searchQuery}
                    <button onClick={() => setSearchQuery('')} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {confidenceFilter !== 'all' && (
                  <Badge variant="secondary">
                    Confidence: {confidenceFilter}
                    <button onClick={() => setConfidenceFilter('all')} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {matchTypeFilter !== 'all' && (
                  <Badge variant="secondary">
                    Match: {matchTypeFilter}
                    <button onClick={() => setMatchTypeFilter('all')} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {(dateRange.from || dateRange.to) && (
                  <Badge variant="secondary">
                    Date Range
                    <button onClick={() => setDateRange({})} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setConfidenceFilter('all');
                  setMatchTypeFilter('all');
                  setDateRange({});
                }}
              >
                Clear All Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{filteredAndSearchedMerges.length}</div>
              <div className="text-sm text-muted-foreground">Total Results</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {filteredAndSearchedMerges.filter(m => getConfidenceLevel(m.match_confidence || 0) === 'high').length}
              </div>
              <div className="text-sm text-muted-foreground">High Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {filteredAndSearchedMerges.filter(m => getConfidenceLevel(m.match_confidence || 0) === 'medium').length}
              </div>
              <div className="text-sm text-muted-foreground">Medium Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">
                {filteredAndSearchedMerges.filter(m => getConfidenceLevel(m.match_confidence || 0) === 'low').length}
              </div>
              <div className="text-sm text-muted-foreground">Low Confidence</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={filterType} onValueChange={setFilterType}>
        <TabsList>
          <TabsTrigger value="all">
            All ({pendingMerges.length})
          </TabsTrigger>
          <TabsTrigger value="student">
            Students ({studentCount})
          </TabsTrigger>
          <TabsTrigger value="teacher">
            Teachers ({teacherCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filterType}>
          <Card>
            <CardHeader>
              <CardTitle>Pending Merges</CardTitle>
              <CardDescription>Review and approve or reject potential matches</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredAndSearchedMerges.length === 0 ? (
                <div className="text-center py-12">
                  {pendingMerges.length === 0 ? (
                    <>
                      <GitMerge className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No pending merges</h3>
                      <p className="text-sm text-muted-foreground">
                        All Infinite Campus records have been processed
                      </p>
                    </>
                  ) : (
                    <>
                      <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No matches found</h3>
                      <p className="text-sm text-muted-foreground">
                        Try adjusting your filters or search query
                      </p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => {
                          setSearchQuery('');
                          setConfidenceFilter('all');
                          setMatchTypeFilter('all');
                          setDateRange({});
                        }}
                      >
                        Clear All Filters
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedMerges.size === filteredAndSearchedMerges.length && filteredAndSearchedMerges.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead></TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>IC Name</TableHead>
                      <TableHead>IC Details</TableHead>
                      <TableHead>Match Confidence</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSearchedMerges.map((merge) => {
                      const isExpanded = expandedRows.has(merge.id);
                      const icData = merge.ic_data;
                      
                      return (
                        <>
                          <TableRow key={merge.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedMerges.has(merge.id)}
                                onCheckedChange={(checked) => handleSelectRow(merge.id, checked as boolean)}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleRowExpansion(merge.id)}
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                            </TableCell>
                            <TableCell>
                              <Badge variant={merge.record_type === 'student' ? 'outline' : 'secondary'}>
                                {merge.record_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {icData.firstName} {icData.lastName}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div>{merge.record_type === 'student' ? icData.gradeLevel : icData.email}</div>
                                {merge.match_criteria && (
                                  <Badge variant="secondary" className="text-xs">
                                    {merge.match_criteria}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const level = getConfidenceLevel(merge.match_confidence || 0);
                                const colors = {
                                  'high': 'bg-green-100 text-green-800 border-green-200',
                                  'medium': 'bg-blue-100 text-blue-800 border-blue-200',
                                  'low': 'bg-amber-100 text-amber-800 border-amber-200',
                                  'very-low': 'bg-red-100 text-red-800 border-red-200'
                                };
                                return (
                                  <Badge variant="outline" className={colors[level]}>
                                    {Math.round(merge.match_confidence || 0)}%
                                  </Badge>
                                );
                              })()}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleDecision(merge.id, 'approve')}
                                >
                                  Approve Merge
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDecision(merge.id, 'reject')}
                                >
                                  Create New
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={7}>
                                <div className="p-4 space-y-4 bg-muted/20 rounded-lg">
                                  <div className="grid grid-cols-2 gap-8">
                                    <div>
                                      <h4 className="font-medium mb-3">Infinite Campus Data</h4>
                                      <dl className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                          <dt className="text-muted-foreground">First Name:</dt>
                                          <dd className="font-medium">{icData.firstName}</dd>
                                        </div>
                                        <div className="flex justify-between">
                                          <dt className="text-muted-foreground">Last Name:</dt>
                                          <dd className="font-medium">{icData.lastName}</dd>
                                        </div>
                                        {icData.email && (
                                          <div className="flex justify-between">
                                            <dt className="text-muted-foreground">Email:</dt>
                                            <dd className="font-medium">{icData.email}</dd>
                                          </div>
                                        )}
                                        {icData.gradeLevel && (
                                          <div className="flex justify-between">
                                            <dt className="text-muted-foreground">Grade:</dt>
                                            <dd className="font-medium">{icData.gradeLevel}</dd>
                                          </div>
                                        )}
                                        <div className="flex justify-between">
                                          <dt className="text-muted-foreground">IC ID:</dt>
                                          <dd className="font-mono text-xs">{merge.ic_external_id}</dd>
                                        </div>
                                      </dl>
                                    </div>
                                    
                                    {merge.existing_record_id && (
                                      <div>
                                        <h4 className="font-medium mb-3">Existing Record</h4>
                                        <dl className="space-y-2 text-sm">
                                          <div className="flex justify-between">
                                            <dt className="text-muted-foreground">Match Criteria:</dt>
                                            <dd>
                                              <Badge variant="outline">{merge.match_criteria}</Badge>
                                            </dd>
                                          </div>
                                          <div className="text-xs text-muted-foreground mt-2">
                                            Existing record will be updated with IC data if approved
                                          </div>
                                        </dl>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedMerges.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <Card className="shadow-lg border-2">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {selectedMerges.size} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMerges(new Set())}
                >
                  Clear
                </Button>
                <div className="h-4 w-px bg-border" />
                <Button
                  size="sm"
                  onClick={() => handleBulkAction('approve')}
                  disabled={isProcessingBulk}
                >
                  {isProcessingBulk ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckSquare className="h-4 w-4 mr-2" />
                  )}
                  Approve Selected
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('reject')}
                  disabled={isProcessingBulk}
                >
                  {isProcessingBulk ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <XSquare className="h-4 w-4 mr-2" />
                  )}
                  Create as New
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ICPendingMerges;

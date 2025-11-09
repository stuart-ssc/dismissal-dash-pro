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
import { GitMerge, Loader2, ChevronDown, ChevronUp, AlertCircle, CheckSquare, XSquare, Search, Calendar, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { MergeCommentsSection } from '@/components/MergeCommentsSection';

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
  const [sortField, setSortField] = useState<'name' | 'confidence' | 'date' | 'matchType'>('confidence');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [expandedRecordDetails, setExpandedRecordDetails] = useState<Map<string, any>>(new Map());

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

  const toggleRowExpansion = async (merge: any) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(merge.id)) {
      newExpanded.delete(merge.id);
    } else {
      newExpanded.add(merge.id);
      // Fetch existing record details if we have an existing_record_id
      if (merge.existing_record_id && !expandedRecordDetails.has(merge.id)) {
        await fetchExistingRecord(merge);
      }
    }
    setExpandedRows(newExpanded);
  };

  const fetchExistingRecord = async (merge: any) => {
    try {
      const table = merge.record_type === 'student' ? 'students' : 'teachers';
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', merge.existing_record_id)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setExpandedRecordDetails(prev => new Map(prev).set(merge.id, data));
      }
    } catch (error) {
      console.error('Error fetching existing record:', error);
    }
  };

  const calculateSimilarity = (str1: string, str2: string): number => {
    if (!str1 || !str2) return 0;
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    if (s1 === s2) return 1;
    
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 1;
    
    const editDistance = (s1: string, s2: string): number => {
      const costs = [];
      for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
          if (i === 0) {
            costs[j] = j;
          } else if (j > 0) {
            let newValue = costs[j - 1];
            if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
            }
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
        if (i > 0) costs[s2.length] = lastValue;
      }
      return costs[s2.length];
    };
    
    return (longer.length - editDistance(s1, s2)) / longer.length;
  };

  const compareFields = (icValue: any, existingValue: any): 'match' | 'different' | 'similar' => {
    if (!existingValue && !icValue) return 'match';
    if (!existingValue) return 'different';
    if (!icValue) return 'match';
    if (icValue === existingValue) return 'match';
    
    if (typeof icValue === 'string' && typeof existingValue === 'string') {
      const similarity = calculateSimilarity(icValue, existingValue);
      if (similarity === 1) return 'match';
      if (similarity > 0.8) return 'similar';
    }
    
    return 'different';
  };

  const getFieldClassName = (comparison: 'match' | 'different' | 'similar') => {
    switch (comparison) {
      case 'different':
        return 'bg-green-50 dark:bg-green-950/20 border-l-2 border-green-500 pl-2';
      case 'similar':
        return 'bg-amber-50 dark:bg-amber-950/20 border-l-2 border-amber-500 pl-2';
      default:
        return '';
    }
  };

  const getConfidenceLevel = (confidence: number): 'high' | 'medium' | 'low' | 'very-low' => {
    if (confidence >= 90) return 'high';
    if (confidence >= 70) return 'medium';
    if (confidence >= 50) return 'low';
    return 'very-low';
  };

  const handleSort = (field: 'name' | 'confidence' | 'date' | 'matchType') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'confidence' || field === 'date' ? 'desc' : 'asc');
    }
  };

  const getSortIcon = (field: 'name' | 'confidence' | 'date' | 'matchType') => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select only items on current page
      setSelectedMerges(new Set(paginatedMerges.map(m => m.id)));
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

  const sortedMerges = useMemo(() => {
    const sorted = [...filteredAndSearchedMerges];
    
    sorted.sort((a, b) => {
      let compareValue = 0;
      
      switch (sortField) {
        case 'name': {
          const aName = `${a.ic_data.firstName} ${a.ic_data.lastName}`.toLowerCase();
          const bName = `${b.ic_data.firstName} ${b.ic_data.lastName}`.toLowerCase();
          compareValue = aName.localeCompare(bName);
          break;
        }
        case 'confidence':
          compareValue = (a.match_confidence || 0) - (b.match_confidence || 0);
          break;
        case 'date': {
          const aDate = new Date(a.created_at).getTime();
          const bDate = new Date(b.created_at).getTime();
          compareValue = aDate - bDate;
          break;
        }
        case 'matchType': {
          const aType = a.match_criteria || '';
          const bType = b.match_criteria || '';
          compareValue = aType.localeCompare(bType);
          break;
        }
      }
      
      return sortDirection === 'asc' ? compareValue : -compareValue;
    });
    
    return sorted;
  }, [filteredAndSearchedMerges, sortField, sortDirection]);

  // Pagination logic
  const totalPages = Math.ceil(sortedMerges.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMerges = sortedMerges.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, searchQuery, confidenceFilter, matchTypeFilter, dateRange]);

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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/dashboard/integrations/ic-sync")}>
            ← Dashboard
          </Button>
          <Button variant="outline" onClick={() => navigate("/dashboard/integrations/ic-pending-merges")}>
            View Pending Merges
          </Button>
        </div>
      </div>

      {sortedMerges.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Action Required</AlertTitle>
          <AlertDescription>
            {sortedMerges.length} record(s) require your review before they can be added to the system
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
              <div className="text-2xl font-bold">{sortedMerges.length}</div>
              <div className="text-sm text-muted-foreground">Total Results</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {sortedMerges.filter(m => getConfidenceLevel(m.match_confidence || 0) === 'high').length}
              </div>
              <div className="text-sm text-muted-foreground">High Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {sortedMerges.filter(m => getConfidenceLevel(m.match_confidence || 0) === 'medium').length}
              </div>
              <div className="text-sm text-muted-foreground">Medium Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">
                {sortedMerges.filter(m => getConfidenceLevel(m.match_confidence || 0) === 'low').length}
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
              {sortedMerges.length > 0 && (
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Show</span>
                    <Select 
                      value={itemsPerPage.toString()} 
                      onValueChange={(value) => {
                        setItemsPerPage(Number(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">
                      records per page
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1}-{Math.min(endIndex, sortedMerges.length)} of {sortedMerges.length}
                  </div>
                </div>
              )}
              {sortedMerges.length === 0 ? (
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
                          checked={paginatedMerges.length > 0 && paginatedMerges.every(m => selectedMerges.has(m.id))}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead></TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleSort('name')}
                          className="h-8 px-2 flex items-center"
                        >
                          IC Name
                          {getSortIcon('name')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleSort('matchType')}
                          className="h-8 px-2 flex items-center"
                        >
                          IC Details
                          {getSortIcon('matchType')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleSort('confidence')}
                          className="h-8 px-2 flex items-center"
                        >
                          Match Confidence
                          {getSortIcon('confidence')}
                        </Button>
                      </TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedMerges.map((merge) => {
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
                                onClick={() => toggleRowExpansion(merge)}
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
                              <TableCell colSpan={7} className="p-0">
                                <div className="p-6 space-y-6 bg-muted/20">
                                  {merge.existing_record_id ? (
                                    <>
                                      {/* Side-by-side comparison */}
                                      <div className="grid grid-cols-2 gap-6">
                                        {/* IC Data Column */}
                                        <Card>
                                          <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                              <CardTitle className="text-base">Infinite Campus Data</CardTitle>
                                              <Badge variant="secondary">New from IC</Badge>
                                            </div>
                                          </CardHeader>
                                          <CardContent className="space-y-3">
                                            <div className={getFieldClassName(compareFields(icData.firstName, expandedRecordDetails.get(merge.id)?.first_name))}>
                                              <div className="text-xs text-muted-foreground">First Name</div>
                                              <div className="font-medium">{icData.firstName || 'N/A'}</div>
                                            </div>
                                            <div className={getFieldClassName(compareFields(icData.lastName, expandedRecordDetails.get(merge.id)?.last_name))}>
                                              <div className="text-xs text-muted-foreground">Last Name</div>
                                              <div className="font-medium">{icData.lastName || 'N/A'}</div>
                                            </div>
                                            {merge.record_type === 'teacher' && (
                                              <div className={getFieldClassName(compareFields(icData.email, expandedRecordDetails.get(merge.id)?.email))}>
                                                <div className="text-xs text-muted-foreground">Email</div>
                                                <div className="font-medium">{icData.email || 'N/A'}</div>
                                              </div>
                                            )}
                                            {merge.record_type === 'student' && (
                                              <>
                                                <div className={getFieldClassName(compareFields(icData.studentId, expandedRecordDetails.get(merge.id)?.student_id))}>
                                                  <div className="text-xs text-muted-foreground">Student ID</div>
                                                  <div className="font-medium">{icData.studentId || 'N/A'}</div>
                                                </div>
                                                <div className={getFieldClassName(compareFields(icData.gradeLevel, expandedRecordDetails.get(merge.id)?.grade_level))}>
                                                  <div className="text-xs text-muted-foreground">Grade Level</div>
                                                  <div className="font-medium">{icData.gradeLevel || 'N/A'}</div>
                                                </div>
                                              </>
                                            )}
                                            <div>
                                              <div className="text-xs text-muted-foreground">IC External ID</div>
                                              <div className="font-mono text-xs">{merge.ic_external_id}</div>
                                            </div>
                                          </CardContent>
                                        </Card>

                                        {/* Existing Data Column */}
                                        <Card>
                                          <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                              <CardTitle className="text-base">Current DismissalPro Record</CardTitle>
                                              <Badge>Existing</Badge>
                                            </div>
                                          </CardHeader>
                                          <CardContent className="space-y-3">
                                            {expandedRecordDetails.get(merge.id) ? (
                                              <>
                                                <div>
                                                  <div className="text-xs text-muted-foreground">First Name</div>
                                                  <div className="font-medium">{expandedRecordDetails.get(merge.id).first_name || 'N/A'}</div>
                                                </div>
                                                <div>
                                                  <div className="text-xs text-muted-foreground">Last Name</div>
                                                  <div className="font-medium">{expandedRecordDetails.get(merge.id).last_name || 'N/A'}</div>
                                                </div>
                                                {merge.record_type === 'teacher' && (
                                                  <div>
                                                    <div className="text-xs text-muted-foreground">Email</div>
                                                    <div className="font-medium">{expandedRecordDetails.get(merge.id).email || 'N/A'}</div>
                                                  </div>
                                                )}
                                                {merge.record_type === 'student' && (
                                                  <>
                                                    <div>
                                                      <div className="text-xs text-muted-foreground">Student ID</div>
                                                      <div className="font-medium">{expandedRecordDetails.get(merge.id).student_id || 'N/A'}</div>
                                                    </div>
                                                    <div>
                                                      <div className="text-xs text-muted-foreground">Grade Level</div>
                                                      <div className="font-medium">{expandedRecordDetails.get(merge.id).grade_level || 'N/A'}</div>
                                                    </div>
                                                  </>
                                                )}
                                                <div>
                                                  <div className="text-xs text-muted-foreground">IC External ID</div>
                                                  <div className="font-mono text-xs">{expandedRecordDetails.get(merge.id).ic_external_id || 'Not linked'}</div>
                                                </div>
                                              </>
                                            ) : (
                                              <div className="flex items-center justify-center py-8">
                                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                              </div>
                                            )}
                                          </CardContent>
                                        </Card>
                                      </div>

                                      {/* Impact Summary */}
                                      {expandedRecordDetails.get(merge.id) && (
                                        <Alert>
                                          <AlertCircle className="h-4 w-4" />
                                          <AlertTitle>Changes Summary</AlertTitle>
                                          <AlertDescription>
                                            {(() => {
                                              const existing = expandedRecordDetails.get(merge.id);
                                              const changes: string[] = [];
                                              
                                              if (compareFields(icData.firstName, existing.first_name) !== 'match') {
                                                changes.push(`First Name: ${existing.first_name} → ${icData.firstName}`);
                                              }
                                              if (compareFields(icData.lastName, existing.last_name) !== 'match') {
                                                changes.push(`Last Name: ${existing.last_name} → ${icData.lastName}`);
                                              }
                                              if (merge.record_type === 'teacher' && compareFields(icData.email, existing.email) !== 'match') {
                                                changes.push(`Email: ${existing.email} → ${icData.email}`);
                                              }
                                              if (merge.record_type === 'student') {
                                                if (compareFields(icData.studentId, existing.student_id) !== 'match') {
                                                  changes.push(`Student ID: ${existing.student_id} → ${icData.studentId}`);
                                                }
                                                if (compareFields(icData.gradeLevel, existing.grade_level) !== 'match') {
                                                  changes.push(`Grade: ${existing.grade_level} → ${icData.gradeLevel}`);
                                                }
                                              }
                                              
                                              if (changes.length === 0) {
                                                return 'No field changes detected. This merge will link the IC External ID.';
                                              }
                                              
                                              return (
                                                <div className="space-y-1 mt-2">
                                                  <div className="font-medium">{changes.length} field(s) will be updated:</div>
                                                  <ul className="list-disc list-inside space-y-1 text-sm">
                                                    {changes.map((change, i) => (
                                                      <li key={i}>{change}</li>
                                                    ))}
                                                  </ul>
                                                </div>
                                              );
                                            })()}
                                          </AlertDescription>
                                        </Alert>
                                      )}

                                      {/* Match Confidence Explanation */}
                                      <Card>
                                        <CardHeader className="pb-3">
                                          <CardTitle className="text-sm">Why this match?</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2 text-sm">
                                          <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Match Criteria:</span>
                                            <Badge variant="outline">{merge.match_criteria || 'N/A'}</Badge>
                                          </div>
                                          <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Confidence Score:</span>
                                            <span className="font-medium">{Math.round(merge.match_confidence || 0)}%</span>
                                          </div>
                                          <div className="text-xs text-muted-foreground pt-2 border-t">
                                            {(() => {
                                              const level = getConfidenceLevel(merge.match_confidence || 0);
                                              if (level === 'high') return 'High confidence match - recommended to approve';
                                              if (level === 'medium') return 'Medium confidence - please review carefully';
                                              if (level === 'low') return 'Low confidence - verify before approving';
                                              return 'Very low confidence - consider creating as new record';
                                            })()}
                                          </div>
                                        </CardContent>
                                      </Card>

                                      {/* Comments Section */}
                                      <div className="mt-6 pt-6 border-t">
                                        <MergeCommentsSection mergeId={merge.id} />
                                      </div>
                                    </>
                                  ) : (
                                    /* New Record (no existing match) */
                                    <Card>
                                      <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                          <CardTitle className="text-base">New Record from Infinite Campus</CardTitle>
                                          <Badge variant="secondary">No Existing Match</Badge>
                                        </div>
                                      </CardHeader>
                                      <CardContent className="space-y-3">
                                        <Alert>
                                          <AlertCircle className="h-4 w-4" />
                                          <AlertTitle>Create New Record</AlertTitle>
                                          <AlertDescription>
                                            No existing record found. Selecting "Create New" will add this {merge.record_type} to DismissalPro.
                                          </AlertDescription>
                                        </Alert>
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <div className="text-xs text-muted-foreground">First Name</div>
                                            <div className="font-medium">{icData.firstName}</div>
                                          </div>
                                          <div>
                                            <div className="text-xs text-muted-foreground">Last Name</div>
                                            <div className="font-medium">{icData.lastName}</div>
                                          </div>
                                          {merge.record_type === 'teacher' && (
                                            <div className="col-span-2">
                                              <div className="text-xs text-muted-foreground">Email</div>
                                              <div className="font-medium">{icData.email || 'N/A'}</div>
                                            </div>
                                          )}
                                          {merge.record_type === 'student' && (
                                            <>
                                              <div>
                                                <div className="text-xs text-muted-foreground">Student ID</div>
                                                <div className="font-medium">{icData.studentId || 'N/A'}</div>
                                              </div>
                                              <div>
                                                <div className="text-xs text-muted-foreground">Grade Level</div>
                                                <div className="font-medium">{icData.gradeLevel || 'N/A'}</div>
                                              </div>
                                            </>
                                          )}
                                          <div className="col-span-2">
                                            <div className="text-xs text-muted-foreground">IC External ID</div>
                                            <div className="font-mono text-xs">{merge.ic_external_id}</div>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  )}
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

              {sortedMerges.length > 0 && totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        // Show first page, last page, current page, and pages near current
                        return (
                          page === 1 ||
                          page === totalPages ||
                          Math.abs(page - currentPage) <= 1
                        );
                      })
                      .map((page, index, array) => {
                        // Add ellipsis if there's a gap
                        const prevPage = array[index - 1];
                        const showEllipsis = prevPage && page - prevPage > 1;
                        
                        return (
                          <div key={page} className="flex items-center gap-1">
                            {showEllipsis && (
                              <span className="px-2 text-muted-foreground">...</span>
                            )}
                            <Button
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="w-9"
                            >
                              {page}
                            </Button>
                          </div>
                        );
                      })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
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

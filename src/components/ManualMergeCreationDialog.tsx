import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Search, Loader2, UserCheck, Users, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ManualMergeCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: number;
  onMergeCreated: () => void;
}

export const ManualMergeCreationDialog = ({
  open,
  onOpenChange,
  schoolId,
  onMergeCreated
}: ManualMergeCreationDialogProps) => {
  const [recordType, setRecordType] = useState<'student' | 'teacher'>('student');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedRecord1, setSelectedRecord1] = useState<any>(null);
  const [selectedRecord2, setSelectedRecord2] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const table = recordType === 'student' ? 'students' : 'teachers';
      const query = searchQuery.toLowerCase();
      
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('school_id', schoolId)
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%${recordType === 'teacher' ? `,email.ilike.%${query}%` : ''}`)
        .limit(20);

      if (error) throw error;

      setSearchResults(data || []);

      if (data?.length === 0) {
        toast.info('No records found matching your search');
      }
    } catch (error: any) {
      console.error('Error searching:', error);
      toast.error('Failed to search records');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreateMerge = async () => {
    if (!selectedRecord1 || !selectedRecord2) {
      toast.error('Please select two records to compare');
      return;
    }

    if (selectedRecord1.id === selectedRecord2.id) {
      toast.error('Cannot create merge for the same record');
      return;
    }

    setIsCreating(true);
    try {
      // Calculate basic similarity
      const similarity = calculateSimilarity(selectedRecord1, selectedRecord2);

      // Create a manual pending merge
      const { error } = await supabase
        .from('ic_pending_merges')
        .insert({
          school_id: schoolId,
          record_type: recordType,
          existing_record_id: selectedRecord1.id,
          ic_external_id: `manual_${Date.now()}`,
          ic_data: recordType === 'student' ? {
            firstName: selectedRecord2.first_name,
            lastName: selectedRecord2.last_name,
            studentId: selectedRecord2.student_id,
            gradeLevel: selectedRecord2.grade_level,
          } : {
            firstName: selectedRecord2.first_name,
            lastName: selectedRecord2.last_name,
            email: selectedRecord2.email,
          },
          match_confidence: similarity,
          match_criteria: 'manual_review',
          status: 'pending',
        });

      if (error) throw error;

      toast.success('Manual merge request created successfully');
      onMergeCreated();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('Error creating merge:', error);
      toast.error(error.message || 'Failed to create merge request');
    } finally {
      setIsCreating(false);
    }
  };

  const calculateSimilarity = (record1: any, record2: any): number => {
    let score = 0;
    let checks = 0;

    const compareStrings = (str1: string, str2: string): number => {
      if (!str1 || !str2) return 0;
      return str1.toLowerCase() === str2.toLowerCase() ? 100 : 50;
    };

    // Compare first name
    if (record1.first_name && record2.first_name) {
      score += compareStrings(record1.first_name, record2.first_name);
      checks++;
    }

    // Compare last name
    if (record1.last_name && record2.last_name) {
      score += compareStrings(record1.last_name, record2.last_name);
      checks++;
    }

    // Record-specific comparisons
    if (recordType === 'student' && record1.grade_level && record2.grade_level) {
      score += record1.grade_level === record2.grade_level ? 100 : 0;
      checks++;
    }

    if (recordType === 'teacher' && record1.email && record2.email) {
      score += compareStrings(record1.email, record2.email);
      checks++;
    }

    return checks > 0 ? Math.round(score / checks) : 50;
  };

  const resetForm = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedRecord1(null);
    setSelectedRecord2(null);
  };

  const handleRecordSelect = (record: any) => {
    if (!selectedRecord1) {
      setSelectedRecord1(record);
    } else if (!selectedRecord2) {
      setSelectedRecord2(record);
    } else {
      // Replace second record
      setSelectedRecord2(record);
    }
  };

  const getRecordDisplay = (record: any) => {
    if (!record) return null;
    return recordType === 'student' 
      ? `${record.first_name} ${record.last_name} - Grade ${record.grade_level}`
      : `${record.first_name} ${record.last_name} - ${record.email}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Create Manual Merge Request
          </DialogTitle>
          <DialogDescription>
            Search for potential duplicate records and flag them for review. This is useful for finding duplicates in your existing data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Record Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Record Type</label>
            <Select value={recordType} onValueChange={(value: any) => {
              setRecordType(value);
              resetForm();
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Students</SelectItem>
                <SelectItem value="teacher">Teachers</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Search Records</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Search ${recordType}s by name${recordType === 'teacher' ? ' or email' : ''}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
              </Button>
            </div>
          </div>

          {/* Selected Records */}
          {(selectedRecord1 || selectedRecord2) && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Selected Records for Comparison:</p>
                  {selectedRecord1 && (
                    <div className="flex items-center justify-between bg-primary/5 p-2 rounded">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-primary" />
                        <span className="text-sm">{getRecordDisplay(selectedRecord1)}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedRecord1(null)}>
                        Remove
                      </Button>
                    </div>
                  )}
                  {selectedRecord2 && (
                    <div className="flex items-center justify-between bg-primary/5 p-2 rounded">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-primary" />
                        <span className="text-sm">{getRecordDisplay(selectedRecord2)}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedRecord2(null)}>
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Search Results */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Search Results {searchResults.length > 0 && `(${searchResults.length})`}
            </label>
            <div className="border rounded-lg max-h-96 overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Search for records to find potential duplicates</p>
                </div>
              ) : (
                <div className="divide-y">
                  {searchResults.map((record) => {
                    const isSelected = selectedRecord1?.id === record.id || selectedRecord2?.id === record.id;
                    
                    return (
                      <Card 
                        key={record.id} 
                        className={`border-0 rounded-none cursor-pointer hover:bg-muted/50 transition-colors ${
                          isSelected ? 'bg-primary/10' : ''
                        }`}
                        onClick={() => handleRecordSelect(record)}
                      >
                        <CardContent className="py-3 px-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">
                                {record.first_name} {record.last_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {recordType === 'student' 
                                  ? `Grade ${record.grade_level} • ID: ${record.student_id || 'N/A'}`
                                  : record.email
                                }
                              </div>
                            </div>
                            {isSelected && (
                              <Badge variant="outline" className="bg-primary/10 text-primary">
                                Selected
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateMerge}
              disabled={!selectedRecord1 || !selectedRecord2 || isCreating}
            >
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Merge Request
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

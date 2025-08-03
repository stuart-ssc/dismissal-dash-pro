import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, AlertCircle, CheckCircle, Loader2, Users, GraduationCap, UserCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

interface RosterRow {
  studentId?: string;
  firstName: string;
  lastName: string;
  gradeLevel: string;
  className: string;
  roomNumber?: string;
  teacherFirstName: string;
  teacherLastName: string;
  teacherEmail: string;
  parentGuardianName?: string;
  contactInfo?: string;
  specialNotes?: string;
  dismissalGroup?: string;
}

interface ImportResults {
  studentsCreated: number;
  teachersCreated: number;
  classesCreated: number;
  studentsEnrolled: number;
  teachersAssigned: number;
  errors: string[];
}

const Import = () => {
  const { user, userRole, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [schoolName, setSchoolName] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [parsedData, setParsedData] = useState<RosterRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchSchoolName = async () => {
      if (!user) return;
      
      try {
        // Get user's profile to get school_id, first_name, and last_name
        const { data: profile } = await supabase
          .from('profiles')
          .select('school_id, first_name, last_name')
          .eq('id', user.id)
          .single();

        if (profile) {
          setFirstName(profile.first_name || '');
          setLastName(profile.last_name || '');

          if (profile.school_id) {
            // Get school name
            const { data: school } = await supabase
              .from('schools')
              .select('school_name')
              .eq('id', profile.school_id)
              .single();

            if (school?.school_name) {
              setSchoolName(school.school_name);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching school name:', error);
      }
    };

    fetchSchoolName();
  }, [user]);

  const parseCSVContent = (content: string): RosterRow[] => {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('File must contain at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows: RosterRow[] = [];
    const errors: string[] = [];

    // Expected column mappings
    const columnMap = {
      'student id': 'studentId',
      'studentid': 'studentId',
      'id': 'studentId',
      'first name': 'firstName',
      'firstname': 'firstName',
      'last name': 'lastName',
      'lastname': 'lastName',
      'grade': 'gradeLevel',
      'grade level': 'gradeLevel',
      'class': 'className',
      'class name': 'className',
      'classroom': 'className',
      'room': 'roomNumber',
      'room number': 'roomNumber',
      'teacher first name': 'teacherFirstName',
      'teacherfirstname': 'teacherFirstName',
      'teacher last name': 'teacherLastName',
      'teacherlastname': 'teacherLastName',
      'teacher email': 'teacherEmail',
      'teacheremail': 'teacherEmail',
      'parent': 'parentGuardianName',
      'guardian': 'parentGuardianName',
      'parent/guardian': 'parentGuardianName',
      'contact': 'contactInfo',
      'contact info': 'contactInfo',
      'phone': 'contactInfo',
      'notes': 'specialNotes',
      'special notes': 'specialNotes',
      'dismissal': 'dismissalGroup',
      'dismissal group': 'dismissalGroup',
    };

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row: any = {};

      headers.forEach((header, index) => {
        const mappedField = columnMap[header as keyof typeof columnMap];
        if (mappedField && values[index]) {
          row[mappedField] = values[index];
        }
      });

      // Validate required fields (student ID is now optional)
      if (!row.firstName || !row.lastName || !row.gradeLevel || !row.className || !row.teacherFirstName || !row.teacherLastName || !row.teacherEmail) {
        errors.push(`Row ${i + 1}: Missing required fields (First Name, Last Name, Grade Level, Class Name, Teacher First Name, Teacher Last Name, Teacher Email)`);
        continue;
      }

      rows.push(row as RosterRow);
    }

    setParseErrors(errors);
    return rows;
  };

  const processFile = async (file: File) => {
    try {
      const content = await file.text();
      const data = parseCSVContent(content);
      setParsedData(data);
      
      if (data.length === 0) {
        throw new Error('No valid rows found in the file');
      }

      toast({
        title: "File Parsed Successfully",
        description: `Found ${data.length} valid rows to import`,
      });
    } catch (error) {
      toast({
        title: "File Parse Error",
        description: error.message,
        variant: "destructive",
      });
      setParseErrors([error.message]);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || parsedData.length === 0) {
      toast({
        title: "No Data to Import",
        description: "Please select and parse a valid CSV file first",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setUploadProgress(0);
    setImportResults(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('rosterData', JSON.stringify(parsedData));

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const { data, error } = await supabase.functions.invoke('import-roster', {
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (error) throw error;

      setImportResults(data.results);
      toast({
        title: "Import Completed",
        description: data.message,
      });

    } catch (error) {
      toast({
        title: "Import Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(file => file.type === 'text/csv' || file.name.endsWith('.csv'));
    
    if (csvFile) {
      setSelectedFile(csvFile);
      processFile(csvFile);
    } else {
      toast({
        title: "Invalid File Type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const csvFile = files[0];
    
    if (csvFile && (csvFile.type === 'text/csv' || csvFile.name.endsWith('.csv'))) {
      setSelectedFile(csvFile);
      processFile(csvFile);
    } else {
      toast({
        title: "Invalid File Type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // For school admins, show the sidebar layout
  if (userRole === 'school_admin') {
    return (
      <SidebarProvider>
        <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 w-full flex">
          <AdminSidebar />
          <div className="flex-1 flex flex-col">
            <header className="h-16 flex items-center justify-between px-6 border-b bg-card/50 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="text-2xl font-bold">
                    Import Roster
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Upload student roster files for {schoolName}
                  </p>
                </div>
              </div>
              <Button onClick={signOut} variant="outline">
                Sign Out
              </Button>
            </header>

            <main className="flex-1 p-6 space-y-6">
              <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Roster File
                  </CardTitle>
                  <CardDescription>
                    Upload a CSV or Excel file containing student information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragOver 
                        ? 'border-primary bg-primary/5' 
                        : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Drop your file here</h3>
                    <p className="text-muted-foreground mb-4">
                      or click to browse and select a file
                    </p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload">
                      <Button variant="outline" className="cursor-pointer">
                        Choose File
                      </Button>
                    </label>
                    <p className="text-xs text-muted-foreground mt-4">
                      Supported formats: CSV only
                    </p>
                  </div>

                  {selectedFile && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm font-medium">{selectedFile.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({(selectedFile.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        {parsedData.length > 0 && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      {parsedData.length > 0 && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Ready to import {parsedData.length} students
                        </p>
                      )}
                    </div>
                  )}

                  {parseErrors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          <p className="font-medium">Parse Errors:</p>
                          {parseErrors.slice(0, 5).map((error, index) => (
                            <p key={index} className="text-xs">{error}</p>
                          ))}
                          {parseErrors.length > 5 && (
                            <p className="text-xs">...and {parseErrors.length - 5} more errors</p>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {parsedData.length > 0 && (
                    <Button 
                      onClick={handleFileUpload} 
                      disabled={isProcessing}
                      className="w-full"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing Import...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Import {parsedData.length} Students
                        </>
                      )}
                    </Button>
                  )}

                  {isProcessing && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Import Progress</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="w-full" />
                    </div>
                  )}
                </CardContent>
              </Card>

              {importResults && (
                <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Import Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                        <Users className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                        <div className="text-2xl font-bold text-blue-600">{importResults.studentsCreated}</div>
                        <div className="text-xs text-muted-foreground">Students Created</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                        <UserCheck className="h-6 w-6 mx-auto mb-2 text-green-600" />
                        <div className="text-2xl font-bold text-green-600">{importResults.teachersCreated}</div>
                        <div className="text-xs text-muted-foreground">Teachers Created</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                        <GraduationCap className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                        <div className="text-2xl font-bold text-purple-600">{importResults.classesCreated}</div>
                        <div className="text-xs text-muted-foreground">Classes Created</div>
                      </div>
                      <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                        <Users className="h-6 w-6 mx-auto mb-2 text-orange-600" />
                        <div className="text-2xl font-bold text-orange-600">{importResults.studentsEnrolled}</div>
                        <div className="text-xs text-muted-foreground">Students Enrolled</div>
                      </div>
                      <div className="text-center p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg">
                        <UserCheck className="h-6 w-6 mx-auto mb-2 text-indigo-600" />
                        <div className="text-2xl font-bold text-indigo-600">{importResults.teachersAssigned}</div>
                        <div className="text-xs text-muted-foreground">Teacher Assignments</div>
                      </div>
                    </div>

                    {importResults.errors.length > 0 && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-1">
                            <p className="font-medium">Import Errors ({importResults.errors.length}):</p>
                            {importResults.errors.slice(0, 5).map((error, index) => (
                              <p key={index} className="text-xs">{error}</p>
                            ))}
                            {importResults.errors.length > 5 && (
                              <p className="text-xs">...and {importResults.errors.length - 5} more errors</p>
                            )}
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    File Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Required Columns:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• First Name (or "FirstName")</li>
                      <li>• Last Name (or "LastName")</li>
                      <li>• Grade Level (or "Grade")</li>
                      <li>• Class Name (or "Class", "Classroom")</li>
                      <li>• Teacher First Name (or "TeacherFirstName")</li>
                      <li>• Teacher Last Name (or "TeacherLastName")</li>
                      <li>• Teacher Email (or "TeacherEmail")</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Optional Columns:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Student ID (or "ID", "StudentID")</li>
                      <li>• Room Number (or "Room")</li>
                      <li>• Parent/Guardian Name (or "Parent", "Guardian")</li>
                      <li>• Contact Info (or "Contact", "Phone")</li>
                      <li>• Special Notes (or "Notes")</li>
                      <li>• Dismissal Group (or "Dismissal")</li>
                    </ul>
                  </div>
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2 text-sm">File Format:</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• CSV format only (.csv)</li>
                      <li>• First row must contain column headers</li>
                      <li>• Column names are case-insensitive</li>
                      <li>• Multiple teachers per class separated by commas</li>
                      <li>• Empty optional fields are allowed</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  // For non-admin users, show the original layout
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      <Navbar />
      
      <div className="container mx-auto px-4 py-16">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                Import Roster
              </h1>
              <p className="text-muted-foreground">
                Upload student roster files for {schoolName}
              </p>
            </div>
            <Button onClick={signOut} variant="outline">
              Sign Out
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Roster File
              </CardTitle>
              <CardDescription>
                Upload a CSV or Excel file containing student information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragOver 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Drop your file here</h3>
                <p className="text-muted-foreground mb-4">
                  or click to browse and select a file
                </p>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button variant="outline" className="cursor-pointer">
                    Choose File
                  </Button>
                </label>
                <p className="text-xs text-muted-foreground mt-4">
                  Supported formats: CSV, Excel (.xlsx, .xls)
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                File Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Required Columns:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Student ID</li>
                  <li>• First Name</li>
                  <li>• Last Name</li>
                  <li>• Grade Level</li>
                  <li>• Class/Teacher</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Optional Columns:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Parent/Guardian Name</li>
                  <li>• Contact Information</li>
                  <li>• Special Notes</li>
                  <li>• Dismissal Group</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Import;
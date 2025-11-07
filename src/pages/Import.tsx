import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, AlertCircle, CheckCircle, Loader2, Users, GraduationCap, UserCheck, Mail } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Navbar from "@/components/Navbar";

import { SidebarTrigger } from "@/components/ui/sidebar";

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
  transportation?: string;
  transportationMethod?: string;
}

interface ImportResults {
  success?: boolean;
  studentsCreated: number;
  teachersCreated: number;
  classesCreated: number;
  studentsEnrolled: number;
  teachersAssigned: number;
  busesCreated: number;
  carLinesCreated: number;
  walkerLocationsCreated: number;
  transportationAssignments: number;
  errors: string[];
  details?: string;
  invitationsSent?: boolean;
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
  const [sendInvitations, setSendInvitations] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    console.log('Total lines found:', lines.length);
    
    if (lines.length < 2) {
      throw new Error('File must contain at least a header row and one data row');
    }

    // Normalize headers - remove spaces and convert to lowercase
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, ''));
    console.log('Headers found:', headers);
    
    const rows: RosterRow[] = [];
    const errors: string[] = [];

    // Expected column mappings - normalized keys (no spaces, lowercase)
    const columnMap = {
      'studentid': 'studentId',
      'id': 'studentId',
      'firstname': 'firstName',
      'lastname': 'lastName',
      'grade': 'gradeLevel',
      'gradelevel': 'gradeLevel',
      'class': 'className',
      'classname': 'className',
      'classroom': 'className',
      'room': 'roomNumber',
      'roomnumber': 'roomNumber',
      'teacherfirstname': 'teacherFirstName',
      'teacherlastname': 'teacherLastName',
      'teacheremail': 'teacherEmail',
      'parent': 'parentGuardianName',
      'guardian': 'parentGuardianName',
      'parentguardian': 'parentGuardianName',
      'contact': 'contactInfo',
      'contactinfo': 'contactInfo',
      'phone': 'contactInfo',
      'notes': 'specialNotes',
      'specialnotes': 'specialNotes',
      'dismissal': 'dismissalGroup',
      'dismissalgroup': 'dismissalGroup',
      'transportation': 'transportation',
      'transport': 'transportation',
      'transportationmethod': 'transportationMethod',
      'transportmethod': 'transportationMethod',
      'dismissalmodeid': 'dismissalModeId',
      'dismissal_mode_id': 'dismissalModeId',
      'dismissalid': 'dismissalModeId',
      'cartag': 'dismissalModeId',
      'car_tag': 'dismissalModeId',
      'tagnumber': 'dismissalModeId',
      'tag_number': 'dismissalModeId',
    };

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      console.log(`Row ${i + 1} values:`, values);
      
      const row: any = {};

      headers.forEach((header, index) => {
        const mappedField = columnMap[header as keyof typeof columnMap];
        if (mappedField && values[index]) {
          row[mappedField] = values[index];
          console.log(`Mapped ${header} -> ${mappedField}: ${values[index]}`);
        }
      });

      console.log(`Row ${i + 1} mapped object:`, row);
      
      // Validate required fields (student ID is now optional)
      const missingFields = [];
      if (!row.firstName) missingFields.push('First Name');
      if (!row.lastName) missingFields.push('Last Name');
      if (!row.gradeLevel) missingFields.push('Grade Level');
      if (!row.className) missingFields.push('Class Name');
      if (!row.teacherFirstName) missingFields.push('Teacher First Name');
      if (!row.teacherLastName) missingFields.push('Teacher Last Name');
      if (!row.teacherEmail) missingFields.push('Teacher Email');

      if (missingFields.length > 0) {
        console.log(`Row ${i + 1} missing fields:`, missingFields);
        errors.push(`Row ${i + 1}: Missing required fields (${missingFields.join(', ')})`);
        continue;
      }

      rows.push(row as RosterRow);
    }

    console.log('Final parsed rows:', rows);
    console.log('Parse errors:', errors);

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
      formData.append('sendInvitations', sendInvitations.toString());

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
      <>
        <header className="h-16 flex items-center justify-between px-6 border-b bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <div>
              <h1 className="text-2xl font-bold">
                {schoolName}
              </h1>
              <p className="text-sm text-muted-foreground">
                Welcome back, {firstName} {lastName}
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
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Choose File
                    </Button>
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
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 p-4 bg-muted/50 rounded-lg">
                        <Checkbox 
                          id="send-invitations" 
                          checked={sendInvitations}
                          onCheckedChange={(checked) => setSendInvitations(checked as boolean)}
                        />
                        <label
                          htmlFor="send-invitations"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          Send invitation emails to teachers immediately
                        </label>
                      </div>
                      <p className="text-xs text-muted-foreground px-4">
                        {sendInvitations 
                          ? "✓ Teachers will receive invitation emails after import completes" 
                          : "⚠️ Teachers will be created but NOT invited. You can invite them later from the People page."}
                      </p>
                      
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
                    </div>
                  )}

                  {isProcessing && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Processing (All-or-Nothing)...</span>
                        <span>In Progress</span>
                      </div>
                      <Progress value={50} className="w-full animate-pulse" />
                      <div className="text-sm text-muted-foreground">
                        Processing {parsedData.length} rows in a single transaction...
                      </div>
                      <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2 rounded">
                        ⚠️ Import will either succeed completely or fail with no changes made
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {importResults && (
                <Card className={`shadow-elevated border-0 backdrop-blur ${
                  importResults.success ? 'bg-green-50/80 border-green-200' : 'bg-red-50/80 border-red-200'
                }`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {importResults.success ? (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          Import Completed Successfully
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-5 w-5 text-red-600" />
                          Import Failed - No Changes Made
                        </>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {importResults.success ? (
                      <>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
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
                          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                            <Users className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
                            <div className="text-2xl font-bold text-yellow-600">{importResults.busesCreated || 0}</div>
                            <div className="text-xs text-muted-foreground">Buses Created</div>
                          </div>
                          <div className="text-center p-3 bg-teal-50 dark:bg-teal-950/20 rounded-lg">
                            <Users className="h-6 w-6 mx-auto mb-2 text-teal-600" />
                            <div className="text-2xl font-bold text-teal-600">{importResults.carLinesCreated || 0}</div>
                            <div className="text-xs text-muted-foreground">Car Lines Created</div>
                          </div>
                          <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                            <Users className="h-6 w-6 mx-auto mb-2 text-emerald-600" />
                            <div className="text-2xl font-bold text-emerald-600">{importResults.walkerLocationsCreated || 0}</div>
                            <div className="text-xs text-muted-foreground">Walker Locations</div>
                          </div>
                        </div>
                        
                        {importResults.invitationsSent !== undefined && (
                          <Alert className={importResults.invitationsSent ? "bg-green-50 border-green-200 dark:bg-green-950/20" : "bg-amber-50 border-amber-200 dark:bg-amber-950/20"}>
                            <AlertDescription className="flex items-center gap-2">
                              {importResults.invitationsSent ? (
                                <>
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <span className="text-green-800 dark:text-green-200">Teacher invitations sent successfully</span>
                                </>
                              ) : (
                                <>
                                  <Mail className="h-4 w-4 text-amber-600" />
                                  <span className="text-amber-800 dark:text-amber-200">Teachers created but not invited. Go to People page to send invitations.</span>
                                </>
                              )}
                            </AlertDescription>
                          </Alert>
                        )}
                      </>
                    ) : (
                      <div className="p-4 bg-red-100 dark:bg-red-950/20 rounded-lg">
                        <div className="font-medium text-red-800 dark:text-red-200 mb-2">Error Details:</div>
                        <div className="text-sm text-red-700 dark:text-red-300">{importResults.details}</div>
                        <div className="mt-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-2 rounded">
                          The database transaction was automatically rolled back. Please fix the error and try again.
                        </div>
                      </div>
                    )}

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
                <CardContent className="p-6">
                  <Accordion type="single" collapsible defaultValue={selectedFile ? "" : "requirements"}>
                    <AccordionItem value="requirements" className="border-none">
                      <AccordionTrigger className="flex items-center gap-2 text-left hover:no-underline p-0">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5" />
                          <span className="text-lg font-semibold">File Requirements</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-4">
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
                             <li>• Transportation (accepted values: "Bus", "Car", "Walker")</li>
                             <li>• Transportation Method (bus number, car line name, or walker location)</li>
                           </ul>
                         </div>
                         <div>
                           <h4 className="font-medium mb-2">Transportation Processing:</h4>
                           <ul className="text-sm text-muted-foreground space-y-1">
                             <li>• If Transportation = "Bus" and Transportation Method is provided, creates bus and assigns student</li>
                             <li>• If Transportation = "Car" and Transportation Method is provided, creates car line and assigns student</li>
                             <li>• If Transportation = "Walker" and Transportation Method is provided, creates walker location and assigns student</li>
                             <li>• Transportation values are case-insensitive (bus, BUS, Bus all work)</li>
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
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </main>
          </>
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
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose File
                </Button>
                <p className="text-xs text-muted-foreground mt-4">
                  Supported formats: CSV, Excel (.xlsx, .xls)
                </p>
              </div>
            </CardContent>
          </Card>

          {parseErrors.length > 0 && (
            <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
              <CardContent className="p-6">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Parsing Errors</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      {parseErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {parsedData.length > 0 && (
            <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
              <CardContent className="p-6 space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Ready to Import</AlertTitle>
                  <AlertDescription>
                    Found {parsedData.length} rows to import. Click the button below to start the import process.
                  </AlertDescription>
                </Alert>
                
                <div className="flex items-center space-x-2 p-4 bg-muted/50 rounded-lg">
                  <Checkbox 
                    id="send-invitations-default" 
                    checked={sendInvitations}
                    onCheckedChange={(checked) => setSendInvitations(checked as boolean)}
                  />
                  <label
                    htmlFor="send-invitations-default"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Send invitation emails to teachers immediately
                  </label>
                </div>
                <p className="text-xs text-muted-foreground px-4">
                  {sendInvitations 
                    ? "✓ Teachers will receive invitation emails after import completes" 
                    : "⚠️ Teachers will be created but NOT invited. You can invite them later from the People page."}
                </p>

                <Button
                  onClick={handleFileUpload}
                  disabled={isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing... {uploadProgress}%
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Import Roster Data
                    </>
                  )}
                </Button>
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
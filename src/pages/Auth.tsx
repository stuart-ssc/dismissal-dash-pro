import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSEO } from "@/hooks/useSEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Mail, Lock, User, Building, UserCheck, Check, ChevronsUpDown, Loader2, Info } from "lucide-react";
import Navbar from "@/components/Navbar";
import logoMark from "@/assets/logo-mark.svg";
import { useAuth } from "@/hooks/useAuth";
import { OAuthButtons } from "@/components/OAuthButtons";
import { supabase } from "@/integrations/supabase/client";
import { SchoolSelectionModal } from "@/components/SchoolSelectionModal";
import { signInSchema, signUpSchema, type SignInFormData, type SignUpFormData } from "@/lib/validation";
import { handleError } from "@/lib/errorHandler";
import { logger } from "@/lib/logger";
import { enhancedSchoolSearch } from "@/lib/schoolSearch";
import { toast } from "sonner";

interface SignInForm extends SignInFormData {}
interface SignUpForm extends SignUpFormData {}

const Auth = () => {
  const { signIn, signUp, user, userRole, loading, signInWithGoogle, signInWithMicrosoft, linkOAuthToInvitation, hasMultipleSchools, activeSchoolId } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const SEO = useSEO();
  const [isLoading, setIsLoading] = useState(false);
  const [showSchoolSelection, setShowSchoolSelection] = useState(false);
const [schools, setSchools] = useState<{ id: number; school_name: string; city: string; state: string }[]>([]);
const [allSchools, setAllSchools] = useState<{ id: number; school_name: string; city: string; state: string }[]>([]);
  const [schoolSearchOpen, setSchoolSearchOpen] = useState(false);
  const [schoolSearchValue, setSchoolSearchValue] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<{ id: number; school_name: string; city: string; state: string } | null>(null);
  const [selectedRole, setSelectedRole] = useState<'school_admin' | 'teacher' | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  
  // Teacher invitation state
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [invitationType, setInvitationType] = useState<string | null>(null);
  const [teacherData, setTeacherData] = useState<any>(null);
  const [isValidatingInvitation, setIsValidatingInvitation] = useState(false);
  
  // Password reset dialog state
  const [showPasswordResetDialog, setShowPasswordResetDialog] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  // School creation state
  const [showCreateSchoolDialog, setShowCreateSchoolDialog] = useState(false);
  const [isCreatingSchool, setIsCreatingSchool] = useState(false);
  const [isInCreateSchoolMode, setIsInCreateSchoolMode] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [isFormPreFilled, setIsFormPreFilled] = useState(false);
  const [newSchoolData, setNewSchoolData] = useState({
    schoolName: '',
    streetAddress: '',
    city: '',
    state: '',
    zipcode: '',
    county: '',
    schoolDistrict: '',
    phoneNumber: '',
    creatorFirstName: '',
    creatorLastName: '',
    creatorEmail: '',
    creatorRole: null as 'school_admin' | 'teacher' | null
  });

  const signInForm = useForm<SignInForm>({
    resolver: zodResolver(signInSchema)
  });
  const signUpForm = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema)
  });

const searchSchools = useCallback(async (query: string) => {
  const q = query.trim();
  if (q.length < 2) {
    setSchools([]);
    return;
  }

  setIsSearching(true);
  try {
    let searchResults: any[] = [];

    // For queries 2+ chars, prioritize server search
    if (q.length >= 2) {
      const { data: serverData, error } = await supabase
        .rpc('search_schools_for_signup', { q })
        .throwOnError();
      
      if (serverData?.length) {
        searchResults = serverData.map(s => ({ ...s, score: 400 }));
        console.debug?.('[Auth] server search', { query: q, count: searchResults.length });
      }
    }

    // Client-side fallback if no server results
    if (searchResults.length === 0) {
      let list = allSchools;

      if (list.length === 0) {
        const { data } = await supabase.rpc('get_schools_for_signup');
        list = data ?? [];
        setAllSchools(list);
        console.debug?.('[Auth] prefetched on demand', { count: list.length });
      }

      searchResults = enhancedSchoolSearch(list, q, 15);
      console.debug?.('[Auth] client search fallback', { query: q, results: searchResults.length });
    }

    setSchools(searchResults);
  } catch (error) {
    const secureError = handleError(error, 'school search');
    logger.warn({
      message: 'School search failed',
      data: { query: q, error: secureError.message }
    });
    setSchools([]);
  } finally {
    setIsSearching(false);
  }
}, [allSchools]);

const prefetchSchools = useCallback(async () => {
  if (allSchools.length > 0) return;
  try {
    const { data } = await supabase.rpc('get_schools_for_signup');
    setAllSchools(data ?? []);
    console.debug?.('[Auth] prefetched schools', { count: (data ?? []).length });
  } catch (error) {
    const secureError = handleError(error, 'prefetch schools');
    logger.warn({
      message: 'Prefetch schools failed',
      data: { error: secureError.message }
    });
  }
}, [allSchools]);

  // Prefetch schools immediately on mount to avoid empty-list races
  useEffect(() => {
    prefetchSchools();
  }, [prefetchSchools]);

  // Check for teacher invitation in URL params
  useEffect(() => {
    const invitation = searchParams.get('invitation');
    const type = searchParams.get('type');
    
    if (invitation && type === 'teacher') {
      setInvitationToken(invitation);
      setInvitationType(type);
      validateTeacherInvitation(invitation);
    }
  }, [searchParams]);

  const validateTeacherInvitation = async (token: string) => {
    setIsValidatingInvitation(true);
    try {
      // Use secure edge function instead of direct table query
      const { data, error } = await supabase.functions.invoke('validate-teacher-invitation', {
        body: { token }
      });

      if (error || !data?.valid) {
        toast.error(data?.error || 'Invalid or expired invitation link');
        setInvitationToken(null);
        setInvitationType(null);
        return;
      }

      // Store minimal data returned from secure endpoint
      setTeacherData({
        first_name: data.firstName,
        schools: { school_name: data.schoolName }
      });
      toast.success(`Welcome ${data.firstName}! Please complete your account setup.`);
    } catch (error) {
      const secureError = handleError(error, 'invitation validation');
      logger.warn({
        message: 'Invitation validation failed',
        data: { error: secureError.message }
      });
      toast.error('Error validating invitation');
      setInvitationToken(null);
      setInvitationType(null);
    } finally {
      setIsValidatingInvitation(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchSchools(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchSchools]);

  useEffect(() => {
    if (!loading && user && userRole) {
      if (userRole === 'system_admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, userRole, loading, navigate]);

  // Check if school selection modal should be shown
  useEffect(() => {
    if (hasMultipleSchools && !activeSchoolId) {
      setShowSchoolSelection(true);
    } else {
      setShowSchoolSelection(false);
    }
  }, [hasMultipleSchools, activeSchoolId]);

  const handleSignIn = async (data: SignInForm) => {
    setIsLoading(true);
    await signIn(data.email, data.password);
    setIsLoading(false);
  };

  const handleSignUp = async (data: SignUpForm) => {
    setIsLoading(true);
    await signUp(data.email, data.password, data.firstName, data.lastName, parseInt(data.schoolId), data.role);
    setIsLoading(false);
  };

  const handleTeacherInvitationSignup = async (data: { password: string }) => {
    if (!invitationToken) return;
    
    setIsLoading(true);
    try {
      // Use secure edge function to complete signup
      const { data: result, error } = await supabase.functions.invoke('complete-teacher-signup', {
        body: { 
          token: invitationToken,
          password: data.password
        }
      });

      if (error || !result?.success) {
        throw new Error(result?.error || error?.message || 'Failed to complete account setup');
      }

      toast.success(result.message || 'Account created successfully! Please check your email to verify your account.');
      setInvitationToken(null);
      setInvitationType(null);
      setTeacherData(null);
    } catch (error: any) {
      const secureError = handleError(error, 'teacher signup');
      logger.warn({
        message: 'Teacher signup failed',
        data: { error: secureError.message }
      });
      toast.error(secureError.userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      toast.error('Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/`,
      });

      if (error) throw error;

      toast.success('Password reset email sent! Check your inbox.');
      setShowPasswordResetDialog(false);
      setResetEmail("");
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast.error(error.message || 'Failed to send password reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate school fields
    if (!newSchoolData.schoolName || !newSchoolData.city || !newSchoolData.state) {
      toast.error('Please fill in all required school fields');
      return;
    }
    
    // Validate user fields
    if (!newSchoolData.creatorFirstName || !newSchoolData.creatorLastName || 
        !newSchoolData.creatorEmail || !newSchoolData.creatorRole) {
      toast.error('Please fill in all required personal information');
      return;
    }

    setIsCreatingSchool(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-school', {
        body: {
          // School data
          schoolName: newSchoolData.schoolName.trim(),
          streetAddress: newSchoolData.streetAddress.trim(),
          city: newSchoolData.city.trim(),
          state: newSchoolData.state,
          zipcode: newSchoolData.zipcode.trim(),
          county: newSchoolData.county.trim(),
          schoolDistrict: newSchoolData.schoolDistrict.trim(),
          phoneNumber: newSchoolData.phoneNumber.trim(),
          
          // User data
          creatorEmail: newSchoolData.creatorEmail.trim(),
          creatorFirstName: newSchoolData.creatorFirstName.trim(),
          creatorLastName: newSchoolData.creatorLastName.trim(),
          creatorRole: newSchoolData.creatorRole
        }
      });

      if (error) throw error;

      // Success! Pre-fill the signup form and exit create mode
      setSelectedSchool({
        id: data.schoolId,
        school_name: data.schoolName,
        city: newSchoolData.city,
        state: newSchoolData.state
      });
      
      setSelectedRole(newSchoolData.creatorRole!);
      
      // Pre-fill the signup form
      signUpForm.setValue('schoolId', data.schoolId.toString());
      signUpForm.setValue('role', newSchoolData.creatorRole!);
      signUpForm.setValue('firstName', newSchoolData.creatorFirstName);
      signUpForm.setValue('lastName', newSchoolData.creatorLastName);
      signUpForm.setValue('email', newSchoolData.creatorEmail);
      
      // Mark form as pre-filled
      setIsFormPreFilled(true);
      
      // Exit create school mode
      setIsInCreateSchoolMode(false);
      setShowSuccessBanner(true);
      
      // Auto-hide success banner after 5 seconds
      setTimeout(() => setShowSuccessBanner(false), 5000);
      
      toast.success(
        data.flagged 
          ? `${data.schoolName} has been added! Note: This school will be reviewed by our team. Now set your password to complete signup.`
          : `${data.schoolName} has been added! Now set your password to complete signup.`
      );
      
    } catch (error: any) {
      console.error('Create school error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // Extract actual error message
      const errorMessage = error?.context?.body?.error || 
                           error?.message || 
                           'Failed to create school';
      
      if (errorMessage.includes('rate limit') || errorMessage.includes('Rate limit')) {
        toast.error(errorMessage);
      } else if (errorMessage.includes('duplicate') || errorMessage.includes('already exists')) {
        toast.error(errorMessage);
      } else if (errorMessage.includes('required') || errorMessage.includes('must be')) {
        toast.error(errorMessage);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsCreatingSchool(false);
    }
  };

  const handleOAuthGoogle = async () => {
    // If invitation token exists, we don't need school/role selection
    if (invitationToken) {
      setIsLoading(true);
      try {
        // Store invitation token temporarily in sessionStorage (more secure than localStorage)
        sessionStorage.setItem('pendingInvitation', invitationToken);
        await signInWithGoogle();
      } catch (error) {
        toast.error('Failed to sign in with Google');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Regular signup - validate school and role are selected
    if (!selectedSchool || !selectedRole) {
      toast.error('Please select your school and role first');
      return;
    }

    setIsLoading(true);
    try {
      // Create secure server-side OAuth state
      const { data, error } = await supabase.functions.invoke('prepare-oauth-signup', {
        body: {
          schoolId: selectedSchool.id,
          role: selectedRole,
          email: null
        }
      });

      if (error || !data?.stateToken) {
        throw new Error('Failed to prepare OAuth signup');
      }

      // Store state token temporarily for OAuth callback
      sessionStorage.setItem('oauth_state_token', data.stateToken);
      sessionStorage.setItem('oauth_state_expires', data.expiresAt);
      
      await signInWithGoogle();
    } catch (error) {
      console.error('OAuth Google error:', error);
      toast.error('Failed to prepare sign in with Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthMicrosoft = async () => {
    // If invitation token exists, we don't need school/role selection
    if (invitationToken) {
      setIsLoading(true);
      try {
        // Store invitation token temporarily in sessionStorage (more secure than localStorage)
        sessionStorage.setItem('pendingInvitation', invitationToken);
        await signInWithMicrosoft();
      } catch (error) {
        toast.error('Failed to sign in with Microsoft');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Regular signup - validate school and role are selected
    if (!selectedSchool || !selectedRole) {
      toast.error('Please select your school and role first');
      return;
    }

    setIsLoading(true);
    try {
      // Create secure server-side OAuth state
      const { data, error } = await supabase.functions.invoke('prepare-oauth-signup', {
        body: {
          schoolId: selectedSchool.id,
          role: selectedRole,
          email: null
        }
      });

      if (error || !data?.stateToken) {
        throw new Error('Failed to prepare OAuth signup');
      }

      // Store state token temporarily for OAuth callback
      sessionStorage.setItem('oauth_state_token', data.stateToken);
      sessionStorage.setItem('oauth_state_expires', data.expiresAt);
      
      await signInWithMicrosoft();
    } catch (error) {
      console.error('OAuth Microsoft error:', error);
      toast.error('Failed to prepare sign in with Microsoft');
    } finally {
      setIsLoading(false);
    }
  };

  // Check for pending invitation or OAuth state after OAuth redirect
  useEffect(() => {
    const pendingInvitation = sessionStorage.getItem('pendingInvitation');
    if (pendingInvitation && user && !userRole) {
      // User just completed OAuth and has a pending invitation
      linkOAuthToInvitation(pendingInvitation).then(() => {
        sessionStorage.removeItem('pendingInvitation');
      });
    }
  }, [user, userRole, linkOAuthToInvitation]);

  if (loading || isValidatingInvitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        {isValidatingInvitation && (
          <p className="mt-4 text-muted-foreground">Validating invitation...</p>
        )}
      </div>
    );
  }

  return (
    <>
      <SEO />
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
        <Navbar />
        
        <div className="container mx-auto px-4 py-16 flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-white">
                  <img src={logoMark} alt="Dismissal Pro" className="h-8 w-8" />
                </div>
              </div>
              <h1 className="text-3xl font-bold mb-2">Welcome to Dismissal Pro</h1>
              <p className="text-muted-foreground">Streamline your school's dismissal process</p>
            </div>

            {/* Success Banner */}
            {showSuccessBanner && (
              <Alert className="mb-4 border-green-500 bg-green-50 dark:bg-green-950">
                <Check className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  ✓ <strong>{selectedSchool?.school_name}</strong> has been added! 
                  Complete your signup below by setting a password.
                </AlertDescription>
              </Alert>
            )}

            {isInCreateSchoolMode ? (
              // Full-page "Add Your School" form
              <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure? Your information will be lost.')) {
                          setIsInCreateSchoolMode(false);
                          setNewSchoolData({
                            schoolName: '',
                            streetAddress: '',
                            city: '',
                            state: '',
                            zipcode: '',
                            county: '',
                            schoolDistrict: '',
                            phoneNumber: '',
                            creatorFirstName: '',
                            creatorLastName: '',
                            creatorEmail: '',
                            creatorRole: null
                          });
                        }
                      }}
                    >
                      ← Back to School Search
                    </Button>
                    <Badge variant="outline">Step 1 of 2</Badge>
                  </div>
                  
                  <CardTitle className="text-2xl">Add Your School to DismissalPro</CardTitle>
                  <CardDescription>
                    We'll add your school immediately so you can start using DismissalPro. 
                    Our team will verify the details within 24 hours.
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <form onSubmit={handleCreateSchool} className="space-y-6">
                    {/* SECTION 1: School Information */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Building className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">School Information</h3>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="create-school-name">
                          School Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="create-school-name"
                          value={newSchoolData.schoolName}
                          onChange={(e) => setNewSchoolData(prev => ({ ...prev, schoolName: e.target.value }))}
                          placeholder="Lincoln Elementary School"
                          required
                          minLength={3}
                          maxLength={100}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="create-school-address">Street Address</Label>
                        <Input
                          id="create-school-address"
                          value={newSchoolData.streetAddress}
                          onChange={(e) => setNewSchoolData(prev => ({ ...prev, streetAddress: e.target.value }))}
                          placeholder="123 Main Street"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="create-school-city">
                            City <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="create-school-city"
                            value={newSchoolData.city}
                            onChange={(e) => setNewSchoolData(prev => ({ ...prev, city: e.target.value }))}
                            placeholder="Springfield"
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="create-school-state">
                            State <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={newSchoolData.state}
                            onValueChange={(value) => setNewSchoolData(prev => ({ ...prev, state: value }))}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AL">Alabama</SelectItem>
                              <SelectItem value="AK">Alaska</SelectItem>
                              <SelectItem value="AZ">Arizona</SelectItem>
                              <SelectItem value="AR">Arkansas</SelectItem>
                              <SelectItem value="CA">California</SelectItem>
                              <SelectItem value="CO">Colorado</SelectItem>
                              <SelectItem value="CT">Connecticut</SelectItem>
                              <SelectItem value="DE">Delaware</SelectItem>
                              <SelectItem value="FL">Florida</SelectItem>
                              <SelectItem value="GA">Georgia</SelectItem>
                              <SelectItem value="HI">Hawaii</SelectItem>
                              <SelectItem value="ID">Idaho</SelectItem>
                              <SelectItem value="IL">Illinois</SelectItem>
                              <SelectItem value="IN">Indiana</SelectItem>
                              <SelectItem value="IA">Iowa</SelectItem>
                              <SelectItem value="KS">Kansas</SelectItem>
                              <SelectItem value="KY">Kentucky</SelectItem>
                              <SelectItem value="LA">Louisiana</SelectItem>
                              <SelectItem value="ME">Maine</SelectItem>
                              <SelectItem value="MD">Maryland</SelectItem>
                              <SelectItem value="MA">Massachusetts</SelectItem>
                              <SelectItem value="MI">Michigan</SelectItem>
                              <SelectItem value="MN">Minnesota</SelectItem>
                              <SelectItem value="MS">Mississippi</SelectItem>
                              <SelectItem value="MO">Missouri</SelectItem>
                              <SelectItem value="MT">Montana</SelectItem>
                              <SelectItem value="NE">Nebraska</SelectItem>
                              <SelectItem value="NV">Nevada</SelectItem>
                              <SelectItem value="NH">New Hampshire</SelectItem>
                              <SelectItem value="NJ">New Jersey</SelectItem>
                              <SelectItem value="NM">New Mexico</SelectItem>
                              <SelectItem value="NY">New York</SelectItem>
                              <SelectItem value="NC">North Carolina</SelectItem>
                              <SelectItem value="ND">North Dakota</SelectItem>
                              <SelectItem value="OH">Ohio</SelectItem>
                              <SelectItem value="OK">Oklahoma</SelectItem>
                              <SelectItem value="OR">Oregon</SelectItem>
                              <SelectItem value="PA">Pennsylvania</SelectItem>
                              <SelectItem value="RI">Rhode Island</SelectItem>
                              <SelectItem value="SC">South Carolina</SelectItem>
                              <SelectItem value="SD">South Dakota</SelectItem>
                              <SelectItem value="TN">Tennessee</SelectItem>
                              <SelectItem value="TX">Texas</SelectItem>
                              <SelectItem value="UT">Utah</SelectItem>
                              <SelectItem value="VT">Vermont</SelectItem>
                              <SelectItem value="VA">Virginia</SelectItem>
                              <SelectItem value="WA">Washington</SelectItem>
                              <SelectItem value="WV">West Virginia</SelectItem>
                              <SelectItem value="WI">Wisconsin</SelectItem>
                              <SelectItem value="WY">Wyoming</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="create-school-zipcode">Zipcode</Label>
                          <Input
                            id="create-school-zipcode"
                            value={newSchoolData.zipcode}
                            onChange={(e) => setNewSchoolData(prev => ({ ...prev, zipcode: e.target.value }))}
                            placeholder="12345"
                            pattern="[0-9]{5}"
                            maxLength={5}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="create-school-county">County</Label>
                          <Input
                            id="create-school-county"
                            value={newSchoolData.county}
                            onChange={(e) => setNewSchoolData(prev => ({ ...prev, county: e.target.value }))}
                            placeholder="Sangamon County"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="create-school-district">School District</Label>
                        <Input
                          id="create-school-district"
                          value={newSchoolData.schoolDistrict}
                          onChange={(e) => setNewSchoolData(prev => ({ ...prev, schoolDistrict: e.target.value }))}
                          placeholder="Springfield Public Schools"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="create-school-phone">Phone Number</Label>
                        <Input
                          id="create-school-phone"
                          type="tel"
                          value={newSchoolData.phoneNumber}
                          onChange={(e) => setNewSchoolData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* SECTION 2: Your Information */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">Your Information</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="creator-first-name">
                            First Name <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="creator-first-name"
                            value={newSchoolData.creatorFirstName}
                            onChange={(e) => setNewSchoolData(prev => ({ ...prev, creatorFirstName: e.target.value }))}
                            placeholder="John"
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="creator-last-name">
                            Last Name <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="creator-last-name"
                            value={newSchoolData.creatorLastName}
                            onChange={(e) => setNewSchoolData(prev => ({ ...prev, creatorLastName: e.target.value }))}
                            placeholder="Doe"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="creator-email">
                          Email <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="creator-email"
                            type="email"
                            value={newSchoolData.creatorEmail}
                            onChange={(e) => setNewSchoolData(prev => ({ ...prev, creatorEmail: e.target.value }))}
                            placeholder="john@school.edu"
                            className="pl-9"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="creator-role">
                          Your Role <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={newSchoolData.creatorRole || ''}
                          onValueChange={(value) => setNewSchoolData(prev => ({ 
                            ...prev, 
                            creatorRole: value as 'school_admin' | 'teacher' 
                          }))}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="school_admin">School Administrator</SelectItem>
                            <SelectItem value="teacher">Teacher</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Your school will be available <strong>immediately</strong> after creation. 
                        Our team will verify the details within 24 hours and you'll receive an email confirmation.
                      </AlertDescription>
                    </Alert>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      variant="hero" 
                      size="lg"
                      disabled={isCreatingSchool || 
                                !newSchoolData.schoolName || 
                                !newSchoolData.city || 
                                !newSchoolData.state ||
                                !newSchoolData.creatorFirstName ||
                                !newSchoolData.creatorLastName ||
                                !newSchoolData.creatorEmail ||
                                !newSchoolData.creatorRole}
                    >
                      {isCreatingSchool ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating School...
                        </>
                      ) : (
                        "Create School & Continue to Set Password"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
              {invitationToken && teacherData ? (
                // Teacher invitation completion form with OAuth
                <div>
                  <CardHeader>
                    <CardTitle className="text-xl">Complete Your Account Setup</CardTitle>
                    <CardDescription>
                      Welcome to {teacherData.schools?.school_name}! Choose how you'd like to sign up.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 mb-6">
                      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <h3 className="font-semibold text-primary mb-2">Your Details</h3>
                        <p className="text-sm text-muted-foreground">
                          <strong>Name:</strong> {teacherData.first_name} {teacherData.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <strong>Email:</strong> {teacherData.email}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <strong>School:</strong> {teacherData.schools?.school_name}
                        </p>
                      </div>
                    </div>

                    {/* OAuth buttons for faster signup */}
                    <div className="space-y-4">
                      <div className="text-center">
                        <p className="text-sm font-medium text-muted-foreground mb-3">
                          ⚡ Sign up faster with Google or Microsoft
                        </p>
                      </div>
                      
                      <OAuthButtons
                        onGoogleClick={handleOAuthGoogle}
                        onMicrosoftClick={handleOAuthMicrosoft}
                        disabled={isLoading}
                      />

                      {/* OR Divider */}
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">
                            Or use email/password
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const password = formData.get('password') as string;
                      const confirmPassword = formData.get('confirmPassword') as string;
                      
                      if (password !== confirmPassword) {
                        toast.error('Passwords do not match');
                        return;
                      }
                      
                      if (password.length < 8) {
                        toast.error('Password must be at least 8 characters');
                        return;
                      }
                      
                      handleTeacherInvitationSignup({ password });
                    }} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="password">Create Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            id="password" 
                            name="password"
                            type="password" 
                            placeholder="Create a strong password"
                            className="pl-9"
                            required
                            minLength={8}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            id="confirmPassword" 
                            name="confirmPassword"
                            type="password" 
                            placeholder="Confirm your password"
                            className="pl-9"
                            required
                            minLength={8}
                          />
                        </div>
                      </div>
                      
                      <Button type="submit" className="w-full" variant="hero" disabled={isLoading}>
                        {isLoading ? "Creating Account..." : "Complete Setup"}
                      </Button>
                    </form>
                  </CardContent>
                </div>
              ) : (
                // Regular login/signup tabs
                <Tabs defaultValue="login" className="w-full">
                  <CardHeader>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="login">Sign In</TabsTrigger>
                      <TabsTrigger value="signup">Sign Up</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="login">
                      <CardTitle className="text-xl">Sign in to your account</CardTitle>
                      <CardDescription>
                        Welcome back! Enter your credentials to continue.
                      </CardDescription>
                    </TabsContent>
                    
                    <TabsContent value="signup">
                      <CardTitle className="text-xl">Create your account</CardTitle>
                      <CardDescription>
                        {invitationToken ? (
                          <span className="text-primary font-medium">
                            📧 You have a teacher invitation! Complete the setup below.
                          </span>
                        ) : (
                          "Join thousands of schools using Dismissal Pro."
                        )}
                      </CardDescription>
                    </TabsContent>
                  </CardHeader>
                  
                  <CardContent>
                    <TabsContent value="login">
                      <OAuthButtons
                        onGoogleClick={handleOAuthGoogle}
                        onMicrosoftClick={handleOAuthMicrosoft}
                        disabled={isLoading}
                      />
                      
                      <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              id="email" 
                              type="email" 
                              placeholder="Enter your email"
                              className="pl-9"
                              {...signInForm.register("email")}
                            />
                            {signInForm.formState.errors.email && (
                              <p className="text-sm text-destructive mt-1">
                                {signInForm.formState.errors.email.message}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="password">Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              id="password" 
                              type="password" 
                              placeholder="Enter your password"
                              className="pl-9"
                              {...signInForm.register("password")}
                            />
                            {signInForm.formState.errors.password && (
                              <p className="text-sm text-destructive mt-1">
                                {signInForm.formState.errors.password.message}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <Button type="submit" className="w-full" variant="hero" disabled={isLoading}>
                          {isLoading ? "Signing in..." : "Sign In"}
                        </Button>
                        
                        <div className="text-center">
                          <Button 
                            type="button" 
                            variant="link" 
                            size="sm"
                            onClick={() => setShowPasswordResetDialog(true)}
                          >
                            Forgot your password?
                          </Button>
                        </div>
                      </form>
                    </TabsContent>
                    
                    <TabsContent value="signup">
                      <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                        {/* Show pre-filled details after school creation */}
                        {isFormPreFilled && (
                          <div className="mb-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                            <h4 className="font-semibold text-primary mb-2">Your Details</h4>
                            <div className="text-sm space-y-1">
                              <p><strong>School:</strong> {selectedSchool?.school_name}</p>
                              <p><strong>Role:</strong> {selectedRole === 'school_admin' ? 'School Administrator' : 'Teacher'}</p>
                              <p><strong>Name:</strong> {signUpForm.watch('firstName')} {signUpForm.watch('lastName')}</p>
                              <p><strong>Email:</strong> {signUpForm.watch('email')}</p>
                            </div>
                          </div>
                        )}

                        {/* STEP 1: School Selection (Required First) - Hide if pre-filled */}
                        {!isFormPreFilled && (
                          <>
                        <div className="space-y-2">
                          <Label htmlFor="schoolId">School *</Label>
                          <Popover open={schoolSearchOpen} onOpenChange={(open) => { setSchoolSearchOpen(open); if (open) prefetchSchools(); }}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={schoolSearchOpen}
                                className="w-full justify-between"
                              >
                                {selectedSchool
                                  ? `${selectedSchool.school_name} (${selectedSchool.city}, ${selectedSchool.state})`
                                  : "Search for your school..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0">
                              <Command shouldFilter={false}>
                                <CommandInput 
                                  placeholder="Type to search schools..." 
                                  value={searchQuery}
                                  onValueChange={setSearchQuery}
                                />
                                <CommandList>
                                  {isSearching && (
                                    <div className="flex items-center justify-center p-4">
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                      <span className="text-sm text-muted-foreground">Searching...</span>
                                    </div>
                                  )}
                                  {!isSearching && searchQuery.length >= 2 && schools.length === 0 && (
                                    <CommandEmpty>
                                      <div className="py-6 text-center text-sm space-y-2">
                                        <p>No schools found matching "{searchQuery}"</p>
                                        <Button
                                          variant="link"
                                          size="sm"
                                          onClick={() => {
                                            setIsInCreateSchoolMode(true);
                                            setSchoolSearchOpen(false);
                                            setNewSchoolData({
                                              schoolName: searchQuery,
                                              streetAddress: '',
                                              city: '',
                                              state: '',
                                              zipcode: '',
                                              county: '',
                                              schoolDistrict: '',
                                              phoneNumber: '',
                                              creatorFirstName: '',
                                              creatorLastName: '',
                                              creatorEmail: '',
                                              creatorRole: null
                                            });
                                          }}
                                        >
                                          Can't find your school? Click here to add it →
                                        </Button>
                                      </div>
                                    </CommandEmpty>
                                  )}
                                  {!isSearching && searchQuery.length < 2 && (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                      Type at least 2 characters to search
                                    </div>
                                  )}
                                  {!isSearching && schools.length > 0 && (
                                    <CommandGroup>
                                      {schools.map((school) => (
                                        <CommandItem
                                          key={school.id}
                                          value={school.id.toString()}
                                          onSelect={() => {
                                            setSelectedSchool(school);
                                            signUpForm.setValue("schoolId", school.id.toString());
                                            setSchoolSearchOpen(false);
                                            setSearchQuery("");
                                          }}
                                        >
                                          <Check
                                            className={`mr-2 h-4 w-4 ${
                                              selectedSchool?.id === school.id
                                                ? "opacity-100"
                                                : "opacity-0"
                                            }`}
                                          />
                                          <div>
                                            <div className="font-medium">{school.school_name}</div>
                                            <div className="text-sm text-muted-foreground">
                                              {school.city && school.state ? `${school.city}, ${school.state}` : "Location not specified"}
                                            </div>
                                          </div>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  )}
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                        
                        {/* STEP 2: Role Selection (Enabled after school selected) */}
                        <div className="space-y-2">
                          <Label htmlFor="role">Role *</Label>
                          <Select 
                            disabled={!selectedSchool}
                            onValueChange={(value) => {
                              const roleValue = value as "school_admin" | "teacher";
                              setSelectedRole(roleValue);
                              signUpForm.setValue("role", roleValue);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={selectedSchool ? "Select your role" : "Select school first"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="school_admin">School Admin</SelectItem>
                              <SelectItem value="teacher">Teacher</SelectItem>
                            </SelectContent>
                          </Select>
                          {signUpForm.formState.errors.role && (
                            <p className="text-sm text-destructive mt-1">
                              {signUpForm.formState.errors.role.message}
                            </p>
                          )}
                        </div>

                        {/* STEP 3: Authentication Method Options */}
                        <div className="space-y-4">
                          <Separator className="my-2" />
                          
                          {/* OAuth Section */}
                          <div className="space-y-3">
                            <OAuthButtons
                              onGoogleClick={handleOAuthGoogle}
                              onMicrosoftClick={handleOAuthMicrosoft}
                              disabled={isLoading || !selectedSchool || !selectedRole}
                            />
                          </div>

                          {/* OR Divider */}
                          <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                              <span className="bg-background px-2 text-muted-foreground">
                                Or continue with email
                              </span>
                            </div>
                          </div>

                          {/* Name Fields - For email signup (hide if pre-filled) */}
                          {!isFormPreFilled && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="firstName">First Name *</Label>
                              <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input 
                                  id="firstName" 
                                  placeholder="John"
                                  className="pl-9"
                                  {...signUpForm.register("firstName")}
                                />
                                {signUpForm.formState.errors.firstName && (
                                  <p className="text-sm text-destructive mt-1">
                                    {signUpForm.formState.errors.firstName.message}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="lastName">Last Name *</Label>
                              <Input 
                                id="lastName" 
                                placeholder="Doe"
                                {...signUpForm.register("lastName")}
                              />
                              {signUpForm.formState.errors.lastName && (
                                <p className="text-sm text-destructive mt-1">
                                  {signUpForm.formState.errors.lastName.message}
                                </p>
                              )}
                            </div>
                          </div>

                          )}

                          {!isFormPreFilled && (
                          <div className="space-y-2">
                            <Label htmlFor="signupEmail">Email *</Label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input 
                                id="signupEmail" 
                                type="email" 
                                placeholder="john@school.edu"
                                className="pl-9"
                                {...signUpForm.register("email")}
                              />
                              {signUpForm.formState.errors.email && (
                                <p className="text-sm text-destructive mt-1">
                                  {signUpForm.formState.errors.email.message}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          )}
                          
                          {/* Always show password field */}
                          <div className="space-y-2">
                            <Label htmlFor="signupPassword">Password *</Label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input 
                                id="signupPassword" 
                                type="password" 
                                placeholder="Create a strong password"
                                className="pl-9"
                                {...signUpForm.register("password")}
                                 autoFocus={!!signUpForm.watch('firstName')}
                              />
                              {signUpForm.formState.errors.password && (
                                <p className="text-sm text-destructive mt-1">
                                  {signUpForm.formState.errors.password.message}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        </>
                        )}
                        
                        <Button type="submit" className="w-full" variant="hero" disabled={isLoading}>
                          {isLoading ? "Creating account..." : "Create Account"}
                        </Button>
                        
                        <p className="text-xs text-muted-foreground text-center">
                          By creating an account, you agree to our Terms of Service and Privacy Policy.
                        </p>
                      </form>
                    </TabsContent>
                    
                    <div className="mt-6">
                      <Separator className="my-4" />
                      <div className="text-center text-sm text-muted-foreground">
                        "The intuitive dismissal system has transformed our afternoon routine. Teachers love how easy it is to manage their classes." - Sarah M., Elementary Principal
                      </div>
                    </div>
                  </CardContent>
                </Tabs>
              )}
              </Card>
            )}

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Trusted by 500+ schools nationwide
            </div>
          </div>
        </div>
        
        
        {/* Password Reset Dialog */}
        <Dialog open={showPasswordResetDialog} onOpenChange={setShowPasswordResetDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Your Password</DialogTitle>
              <DialogDescription>
                Enter your email address and we'll send you a link to reset your password.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@school.edu"
                    className="pl-9"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPasswordResetDialog(false);
                  setResetEmail("");
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handlePasswordReset}
                disabled={isLoading || !resetEmail}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <SchoolSelectionModal open={showSchoolSelection} />
    </>
  );
};

export default Auth;
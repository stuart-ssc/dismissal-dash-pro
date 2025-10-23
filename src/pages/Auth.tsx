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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GraduationCap, Mail, Lock, User, Building, UserCheck, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { OAuthButtons } from "@/components/OAuthButtons";
import { supabase } from "@/integrations/supabase/client";
import { signInSchema, signUpSchema, type SignInFormData, type SignUpFormData } from "@/lib/validation";
import { handleError } from "@/lib/errorHandler";
import { logger } from "@/lib/logger";
import { enhancedSchoolSearch } from "@/lib/schoolSearch";
import { toast } from "sonner";

interface SignInForm extends SignInFormData {}
interface SignUpForm extends SignUpFormData {}

const Auth = () => {
  const { signIn, signUp, user, userRole, loading, signInWithGoogle, signInWithMicrosoft, linkOAuthToInvitation } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const SEO = useSEO();
  const [isLoading, setIsLoading] = useState(false);
const [schools, setSchools] = useState<{ id: number; school_name: string; city: string; state: string }[]>([]);
const [allSchools, setAllSchools] = useState<{ id: number; school_name: string; city: string; state: string }[]>([]);
  const [schoolSearchOpen, setSchoolSearchOpen] = useState(false);
  const [schoolSearchValue, setSchoolSearchValue] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<{ id: number; school_name: string; city: string; state: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  
  // Teacher invitation state
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [invitationType, setInvitationType] = useState<string | null>(null);
  const [teacherData, setTeacherData] = useState<any>(null);
  const [isValidatingInvitation, setIsValidatingInvitation] = useState(false);

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
    const email = signInForm.getValues('email');
    
    if (!email) {
      toast.error('Please enter your email address first');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      });

      if (error) throw error;

      toast.success('Password reset email sent! Check your inbox.');
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast.error(error.message || 'Failed to send password reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthGoogle = async () => {
    setIsLoading(true);
    try {
      // If there's an invitation token, store it in localStorage to retrieve after OAuth redirect
      if (invitationToken) {
        localStorage.setItem('pendingInvitation', invitationToken);
      }
      await signInWithGoogle();
    } catch (error) {
      toast.error('Failed to sign in with Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthMicrosoft = async () => {
    setIsLoading(true);
    try {
      // If there's an invitation token, store it in localStorage to retrieve after OAuth redirect
      if (invitationToken) {
        localStorage.setItem('pendingInvitation', invitationToken);
      }
      await signInWithMicrosoft();
    } catch (error) {
      toast.error('Failed to sign in with Microsoft');
    } finally {
      setIsLoading(false);
    }
  };

  // Check for pending invitation after OAuth redirect
  useEffect(() => {
    const pendingInvitation = localStorage.getItem('pendingInvitation');
    if (pendingInvitation && user && !userRole) {
      // User just completed OAuth and has a pending invitation
      linkOAuthToInvitation(pendingInvitation).then(() => {
        localStorage.removeItem('pendingInvitation');
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
                <div className="p-3 rounded-full bg-gradient-to-r from-primary to-secondary">
                  <GraduationCap className="h-8 w-8 text-white" />
                </div>
              </div>
              <h1 className="text-3xl font-bold mb-2">Welcome to Dismissal Pro</h1>
              <p className="text-muted-foreground">Streamline your school's dismissal process</p>
            </div>

            <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
              {invitationToken && teacherData ? (
                // Teacher invitation completion form
                <div>
                  <CardHeader>
                    <CardTitle className="text-xl">Complete Your Account Setup</CardTitle>
                    <CardDescription>
                      Welcome to {teacherData.schools?.school_name}! Create your password below.
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
                    }} className="space-y-4">
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
                        Join thousands of schools using Dismissal Pro.
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
                            onClick={handlePasswordReset}
                            disabled={isLoading}
                          >
                            Forgot your password?
                          </Button>
                        </div>
                      </form>
                    </TabsContent>
                    
                    <TabsContent value="signup">
                      <OAuthButtons
                        onGoogleClick={handleOAuthGoogle}
                        onMicrosoftClick={handleOAuthMicrosoft}
                        disabled={isLoading}
                      />
                      
                      <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
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
                            <Label htmlFor="lastName">Last Name</Label>
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
                        
                        <div className="space-y-2">
                          <Label htmlFor="schoolId">School</Label>
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
                                    <CommandEmpty>No schools found.</CommandEmpty>
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
                        
                        <div className="space-y-2">
                          <Label htmlFor="role">Role</Label>
                          <Select onValueChange={(value) => signUpForm.setValue("role", value as "school_admin" | "teacher")}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your role" />
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
                        
                        <div className="space-y-2">
                          <Label htmlFor="signupEmail">Email</Label>
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
                        
                        <div className="space-y-2">
                          <Label htmlFor="signupPassword">Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              id="signupPassword" 
                              type="password" 
                              placeholder="Create a strong password"
                              className="pl-9"
                              {...signUpForm.register("password")}
                            />
                            {signUpForm.formState.errors.password && (
                              <p className="text-sm text-destructive mt-1">
                                {signUpForm.formState.errors.password.message}
                              </p>
                            )}
                          </div>
                        </div>
                        
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

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Trusted by 500+ schools nationwide
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Auth;
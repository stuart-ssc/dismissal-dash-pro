import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
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
import { GraduationCap, Mail, Lock, User, Building, UserCheck, Check, ChevronsUpDown } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface SignInForm {
  email: string;
  password: string;
}

interface SignUpForm {
  firstName: string;
  lastName: string;
  schoolId: string;
  role: string;
  email: string;
  password: string;
}

const Auth = () => {
  const { signIn, signUp, user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const SEO = useSEO();
  const [isLoading, setIsLoading] = useState(false);
  const [schools, setSchools] = useState<{ id: number; school_name: string; city: string; state: string }[]>([]);
  const [schoolSearchOpen, setSchoolSearchOpen] = useState(false);
  const [schoolSearchValue, setSchoolSearchValue] = useState("");

  const signInForm = useForm<SignInForm>();
  const signUpForm = useForm<SignUpForm>();

  useEffect(() => {
    const fetchSchools = async () => {
      const { data } = await supabase
        .from('schools')
        .select('id, school_name, city, state')
        .order('school_name');
      if (data) setSchools(data);
    };
    fetchSchools();
  }, []);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
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
                  <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="email" 
                          type="email" 
                          placeholder="Enter your email"
                          className="pl-9"
                          {...signInForm.register("email", { required: true })}
                        />
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
                          {...signInForm.register("password", { required: true })}
                        />
                      </div>
                    </div>
                    
                    <Button type="submit" className="w-full" variant="hero" disabled={isLoading}>
                      {isLoading ? "Signing in..." : "Sign In"}
                    </Button>
                    
                    <div className="text-center">
                      <Button variant="link" size="sm">
                        Forgot your password?
                      </Button>
                    </div>
                  </form>
                </TabsContent>
                
                <TabsContent value="signup">
                  <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            id="firstName" 
                            placeholder="John"
                            className="pl-9"
                            {...signUpForm.register("firstName", { required: true })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input 
                          id="lastName" 
                          placeholder="Doe"
                          {...signUpForm.register("lastName", { required: true })}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="schoolId">School</Label>
                      <Popover open={schoolSearchOpen} onOpenChange={setSchoolSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={schoolSearchOpen}
                            className="w-full justify-between"
                          >
                            {schoolSearchValue
                              ? (() => {
                                  const school = schools.find((s) => s.id.toString() === schoolSearchValue);
                                  return school ? `${school.school_name} (${school.city}, ${school.state})` : "Search for your school...";
                                })()
                              : "Search for your school..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Search schools..." />
                            <CommandList>
                              <CommandEmpty>No schools found.</CommandEmpty>
                              <CommandGroup>
                                {schools.slice(0, 100).map((school) => (
                                  <CommandItem
                                    key={school.id}
                                    value={`${school.school_name} ${school.city} ${school.state}`}
                                    onSelect={() => {
                                      const value = school.id.toString();
                                      setSchoolSearchValue(value);
                                      signUpForm.setValue("schoolId", value);
                                      setSchoolSearchOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${
                                        schoolSearchValue === school.id.toString()
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
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select onValueChange={(value) => signUpForm.setValue("role", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="school_admin">School Admin</SelectItem>
                          <SelectItem value="teacher">Teacher</SelectItem>
                        </SelectContent>
                      </Select>
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
                          {...signUpForm.register("email", { required: true })}
                        />
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
                          {...signUpForm.register("password", { required: true })}
                        />
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
                    Trusted by 500+ schools nationwide
                  </div>
                </div>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>
      </div>
    </>
  );
};

export default Auth;
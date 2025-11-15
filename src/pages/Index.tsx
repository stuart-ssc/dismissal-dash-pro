import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle, Clock, Shield, Users, BarChart3, Briefcase } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import heroImage from "@/assets/hero-dismissal.jpg";
import { useSEO } from "@/hooks/useSEO";
import InfiniteCampusLogo from "@/components/InfiniteCampusLogo";

const Index = () => {
  const SEO = useSEO();
  
  const features = [
    {
      icon: <Clock className="h-6 w-6" />,
      title: "Streamlined Process",
      description: "Reduce dismissal time from 45 minutes to just 15 minutes with our organized system."
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Enhanced Safety", 
      description: "Ensure every child gets to the right person with our verification protocols."
    },
    {
      icon: <InfiniteCampusLogo className="w-32 h-8" />,
      title: "Infinite Campus Integration",
      description: "Quick setup with automatic student data sync. Keep your roster up-to-date effortlessly.",
      customIconLayout: true
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Analytics & Insights",
      description: "Track patterns and optimize your dismissal process with detailed reporting."
    }
  ];

  const benefits = [
    "Reduce dismissal chaos and wait times",
    "Improve parent satisfaction scores", 
    "Increase staff efficiency",
    "Enhanced student safety protocols",
    "Real-time dismissal tracking",
    "Infinite Campus integration with automatic sync",
    "Manage field trips and special event transportation"
  ];

  return (
    <>
      <SEO />
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      <Navbar />
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl font-bold leading-tight">
                Transform Your School's{" "}
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Dismissal Process
                </span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Dismissal Pro helps schools create safer, faster, and more organized dismissal 
                procedures that parents love and administrators trust.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/auth">
                <Button variant="hero" size="lg" className="w-full sm:w-auto">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-secondary" />
              <span>Free 30-day trial • No credit card required</span>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl blur-3xl transform -rotate-6"></div>
            <img 
              src={heroImage} 
              alt="School dismissal management" 
              className="relative rounded-2xl shadow-elevated w-full h-auto"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">
            Why Schools Choose Dismissal Pro
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join hundreds of schools that have revolutionized their dismissal process 
            with our comprehensive management platform.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-0 shadow-soft bg-card/80 backdrop-blur hover:shadow-elevated transition-all duration-300">
              <CardHeader>
                {feature.customIconLayout ? (
                  <div className="mb-4 text-primary">
                    {feature.icon}
                  </div>
                ) : (
                  <div className="p-3 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 w-fit">
                    <div className="text-primary">
                      {feature.icon}
                    </div>
                  </div>
                )}
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Special Trip Management Section */}
      <section className="container mx-auto px-4 py-20 bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/5 rounded-3xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="p-3 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 w-fit mb-6">
              <Briefcase className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold mb-4">
              Special Trip Management
            </h2>
            <p className="text-xl text-muted-foreground mb-6">
              Going beyond daily dismissal—organize transportation for field trips, 
              sports teams, club activities, and special events with dedicated 
              management tools.
            </p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-secondary flex-shrink-0 mt-1" />
                <span>Create custom runs for any special event or trip</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-secondary flex-shrink-0 mt-1" />
                <span>Assign specific students to each trip or activity</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-secondary flex-shrink-0 mt-1" />
                <span>Track attendance and manage rosters in real-time</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-secondary flex-shrink-0 mt-1" />
                <span>Dedicated departure modes for organized loading</span>
              </li>
            </ul>
            <Link to="/special-trips">
              <Button variant="hero" size="lg">
                Learn More About Special Trips
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          
          <Card className="p-8 border-0 shadow-elevated bg-gradient-to-br from-card to-secondary/5">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-xl mb-2">Perfect For</CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
                <Briefcase className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="font-medium">Field Trips & Excursions</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
                <Briefcase className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="font-medium">Athletic Events & Games</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
                <Briefcase className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="font-medium">After-School Activities</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
                <Briefcase className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="font-medium">Special Events & Programs</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6">
              Everything You Need for Smooth Dismissals
            </h2>
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-secondary flex-shrink-0" />
                  <span className="text-foreground">{benefit}</span>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <Link to="/auth">
                <Button variant="success" size="lg">
                  Start Your Free Trial
                </Button>
              </Link>
            </div>
          </div>
          
          <Card className="p-8 border-0 shadow-elevated bg-gradient-to-br from-card to-primary/5">
            <CardHeader className="text-center p-0 mb-6">
              <CardTitle className="text-2xl mb-2">Ready to Get Started?</CardTitle>
              <CardDescription className="text-base">
                Join the schools already using Dismissal Pro to create safer, 
                more efficient dismissal processes.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-secondary">15min</div>
                  <div className="text-xs text-muted-foreground">Avg Dismissal Time</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-secondary">98%</div>
                  <div className="text-xs text-muted-foreground">Parent Satisfaction</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
      </div>
    </>
  );
};

export default Index;

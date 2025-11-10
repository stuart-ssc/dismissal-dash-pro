import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle, Briefcase, Users, Calendar, Bus, MapPin, Trophy, GraduationCap, Music } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useSEO } from "@/hooks/useSEO";

const SpecialTrips = () => {
  const SEO = useSEO({
    title: "Special Trip Management - Field Trips, Sports & Events | Dismissal Pro",
    description: "Organize transportation for field trips, sports teams, club activities, and special events with Dismissal Pro's dedicated trip management tools. Track attendance and manage rosters in real-time.",
    keywords: "field trip management, sports team transportation, special event transportation, school trip organization, athletic event management"
  });

  const features = [
    {
      icon: <Calendar className="h-6 w-6" />,
      title: "Custom Run Creation",
      description: "Create dedicated transportation runs for any special event, trip, or activity with flexible scheduling options."
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Roster Management",
      description: "Assign specific students to each trip, manage participant lists, and track attendance in real-time."
    },
    {
      icon: <Bus className="h-6 w-6" />,
      title: "Organized Loading",
      description: "Dedicated departure modes ensure efficient, orderly loading for buses and transportation vehicles."
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "Real-Time Tracking",
      description: "Monitor attendance, departures, and student assignments throughout the entire event or trip."
    }
  ];

  const useCases = [
    {
      icon: <MapPin className="h-8 w-8" />,
      title: "Field Trips & Excursions",
      description: "Manage student assignments for museum visits, educational tours, and outdoor excursions.",
      scenarios: [
        "Grade-level field trips",
        "Educational museum visits",
        "Outdoor education programs",
        "Science center excursions"
      ]
    },
    {
      icon: <Trophy className="h-8 w-8" />,
      title: "Athletic Events",
      description: "Coordinate transportation for sports teams heading to games, tournaments, and competitions.",
      scenarios: [
        "Away game transportation",
        "Tournament travel",
        "Multi-school competitions",
        "Championship events"
      ]
    },
    {
      icon: <GraduationCap className="h-8 w-8" />,
      title: "Academic Activities",
      description: "Organize transport for academic competitions, conferences, and collaborative learning events.",
      scenarios: [
        "Quiz bowl competitions",
        "Debate tournaments",
        "STEM competitions",
        "Student conferences"
      ]
    },
    {
      icon: <Music className="h-8 w-8" />,
      title: "Arts & Clubs",
      description: "Handle transportation for band, choir, drama, and club activities at various venues.",
      scenarios: [
        "Band competitions",
        "Choir performances",
        "Drama festivals",
        "Club meetings & events"
      ]
    }
  ];

  const howItWorksSteps = [
    {
      step: 1,
      title: "Create a Special Run",
      description: "Set up a new special-use run with details about the event, date, time, and destination."
    },
    {
      step: 2,
      title: "Assign Students",
      description: "Select and assign specific students who will participate in the trip or event."
    },
    {
      step: 3,
      title: "Launch Departure Mode",
      description: "Start the dedicated departure mode to manage student loading and attendance."
    },
    {
      step: 4,
      title: "Track & Complete",
      description: "Monitor in real-time as students depart, and complete the run when everyone is accounted for."
    }
  ];

  const benefits = [
    "Eliminate manual paperwork and spreadsheets",
    "Reduce confusion during event departures",
    "Ensure accurate student accountability",
    "Streamline communication between staff",
    "Track participation across all special events",
    "Generate reports for administrators and parents"
  ];

  return (
    <>
      <SEO />
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
        <Navbar />
        
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="p-4 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 w-fit mx-auto">
              <Briefcase className="h-12 w-12 text-primary" />
            </div>
            <div className="space-y-4">
              <h1 className="text-5xl font-bold leading-tight">
                Special Trip{" "}
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Management
                </span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
                Extend Dismissal Pro beyond daily routines. Organize and manage transportation 
                for field trips, sports teams, club activities, and special events with the same 
                precision and safety you apply to daily dismissals.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button variant="hero" size="lg" className="w-full sm:w-auto">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              Key Features
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage special trips and events safely and efficiently.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-soft bg-card/80 backdrop-blur hover:shadow-elevated transition-all duration-300">
                <CardHeader>
                  <div className="p-3 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 w-fit">
                    <div className="text-primary">
                      {feature.icon}
                    </div>
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* How It Works Section */}
        <section className="container mx-auto px-4 py-20 bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/5 rounded-3xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Managing special trips is simple with our four-step process.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorksSteps.map((item, index) => (
              <div key={index} className="relative">
                <Card className="border-0 shadow-soft bg-card/80 backdrop-blur h-full">
                  <CardHeader>
                    <div className="flex items-center gap-4 mb-2">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold">
                        {item.step}
                      </div>
                    </div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{item.description}</CardDescription>
                  </CardContent>
                </Card>
                {index < howItWorksSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-secondary">
                    <ArrowRight className="h-6 w-6" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              Perfect For Every School Event
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From athletic competitions to educational excursions, manage all your special events.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {useCases.map((useCase, index) => (
              <Card key={index} className="border-0 shadow-soft bg-card/80 backdrop-blur">
                <CardHeader>
                  <div className="p-3 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 w-fit mb-4">
                    <div className="text-primary">
                      {useCase.icon}
                    </div>
                  </div>
                  <CardTitle className="text-xl">{useCase.title}</CardTitle>
                  <CardDescription className="text-base">{useCase.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {useCase.scenarios.map((scenario, scenarioIndex) => (
                      <li key={scenarioIndex} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-secondary flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{scenario}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Benefits Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">
                Benefits of Special Trip Management
              </h2>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-secondary flex-shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <Card className="p-8 border-0 shadow-elevated bg-gradient-to-br from-card to-primary/5">
              <CardHeader className="text-center p-0 mb-6">
                <CardTitle className="text-2xl mb-2">Ready to Streamline Your Special Events?</CardTitle>
                <CardDescription className="text-base">
                  Join schools already using Dismissal Pro to manage both daily dismissals 
                  and special event transportation.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 space-y-6">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-secondary">100%</div>
                    <div className="text-xs text-muted-foreground">Student Accountability</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-secondary">50%</div>
                    <div className="text-xs text-muted-foreground">Time Saved</div>
                  </div>
                </div>
                <Link to="/auth" className="block">
                  <Button variant="success" size="lg" className="w-full">
                    Start Your Free Trial
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </>
  );
};

export default SpecialTrips;

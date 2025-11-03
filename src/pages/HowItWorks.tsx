import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "react-router-dom";
import { 
  ClipboardList, 
  Users, 
  School, 
  Bus, 
  Car, 
  MapPin, 
  CheckCircle, 
  ArrowRight,
  Calendar,
  Upload,
  Monitor,
  Zap
} from "lucide-react";

export default function HowItWorks() {
  const SEO = useSEO({
    title: "How It Works - Features Explained",
    description: "Learn how DismissalPro helps schools manage dismissal plans, class rosters, classroom mode, and transportation with our comprehensive guide.",
    keywords: "dismissal management, classroom mode, transportation tracking, school dismissal system, dismissal plans"
  });

  const features = [
    {
      icon: ClipboardList,
      title: "Dismissal Plans",
      description: "Create flexible dismissal schedules for every scenario",
      points: [
        "Multiple plans for regular days, early dismissals, and special events",
        "Switch between plans instantly",
        "Pre-configure transportation assignments",
        "Handle any schedule change with ease"
      ]
    },
    {
      icon: Users,
      title: "Class Roster Management",
      description: "Manage all your student data in one place",
      points: [
        "Import rosters via CSV in seconds",
        "Assign students to classes and teachers",
        "Configure transportation assignments",
        "Update student information easily"
      ]
    },
    {
      icon: School,
      title: "Classroom Mode",
      description: "Empower teachers with intuitive dismissal tools",
      points: [
        "Real-time view of all students",
        "Multiple layout options (groups, transportation columns)",
        "One-click dismissal confirmation",
        "Safety verification before release"
      ]
    }
  ];

  const transportationModes = [
    {
      icon: Bus,
      title: "Bus Mode",
      description: "Organize bus dismissals efficiently",
      features: [
        "Students grouped by bus number",
        "Call buses systematically",
        "Track boarding in real-time",
        "Reduce congestion and wait times"
      ]
    },
    {
      icon: Car,
      title: "Car Line Mode",
      description: "Streamline car pickup",
      features: [
        "Quick student lookup",
        "Parent verification",
        "Reduce wait times",
        "Improve traffic flow"
      ]
    },
    {
      icon: MapPin,
      title: "Walker Mode",
      description: "Manage walker dismissal safely",
      features: [
        "Organize by destination/location",
        "Group dismissal options",
        "Safety protocols",
        "Parent coordination"
      ]
    }
  ];

  const processSteps = [
    {
      number: "1",
      icon: Upload,
      title: "Setup",
      description: "Import your student roster and configure classes"
    },
    {
      number: "2",
      icon: Calendar,
      title: "Plan",
      description: "Create dismissal plans for different scenarios"
    },
    {
      number: "3",
      icon: Users,
      title: "Assign",
      description: "Assign students to transportation methods"
    },
    {
      number: "4",
      icon: Monitor,
      title: "Execute",
      description: "Teachers use Classroom Mode during dismissal"
    },
    {
      number: "5",
      icon: CheckCircle,
      title: "Track",
      description: "Monitor dismissal progress in real-time"
    }
  ];

  return (
    <>
      <SEO />
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
        <Navbar />
        
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="p-3 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10">
              <Zap className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
            How DismissalPro Works
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            A comprehensive dismissal management system that streamlines every aspect of your school's dismissal process—from planning to execution.
          </p>
          <Link to="/auth">
            <Button variant="hero" size="lg" className="group">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </section>

        {/* Main Features Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Core Features That Make Dismissal Simple
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage your school's dismissal process efficiently and safely.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {features.map((feature, index) => (
              <Card 
                key={index}
                className="border-0 shadow-soft bg-card/80 backdrop-blur hover:shadow-elevated transition-all duration-300"
              >
                <CardHeader>
                  <div className="p-3 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 w-fit mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {feature.points.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Transportation Management Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Transportation Management Modes
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Specialized modes for each transportation type ensure organized, efficient dismissal for every student.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {transportationModes.map((mode, index) => (
              <Card 
                key={index}
                className="border-0 shadow-soft bg-card/80 backdrop-blur hover:shadow-elevated transition-all duration-300"
              >
                <CardHeader>
                  <div className="p-3 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 w-fit mb-4">
                    <mode.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{mode.title}</CardTitle>
                  <CardDescription className="text-base">
                    {mode.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {mode.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Process Flow Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple 5-Step Process
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From setup to execution, DismissalPro guides you through every step.
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-6">
            {processSteps.map((step, index) => (
              <div key={index} className="relative">
                <Card className="border-0 shadow-soft bg-card/80 backdrop-blur hover:shadow-elevated transition-all duration-300 text-center">
                  <CardHeader>
                    <div className="mx-auto mb-4">
                      <div className="p-3 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 w-fit mx-auto">
                        <step.icon className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-primary mb-2">{step.number}</div>
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {step.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
                {index < processSteps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                    <ArrowRight className="h-6 w-6 text-primary/30" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-20">
          <Card className="border-0 shadow-soft bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 backdrop-blur">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Transform Your Dismissal Process?
              </CardTitle>
              <CardDescription className="text-lg mb-8">
                Join schools that have already streamlined their dismissal with DismissalPro.
              </CardDescription>
              <div className="flex justify-center gap-4">
                <Link to="/auth">
                  <Button variant="hero" size="lg" className="group">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-secondary">15min</div>
                  <div className="text-sm text-muted-foreground">Average Setup Time</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-success">50%</div>
                  <div className="text-sm text-muted-foreground">Faster Dismissals</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  );
}

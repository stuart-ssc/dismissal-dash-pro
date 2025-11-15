import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
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
  Zap,
  RefreshCw,
  ArrowRightLeft,
  Database,
  Shield
} from "lucide-react";
import InfiniteCampusLogo from "@/components/InfiniteCampusLogo";

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
        "Import rosters via Infinite Campus or CSV in seconds",
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

        {/* Infinite Campus Integration Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="bg-card/40 backdrop-blur rounded-3xl shadow-elevated p-8 md:p-12">
            {/* Header */}
            <div className="text-center mb-12">
              <div className="flex justify-center mb-6">
                <InfiniteCampusLogo className="w-48 h-12" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Automatic Student Data Sync
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Connect your Infinite Campus system and let student rosters, class assignments, and updates flow automatically into DismissalPro—no manual data entry required.
              </p>
            </div>

            {/* Two-Column Layout */}
            <div className="grid md:grid-cols-2 gap-8 md:gap-12">
              {/* Left Column: Benefits */}
              <div>
                <h3 className="text-2xl font-semibold mb-6">Why Schools Love IC Integration</h3>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                      <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">5-Minute Setup</h4>
                      <p className="text-sm text-muted-foreground">
                        Enter your IC credentials once and you're done. Our guided wizard walks you through every step.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                      <RefreshCw className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Always Up-to-Date</h4>
                      <p className="text-sm text-muted-foreground">
                        Automatic daily syncs keep your rosters current. New students, schedule changes, and transfers update automatically.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Enterprise-Grade Security</h4>
                      <p className="text-sm text-muted-foreground">
                        Your IC credentials are encrypted and stored securely. We use industry-standard OAuth protocols.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Zero Data Entry</h4>
                      <p className="text-sm text-muted-foreground">
                        Eliminate hours of manual roster updates. Staff, students, and class assignments sync automatically.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: What Gets Synced */}
              <div>
                <h3 className="text-2xl font-semibold mb-6">What Gets Synced</h3>
                <div className="space-y-4">
                  <Card className="border-0 shadow-soft bg-card/60">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-secondary/10">
                          <Users className="h-5 w-5 text-secondary" />
                        </div>
                        <CardTitle className="text-lg">Student Rosters</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <p className="text-sm text-muted-foreground">
                        Complete student information including names, grade levels, and student IDs.
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-soft bg-card/60">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-secondary/10">
                          <School className="h-5 w-5 text-secondary" />
                        </div>
                        <CardTitle className="text-lg">Class Assignments</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <p className="text-sm text-muted-foreground">
                        Teacher-student relationships and class rosters automatically populate and update.
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-soft bg-card/60">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-secondary/10">
                          <ArrowRightLeft className="h-5 w-5 text-secondary" />
                        </div>
                        <CardTitle className="text-lg">Real-Time Updates</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <p className="text-sm text-muted-foreground">
                        Schedule changes, new enrollments, and withdrawals sync daily or on-demand.
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-soft bg-card/60">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-secondary/10">
                          <Database className="h-5 w-5 text-secondary" />
                        </div>
                        <CardTitle className="text-lg">Custom Fields</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <p className="text-sm text-muted-foreground">
                        Intelligent mapping of custom data fields ensures all your important student information transfers.
                      </p>
                    </CardContent>
                  </Card>

                  <div className="pt-2">
                    <Badge variant="outline" className="w-full justify-center py-2 text-xs">
                      <Upload className="h-3 w-3 mr-2" />
                      Don't use IC? CSV import is also available
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Footer */}
            <div className="text-center mt-12 pt-8 border-t border-border/50">
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-success/10 px-4 py-2 rounded-full">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>Setup takes less than 5 minutes • Sync starts immediately • Cancel anytime</span>
              </div>
            </div>
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
            <CardContent className="pb-8 pt-0 px-0 space-y-4">
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
      
      <Footer />
    </>
  );
}

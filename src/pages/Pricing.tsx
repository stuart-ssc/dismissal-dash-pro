import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { useSEO } from "@/hooks/useSEO";
import { Check, Building2, Users, GraduationCap, Shield, BarChart3, Clock, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const Pricing = () => {
  const SEO = useSEO();

  const features = [
    "Unlimited teachers and staff",
    "Unlimited students",
    "Multiple dismissal plans",
    "All transportation modes (Bus, Car, Walker)",
    "Classroom mode for teachers",
    "Real-time dismissal tracking",
    "Coverage management",
    "Class roster management",
    "CSV import tools",
    "Email notifications",
    "Usage reports and analytics",
    "Priority support",
  ];

  const benefits = [
    {
      icon: Building2,
      title: "One School, One Price",
      description: "Simple pricing that scales with you. No per-user fees or hidden costs.",
    },
    {
      icon: Users,
      title: "Unlimited Users",
      description: "Add as many teachers, staff, and students as your school needs.",
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-level security and compliance to keep your school data safe.",
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Comprehensive reports and insights to optimize your dismissal process.",
    },
  ];

  const faqs = [
    {
      question: "What happens after the free trial?",
      answer: "After 30 days, you can choose to continue with a paid subscription at $500/year. Your data is always yours and you can export it anytime.",
    },
    {
      question: "Can I cancel anytime?",
      answer: "Yes! You can cancel your subscription at any time.",
    },
    {
      question: "Is there a setup fee?",
      answer: "No setup fees, no hidden costs. Just $500/year for unlimited access to all features.",
    },
    {
      question: "What kind of support do you offer?",
      answer: "All schools get priority email support. We typically respond within 24 hours on business days.",
    },
    {
      question: "Do you offer discounts for multiple schools?",
      answer: "Yes! Contact us for district-wide pricing if you're managing multiple schools.",
    },
  ];

  return (
    <>
      <SEO />
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
        <Navbar />
        
        {/* Hero Section */}
        <section className="container px-4 pt-32 pb-16 mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-success/10 text-success">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">30-Day Free Trial</span>
            </div>
            <h1 className="mb-6 text-5xl font-bold leading-tight md:text-6xl">
              Simple, Transparent Pricing
            </h1>
            <p className="mb-8 text-xl text-muted-foreground">
              One price. Unlimited users. All features included. Start your free trial today.
            </p>
          </div>
        </section>

        {/* Pricing Card */}
        <section className="container px-4 pb-20 mx-auto">
          <div className="max-w-3xl mx-auto">
            <Card className="relative overflow-hidden border-2 shadow-elevated border-primary/20 bg-card/80 backdrop-blur">
              <div className="absolute top-0 right-0 px-4 py-1 text-sm font-semibold text-white rounded-bl-lg bg-gradient-to-r from-primary to-secondary">
                Most Popular
              </div>
              <CardContent className="p-8 md:p-12">
                <div className="mb-8 text-center">
                  <h2 className="mb-2 text-2xl font-bold">School Plan</h2>
                  <div className="flex items-baseline justify-center gap-2 mb-4">
                    <span className="text-6xl font-bold">$500</span>
                    <span className="text-2xl text-muted-foreground">/year</span>
                  </div>
                  <p className="text-lg text-muted-foreground">
                    Per school, unlimited everything else
                  </p>
                </div>

                <div className="mb-8">
                  <div className="flex items-center justify-center gap-4 p-4 mb-6 rounded-lg bg-success/10">
                    <Zap className="w-6 h-6 text-success" />
                    <p className="font-semibold text-success">
                      Start your 30-day free trial now
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button 
                      asChild 
                      size="lg" 
                      className="flex-1 text-lg bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                    >
                      <Link to="/auth">Start Free Trial</Link>
                    </Button>
                    <Button 
                      asChild 
                      size="lg" 
                      variant="outline"
                      className="flex-1 text-lg"
                    >
                      <Link to="/how-it-works">Learn More</Link>
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex-shrink-0 p-1 rounded-full bg-success/10">
                        <Check className="w-4 h-4 text-success" />
                      </div>
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 bg-gradient-to-b from-background/50 to-background">
          <div className="container px-4 mx-auto">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-4xl font-bold">Why Schools Choose DismissalPro</h2>
              <p className="text-xl text-muted-foreground">
                More than just pricing—real value for your school
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
              {benefits.map((benefit, index) => (
                <Card 
                  key={index}
                  className="border-0 shadow-soft bg-card/80 backdrop-blur hover:shadow-elevated transition-all duration-300"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10">
                      <benefit.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ROI Section */}
        <section className="py-20 container px-4 mx-auto">
          <div className="max-w-4xl mx-auto">
            <Card className="border-0 shadow-elevated bg-gradient-to-br from-primary/5 to-secondary/5 backdrop-blur">
              <CardContent className="p-8 md:p-12">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-4">
                    Less Than $1.40 Per Day
                  </h2>
                  <p className="text-lg text-muted-foreground">
                    For complete dismissal management across your entire school
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                  <div className="text-center p-6 rounded-lg bg-background/50">
                    <GraduationCap className="w-10 h-10 mx-auto mb-3 text-primary" />
                    <div className="text-3xl font-bold mb-1">20+</div>
                    <div className="text-sm text-muted-foreground">Minutes saved per dismissal</div>
                  </div>
                  <div className="text-center p-6 rounded-lg bg-background/50">
                    <Users className="w-10 h-10 mx-auto mb-3 text-primary" />
                    <div className="text-3xl font-bold mb-1">100%</div>
                    <div className="text-sm text-muted-foreground">Of your staff included</div>
                  </div>
                  <div className="text-center p-6 rounded-lg bg-background/50">
                    <Shield className="w-10 h-10 mx-auto mb-3 text-primary" />
                    <div className="text-3xl font-bold mb-1">0</div>
                    <div className="text-sm text-muted-foreground">Hidden fees or charges</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-gradient-to-b from-background to-background/50">
          <div className="container px-4 mx-auto">
            <div className="max-w-3xl mx-auto">
              <h2 className="mb-12 text-4xl font-bold text-center">Frequently Asked Questions</h2>
              
              <div className="space-y-6">
                {faqs.map((faq, index) => (
                  <Card 
                    key={index}
                    className="border-0 shadow-soft bg-card/80 backdrop-blur hover:shadow-elevated transition-all duration-300"
                  >
                    <CardContent className="p-6">
                      <h3 className="mb-2 text-lg font-semibold">{faq.question}</h3>
                      <p className="text-muted-foreground">{faq.answer}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 container px-4 mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="mb-6 text-4xl font-bold">
              Ready to Transform Your School's Dismissal?
            </h2>
            <p className="mb-8 text-xl text-muted-foreground">
              Join schools across the country who are saving time and improving safety with DismissalPro
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button 
                asChild 
                size="lg"
                className="text-lg bg-gradient-to-r from-primary to-secondary hover:opacity-90"
              >
                <Link to="/auth">Start Your Free Trial</Link>
              </Button>
              <Button 
                asChild 
                size="lg" 
                variant="outline"
                className="text-lg"
              >
                <Link to="/how-it-works">See How It Works</Link>
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              No credit card required • 30-day free trial • Cancel anytime
            </p>
          </div>
        </section>
      </div>
    </>
  );
};

export default Pricing;

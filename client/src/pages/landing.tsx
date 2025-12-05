import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  Target, 
  ArrowRight, 
  Sparkles,
  TrendingUp,
  Users,
  Clock,
  Shield,
  Zap,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Phone,
  Building2,
  Trophy,
  Globe,
  Smartphone,
  RefreshCw
} from "lucide-react";

const results = [
  {
    metric: "40%",
    label: "More Leads Converted",
    description: "Teams using LeadAni see higher conversion rates",
    icon: TrendingUp,
    gradient: "from-emerald-500 to-teal-600"
  },
  {
    metric: "3x",
    label: "Faster Follow-ups",
    description: "Never miss a follow-up with smart NFDT reminders",
    icon: Clock,
    gradient: "from-blue-500 to-indigo-600"
  },
  {
    metric: "Zero",
    label: "Lost Leads",
    description: "Duplicate detection ensures every lead is captured once",
    icon: Shield,
    gradient: "from-purple-500 to-pink-600"
  },
  {
    metric: "100%",
    label: "Team Visibility",
    description: "Real-time sync keeps everyone on the same page",
    icon: Users,
    gradient: "from-amber-500 to-orange-600"
  }
];

const problems = [
  {
    problem: "Leads falling through cracks",
    solution: "Smart duplicate detection & never-lose tracking",
    icon: Phone
  },
  {
    problem: "No idea what team is doing",
    solution: "Real-time dashboard & performance leaderboards",
    icon: Users
  },
  {
    problem: "Missed follow-ups costing sales",
    solution: "NFDT reminders with visual highlighting",
    icon: Clock
  },
  {
    problem: "Data scattered everywhere",
    solution: "One system with Excel-like simplicity",
    icon: Building2
  }
];

const highlights = [
  {
    title: "Works Like Excel",
    description: "Your team already knows how to use it. No training needed.",
    icon: BarChart3,
    gradient: "from-emerald-500 to-teal-600"
  },
  {
    title: "Mobile-First Design",
    description: "Manage leads from anywhere with our PWA app.",
    icon: Smartphone,
    gradient: "from-blue-500 to-indigo-600"
  },
  {
    title: "Auto Lead Distribution",
    description: "Webhooks auto-route leads to the right person instantly.",
    icon: Zap,
    gradient: "from-purple-500 to-pink-600"
  },
  {
    title: "Performance Tracking",
    description: "Set targets, track progress, celebrate wins.",
    icon: Trophy,
    gradient: "from-amber-500 to-orange-600"
  },
  {
    title: "30-Day Data Recovery",
    description: "Point-in-time snapshots mean you never lose data.",
    icon: RefreshCw,
    gradient: "from-slate-500 to-gray-600"
  },
  {
    title: "Multi-Timezone Support",
    description: "Perfect for distributed teams across locations.",
    icon: Globe,
    gradient: "from-teal-500 to-cyan-600"
  }
];

const testimonials = [
  {
    quote: "We went from losing 20% of leads to zero. The duplicate detection alone paid for itself.",
    name: "Education Institute",
    role: "Admissions Team",
    result: "+40% Enrollments"
  },
  {
    quote: "Finally, I can see exactly what my team is doing. The leaderboard created healthy competition.",
    name: "Real Estate Agency", 
    role: "Sales Manager",
    result: "2x Productivity"
  },
  {
    quote: "The webhook integration with our ad platforms was seamless. Leads flow in automatically.",
    name: "Healthcare Clinic",
    role: "Marketing Head",
    result: "Zero Manual Entry"
  }
];

function HeroSection() {
  return (
    <section className="relative overflow-hidden py-20 md:py-32" data-testid="section-hero">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-blue-500/5 to-purple-500/5" />
      
      <motion.div 
        className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div 
        className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
        animate={{ 
          scale: [1.2, 1, 1.2],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 10, repeat: Infinity }}
      />
      <motion.div 
        className="absolute top-40 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2]
        }}
        transition={{ duration: 12, repeat: Infinity }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-6 px-4 py-1.5 text-sm" variant="secondary" data-testid="badge-hero">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Trusted by 500+ Growing Businesses
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight"
            data-testid="text-hero-heading"
          >
            Stop Losing Leads.
            <span className="block mt-2 bg-gradient-to-r from-primary via-blue-500 to-purple-600 bg-clip-text text-transparent">
              Start Closing More.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto"
            data-testid="text-hero-description"
          >
            The spreadsheet-like CRM that your team will actually use. 
            Capture every lead, track every follow-up, and watch your conversions soar.
            <span className="font-semibold text-foreground"> No training required.</span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/signup" data-testid="link-hero-signup">
              <Button size="lg" className="gap-2 px-8 text-base h-12" data-testid="button-hero-trial">
                Start Free - No Card Required
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/features" data-testid="link-hero-features">
              <Button size="lg" variant="outline" className="gap-2 px-8 text-base h-12" data-testid="button-hero-features">
                See All Features
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-4 text-sm text-muted-foreground"
            data-testid="text-hero-subtext"
          >
            Setup in 2 minutes. Free trial includes all features.
          </motion.p>
        </div>
      </div>
    </section>
  );
}

function ResultsSection() {
  return (
    <section className="py-20 bg-muted/30" data-testid="section-results">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge className="mb-4" variant="outline" data-testid="badge-results">
            Real Results
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold" data-testid="text-results-heading">
            What Businesses Achieve With LeadAni
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto text-lg" data-testid="text-results-description">
            These aren't just numbers. They're real outcomes from businesses like yours.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {results.map((result, index) => (
            <motion.div
              key={result.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full border-0 shadow-lg hover-elevate" data-testid={`card-result-${index}`}>
                <CardContent className="pt-6 text-center">
                  <div className={cn(
                    "inline-flex items-center justify-center p-3 rounded-2xl mb-4",
                    `bg-gradient-to-br ${result.gradient}`
                  )}>
                    <result.icon className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text" data-testid={`text-result-metric-${index}`}>
                    {result.metric}
                  </p>
                  <p className="font-semibold mt-2" data-testid={`text-result-label-${index}`}>{result.label}</p>
                  <p className="text-sm text-muted-foreground mt-1" data-testid={`text-result-desc-${index}`}>{result.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProblemSolutionSection() {
  return (
    <section className="py-20" data-testid="section-problems">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold" data-testid="text-problems-heading">
            Sound Familiar?
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto text-lg" data-testid="text-problems-description">
            Every growing business faces these challenges. Here's how we solve them.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {problems.map((item, index) => (
            <motion.div
              key={item.problem}
              initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full hover-elevate" data-testid={`card-problem-${index}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-destructive/10 shrink-0">
                      <item.icon className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-destructive line-through decoration-2" data-testid={`text-problem-${index}`}>
                        {item.problem}
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400" data-testid={`text-solution-${index}`}>
                          {item.solution}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HighlightsSection() {
  return (
    <section className="py-20 bg-muted/30" data-testid="section-highlights">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge className="mb-4" variant="outline" data-testid="badge-highlights">
            Why Teams Love Us
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold" data-testid="text-highlights-heading">
            Built for How You Actually Work
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto text-lg" data-testid="text-highlights-description">
            Not just another CRM. A system designed around real business needs.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {highlights.map((highlight, index) => (
            <motion.div
              key={highlight.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full hover-elevate group" data-testid={`card-highlight-${index}`}>
                <CardContent className="pt-6">
                  <div className={cn(
                    "inline-flex items-center justify-center p-3 rounded-xl mb-4 transition-transform group-hover:scale-110",
                    `bg-gradient-to-br ${highlight.gradient}`
                  )}>
                    <highlight.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg" data-testid={`text-highlight-title-${index}`}>{highlight.title}</h3>
                  <p className="text-muted-foreground mt-2" data-testid={`text-highlight-desc-${index}`}>{highlight.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <Link href="/features" data-testid="link-all-features">
            <Button variant="outline" size="lg" className="gap-2" data-testid="button-all-features">
              Explore All 23 Features
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="py-20" data-testid="section-testimonials">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge className="mb-4" variant="outline" data-testid="badge-testimonials">
            Success Stories
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold" data-testid="text-testimonials-heading">
            Businesses Growing With LeadAni
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full" data-testid={`card-testimonial-${index}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Sparkles key={i} className="h-4 w-4 text-amber-500 fill-amber-500" />
                    ))}
                  </div>
                  <p className="text-muted-foreground italic mb-6" data-testid={`text-testimonial-quote-${index}`}>
                    "{testimonial.quote}"
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold" data-testid={`text-testimonial-name-${index}`}>{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground" data-testid={`text-testimonial-role-${index}`}>{testimonial.role}</p>
                    </div>
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" data-testid={`badge-testimonial-result-${index}`}>
                      {testimonial.result}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-20" data-testid="section-cta">
      <div className="container mx-auto px-4">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center py-16 px-8 rounded-3xl bg-gradient-to-br from-primary/10 via-blue-500/10 to-purple-500/10 border relative overflow-hidden"
        >
          <motion.div 
            className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 6, repeat: Infinity }}
          />
          <motion.div 
            className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl"
            animate={{ 
              scale: [1.2, 1, 1.2],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          
          <div className="relative z-10">
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center justify-center p-4 rounded-2xl bg-gradient-to-br from-primary to-blue-600 mb-6"
            >
              <Target className="h-8 w-8 text-white" />
            </motion.div>
            
            <h2 className="text-3xl md:text-4xl font-bold" data-testid="text-cta-heading">
              Ready to Never Lose a Lead Again?
            </h2>
            <p className="text-muted-foreground mt-4 max-w-xl mx-auto text-lg" data-testid="text-cta-description">
              Join 500+ businesses who've transformed their lead management. 
              Start your free trial today - setup takes just 2 minutes.
            </p>
            
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup" data-testid="link-cta-signup">
                <Button size="lg" className="gap-2 px-8 text-base h-12" data-testid="button-cta-trial">
                  <Sparkles className="h-4 w-4" />
                  Start Your Free Trial
                </Button>
              </Link>
              <Link href="/login" data-testid="link-cta-login">
                <Button size="lg" variant="outline" className="gap-2 px-8 text-base h-12" data-testid="button-cta-login">
                  Sign In
                </Button>
              </Link>
            </div>
            
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2" data-testid="text-cta-benefit-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                No credit card required
              </div>
              <div className="flex items-center gap-2" data-testid="text-cta-benefit-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                All features included
              </div>
              <div className="flex items-center gap-2" data-testid="text-cta-benefit-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Cancel anytime
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-background" data-testid="landing-page">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" data-testid="link-home-logo">
            <motion.div 
              className="flex items-center gap-2 cursor-pointer"
              whileHover={{ scale: 1.02 }}
            >
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-blue-600">
                <Target className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl">LeadAni LFS</span>
            </motion.div>
          </Link>
          
          <div className="flex items-center gap-3">
            <Link href="/features" data-testid="link-header-features" className="hidden sm:block">
              <Button variant="ghost" size="sm" data-testid="button-header-features">Features</Button>
            </Link>
            <ThemeToggle />
            <Link href="/login" data-testid="link-header-signin">
              <Button variant="ghost" size="sm" data-testid="button-header-signin">Sign In</Button>
            </Link>
            <Link href="/signup" data-testid="link-header-signup">
              <Button size="sm" data-testid="button-header-signup">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <HeroSection />
      <ResultsSection />
      <ProblemSolutionSection />
      <HighlightsSection />
      <TestimonialsSection />
      <CTASection />

      <footer className="border-t py-8" data-testid="footer">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary to-blue-600">
                <Target className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold">LeadAni LFS</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/features" data-testid="link-footer-features">
                <span className="hover:text-foreground transition-colors cursor-pointer">Features</span>
              </Link>
              <Link href="/login" data-testid="link-footer-signin">
                <span className="hover:text-foreground transition-colors cursor-pointer">Sign In</span>
              </Link>
              <Link href="/signup" data-testid="link-footer-signup">
                <span className="hover:text-foreground transition-colors cursor-pointer">Get Started</span>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground" data-testid="text-copyright">
              &copy; {new Date().getFullYear()} LeadAni LFS. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

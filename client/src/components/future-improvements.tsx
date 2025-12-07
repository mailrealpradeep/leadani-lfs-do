import { 
  MessageSquare, 
  Bot, 
  Mic, 
  Smartphone, 
  ArrowRight, 
  ArrowDown,
  DollarSign,
  Clock,
  Zap,
  Users,
  Volume2,
  Webhook,
  Send,
  CheckCircle2,
  Circle,
  Lightbulb,
  Target,
  TrendingUp,
  MessageCircle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Improvement {
  id: number;
  title: string;
  icon: any;
  status: "planned" | "in_progress" | "ready";
  priority: "high" | "medium" | "low";
  estimatedEffort: string;
  costEstimate: string;
  description: string;
  businessValue: string[];
  architecture: {
    title: string;
    steps: string[];
  };
  techRequirements: string[];
  providers?: { name: string; cost: string; notes: string }[];
  notes?: string;
}

const improvements: Improvement[] = [
  {
    id: 1,
    title: "WhatsApp / Instagram Lead Chat Integration",
    icon: MessageSquare,
    status: "planned",
    priority: "high",
    estimatedEffort: "1-2 weeks",
    costEstimate: "BSP subscription (existing)",
    description: "Bidirectional messaging integration that routes client WhatsApp/Instagram messages to LFS Lead Chat and enables team responses back to clients through your existing BSP (Business Service Provider).",
    businessValue: [
      "Respond to leads directly from LFS without switching apps",
      "Maintain complete conversation history within lead records",
      "Faster response times improve lead conversion",
      "Centralized communication for better team collaboration"
    ],
    architecture: {
      title: "Message Flow Architecture",
      steps: [
        "Client sends WhatsApp/IG message to your Official Business Account",
        "BSP receives message and triggers webhook to LFS",
        "LFS webhook endpoint matches phone number to existing lead",
        "Message appears in Lead Chat with real-time notification",
        "Team member responds in Lead Chat interface",
        "LFS triggers outgoing webhook to BSP",
        "BSP delivers reply to client's WhatsApp/Instagram"
      ]
    },
    techRequirements: [
      "Inbound webhook endpoint with phone-to-lead matching",
      "Lead Chat UI updates to display channel source (WhatsApp/IG badge)",
      "Outgoing webhook trigger on Lead Chat replies",
      "Real-time Socket.IO notifications for new messages",
      "Message delivery status tracking"
    ],
    notes: "Uses your existing BSP - no additional WhatsApp API costs. Template management not required for replies within 24-hour window."
  },
  {
    id: 2,
    title: "AI Coach for Tele Caller",
    icon: Bot,
    status: "planned",
    priority: "medium",
    estimatedEffort: "2-3 days",
    costEstimate: "$5-20/month (TTS)",
    description: "Personalized AI avatar coach that delivers motivational messages based on individual lead performance metrics. Uses Text-to-Speech with animated avatar for engaging daily briefings.",
    businessValue: [
      "Personalized daily motivation based on actual performance",
      "Visual engagement increases message retention",
      "Automated coaching reduces manager overhead",
      "Gamification element improves team morale",
      "Consistent guidance for all team members"
    ],
    architecture: {
      title: "AI Coach Flow",
      steps: [
        "User logs in or triggers coaching session",
        "System pulls user's lead metrics (conversion ratio, follow-ups, targets)",
        "Message generator creates personalized script in Hindi/English",
        "Text-to-Speech API converts script to natural voice audio",
        "Animated avatar displays with lip-sync movements",
        "Audio plays while avatar animates",
        "User receives actionable insights and daily goals"
      ]
    },
    techRequirements: [
      "Performance metrics aggregation service",
      "Dynamic message template engine with variable substitution",
      "TTS integration (ElevenLabs or Azure recommended for Hindi)",
      "Animated avatar component (Lottie/CSS animation)",
      "Trigger logic (login, scheduled, low performance alerts)"
    ],
    providers: [
      { name: "ElevenLabs", cost: "$5-22/month", notes: "Best voice quality, excellent Hindi support" },
      { name: "Azure TTS", cost: "Pay-per-use (~$4/1M chars)", notes: "Enterprise reliable, many Hindi voices" },
      { name: "Google TTS", cost: "Free tier available", notes: "Good quality, limited free quota" }
    ],
    notes: "Cost-effective alternative to AI video avatars (HeyGen $99/mo, D-ID $29/mo). Simple animated avatar + TTS provides 90% of the impact at 10% of the cost."
  }
];

const statusColors = {
  planned: "bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30",
  in_progress: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
  ready: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
};

const priorityColors = {
  high: "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30",
  medium: "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30",
  low: "bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30"
};

const statusLabels = {
  planned: "Planned",
  in_progress: "In Progress",
  ready: "Ready to Build"
};

export function FutureImprovements() {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Lightbulb className="h-6 w-6 text-amber-500" />
          <div>
            <h2 className="text-xl font-bold" data-testid="text-future-improvements-title">Future Improvements</h2>
            <p className="text-sm text-muted-foreground">Planned features and enhancements for Leadani LFS</p>
          </div>
        </div>

        <div className="space-y-6">
          {improvements.map((improvement) => (
            <Card key={improvement.id} data-testid={`card-improvement-${improvement.id}`}>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <improvement.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{improvement.title}</CardTitle>
                      <CardDescription className="mt-1">{improvement.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className={statusColors[improvement.status]}>
                      {statusLabels[improvement.status]}
                    </Badge>
                    <Badge variant="outline" className={priorityColors[improvement.priority]}>
                      {improvement.priority.charAt(0).toUpperCase() + improvement.priority.slice(1)} Priority
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Estimated Effort:</span>
                    <span className="font-medium">{improvement.estimatedEffort}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Cost Estimate:</span>
                    <span className="font-medium">{improvement.costEstimate}</span>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <Target className="h-4 w-4 text-emerald-500" />
                    Business Value
                  </h4>
                  <ul className="space-y-2">
                    {improvement.businessValue.map((value, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{value}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <Zap className="h-4 w-4 text-blue-500" />
                    {improvement.architecture.title}
                  </h4>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="space-y-2">
                      {improvement.architecture.steps.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div className="flex flex-col items-center">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-medium">
                              {idx + 1}
                            </div>
                            {idx < improvement.architecture.steps.length - 1 && (
                              <div className="w-px h-4 bg-border mt-1" />
                            )}
                          </div>
                          <span className="text-sm pt-0.5">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <Smartphone className="h-4 w-4 text-purple-500" />
                    Technical Requirements
                  </h4>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {improvement.techRequirements.map((req, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Circle className="h-3 w-3 text-muted-foreground mt-1.5 shrink-0" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {improvement.providers && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-3">
                        <TrendingUp className="h-4 w-4 text-amber-500" />
                        Recommended Providers
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {improvement.providers.map((provider, idx) => (
                          <div key={idx} className="p-3 rounded-lg bg-muted/50 border">
                            <div className="font-medium text-sm">{provider.name}</div>
                            <div className="text-xs text-primary font-medium mt-1">{provider.cost}</div>
                            <div className="text-xs text-muted-foreground mt-1">{provider.notes}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {improvement.notes && (
                  <>
                    <Separator />
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <MessageCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-amber-800 dark:text-amber-200">{improvement.notes}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

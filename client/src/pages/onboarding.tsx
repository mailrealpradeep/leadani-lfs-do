import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Users, FileSpreadsheet, Rocket } from "lucide-react";

export default function Onboarding() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);

  const steps = [
    {
      icon: CheckCircle,
      title: "Welcome to Dabluz CRM!",
      description: "Your company account has been created successfully.",
      content: (
        <div className="space-y-4 text-center">
          <p className="text-muted-foreground">
            You're all set up as a Company Admin. Let's explore what you can do.
          </p>
          <Button onClick={() => setStep(2)} data-testid="button-next-step-1">
            Get Started
          </Button>
        </div>
      ),
    },
    {
      icon: Users,
      title: "Invite Your Team",
      description: "Collaborate with your team members in real-time.",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            As a Company Admin, you can invite team members to join your workspace.
            Navigate to the Admin panel to create invite codes for your staff.
          </p>
          <ul className="text-sm text-muted-foreground space-y-2 text-left">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>Send invite codes via email or share directly</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>Assign roles (Admin or User)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>Track invitation status</span>
            </li>
          </ul>
          <Button onClick={() => setStep(3)} data-testid="button-next-step-2">
            Continue
          </Button>
        </div>
      ),
    },
    {
      icon: FileSpreadsheet,
      title: "Manage Your Leads",
      description: "Add leads, customize columns, and track progress.",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Your first sheet "My First Sheet" is ready. You can:
          </p>
          <ul className="text-sm text-muted-foreground space-y-2 text-left">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>Add leads manually or import from Excel/CSV</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>Create custom columns for your workflow</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>Filter, search, and export data</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>Track updates and activity</span>
            </li>
          </ul>
          <Button onClick={() => setStep(4)} data-testid="button-next-step-3">
            Continue
          </Button>
        </div>
      ),
    },
    {
      icon: Rocket,
      title: "You're All Set!",
      description: "Start building your lead pipeline today.",
      content: (
        <div className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Everything is ready for you to start managing leads with your team.
          </p>
          <Button onClick={() => navigate("/")} size="lg" data-testid="button-go-dashboard">
            Go to Dashboard
          </Button>
        </div>
      ),
    },
  ];

  const currentStep = steps[step - 1];
  const Icon = currentStep.icon;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Icon className="h-12 w-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">{currentStep.title}</CardTitle>
          <CardDescription>{currentStep.description}</CardDescription>
        </CardHeader>
        <CardContent>{currentStep.content}</CardContent>
        <CardFooter className="justify-center">
          <div className="flex gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full transition-colors ${
                  index + 1 === step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { acceptInviteSchema } from "@shared/schema";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, CheckCircle, AlertCircle } from "lucide-react";
import { Link } from "wouter";

type AcceptInviteFormData = z.infer<typeof acceptInviteSchema>;

interface InviteDetails {
  email: string;
  role: string;
  company_name: string;
  expires_at: string;
}

export default function InviteAccept() {
  const [, params] = useRoute("/invite/:code");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { authenticate } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  const code = params?.code;

  const form = useForm<AcceptInviteFormData>({
    resolver: zodResolver(acceptInviteSchema),
    defaultValues: {
      name: "",
      password: "",
    },
  });

  useEffect(() => {
    if (!code) {
      setError("Invalid invite code");
      setIsLoading(false);
      return;
    }

    loadInviteDetails();
  }, [code]);

  async function loadInviteDetails() {
    try {
      const response = await fetch(`/api/public/invites/${code}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load invite");
      }

      setInviteDetails(data);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmit(data: AcceptInviteFormData) {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/public/invites/${code}/accept`, {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to accept invite");
      }

      // Authenticate user (sets token, localStorage, and query cache)
      authenticate(result);

      toast({
        title: "Success!",
        description: `Welcome to ${result.company.name}!`,
      });

      // Navigate to dashboard
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Failed to accept invite",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !inviteDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Invalid Invite</CardTitle>
            <CardDescription>{error || "This invite could not be found"}</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Link href="/signup">
              <Button data-testid="button-create-account">Create Your Own Account</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Dabluz CRM</span>
          </div>
          <CardTitle className="text-2xl">Join {inviteDetails.company_name}</CardTitle>
          <CardDescription>
            You've been invited as a {inviteDetails.role === "company_admin" ? "Company Admin" : "Team Member"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-3 bg-muted rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span className="font-medium">Email:</span>
              <span className="text-muted-foreground">{inviteDetails.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span className="font-medium">Role:</span>
              <span className="text-muted-foreground capitalize">
                {inviteDetails.role.replace("_", " ")}
              </span>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="John Doe"
                        data-testid="input-name"
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="••••••••"
                        data-testid="input-password"
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                data-testid="button-accept-invite"
              >
                {isSubmitting ? "Creating Account..." : "Accept Invite & Join"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login">
              <a className="text-primary hover:underline" data-testid="link-login">
                Log in
              </a>
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

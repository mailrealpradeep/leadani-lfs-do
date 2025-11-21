import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { companySignupSchema } from "@shared/schema";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { BarChart3 } from "lucide-react";
import { Link } from "wouter";

type SignupFormData = z.infer<typeof companySignupSchema>;

export default function Signup() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { authenticate } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SignupFormData>({
    resolver: zodResolver(companySignupSchema),
    defaultValues: {
      company_name: "",
      admin_name: "",
      admin_email: "",
      admin_password: "",
    },
  });

  async function onSubmit(data: SignupFormData) {
    setIsSubmitting(true);
    try {
      // Normalize data before sending
      const normalizedData = {
        company_name: data.company_name.trim(),
        admin_name: data.admin_name.trim(),
        admin_email: data.admin_email.trim().toLowerCase(),
        admin_password: data.admin_password,
      };

      const response = await fetch("/api/public/signup", {
        method: "POST",
        body: JSON.stringify(normalizedData),
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Signup failed");
      }

      // Authenticate user (sets token, localStorage, and query cache)
      authenticate(result);

      toast({
        title: "Success!",
        description: `Welcome to Dabluz CRM, ${data.admin_name}!`,
      });

      // Navigate to onboarding
      navigate("/onboarding");
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Dabluz CRM</span>
          </div>
          <CardTitle className="text-2xl">Create Your Company</CardTitle>
          <CardDescription>
            Start managing leads with your team in minutes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Acme Inc."
                        data-testid="input-company-name"
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="admin_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="John Doe"
                        data-testid="input-admin-name"
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="admin_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="john@acme.com"
                        data-testid="input-admin-email"
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="admin_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="••••••••"
                        data-testid="input-admin-password"
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
                data-testid="button-submit-signup"
              >
                {isSubmitting ? "Creating Account..." : "Create Account"}
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

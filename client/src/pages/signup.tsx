import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, useReducedMotion } from "framer-motion";
import { companySignupSchema } from "@shared/schema";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AuthShell, AuthPanelHeadline, AUTH_BUTTON, AUTH_INPUT } from "@/components/auth-shell";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  ArrowRight,
  Bot,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Route,
  Sparkles,
  Trophy,
} from "lucide-react";

type SignupFormData = z.infer<typeof companySignupSchema>;

const INPUT = AUTH_INPUT;

const BENEFITS = [
  { icon: Route, title: "Leads routed in seconds", text: "From ads, WhatsApp and your website to the right rep." },
  { icon: Bot, title: "AI on every follow-up", text: "Leads rated Hot to Poor. Lazy remarks rejected." },
  { icon: Trophy, title: "A team that wants to win", text: "Leaderboards, PowerScore and personal Vision Boards." },
];

function passwordStrength(pw: string): { score: number; label: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return { score, label: ["Too short", "Okay", "Good", "Strong", "Excellent"][score] };
}

export default function Signup() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { authenticate } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<SignupFormData>({
    resolver: zodResolver(companySignupSchema),
    defaultValues: {
      company_name: "",
      admin_name: "",
      admin_email: "",
      admin_password: "",
    },
  });

  const password = form.watch("admin_password");
  const strength = passwordStrength(password || "");

  async function onSubmit(data: SignupFormData) {
    setIsSubmitting(true);
    try {
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
        title: "Workspace created",
        description: `Welcome to Leadani, ${normalizedData.admin_name}!`,
      });

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
    <AuthShell title="Create your workspace · Leadani" panel={<SignupPanel />}>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1 text-[12px] font-medium text-emerald-200">
              <Sparkles className="h-3.5 w-3.5" /> Free during early access
            </span>
            <h1 className="mt-5 font-[Geist,Inter,sans-serif] text-[32px] font-semibold leading-tight tracking-[-0.03em] sm:text-4xl">
              Create your workspace
            </h1>
            <p className="mt-2.5 text-[15px] text-white/55">
              Set up your company in under two minutes. Invite your team right after.
            </p>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
                <FormField
                  control={form.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[13px] font-medium text-white/70">Company name</FormLabel>
                      <FormControl>
                        <input
                          {...field}
                          autoFocus
                          autoComplete="organization"
                          placeholder="Acme Realty"
                          className={INPUT}
                          data-testid="input-company-name"
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage className="text-[13px] text-rose-300" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="admin_name"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[13px] font-medium text-white/70">Your name</FormLabel>
                      <FormControl>
                        <input
                          {...field}
                          autoComplete="name"
                          placeholder="Priya Sharma"
                          className={INPUT}
                          data-testid="input-admin-name"
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage className="text-[13px] text-rose-300" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="admin_email"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[13px] font-medium text-white/70">Work email</FormLabel>
                      <FormControl>
                        <input
                          {...field}
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          placeholder="priya@acmerealty.com"
                          className={INPUT}
                          data-testid="input-admin-email"
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage className="text-[13px] text-rose-300" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="admin_password"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[13px] font-medium text-white/70">Password</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            placeholder="At least 8 characters"
                            className={cn(INPUT, "pr-12")}
                            data-testid="input-admin-password"
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-white/40 transition hover:text-white/80"
                          data-testid="button-toggle-password"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {password ? (
                        <div className="flex items-center gap-3 pt-0.5">
                          <div className="flex flex-1 gap-1">
                            {[0, 1, 2, 3].map((i) => (
                              <span
                                key={i}
                                className={cn(
                                  "h-1 flex-1 rounded-full transition-colors",
                                  i < strength.score
                                    ? strength.score <= 1
                                      ? "bg-amber-400"
                                      : "bg-emerald-400"
                                    : "bg-white/10",
                                )}
                              />
                            ))}
                          </div>
                          <span className="w-16 text-right text-[11px] text-white/45">{strength.label}</span>
                        </div>
                      ) : null}
                      <FormMessage className="text-[13px] text-rose-300" />
                    </FormItem>
                  )}
                />

                <button
                  type="submit"
                  disabled={isSubmitting}
                  data-testid="button-submit-signup"
                  className={cn(AUTH_BUTTON, "mt-2")}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Creating your workspace…
                    </>
                  ) : (
                    <>
                      Create workspace
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </form>
            </Form>

            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-white/45">
              {["No credit card", "Every feature included", "Free in early access"].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-400" /> {t}
                </li>
              ))}
            </ul>

            <p className="mt-8 border-t border-white/[0.06] pt-6 text-sm text-white/50">
              Already have an account?{" "}
              <Link asChild href="/login">
                <a className="font-medium text-white underline-offset-4 hover:underline" data-testid="link-login">
                  Sign in
                </a>
              </Link>
            </p>
    </AuthShell>
  );
}

function SignupPanel() {
  const reduce = useReducedMotion();
  return (
    <>
      <AuthPanelHeadline />
          <ul className="mt-10 space-y-6">
            {BENEFITS.map((b, i) => (
              <motion.li
                key={b.title}
                initial={reduce ? false : { opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.1, duration: 0.5 }}
                className="flex gap-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05]">
                  <b.icon className="h-5 w-5 text-white" />
                </span>
                <div>
                  <p className="font-semibold text-white">{b.title}</p>
                  <p className="mt-0.5 text-[15px] text-white/55">{b.text}</p>
                </div>
              </motion.li>
            ))}
          </ul>

          <div className="mt-12 rounded-2xl border border-white/10 bg-[#0c0f22]/80 p-5 backdrop-blur">
            <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-white/40">
              What happens next
            </p>
            <ol className="mt-4 space-y-3 text-[15px] text-white/70">
              {["Invite your team", "Import or add your leads", "Connect a lead source"].map((s, i) => (
                <li key={s} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[12px] font-semibold text-white">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
    </>
  );
}

import { useState } from "react";
import { Link, Redirect, useLocation } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AuthShell, AuthPanelHeadline, AUTH_BUTTON, AUTH_INPUT } from "@/components/auth-shell";
import { ArrowRight, BellRing, Eye, EyeOff, Flame, Loader2, Trophy } from "lucide-react";

const TODAY = [
  { icon: BellRing, label: "Follow-ups due today", tone: "text-sky-300 bg-sky-400/10" },
  { icon: Flame, label: "Hot leads waiting for a call", tone: "text-rose-300 bg-rose-400/10" },
  { icon: Trophy, label: "Your PowerScore this month", tone: "text-amber-300 bg-amber-400/10" },
];

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const reduce = useReducedMotion();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (isAuthenticated) {
    return <Redirect to="/" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login({ email: email.trim(), password });
      setLocation("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message || "Invalid credentials",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Sign in · Leadani"
      panel={
        <>
          <AuthPanelHeadline />
          <div className="mt-10 rounded-2xl border border-white/10 bg-[#0c0f22]/80 p-5 backdrop-blur">
            <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-white/40">Waiting for you inside</p>
            <ul className="mt-4 space-y-3">
              {TODAY.map(({ icon: Icon, label, tone }, i) => (
                <motion.li
                  key={label}
                  initial={reduce ? false : { opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.1, duration: 0.5 }}
                  className="flex items-center gap-3 text-[15px] text-white/75"
                >
                  <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", tone)}>
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  {label}
                </motion.li>
              ))}
            </ul>
          </div>
        </>
      }
    >
      <h1 className="font-[Geist,Inter,sans-serif] text-[32px] font-semibold leading-tight tracking-[-0.03em] sm:text-4xl">
        Welcome back
      </h1>
      <p className="mt-2.5 text-[15px] text-white/55">Sign in to pick up where your team left off.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="space-y-2">
          <label htmlFor="email" className="text-[13px] font-medium text-white/70">
            Email
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={AUTH_INPUT}
            data-testid="input-email"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-[13px] font-medium text-white/70">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={cn(AUTH_INPUT, "pr-12")}
              data-testid="input-password"
              disabled={isLoading}
            />
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
          <p className="text-[12.5px] text-white/40">Forgot your password? Ask your company admin to reset it.</p>
        </div>

        <button type="submit" disabled={isLoading} data-testid="button-login" className={cn(AUTH_BUTTON, "mt-2")}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>

      <p className="mt-8 border-t border-white/[0.06] pt-6 text-sm text-white/50">
        New to Leadani?{" "}
        <Link href="/signup" asChild>
          <a className="font-medium text-white underline-offset-4 hover:underline" data-testid="link-signup">
            Create a free workspace
          </a>
        </Link>
      </p>
    </AuthShell>
  );
}

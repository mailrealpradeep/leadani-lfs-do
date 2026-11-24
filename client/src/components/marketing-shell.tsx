import { useEffect, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { BrandLogo, BrandMark } from "@/components/brand-logo";

/*
 * Shared frame for the public marketing pages (landing, features, guide,
 * help): the dark brand tokens, header, call-to-action band and footer.
 */

/* -------------------------------------------------------------------------- */
/*  Design tokens (the landing page is intentionally always dark)             */
/* -------------------------------------------------------------------------- */

export const GRADIENT_TEXT =
  "bg-gradient-to-r from-[#5eead4] via-[#60a5fa] to-[#c084fc] bg-clip-text text-transparent";
export const DISPLAY = "font-[Geist,Inter,sans-serif] tracking-[-0.035em]";

export function Section({
  id,
  className,
  children,
  ...rest
}: {
  id?: string;
  className?: string;
  children: ReactNode;
  "data-testid"?: string;
}) {
  return (
    <section id={id} className={cn("relative px-4 sm:px-6", className)} {...rest}>
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-4 text-[13px] font-medium uppercase tracking-[0.18em] text-[#8b9cff]">
      {children}
    </p>
  );
}

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function PrimaryCta({
  href,
  children,
  className,
  testId,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <Link asChild href={href}>
      <a
        data-testid={testId}
        className={cn(
          "group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-[15px] font-semibold text-[#070814] shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_10px_40px_-10px_rgba(129,140,248,0.8)] transition hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#818cf8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060f]",
          className,
        )}
      >
        {children}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </a>
    </Link>
  );
}

export function GhostCta({
  href,
  children,
  testId,
}: {
  href: string;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <a
      href={href}
      data-testid={testId}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-6 text-[15px] font-medium text-white/90 transition hover:border-white/25 hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#818cf8]"
    >
      {children}
    </a>
  );
}

/* -------------------------------------------------------------------------- */
/*  Header                                                                     */
/* -------------------------------------------------------------------------- */

const NAV = [
  { label: "How it works", href: "/#how" },
  { label: "Product", href: "/#product" },
  { label: "Features", href: "/features" },
  { label: "Coming soon", href: "/#roadmap", upcoming: true },
  { label: "Pricing", href: "/#pricing" },
  { label: "Help", href: "/help" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled || open
          ? "border-b border-white/[0.06] bg-[#05060f]/80 backdrop-blur-xl"
          : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link asChild href="/">
          <a data-testid="link-home-logo" className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#818cf8]">
            <BrandLogo textClassName="text-white" />
          </a>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm text-white/65 transition hover:text-white"
            >
              {"upcoming" in item && <span className="h-1.5 w-1.5 rounded-full bg-amber-300" aria-hidden="true" />}
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <Link asChild href="/">
              <a
                data-testid="link-header-open-app"
                className="inline-flex h-9 items-center rounded-full bg-white px-4 text-sm font-semibold text-[#070814] transition hover:bg-white/90"
              >
                Open app
              </a>
            </Link>
          ) : (
            <>
              <Link asChild href="/login">
                <a
                  data-testid="link-header-signin"
                  className="hidden rounded-full px-4 py-2 text-sm font-medium text-white/80 transition hover:text-white sm:inline-flex"
                >
                  Sign in
                </a>
              </Link>
              <Link asChild href="/signup">
                <a
                  data-testid="link-header-signup"
                  className="inline-flex h-9 items-center rounded-full bg-white px-4 text-sm font-semibold text-[#070814] transition hover:bg-white/90"
                >
                  Get started
                </a>
              </Link>
            </>
          )}
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-white/10 md:hidden"
            data-testid="button-mobile-menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden md:hidden"
          >
            <div className="flex flex-col gap-1 px-4 pb-5 pt-1">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-3 text-base text-white/80 hover:bg-white/5"
                >
                  {item.label}
                  {"upcoming" in item && (
                    <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-200">
                      New
                    </span>
                  )}
                </a>
              ))}
              {!isAuthenticated && (
                <Link asChild href="/login">
                  <a className="rounded-xl px-3 py-3 text-base text-white/80 hover:bg-white/5">Sign in</a>
                </Link>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/*  Final CTA + footer                                                         */
/* -------------------------------------------------------------------------- */

export function FinalCta() {
  return (
    <Section className="pb-24 pt-8 sm:pb-32" data-testid="section-cta">
      <Reveal>
        <div className="relative overflow-hidden rounded-[32px] border border-white/10 px-6 py-16 text-center sm:px-12 sm:py-24">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_50%_0%,rgba(99,102,241,0.45),transparent_60%),radial-gradient(60%_80%_at_90%_100%,rgba(217,70,239,0.25),transparent_60%),radial-gradient(60%_80%_at_10%_100%,rgba(34,211,238,0.2),transparent_60%)]" />
          <div className="relative">
            <BrandMark className="mx-auto h-14 w-14" />
            <h2
              className={cn(DISPLAY, "mx-auto mt-8 max-w-3xl text-3xl font-semibold text-white sm:text-5xl md:text-6xl")}
              data-testid="text-cta-heading"
            >
              Stop losing leads.
              <br />
              <span className={GRADIENT_TEXT}>Start compounding them.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base text-white/65 sm:text-lg">
              Create your workspace in under two minutes and bring your whole team in today.
            </p>
            <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <PrimaryCta href="/signup" testId="button-cta-trial">
                Create your workspace
              </PrimaryCta>
              <Link asChild href="/login">
                <a
                  data-testid="button-cta-login"
                  className="inline-flex h-12 items-center justify-center rounded-full px-6 text-[15px] font-medium text-white/80 transition hover:text-white"
                >
                  I already have an account
                </a>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-white/50">
              {["Free during early access", "No credit card", "All features included"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-400" /> {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] px-4 py-10 sm:px-6" data-testid="footer">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
        <div className="flex flex-col items-center gap-2 md:items-start">
          <BrandLogo markClassName="h-7 w-7" textClassName="text-white text-base" />
          <p className="text-[13px] text-white/40">The lead follow-up system for growing sales teams.</p>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/50">
          <Link asChild href="/features"><a className="hover:text-white" data-testid="link-footer-features">Features</a></Link>
          <Link asChild href="/guide"><a className="hover:text-white">Guide</a></Link>
          <Link asChild href="/help"><a className="hover:text-white">Help</a></Link>
          <Link asChild href="/login"><a className="hover:text-white" data-testid="link-footer-signin">Sign in</a></Link>
          <Link asChild href="/signup"><a className="hover:text-white" data-testid="link-footer-signup">Get started</a></Link>
        </nav>
        <p className="text-[13px] text-white/35" data-testid="text-copyright">
          © {new Date().getFullYear()} Leadani
        </p>
      </div>
    </footer>
  );
}


/* -------------------------------------------------------------------------- */
/*  Page frame                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Dark brand page with header and footer. `marketing` + `dark` switch the
 * shadcn theme tokens inside to the brand palette (see index.css), so pages
 * built from the regular UI components (cards, accordions, inputs) match.
 */
export function MarketingPage({
  title,
  children,
  testId,
}: {
  title: string;
  children: ReactNode;
  testId?: string;
}) {
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    return () => {
      document.title = prev;
    };
  }, [title]);

  return (
    <div
      className="dark marketing relative min-h-screen overflow-x-hidden bg-[#05060f] font-[Inter,sans-serif] text-white antialiased selection:bg-indigo-500/40"
      data-testid={testId}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[700px] bg-[radial-gradient(50%_45%_at_50%_0%,rgba(79,70,229,0.26),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px] bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_40%,transparent_100%)]" />
      <Header />
      <main className="relative pt-16">{children}</main>
      <Footer />
    </div>
  );
}

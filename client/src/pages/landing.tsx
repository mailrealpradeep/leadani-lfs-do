import { useEffect, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { BrandLogo, BrandMark } from "@/components/brand-logo";
import { SheetDemo } from "@/components/landing/sheet-demo";
import { Roadmap } from "@/components/landing/roadmap";
import {
  DISPLAY,
  Eyebrow,
  FinalCta,
  Footer,
  GhostCta,
  GRADIENT_TEXT,
  Header,
  PrimaryCta,
  Reveal,
  Section,
} from "@/components/marketing-shell";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BellRing,
  Bot,
  CalendarClock,
  Check,
  CircleDot,
  Clock3,
  DatabaseBackup,
  FileSpreadsheet,
  Fingerprint,
  Flame,
  Globe2,
  History,
  Inbox,
  LayoutGrid,
  Menu,
  MessageCircle,
  Route,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
  Wand2,
  X,
  Zap,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Hero + live product preview                                                */
/* -------------------------------------------------------------------------- */

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-[1px]" aria-label={`${n} of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3 w-3",
            i < n ? "fill-amber-400 text-amber-400" : "fill-white/10 text-white/10",
          )}
        />
      ))}
    </span>
  );
}

function ProgressRing({ value }: { value: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="55%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#d946ef" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke="url(#ringGrad)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value / 100)}
      />
    </svg>
  );
}

function Hero() {
  const reduce = useReducedMotion();
  const fade = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <Section className="overflow-hidden pb-24 pt-32 sm:pb-32 sm:pt-40" data-testid="section-hero">
      <div className="text-center">
        <motion.a
          {...fade(0)}
          href="#product"
          className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-3 text-[13px] text-white/75 backdrop-blur transition hover:border-white/20"
          data-testid="badge-hero"
        >
          <span className="rounded-full bg-gradient-to-r from-[#3b82f6] to-[#a855f7] px-2 py-0.5 text-[11px] font-semibold text-white">
            New
          </span>
          <span className="sm:hidden">AI rates every lead for you</span>
          <span className="hidden sm:inline">AI that rates every lead and checks every follow-up</span>
          <ArrowUpRight className="h-3.5 w-3.5 text-white/50" />
        </motion.a>

        <motion.h1
          {...fade(0.08)}
          className={cn(
            DISPLAY,
            "mx-auto max-w-4xl text-[42px] font-semibold leading-[1.02] text-white sm:text-6xl md:text-7xl lg:text-[84px]",
          )}
          data-testid="text-hero-heading"
        >
          Every lead, followed up.
          <br />
          <span className={GRADIENT_TEXT}>Every deal, closed.</span>
        </motion.h1>

        <motion.p
          {...fade(0.16)}
          className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/60 sm:text-lg md:text-xl"
          data-testid="text-hero-description"
        >
          Leadani captures leads from ads, WhatsApp and your website, routes each one to the
          right rep in seconds, and makes sure nobody forgets to follow up. More of your
          leads turn into revenue.
        </motion.p>

        <motion.div
          {...fade(0.24)}
          className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center"
        >
          <PrimaryCta href="/signup" testId="button-hero-trial">
            Start free
          </PrimaryCta>
          <GhostCta href="#how" testId="button-hero-how">
            See how it works
          </GhostCta>
        </motion.div>

        <motion.p {...fade(0.32)} className="mt-5 text-[13px] text-white/40" data-testid="text-hero-subtext">
          Free during early access · No credit card · Set up in minutes
        </motion.p>
      </div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="mt-16 sm:mt-20"
      >
        <SheetDemo />
      </motion.div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sources strip                                                              */
/* -------------------------------------------------------------------------- */

const SOURCES = [
  { label: "Meta Lead Ads", icon: Inbox },
  { label: "Google Ads", icon: Globe2 },
  { label: "WhatsApp Business", icon: MessageCircle },
  { label: "Website forms", icon: LayoutGrid },
  { label: "Excel & CSV", icon: FileSpreadsheet },
  { label: "Any webhook", icon: Zap },
];

const PROOF = [
  { value: "58,800+", label: "leads managed" },
  { value: "357,000+", label: "follow-ups logged" },
  { value: "245,000+", label: "calls logged" },
  { value: "290+", label: "deals converted" },
];

// Real production totals (see client/src/pages/customers.tsx for the counts).
function Proof() {
  return (
    <Section className="pb-16 pt-4" data-testid="section-proof">
      <Reveal>
        <div className="mx-auto max-w-5xl rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {PROOF.map((p) => (
              <div key={p.label} className="text-center">
                <p className={cn(DISPLAY, "text-3xl font-semibold text-white sm:text-4xl")}>{p.value}</p>
                <p className="mt-1 text-[13px] text-white/50">{p.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-[13.5px] text-white/50">
            Real teams in education, construction and IT services, counted from our production database.{" "}
            <Link asChild href="/customers">
              <a className="whitespace-nowrap font-medium text-[#a5b4fc] underline-offset-4 hover:underline" data-testid="link-proof-customers">
                See customer results →
              </a>
            </Link>
          </p>
        </div>
      </Reveal>
    </Section>
  );
}

function Sources() {
  return (
    <Section className="pb-20 pt-6">
      <p className="text-center text-[13px] text-white/40">
        Plug in every place your leads come from
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
        {SOURCES.map(({ label, icon: Icon }) => (
          <span
            key={label}
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-sm text-white/65"
          >
            <Icon className="h-4 w-4 text-white/40" />
            {label}
          </span>
        ))}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*  How it works: the lead journey                                             */
/* -------------------------------------------------------------------------- */

const JOURNEY = [
  {
    icon: Inbox,
    title: "Capture",
    text: "Leads from ads, WhatsApp, website and Excel land in one place. Duplicates are caught automatically.",
  },
  {
    icon: Route,
    title: "Route",
    text: "Rules send each lead to the right rep instantly, with fair weighted distribution across the team.",
  },
  {
    icon: BellRing,
    title: "Follow up",
    text: "Every lead gets a next follow-up time. Overdue ones light up, so nothing goes cold.",
  },
  {
    icon: Sparkles,
    title: "Qualify with AI",
    text: "AI reads every remark, rates each lead from Hot to Poor, and rejects lazy updates.",
  },
  {
    icon: Trophy,
    title: "Close & reward",
    text: "Pipeline stages, targets, PowerScore and Vision Boards turn closing into a game reps want to win.",
  },
];

function HowItWorks() {
  return (
    <Section id="how" className="scroll-mt-20 py-24 sm:py-32" data-testid="section-how">
      <Reveal className="mx-auto max-w-3xl text-center">
        <Eyebrow>How it works</Eyebrow>
        <h2 className={cn(DISPLAY, "text-3xl font-semibold text-white sm:text-5xl")}>
          From first click to closed deal,
          <span className="text-white/45"> on autopilot.</span>
        </h2>
      </Reveal>

      <div className="relative mt-16">
        <div className="pointer-events-none absolute left-[27px] top-0 h-full w-px bg-gradient-to-b from-[#22d3ee]/60 via-[#6366f1]/50 to-[#d946ef]/0 md:left-0 md:top-[27px] md:h-px md:w-full md:bg-gradient-to-r" />
        <ol className="grid gap-8 md:grid-cols-5 md:gap-6">
          {JOURNEY.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.08}>
              <li className="relative flex gap-5 md:flex-col md:gap-0">
                <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-[#0b0d1d] shadow-[0_0_30px_-8px_rgba(99,102,241,0.6)]">
                  <step.icon className="h-6 w-6 text-white" />
                </span>
                <div className="md:mt-6">
                  <p className="text-[12px] font-medium text-white/35">0{i + 1}</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-white/55">{step.text}</p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*  The problem, in one sentence                                               */
/* -------------------------------------------------------------------------- */

const OUTCOMES = [
  {
    k: "Speed to lead",
    v: "Seconds, not hours",
    text: "New leads reach the right rep while the customer is still on their phone.",
  },
  {
    k: "Follow-up discipline",
    v: "Zero forgotten leads",
    text: "Every lead has a next step and an owner. Managers see who is behind, live.",
  },
  {
    k: "Team motivation",
    v: "A team that wants to win",
    text: "Leaderboards, points and personal goals make the daily grind feel like progress.",
  },
];

function Problem() {
  return (
    <Section className="py-24 sm:py-32">
      <Reveal>
        <p
          className={cn(
            DISPLAY,
            "mx-auto max-w-4xl text-center text-[28px] font-medium leading-[1.2] text-white/45 sm:text-4xl md:text-[44px]",
          )}
        >
          Most leads aren't lost to competitors.{" "}
          <span className="text-white">They're lost to a follow-up nobody made.</span>
        </p>
      </Reveal>

      <div className="mt-16 grid gap-px overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.08] md:grid-cols-3">
        {OUTCOMES.map((o, i) => (
          <Reveal key={o.k} delay={i * 0.08} className="bg-[#070816]">
            <div className="h-full p-7 sm:p-9">
              <p className="text-[13px] font-medium text-[#8b9cff]">{o.k}</p>
              <p className={cn(DISPLAY, "mt-3 text-2xl font-semibold text-white sm:text-[28px]")}>
                {o.v}
              </p>
              <p className="mt-3 text-[15px] leading-relaxed text-white/55">{o.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Product bento                                                              */
/* -------------------------------------------------------------------------- */

function BentoCard({
  className,
  icon: Icon,
  title,
  text,
  children,
  delay = 0,
}: {
  className?: string;
  icon: typeof Sparkles;
  title: string;
  text: string;
  children?: ReactNode;
  delay?: number;
}) {
  return (
    <Reveal delay={delay} className={className}>
      <div className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6 transition-colors hover:border-white/[0.16] sm:p-7">
        <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl transition-opacity group-hover:opacity-100 md:opacity-0" />
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
          <Icon className="h-5 w-5 text-white" />
        </span>
        <h3 className="mt-5 text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-white/55">{text}</p>
        {children && <div className="mt-6 flex-1">{children}</div>}
      </div>
    </Reveal>
  );
}

function AiRatingVisual() {
  const items = [
    { label: "Hot", n: 5, w: "92%", c: "from-rose-400 to-orange-400" },
    { label: "Warm", n: 4, w: "71%", c: "from-amber-300 to-yellow-300" },
    { label: "Lukewarm", n: 3, w: "48%", c: "from-sky-400 to-indigo-400" },
    { label: "Cold", n: 2, w: "26%", c: "from-slate-400 to-slate-500" },
  ];
  return (
    <div className="space-y-3 rounded-2xl border border-white/[0.06] bg-[#080a18] p-4">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-3">
          <span className="w-20 text-xs text-white/60">{it.label}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div className={cn("h-full rounded-full bg-gradient-to-r", it.c)} style={{ width: it.w }} />
          </div>
          <Stars n={it.n} />
        </div>
      ))}
      <p className="pt-1 text-[11px] text-white/35">
        Understands remarks in English, Hindi and Odia
      </p>
    </div>
  );
}

function LeaderboardVisual() {
  const people = [
    { name: "Priya", pts: 2480, w: "100%" },
    { name: "Arjun", pts: 2115, w: "85%" },
    { name: "Monica", pts: 1890, w: "76%" },
  ];
  return (
    <div className="space-y-2.5 rounded-2xl border border-white/[0.06] bg-[#080a18] p-4">
      {people.map((p, i) => (
        <div key={p.name} className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
              i === 0 ? "bg-amber-400 text-[#1a1200]" : "bg-white/10 text-white/70",
            )}
          >
            {i + 1}
          </span>
          <span className="w-14 text-sm text-white/80">{p.name}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#22d3ee] via-[#6366f1] to-[#d946ef]"
              style={{ width: p.w }}
            />
          </div>
          <span className="w-12 text-right font-mono text-xs text-white/60">{p.pts}</span>
        </div>
      ))}
    </div>
  );
}

function RoutingVisual() {
  const reps = [
    { name: "Priya", pct: 40 },
    { name: "Arjun", pct: 30 },
    { name: "Monica", pct: 30 },
  ];
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#080a18] p-4">
      <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-white/70">
        <span className="text-[#8b9cff]">IF</span> city = Mumbai
        <span className="text-[#8b9cff]">AND</span> language = Hindi
      </div>
      <div className="mt-3 flex h-2.5 overflow-hidden rounded-full">
        <div className="bg-[#22d3ee]" style={{ width: "40%" }} />
        <div className="bg-[#6366f1]" style={{ width: "30%" }} />
        <div className="bg-[#c084fc]" style={{ width: "30%" }} />
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-white/50">
        {reps.map((r) => (
          <span key={r.name}>
            {r.name} · {r.pct}%
          </span>
        ))}
      </div>
    </div>
  );
}

function Product() {
  return (
    <Section id="product" className="scroll-mt-20 py-24 sm:py-32" data-testid="section-product">
      <Reveal className="mx-auto max-w-3xl text-center">
        <Eyebrow>The product</Eyebrow>
        <h2 className={cn(DISPLAY, "text-3xl font-semibold text-white sm:text-5xl")}>
          A complete sales engine.
          <br className="hidden sm:block" />
          <span className="text-white/45"> As easy as a spreadsheet.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base text-white/55 sm:text-lg">
          Your team already knows how to use it. Everything else is done for them.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-4 md:grid-cols-6">
        <BentoCard
          className="md:col-span-4"
          icon={Sparkles}
          title="AI lead rating"
          text="After a few follow-ups, AI scores engagement, sentiment and progress, and rates every lead from Hot to Poor. Your reps call the right people first."
        >
          <AiRatingVisual />
        </BentoCard>

        <BentoCard
          className="md:col-span-2"
          icon={Wand2}
          title="AI remark quality check"
          text="'Called' or 'NP' won't pass. AI asks for real detail before a follow-up is saved, so your CRM data stays useful."
          delay={0.05}
        />

        <BentoCard
          className="md:col-span-2"
          icon={MessageCircle}
          title="WhatsApp, built in"
          text="Connect WhatsApp Business. New chats become leads, replies land in the lead's history, and returning leads come back to life."
        />

        <BentoCard
          className="md:col-span-4"
          icon={Route}
          title="Smart routing & fair distribution"
          text="AND/OR rules route leads by city, language, campaign or anything else. Weighted round-robin keeps distribution fair, with no manual assigning."
          delay={0.05}
        >
          <RoutingVisual />
        </BentoCard>

        <BentoCard
          className="md:col-span-3"
          icon={Trophy}
          title="PowerScore & live leaderboard"
          text="Points for follow-ups, visits and closings. Streaks and milestones. Healthy competition, without micromanaging."
        >
          <LeaderboardVisual />
        </BentoCard>

        <BentoCard
          className="md:col-span-3"
          icon={Target}
          title="Vision Board"
          text="Each rep sets a personal dream, like a car, a home or a trip, and watches it fill up with every deal they close. Motivation that's personal."
          delay={0.05}
        >
          <div className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-[#080a18] p-4">
            <div className="relative">
              <ProgressRing value={72} />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white">
                72%
              </span>
            </div>
            <div className="text-sm">
              <p className="font-semibold text-white">Dream home down payment</p>
              <p className="text-white/50">₹8.6L earned of ₹12L · 23 closings</p>
            </div>
          </div>
        </BentoCard>

        <BentoCard
          className="md:col-span-2"
          icon={LayoutGrid}
          title="Feels like Excel"
          text="Click to edit, tab to move, paste to fill. Custom columns, filters, saved views and live sync across the team."
        />
        <BentoCard
          className="md:col-span-2"
          icon={Fingerprint}
          title="Attendance & exit rules"
          text="Reps mark attendance from their phone and can't clock out until the day's follow-ups are done."
          delay={0.05}
        />
        <BentoCard
          className="md:col-span-2"
          icon={CircleDot}
          title="Pipeline analytics"
          text="See exactly where leads drop off, stage by stage, with expected vs actual conversion and incentives."
          delay={0.1}
        />
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*  For every seat                                                             */
/* -------------------------------------------------------------------------- */

const ROLES = [
  {
    who: "For owners",
    headline: "Know exactly where revenue is leaking.",
    points: [
      "Pipeline and conversion by stage",
      "Team performance side by side",
      "Your data is yours, with automatic Google Sheets backup",
    ],
  },
  {
    who: "For managers",
    headline: "Run the team from one screen.",
    points: [
      "See who is behind on follow-ups, live",
      "Targets: daily, weekly, monthly",
      "Auto-fill, validation and lock rules keep data clean",
    ],
  },
  {
    who: "For sales reps",
    headline: "Know who to call next. Always.",
    points: [
      "Today's follow-ups and hot leads, one tap away",
      "Full CRM on any phone, no app store needed",
      "Points, streaks and a personal Vision Board",
    ],
  },
];

function Teams() {
  return (
    <Section id="teams" className="scroll-mt-20 py-24 sm:py-32" data-testid="section-teams">
      <Reveal className="mx-auto max-w-3xl text-center">
        <Eyebrow>Built for every seat</Eyebrow>
        <h2 className={cn(DISPLAY, "text-3xl font-semibold text-white sm:text-5xl")}>
          Everyone gets what they need.
          <span className="text-white/45"> Nobody needs training.</span>
        </h2>
      </Reveal>

      <div className="mt-14 grid gap-4 md:grid-cols-3">
        {ROLES.map((r, i) => (
          <Reveal key={r.who} delay={i * 0.08}>
            <div className="h-full rounded-3xl border border-white/[0.08] bg-white/[0.02] p-7">
              <p className="text-[13px] font-medium text-[#8b9cff]">{r.who}</p>
              <h3 className="mt-3 text-xl font-semibold leading-snug text-white">{r.headline}</h3>
              <ul className="mt-6 space-y-3">
                {r.points.map((p) => (
                  <li key={p} className="flex gap-3 text-[15px] text-white/65">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Trust                                                                      */
/* -------------------------------------------------------------------------- */

const TRUST = [
  { icon: ShieldCheck, title: "Role-based access", text: "Admins, managers and reps see only the sheets they should." },
  { icon: History, title: "Complete audit trail", text: "Every change, every login, every lead's full history." },
  { icon: DatabaseBackup, title: "Never lose data", text: "30-day lead recovery and automatic Google Sheets backup." },
  { icon: BadgeCheck, title: "Duplicate-proof", text: "Every entry point checks phone numbers before a lead is created." },
  { icon: Smartphone, title: "Installable app", text: "Works like a native app on Android and iPhone, with push alerts." },
  { icon: Clock3, title: "Your timezone", text: "Teams across cities and countries see the same correct time." },
];

function Trust() {
  return (
    <Section id="trust" className="scroll-mt-20 py-24 sm:py-32" data-testid="section-trust">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <Reveal>
          <Eyebrow>Built to be trusted</Eyebrow>
          <h2 className={cn(DISPLAY, "text-3xl font-semibold text-white sm:text-5xl")}>
            Your leads are your business.
            <span className="text-white/45"> We treat them that way.</span>
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-white/55 sm:text-lg">
            Leadani is built for teams that can't afford to lose a single lead or a single row
            of data.
          </p>
        </Reveal>
        <div className="grid gap-x-8 gap-y-9 sm:grid-cols-2">
          {TRUST.map((t, i) => (
            <Reveal key={t.title} delay={i * 0.05}>
              <div>
                <t.icon className="h-5 w-5 text-[#8b9cff]" />
                <h3 className="mt-3 font-semibold text-white">{t.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-white/55">{t.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Pricing + calculator                                                       */
/* -------------------------------------------------------------------------- */

// Change these to adjust the published price list.
const PRICING = {
  base: 100, // USD per company per month
  includedUsers: 2,
  includedLeads: 500, // new leads per month
  perExtraUser: 25, // USD per additional user per month
  leadBlock: 500, // additional leads are sold in blocks of this size
  perLeadBlock: 15, // USD per additional block per month
};

function priceFor(users: number, leads: number) {
  const extraUsers = Math.max(0, users - PRICING.includedUsers);
  const extraBlocks = Math.ceil(Math.max(0, leads - PRICING.includedLeads) / PRICING.leadBlock);
  return {
    extraUsers,
    extraBlocks,
    userCost: extraUsers * PRICING.perExtraUser,
    leadCost: extraBlocks * PRICING.perLeadBlock,
    total: PRICING.base + extraUsers * PRICING.perExtraUser + extraBlocks * PRICING.perLeadBlock,
  };
}

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

function RangeField({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
  testId,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  testId: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="block">
      <span className="flex items-baseline justify-between">
        <span className="text-sm text-white/60">{label}</span>
        <span className="font-mono text-lg font-semibold text-white">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        data-testid={testId}
        className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-indigo-400 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(129,140,248,0.35)]"
        style={{
          background: `linear-gradient(to right, #22d3ee 0%, #6366f1 ${pct / 2}%, #c084fc ${pct}%, rgba(255,255,255,0.1) ${pct}%)`,
        }}
      />
      <span className="mt-1.5 flex justify-between text-[11px] text-white/30">
        <span>{min.toLocaleString("en-US")}</span>
        <span>{max.toLocaleString("en-US")}+</span>
      </span>
    </label>
  );
}

function Pricing() {
  const [users, setUsers] = useState(5);
  const [leads, setLeads] = useState(1500);
  const p = priceFor(users, leads);

  return (
    <Section id="pricing" className="scroll-mt-20 py-24 sm:py-32" data-testid="section-pricing">
      <Reveal className="mx-auto max-w-3xl text-center">
        <Eyebrow>Pricing</Eyebrow>
        <h2 className={cn(DISPLAY, "text-3xl font-semibold text-white sm:text-5xl")}>
          One simple price.
          <br className="hidden sm:block" />
          <span className="text-white/45"> Grows only when you do.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base text-white/55 sm:text-lg">
          Every feature, for every company. You only pay for more seats and more leads.
        </p>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mx-auto mt-8 flex max-w-xl items-center justify-center gap-2.5 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-4 py-2 text-center text-[13px] text-emerald-200">
          <Sparkles className="h-4 w-4 shrink-0" />
          Early access: Leadani is free to use until paid plans launch.
        </div>
      </Reveal>

      <div className="mt-10 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <Reveal>
          <div className="relative h-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-indigo-500/[0.12] to-white/[0.02] p-7 sm:p-9">
            <p className="text-[13px] font-medium text-[#8b9cff]">Leadani for teams</p>
            <p className="mt-4 flex items-end gap-2">
              <span className={cn(DISPLAY, "text-6xl font-semibold text-white")}>{usd(PRICING.base)}</span>
              <span className="pb-2 text-white/50">/ company / month</span>
            </p>
            <ul className="mt-7 space-y-3 text-[15px] text-white/70">
              {[
                `${PRICING.includedUsers} users included`,
                `${PRICING.includedLeads.toLocaleString("en-US")} new leads every month`,
                "Every feature, including AI and WhatsApp",
                "Unlimited sheets, views and webhooks",
                `+${usd(PRICING.perExtraUser)} per extra user`,
                `+${usd(PRICING.perLeadBlock)} per extra ${PRICING.leadBlock.toLocaleString("en-US")} leads`,
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> {t}
                </li>
              ))}
            </ul>
            <PrimaryCta href="/signup" className="mt-9 w-full" testId="button-pricing-start">
              Start free
            </PrimaryCta>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="h-full rounded-3xl border border-white/[0.08] bg-white/[0.02] p-7 sm:p-9" data-testid="pricing-calculator">
            <p className="text-[13px] font-medium text-[#8b9cff]">Estimate your price</p>
            <div className="mt-7 space-y-8">
              <RangeField
                label="Team members"
                value={users}
                display={String(users)}
                min={2}
                max={100}
                step={1}
                onChange={setUsers}
                testId="input-pricing-users"
              />
              <RangeField
                label="New leads per month"
                value={leads}
                display={leads.toLocaleString("en-US")}
                min={500}
                max={20000}
                step={500}
                onChange={setLeads}
                testId="input-pricing-leads"
              />
            </div>

            <div className="mt-9 space-y-2.5 border-t border-white/[0.08] pt-6 text-sm">
              <div className="flex justify-between text-white/55">
                <span>Base ({PRICING.includedUsers} users, {PRICING.includedLeads} leads)</span>
                <span className="font-mono text-white/80">{usd(PRICING.base)}</span>
              </div>
              <div className="flex justify-between text-white/55">
                <span>{p.extraUsers} extra {p.extraUsers === 1 ? "user" : "users"}</span>
                <span className="font-mono text-white/80">{usd(p.userCost)}</span>
              </div>
              <div className="flex justify-between text-white/55">
                <span>
                  {(p.extraBlocks * PRICING.leadBlock).toLocaleString("en-US")} extra leads
                </span>
                <span className="font-mono text-white/80">{usd(p.leadCost)}</span>
              </div>
            </div>

            <div className="mt-6 flex items-end justify-between gap-4 rounded-2xl bg-white/[0.04] p-5">
              <div>
                <p className="text-[13px] text-white/50">Estimated monthly price</p>
                <p className="mt-1 text-[13px] text-emerald-300">Free during early access</p>
              </div>
              <p className={cn(DISPLAY, "text-4xl font-semibold text-white")} data-testid="text-pricing-total">
                {usd(p.total)}
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */

export default function Landing() {
  useEffect(() => {
    const prev = document.title;
    document.title = "Leadani: every lead, followed up";
    const html = document.documentElement;
    const prevScroll = html.style.scrollBehavior;
    html.style.scrollBehavior = "smooth";
    // Arriving from another page via a link like /#roadmap: the browser tried
    // to jump before this page rendered, so scroll to the section now.
    let jump: number | undefined;
    if (window.location.hash.length <= 1) window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    if (window.location.hash.length > 1) {
      const id = decodeURIComponent(window.location.hash.slice(1));
      jump = window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "auto", block: "start" });
      }, 60);
    }
    return () => {
      window.clearTimeout(jump);
      document.title = prev;
      html.style.scrollBehavior = prevScroll;
    };
  }, []);

  return (
    <div
      className="relative min-h-screen overflow-x-hidden bg-[#05060f] font-[Inter,sans-serif] text-white antialiased selection:bg-indigo-500/40"
      data-testid="landing-page"
    >
      {/* ambient background */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1100px] bg-[radial-gradient(50%_40%_at_50%_0%,rgba(79,70,229,0.28),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[900px] bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_40%,transparent_100%)]" />

      <Header />
      <main className="relative">
        <Hero />
        <Proof />
        <Sources />
        <HowItWorks />
        <Problem />
        <Product />
        <Teams />
        <Trust />
        <Roadmap />
        <Pricing />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

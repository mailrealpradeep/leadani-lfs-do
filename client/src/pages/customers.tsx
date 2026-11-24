import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import {
  Anchor,
  Bot,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Code2,
  Database,
  HardHat,
  MapPin,
  MessageSquareText,
  PhoneCall,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DISPLAY,
  Eyebrow,
  FinalCta,
  GRADIENT_TEXT,
  MarketingPage,
  Reveal,
  Section,
} from "@/components/marketing-shell";

/*
 * Customers page. Every figure below was counted from the Leadani production
 * database (aggregate counts only, no lead data) on AS_OF. Nothing here is
 * estimated or extrapolated. To refresh, re-run the counts and update DATA.
 *
 * Client names are deliberately NOT in this file: the page source ships in the
 * public JS bundle. Once a client agrees in writing to be named, add their
 * name as `name` on their entry below.
 */
const AS_OF = "23 November 2026";

const PLATFORM = [
  { value: 58800, suffix: "+", label: "leads managed", icon: Database },
  { value: 357000, suffix: "+", label: "follow-ups logged", icon: MessageSquareText },
  { value: 245000, suffix: "+", label: "calls logged", icon: PhoneCall },
  { value: 38900, suffix: "+", label: "leads rated by AI", icon: Bot },
  { value: 1670, suffix: "", label: "visits completed", icon: CalendarCheck },
  { value: 290, suffix: "+", label: "deals converted", icon: Trophy },
];

type Stat = { value: number; label: string; format?: "pct" | "decimal" };

type Story = {
  id: string;
  name?: string;
  descriptor: string;
  industry: string;
  icon: typeof Anchor;
  since: string;
  team: number;
  headline: ReactNode;
  summary: string;
  stats: Stat[];
  funnel: { label: string; value: number }[];
  howTheyUse: string[];
  accent: string;
};

const STORIES: Story[] = [
  {
    id: "maritime",
    descriptor: "Maritime training institute",
    industry: "Education",
    icon: Anchor,
    since: "December 2025",
    team: 16,
    headline: (
      <>
        48,500 student enquiries.
        <br />
        <span className="text-white/45">9 in 10 followed up.</span>
      </>
    ),
    summary:
      "A team of counsellors works every enquiry from one shared Leadani sheet: each call is logged with its outcome, campus visits are scheduled and tracked, and AI rates every lead from the remarks.",
    stats: [
      { value: 48542, label: "enquiries managed" },
      { value: 300561, label: "follow-ups logged" },
      { value: 228171, label: "calls logged" },
      { value: 93.5, label: "of enquiries followed up", format: "pct" },
      { value: 6.2, label: "follow-ups per enquiry", format: "decimal" },
      { value: 34570, label: "enquiries rated by AI" },
    ],
    funnel: [
      { label: "Enquiries", value: 48542 },
      { label: "Followed up", value: 45404 },
      { label: "Visits completed", value: 1535 },
      { label: "Enrolled", value: 264 },
    ],
    howTheyUse: [
      "Every call logged with its status: connected, busy, not reachable",
      "Campus visits scheduled and marked visited in the sheet",
      "AI rating on every enquiry, from counsellors' remarks",
      "15 counsellors active, one shared source of truth",
    ],
    accent: "from-sky-400 via-indigo-500 to-violet-500",
  },
  {
    id: "construction",
    descriptor: "Home construction company",
    industry: "Construction & real estate",
    icon: HardHat,
    since: "December 2025",
    team: 6,
    headline: (
      <>
        6,548 of 6,551 leads
        <br />
        <span className="text-white/45">followed up.</span>
      </>
    ),
    summary:
      "A small sales team that never lets a lead go cold: 6,548 of 6,551 leads have at least one logged follow-up, at more than eight touches per lead, with site visits tracked right in the sheet.",
    stats: [
      { value: 6551, label: "leads managed" },
      { value: 99.9, label: "of leads followed up", format: "pct" },
      { value: 8.4, label: "follow-ups per lead", format: "decimal" },
      { value: 54998, label: "follow-ups logged" },
      { value: 16171, label: "calls logged" },
      { value: 117, label: "site visits completed" },
    ],
    funnel: [
      { label: "Leads", value: 6551 },
      { label: "Followed up", value: 6548 },
      { label: "Site visits", value: 117 },
    ],
    howTheyUse: [
      "Leads from ads land in the sheet with their ad source",
      "Estimate, plan and final-stage statuses mirror their sales process",
      "Site visits scheduled, assigned and marked done",
      "AI-rated leads tell the team who to call first",
    ],
    accent: "from-amber-300 via-orange-500 to-rose-500",
  },
];

const SMALL_STORY = {
  descriptor: "Software services firm",
  industry: "IT services",
  icon: Code2,
  deals: 25,
  leads: 978,
};

const displayName = (s: { name?: string; descriptor: string }) => s.name ?? s.descriptor;
const anyNamed = () => STORIES.some((s) => s.name);

/* ------------------------------------------------------------- helpers */

function formatValue(value: number, format?: Stat["format"]) {
  if (format === "pct") return `${value.toFixed(1)}%`;
  if (format === "decimal") return value.toFixed(1);
  return Math.round(value).toLocaleString("en-US");
}

function CountUp({ value, format, suffix = "" }: { value: number; format?: Stat["format"]; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);

  useEffect(() => {
    if (!inView || reduce) return;
    const start = performance.now();
    const duration = 1400;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, reduce]);

  return (
    <span ref={ref} className="tabular-nums">
      {formatValue(shown, format)}
      {suffix}
    </span>
  );
}

/* --------------------------------------------------------------- hero */

function Hero() {
  return (
    <Section className="pb-10 pt-20 sm:pt-28" data-testid="section-customers-hero">
      <div className="text-center">
        <Eyebrow>Customers</Eyebrow>
        <h1 className={cn(DISPLAY, "mx-auto max-w-4xl text-[42px] font-semibold leading-[1.03] text-white sm:text-6xl md:text-7xl")}>
          Real teams.
          <br />
          <span className={GRADIENT_TEXT}>Real numbers.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/60 sm:text-lg">
          Every number on this page is counted straight from Leadani's production database. Nothing is estimated, surveyed or rounded up.
        </p>
      </div>

      <div className="mx-auto mt-14 grid max-w-5xl grid-cols-2 gap-px overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.08] md:grid-cols-3">
        {PLATFORM.map((s) => (
          <div key={s.label} className="bg-[#070816] px-5 py-7 sm:px-8 sm:py-9">
            <s.icon className="h-5 w-5 text-[#8b9cff]" />
            <p className={cn(DISPLAY, "mt-4 text-[30px] font-semibold text-white sm:text-5xl")}>
              <CountUp value={s.value} suffix={s.suffix} />
            </p>
            <p className="mt-1.5 text-[13px] text-white/50 sm:text-[15px]">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-[12.5px] text-white/35">
        All Leadani workspaces combined, as of {AS_OF}.
      </p>
    </Section>
  );
}

/* --------------------------------------------------- what it means */

function Meaning() {
  const items = [
    {
      big: "~1,000",
      title: "follow-ups every day",
      text: "357,000 follow-ups in under a year. Each one has a remark, a time and an owner, instead of living in notebooks and personal WhatsApp chats.",
    },
    {
      big: "6.1",
      title: "touches per lead, on average",
      text: "Leads aren't called once and forgotten. They're worked again and again until there's an answer.",
    },
    {
      big: "1 step",
      title: "to hand over a leaving rep's leads",
      text: "Transfer all their leads to a teammate at once. Every past call and remark moves with them, so nobody starts from zero.",
    },
  ];
  return (
    <Section className="py-16 sm:py-24">
      <Reveal className="mx-auto max-w-3xl text-center">
        <Eyebrow>What that means</Eyebrow>
        <h2 className={cn(DISPLAY, "text-3xl font-semibold text-white sm:text-5xl")}>
          Sales memory
          <br className="hidden sm:block" />
          <span className="text-white/45"> your business never loses.</span>
        </h2>
      </Reveal>
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {items.map((it, i) => (
          <Reveal key={it.title} delay={i * 0.08}>
            <div className="h-full rounded-3xl border border-white/[0.08] bg-white/[0.02] p-7">
              <p className={cn(DISPLAY, "text-5xl font-semibold", GRADIENT_TEXT)}>{it.big}</p>
              <p className="mt-3 text-lg font-semibold text-white">{it.title}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-white/55">{it.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------- case study */

function Funnel({ steps, accent }: { steps: Story["funnel"]; accent: string }) {
  const max = steps[0].value;
  return (
    <div className="space-y-3">
      {steps.map((s, i) => {
        // Visible bars even for small stages; label carries the exact value.
        const pct = Math.max(6, (s.value / max) * 100);
        return (
          <div key={s.label}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
              <span className="text-white/65">{s.label}</span>
              <span className="font-semibold tabular-nums text-white">{s.value.toLocaleString("en-US")}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                className={cn("h-full rounded-full bg-gradient-to-r", accent)}
                initial={{ width: 0 }}
                whileInView={{ width: `${pct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CaseStudy({ story, flip }: { story: Story; flip?: boolean }) {
  const Icon = story.icon;
  return (
    <Section id={story.id} className="scroll-mt-20 py-10 sm:py-14" data-testid={`case-${story.id}`}>
      <Reveal>
        <article className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01]">
          <div className={cn("pointer-events-none absolute -top-40 h-80 w-80 rounded-full bg-gradient-to-br opacity-25 blur-3xl", story.accent, flip ? "-left-20" : "-right-20")} />
          <div className={cn("relative grid gap-10 p-7 sm:p-10 lg:grid-cols-2 lg:gap-14 lg:p-14", flip && "lg:[&>*:first-child]:order-2")}>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white", story.accent)}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[12px] text-white/70">
                  {story.industry}
                </span>
              </div>
              <p className="mt-5 text-[15px] font-medium text-white/80">{displayName(story)}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-white/45">
                <span className="inline-flex items-center gap-1"><CalendarCheck className="h-3.5 w-3.5" /> On Leadani since {story.since}</span>
                <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {story.team} team members</span>
              </p>
              <h2 className={cn(DISPLAY, "mt-6 text-3xl font-semibold leading-[1.08] text-white sm:text-[44px]")}>{story.headline}</h2>
              <p className="mt-5 text-[15.5px] leading-relaxed text-white/60">{story.summary}</p>

              <ul className="mt-7 space-y-2.5">
                {story.howTheyUse.map((u) => (
                  <li key={u} className="flex gap-2.5 text-[14.5px] text-white/70">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    {u}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.08] sm:grid-cols-3">
                {story.stats.map((st) => (
                  <div key={st.label} className="bg-[#080a19] p-4 sm:p-5">
                    <p className={cn(DISPLAY, "text-2xl font-semibold text-white sm:text-[28px]")}>
                      <CountUp value={st.value} format={st.format} />
                    </p>
                    <p className="mt-1 text-[12px] leading-snug text-white/50">{st.label}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-[#080a19] p-5 sm:p-6">
                <p className="mb-4 text-[12px] font-medium uppercase tracking-[0.14em] text-white/40">From lead to outcome</p>
                <Funnel steps={story.funnel} accent={story.accent} />
              </div>
            </div>
          </div>
        </article>
      </Reveal>
    </Section>
  );
}

function SmallStory() {
  const s = SMALL_STORY;
  const rate = ((s.deals / s.leads) * 100).toFixed(1);
  return (
    <Section className="py-10 sm:py-14">
      <Reveal>
        <div className="grid gap-6 rounded-[28px] border border-white/10 bg-white/[0.02] p-7 sm:p-10 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white">
                <s.icon className="h-5 w-5" />
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[12px] text-white/70">{s.industry}</span>
            </div>
            <p className="mt-4 text-[15px] font-medium text-white/80">{displayName(s)}</p>
            <h3 className={cn(DISPLAY, "mt-2 text-2xl font-semibold text-white sm:text-3xl")}>
              {s.deals} deals won from {s.leads.toLocaleString("en-US")} leads.
            </h3>
            <p className="mt-2 text-[15px] text-white/55">Payment received or work started, tracked stage by stage in the sheet.</p>
          </div>
          <div className="text-left md:text-right">
            <p className={cn(DISPLAY, "text-5xl font-semibold sm:text-6xl", GRADIENT_TEXT)}>{rate}%</p>
            <p className="mt-1 text-[13px] text-white/45">lead-to-deal rate</p>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

function Method() {
  return (
    <Section className="py-10">
      <div className="mx-auto flex max-w-3xl gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-[14px] leading-relaxed text-white/55">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#8b9cff]" />
        <div>
          <p className="font-medium text-white/80">How we count</p>
          <p className="mt-1.5">
            Figures are aggregate counts from Leadani's production database as of {AS_OF}. A follow-up is a logged update on
            a lead (call, WhatsApp, visit or note). A call is an update the rep logged as a call; Leadani does not record call audio yet. Visits and conversions are leads whose
            status the customer's own team set to visited or converted. No individual lead data is shown.
            {!anyNamed() && " Customer names are withheld until they agree to be named."}
          </p>
          <p className="mt-3 inline-flex items-center gap-1.5 text-white/40">
            <MapPin className="h-3.5 w-3.5" /> Teams across India
            <Building2 className="ml-3 h-3.5 w-3.5" /> Education, construction, IT services and more
          </p>
        </div>
      </div>
    </Section>
  );
}

export default function Customers() {
  return (
    <MarketingPage title="Customers · Leadani" testId="customers-page">
      <Hero />
      <Meaning />
      {STORIES.map((s, i) => (
        <CaseStudy key={s.id} story={s} flip={i % 2 === 1} />
      ))}
      <SmallStory />
      <Method />
      <FinalCta />
    </MarketingPage>
  );
}

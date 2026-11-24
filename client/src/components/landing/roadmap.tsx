import { motion, useReducedMotion } from "framer-motion";
import { BarChart3, Flame, Mic, Phone, PhoneIncoming, Smartphone, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { DISPLAY, Eyebrow, Reveal, Section } from "@/components/marketing-shell";

/*
 * "Coming next" roadmap. Everything here is planned, not shipped: each card
 * carries a "Coming soon" label so visitors and investors can tell the two
 * apart. Remove an item from ROADMAP (and add it to the product sections)
 * once it ships.
 */

function ComingSoon() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-200">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
      Coming soon
    </span>
  );
}

function CallAnalyticsVisual() {
  const reduce = useReducedMotion();
  const bars = [8, 14, 22, 12, 28, 18, 34, 20, 26, 10, 30, 16, 24, 12, 20, 8, 18, 26, 14, 22, 10, 16];
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#080a18] p-4">
      <div className="flex items-center justify-between text-[12px]">
        <span className="flex items-center gap-2 text-white/80">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500/15 text-rose-300">
            <Mic className="h-3.5 w-3.5" />
          </span>
          Call with Ananya Rao
        </span>
        <span className="font-mono text-white/45">04:12</span>
      </div>
      <div className="mt-3 flex h-10 items-center gap-[3px]">
        {bars.map((h, i) => (
          <motion.span
            key={i}
            className="w-full rounded-full bg-gradient-to-t from-indigo-500 to-cyan-300"
            style={{ height: h }}
            animate={reduce ? undefined : { scaleY: [1, 0.45, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.06, ease: "easeInOut" }}
          />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          { k: "Connect rate", v: "68%" },
          { k: "Avg talk time", v: "3m 40s" },
          { k: "Best time", v: "6–8 PM" },
        ].map((s) => (
          <div key={s.k} className="rounded-lg bg-white/[0.04] px-2 py-2">
            <p className="text-[14px] font-semibold text-white">{s.v}</p>
            <p className="text-[10.5px] text-white/45">{s.k}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CallerIdVisual() {
  const reduce = useReducedMotion();
  return (
    <div className="mx-auto w-full max-w-[240px] rounded-[28px] border border-white/10 bg-[#080a18] p-2">
      <div className="rounded-[22px] bg-gradient-to-b from-[#1b1f3d] to-[#0b0d1d] px-4 pb-4 pt-5 text-center">
        <p className="text-[11px] text-white/50">Incoming call · Leadani</p>
        <motion.span
          className="mx-auto mt-3 flex h-12 w-12 items-center justify-center rounded-full bg-fuchsia-500 text-[15px] font-bold text-white"
          animate={reduce ? undefined : { boxShadow: ["0 0 0 0 rgba(217,70,239,0.55)", "0 0 0 14px rgba(217,70,239,0)"] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        >
          AR
        </motion.span>
        <p className="mt-2 text-[16px] font-semibold text-white">Ananya Rao</p>
        <p className="text-[11.5px] text-white/55">Visit Scheduled · Sat 11 AM</p>
        <div className="mt-3 space-y-1.5 rounded-xl bg-white/[0.06] p-2.5 text-left text-[11px]">
          <p className="flex items-center gap-1.5 text-red-300">
            <Flame className="h-3 w-3" /> AI rating: Hot
          </p>
          <p className="text-white/65">“Wants 3BHK near Patia, budget ₹80L.”</p>
        </div>
        <div className="mt-4 flex justify-center gap-8">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500 text-white">
            <Phone className="h-4 w-4 rotate-[135deg]" />
          </span>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Phone className="h-4 w-4" />
          </span>
        </div>
      </div>
    </div>
  );
}

function MobileFirstVisual() {
  return (
    <div className="flex items-end justify-center gap-3">
      {[
        { h: "h-[150px]", label: "Today" },
        { h: "h-[178px]", label: "Lead" },
        { h: "h-[150px]", label: "Update" },
      ].map((p, i) => (
        <div key={p.label} className={cn("w-[74px] rounded-[18px] border border-white/10 bg-[#080a18] p-1.5", p.h)}>
          <div className="flex h-full flex-col gap-1.5 rounded-[13px] bg-white/[0.04] p-2">
            <span className="h-1.5 w-8 rounded-full bg-white/25" />
            {Array.from({ length: i === 1 ? 5 : 4 }).map((_, j) => (
              <span
                key={j}
                className={cn("h-4 rounded-md", j === 0 ? "bg-gradient-to-r from-indigo-500/70 to-fuchsia-500/70" : "bg-white/[0.07]")}
              />
            ))}
            <span className="mt-auto h-5 rounded-lg bg-white/90" />
          </div>
        </div>
      ))}
    </div>
  );
}

const ROADMAP = [
  {
    icon: BarChart3,
    title: "Call recording & call analytics",
    text: "Every call recorded and attached to the lead's history. See connect rate, talk time, missed calls and the best time to call, for each rep and the whole team.",
    visual: <CallAnalyticsVisual />,
  },
  {
    icon: PhoneIncoming,
    title: "Know who's calling, with lead data",
    text: "When a lead calls a rep's phone, Leadani shows who it is before they answer: name, status, AI rating and the last remark.",
    visual: <CallerIdVisual />,
  },
  {
    icon: Smartphone,
    title: "Fully mobile-first app",
    text: "Every screen redesigned for the phone first, so reps in the field can call, update and close leads with one hand.",
    visual: <MobileFirstVisual />,
  },
];

export function Roadmap({ id = "roadmap", className }: { id?: string; className?: string }) {
  return (
    <Section id={id} className={cn("scroll-mt-20 py-24 sm:py-32", className)} data-testid="section-roadmap">
      <Reveal className="mx-auto max-w-3xl text-center">
        <Eyebrow>Coming next</Eyebrow>
        <h2 className={cn(DISPLAY, "text-3xl font-semibold text-white sm:text-5xl")}>
          Deals happen on the phone.
          <br className="hidden sm:block" />
          <span className="text-white/45"> That's what we're building next.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base text-white/55 sm:text-lg">
          On our roadmap now. Early-access teams get every new feature as it ships.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-4 md:grid-cols-3">
        {ROADMAP.map((item, i) => (
          <Reveal key={item.title} delay={i * 0.08}>
            <div className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-dashed border-white/[0.14] bg-gradient-to-b from-white/[0.03] to-transparent p-6 sm:p-7">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                  <item.icon className="h-5 w-5 text-white" />
                </span>
                <ComingSoon />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-white/55">{item.text}</p>
              <div className="mt-6 flex flex-1 items-end">
                <div className="w-full">{item.visual}</div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <p className="mt-8 flex items-center justify-center gap-2 text-center text-[13px] text-white/40">
        <Sparkles className="h-3.5 w-3.5" /> Planned features. Timelines may change.
      </p>
    </Section>
  );
}

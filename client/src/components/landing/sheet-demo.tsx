import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  CalendarCheck,
  ChevronDown,
  Clock,
  Crown,
  Eye,
  EyeOff,
  FilterX,
  GripVertical,
  HelpCircle,
  History,
  LayoutGrid,
  ListChecks,
  MapPin,
  MessageCircle,
  Moon,
  MousePointer2,
  PanelLeft,
  PartyPopper,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Trophy,
  Users,
  Webhook,
  X,
  Zap,
} from "lucide-react";

/*
 * A faithful, animated copy of the real Leadani app (light mode: same sheet
 * grid, same "Record Lead Update" dialog, same AI Insights badges, same
 * PowerScore podium) playing the full journey of one lead:
 *
 *   lead arrives -> call logged, AI rejects a lazy remark -> visit scheduled
 *   (+10) -> visited (+25) -> deal closed (+100) -> monthly PowerScore ranking
 *
 * Everything is derived from one clock `t` (ms since the loop started).
 */

const LOOP = 31000;
const T = {
  newLead: 1200,
  toast1End: 4300,
  cursorEdit: 2500,
  dialogOpen: 3400,
  typeBad: [4000, 4600] as const,
  cursorSave: 4800,
  checking: [5300, 6100] as const,
  errorShown: [6100, 7700] as const,
  typeGood: [7700, 10300] as const,
  status: 10600,
  nfdt: 11100,
  saving: [11900, 12400] as const,
  scheduled: 12400,
  aiHot: 13100,
  toastScheduled: [12800, 15000] as const,
  cursorVisit: 15200,
  visitMenu: [16250, 17000] as const,
  visited: 17000,
  toastVisited: [17200, 19400] as const,
  cursorStatus: 19600,
  statusMenu: [20500, 21000] as const,
  closed: 21000,
  toastClosed: [21200, 24000] as const,
  cursorSidebar: 23300,
  scoreboard: 24400,
  countUp: [25000, 26600] as const,
  overtake: 26700,
};

const BAD_REMARK = "called";
const GOOD_REMARK =
  "Spoke to Ananya. Wants 3BHK near Patia, budget ₹80L. Site visit Sat 11 AM with family.";
const QUALITY_MSG = "Remark is too vague. Mention what the customer said and the next step.";

export const STEPS = [
  { from: 0, to: T.dialogOpen, title: "Lead arrives", text: "From your ad straight into the sheet, auto-assigned to a caller." },
  { from: T.dialogOpen, to: T.scheduled, title: "Call, AI-checked", text: "“called” is rejected. AI makes the caller write what really happened." },
  { from: T.scheduled, to: T.cursorVisit, title: "Visit scheduled", text: "Status, next follow-up and visit set. AI rates the lead Hot. +10 points." },
  { from: T.cursorVisit, to: T.cursorStatus, title: "Visited", text: "Visit marked done right in the sheet. Status auto-updates. +25 points." },
  { from: T.cursorStatus, to: T.cursorSidebar, title: "Deal closed", text: "Converted at ₹45L. The whole team sees the win. +100 points." },
  { from: T.cursorSidebar, to: LOOP, title: "Monthly ranking", text: "Every action rolls into a live PowerScore leaderboard." },
];

type Phase = "waiting" | "countdown" | "playing";
const COUNTDOWN_FROM = 3;

/**
 * The demo clock only runs while the demo is on screen. When it scrolls into
 * view it shows a 3-2-1 countdown and then plays from the first step; when it
 * leaves the screen it resets, so a returning visitor always sees the start.
 */
function useDemoClock(targetRef: React.RefObject<HTMLElement>) {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<Phase>("waiting");
  const [count, setCount] = useState(COUNTDOWN_FROM);
  const [t, setT] = useState(reduce ? T.closed + 400 : 0);

  useEffect(() => {
    const el = targetRef.current;
    if (!el || reduce) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        // Start once most of the demo is visible; reset once it is fully gone.
        if (entry.intersectionRatio >= 0.55) setVisible(true);
        else if (!entry.isIntersecting) setVisible(false);
      },
      { threshold: [0, 0.55] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [targetRef, reduce]);

  useEffect(() => {
    if (reduce) return;
    if (!visible) {
      setPhase("waiting");
      setCount(COUNTDOWN_FROM);
      setT(0);
      return;
    }
    setPhase("countdown");
    setCount(COUNTDOWN_FROM);
    let n = COUNTDOWN_FROM;
    const tick = window.setInterval(() => {
      n -= 1;
      if (n > 0) {
        setCount(n);
      } else {
        window.clearInterval(tick);
        setPhase("playing");
      }
    }, 800);
    return () => window.clearInterval(tick);
  }, [visible, reduce]);

  useEffect(() => {
    if (reduce || phase !== "playing") return;
    const start = performance.now();
    const id = window.setInterval(() => setT((performance.now() - start) % LOOP), 50);
    return () => window.clearInterval(id);
  }, [phase, reduce]);

  return { t, phase: reduce ? ("playing" as Phase) : phase, count };
}

function Countdown({ phase, count }: { phase: Phase; count: number }) {
  return (
    <AnimatePresence>
      {phase !== "playing" && (
        <motion.div
          key="countdown"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35 } }}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#05060f]/55 backdrop-blur-[3px]"
        >
          <div className="relative flex h-28 w-28 items-center justify-center sm:h-36 sm:w-36">
            <span className="absolute inset-0 rounded-full border border-white/15 bg-white/[0.06]" />
            {phase === "countdown" && (
              <motion.span
                key={`ring-${count}`}
                className="absolute inset-0 rounded-full border-2 border-indigo-300/80"
                initial={{ scale: 1, opacity: 0.9 }}
                animate={{ scale: 1.35, opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            )}
            <AnimatePresence mode="popLayout">
              <motion.span
                key={phase === "countdown" ? count : "wait"}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.6, opacity: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 22 }}
                className="font-[Geist,Inter,sans-serif] text-6xl font-semibold text-white sm:text-7xl"
              >
                {phase === "countdown" ? count : COUNTDOWN_FROM}
              </motion.span>
            </AnimatePresence>
          </div>
          <p className="mt-6 px-6 text-center text-sm font-medium text-white/85 sm:text-base">
            Watch one lead go from ad to closed deal
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const within = (t: number, [a, b]: readonly [number, number]) => t >= a && t < b;

function typed(text: string, t: number, [a, b]: readonly [number, number]) {
  if (t < a) return "";
  if (t >= b) return text;
  return text.slice(0, Math.ceil(((t - a) / (b - a)) * text.length));
}

type CursorTarget = "rest" | "edit" | "save" | "visitCell" | "visitOpt" | "statusCell" | "statusOpt" | "sidebar";

function deriveState(t: number) {
  let remark = "";
  if (t >= T.typeBad[0] && t < T.typeGood[0]) remark = typed(BAD_REMARK, t, T.typeBad);
  if (t >= T.typeGood[0]) remark = typed(GOOD_REMARK, t, T.typeGood);

  const cursor: CursorTarget =
    t < T.cursorEdit ? "rest"
    : t < T.cursorSave ? "edit"
    : t < T.scheduled ? "save"
    : t < T.cursorVisit ? "rest"
    : t < T.visitMenu[0] ? "visitCell"
    : t < T.visited ? "visitOpt"
    : t < T.cursorStatus ? "rest"
    : t < T.statusMenu[0] ? "statusCell"
    : t < T.closed ? "statusOpt"
    : t < T.cursorSidebar ? "rest"
    : t < T.scoreboard ? "sidebar"
    : "rest";

  const pressAt = [T.dialogOpen, T.checking[0], T.saving[0], T.visitMenu[0], T.visited, T.statusMenu[0], T.closed, T.scoreboard];
  const pressing = pressAt.some((p) => t >= p - 250 && t < p);

  const lead: Lead = {
    name: "Ananya Rao",
    mobile: "9439012856",
    status: t < T.scheduled ? "New Lead" : t < T.visited ? "Visit Scheduled" : t < T.closed ? "Visited" : "Converted",
    nfdt: t < T.scheduled ? "-" : t < T.closed ? "29/11/26 11:00" : "-",
    visit: t < T.scheduled ? "New" : t < T.visited ? "Scheduled" : "Visited",
    ai: t >= T.aiHot ? "Hot" : "New",
  };

  const flash: RowFlash =
    t >= T.closed ? "closed"
    : within(t, [T.newLead, T.newLead + 2200]) ? "new"
    : within(t, [T.scheduled, T.scheduled + 1600]) || within(t, [T.visited, T.visited + 1600]) ? "updated"
    : undefined;

  const step = STEPS.findIndex((s) => t >= s.from && t < s.to);
  const priyaBonus = t < T.countUp[0] ? 0 : t >= T.countUp[1] ? 135 : Math.round(((t - T.countUp[0]) / (T.countUp[1] - T.countUp[0])) * 135);

  return {
    t,
    step: step === -1 ? STEPS.length - 1 : step,
    screen: (t >= T.scoreboard ? "score" : "sheet") as "score" | "sheet",
    newLead: t >= T.newLead,
    lead,
    flash,
    dialogOpen: t >= T.dialogOpen && t < T.scheduled,
    remark,
    typing: within(t, T.typeBad) || within(t, T.typeGood),
    checking: within(t, T.checking),
    error: within(t, T.errorShown),
    statusSet: t >= T.status,
    nfdtSet: t >= T.nfdt,
    saving: within(t, T.saving),
    visitMenu: within(t, T.visitMenu),
    visitHover: t >= T.visitMenu[0] + 350,
    statusMenu: within(t, T.statusMenu),
    statusHover: t >= T.statusMenu[0] + 250,
    toast: within(t, [T.newLead, T.toast1End])
      ? ("lead" as const)
      : within(t, T.toastScheduled)
        ? ("scheduled" as const)
        : within(t, T.toastVisited)
          ? ("visited" as const)
          : within(t, T.toastClosed)
            ? ("closed" as const)
            : null,
    cursor,
    pressing,
    priyaBonus,
    overtaken: t >= T.overtake,
  };
}

type DemoState = ReturnType<typeof deriveState>;

/* ---------------------------------------------------------------- data */

type AiRating = "New" | "Hot" | "Warm" | "Neutral" | "Cold" | "Poor";
type RowFlash = "new" | "updated" | "closed" | undefined;

type Lead = {
  name: string;
  mobile: string;
  status: string;
  nfdt: string;
  visit: string;
  ai: AiRating;
  highlight?: "overdue";
};

const LEADS: Lead[] = [
  { name: "Rohit Sinha", mobile: "9861024417", status: "Negotiation", nfdt: "24/11/26 09:30", visit: "Visited", ai: "Warm", highlight: "overdue" },
  { name: "Neha Kapoor", mobile: "9437215580", status: "Visit Scheduled", nfdt: "24/11/26 16:30", visit: "Scheduled", ai: "Hot" },
  { name: "Aditya Verma", mobile: "7008364129", status: "Not Connected", nfdt: "24/11/26 18:00", visit: "New", ai: "Neutral" },
  { name: "Pooja Nair", mobile: "9124578830", status: "Final Stage", nfdt: "25/11/26 11:00", visit: "Visited", ai: "Hot" },
  { name: "Karan Malhotra", mobile: "8895102276", status: "Follow Up", nfdt: "26/11/26 12:15", visit: "Rescheduled", ai: "Warm" },
  { name: "Sneha Das", mobile: "9776041853", status: "Contacted", nfdt: "28/11/26 10:00", visit: "New", ai: "Cold" },
  { name: "Vikram Shah", mobile: "9938217764", status: "Lost", nfdt: "-", visit: "Cancelled", ai: "Poor" },
];

const VISIT_OPTIONS = ["Scheduled", "Visited", "Rescheduled", "No Show"];
const STATUS_OPTIONS = ["Visited", "Negotiation", "Converted", "Lost"];

// Same palette as client/src/components/ai-rating-badge.tsx (light mode)
const AI_STYLE: Record<AiRating, string> = {
  New: "bg-[#ebebeb] text-[#595959] border-[#595959]/30",
  Hot: "bg-red-500/10 text-red-600 border-red-500/30",
  Warm: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  Neutral: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  Cold: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  Poor: "bg-slate-500/10 text-slate-600 border-slate-500/30",
};

const PRIMARY = "bg-[#0848a8]"; // hsl(217 91% 35%), the app's primary

function AiBadge({ rating }: { rating: AiRating }) {
  return (
    <motion.span
      key={rating}
      initial={rating === "Hot" ? { scale: 0.5, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 16 }}
      className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold", AI_STYLE[rating])}
    >
      {rating === "Hot" && <Sparkles className="h-3 w-3" />}
      {rating}
    </motion.span>
  );
}

/** A value that briefly highlights whenever it changes. */
function Changing({ value, className }: { value: string; className?: string }) {
  return (
    <motion.span
      key={value}
      initial={{ backgroundColor: "rgba(8,72,168,0.18)" }}
      animate={{ backgroundColor: "rgba(8,72,168,0)" }}
      transition={{ duration: 1.4 }}
      className={cn("-mx-1 truncate rounded px-1", className)}
    >
      {value}
    </motion.span>
  );
}

/* ------------------------------------------------------------- dialog */

function UpdateDialog({ s, saveRef, compact }: { s: DemoState; saveRef?: React.Ref<HTMLButtonElement>; compact?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative rounded-lg border border-[#e6e6e6] bg-white text-left shadow-[0_24px_60px_-12px_rgba(0,0,0,0.35)]",
        compact ? "w-full p-4" : "w-[460px] p-6",
      )}
    >
      <X className="absolute right-4 top-4 h-4 w-4 text-[#737373]" />
      <p className={cn("font-semibold text-[#171717]", compact ? "text-[15px]" : "text-[17px]")}>Record Lead Update</p>

      <div className={cn(compact ? "mt-3 space-y-3" : "mt-4 space-y-4")}>
        <div className="space-y-1.5">
          <p className="text-[13px] font-medium text-[#171717]">Update Via</p>
          <div className="flex h-9 items-center justify-between rounded-md border border-[#e3e3e3] px-3 text-[13px] text-[#171717]">
            <span className="inline-flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-[#737373]" /> Call
            </span>
            <ChevronDown className="h-4 w-4 text-[#737373]" />
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-[13px] font-medium text-[#171717]">Remark</p>
          <div
            className={cn(
              "rounded-md border px-3 py-2 text-[13px] leading-relaxed text-[#171717] transition-colors",
              compact ? "min-h-[64px]" : "min-h-[70px]",
              s.error ? "border-red-400 ring-2 ring-red-500/15" : s.typing ? "border-[#0848a8] ring-2 ring-[#0848a8]/20" : "border-[#e3e3e3]",
            )}
          >
            {s.remark ? (
              <span>
                {s.remark}
                {s.typing && <span className="ml-[1px] inline-block h-[14px] w-[1.5px] translate-y-[2px] animate-pulse bg-[#171717]" />}
              </span>
            ) : (
              <span className="text-[#a3a3a3]">Enter update details...</span>
            )}
          </div>
          <AnimatePresence>
            {s.error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1 overflow-hidden"
              >
                <p className="flex items-start gap-1.5 text-[12.5px] text-red-500">
                  <Sparkles className="mt-[2px] h-3.5 w-3.5 shrink-0" />
                  {QUALITY_MSG}
                </p>
                <p className="text-[12.5px] text-[#737373] underline">Proceed Anyway</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-2.5 border-t border-[#ebebeb] pt-3">
          <p className="text-[12.5px] font-medium text-[#595959]">Quick Update (Optional)</p>
          <div className={cn("grid gap-3", compact ? "grid-cols-1" : "grid-cols-2")}>
            <div className="space-y-1.5">
              <p className="text-[12.5px] font-medium text-[#171717]">Lead Status</p>
              <div
                className={cn(
                  "flex h-9 items-center justify-between rounded-md border px-3 text-[13px] text-[#171717] transition-all",
                  s.statusSet ? "border-[#0848a8] bg-[#0848a8]/[0.04]" : "border-[#e3e3e3]",
                )}
              >
                {s.statusSet ? "Visit Scheduled" : "New Lead"}
                <ChevronDown className="h-4 w-4 text-[#737373]" />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[12.5px] font-medium text-[#171717]">Next Follow-up Date</p>
              <div
                className={cn(
                  "flex h-9 items-center justify-between rounded-md border px-3 text-[13px] transition-all",
                  s.nfdtSet ? "border-[#0848a8] bg-[#0848a8]/[0.04] text-[#171717]" : "border-[#e3e3e3] text-[#a3a3a3]",
                )}
              >
                {s.nfdtSet ? "29/11/2026, 11:00 AM" : "dd/mm/yyyy, --:--"}
                <CalendarCheck className="h-4 w-4 text-[#737373]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={cn("flex justify-end gap-2", compact ? "mt-4" : "mt-5")}>
        <span className="inline-flex h-9 items-center rounded-md border border-[#e3e3e3] px-4 text-[13px] font-medium text-[#171717]">Cancel</span>
        <button
          ref={saveRef}
          type="button"
          tabIndex={-1}
          className={cn(
            "inline-flex h-9 items-center rounded-md px-4 text-[13px] font-medium text-white transition-transform",
            PRIMARY,
            s.pressing && s.cursor === "save" && "scale-95",
          )}
        >
          {s.checking ? "Checking..." : s.saving ? "Saving..." : "Save Update"}
        </button>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------- toasts */

function Toast({ s, compact }: { s: DemoState; compact?: boolean }) {
  const content =
    s.toast === "lead" ? (
      <div className="rounded-lg border border-[#e6e6e6] bg-white p-3 shadow-lg">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-[#171717]">
          <Zap className="h-3.5 w-3.5 text-emerald-600" /> New lead · Meta Lead Ads
        </p>
        <p className="mt-0.5 text-[12px] text-[#595959]">Ananya Rao auto-assigned to Priya</p>
      </div>
    ) : s.toast === "scheduled" || s.toast === "visited" ? (
      <div className="flex items-center gap-3 rounded-lg border border-amber-300/60 bg-gradient-to-r from-amber-50 to-white p-3 shadow-lg">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400 text-[13px] font-bold text-[#3b2600]">
          {s.toast === "scheduled" ? "+10" : "+25"}
        </span>
        <div>
          <p className="text-[13px] font-semibold text-[#171717]">PowerScore earned</p>
          <p className="text-[12px] text-[#595959]">{s.toast === "scheduled" ? "Visit scheduled" : "Site visit completed"}</p>
        </div>
      </div>
    ) : s.toast === "closed" ? (
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-[1.5px] shadow-2xl">
        <div className="flex items-center gap-3 rounded-[10px] bg-white p-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white">
            <PartyPopper className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-[#171717]">Deal closed! ₹45,00,000</p>
            <p className="text-[12px] text-[#595959]">Priya converted Ananya Rao · +100 PowerScore</p>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <div className={cn("pointer-events-none absolute z-30", compact ? "inset-x-3 top-3" : "bottom-4 right-4 w-[320px]")}>
      <AnimatePresence mode="wait">
        {content && (
          <motion.div
            key={s.toast}
            initial={{ opacity: 0, y: compact ? -14 : 14, scale: s.toast === "closed" ? 0.9 : 1 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: compact ? -8 : 8 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Confetti({ show }: { show: boolean }) {
  const pieces = Array.from({ length: 26 }, (_, i) => i);
  const colors = ["#f59e0b", "#ef4444", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];
  return (
    <AnimatePresence>
      {show && (
        <motion.div key="confetti" className="pointer-events-none absolute inset-0 z-30 overflow-hidden" exit={{ opacity: 0 }}>
          {pieces.map((i) => (
            <motion.span
              key={i}
              className="absolute top-0 h-2 w-1.5 rounded-[1px]"
              style={{ left: `${(i * 37) % 100}%`, backgroundColor: colors[i % colors.length] }}
              initial={{ y: -20, rotate: 0, opacity: 1 }}
              animate={{ y: 620, rotate: 360 + i * 40, opacity: [1, 1, 0] }}
              transition={{ duration: 2.2 + (i % 5) * 0.25, delay: (i % 7) * 0.06, ease: "easeIn" }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------- PowerScore */

type Person = { name: string; initials: string; base: number; color: string };
const TEAM: Person[] = [
  { name: "Arjun", initials: "AR", base: 2340, color: "bg-sky-500" },
  { name: "Priya", initials: "PR", base: 2215, color: "bg-fuchsia-500" },
  { name: "Monica", initials: "MO", base: 1980, color: "bg-emerald-500" },
  { name: "Rahul", initials: "RA", base: 1620, color: "bg-indigo-500" },
  { name: "Sneha", initials: "SN", base: 1410, color: "bg-rose-500" },
];

function ranked(s: DemoState) {
  const list = TEAM.map((p) => ({ ...p, pts: p.base + (p.name === "Priya" ? s.priyaBonus : 0) }));
  return s.overtaken ? list.sort((a, b) => b.pts - a.pts) : list;
}

const PEDESTAL = [
  { h: 132, cls: "from-amber-300 via-amber-400 to-amber-500", trophy: "text-amber-50" },
  { h: 104, cls: "from-slate-200 via-slate-300 to-slate-400", trophy: "text-white" },
  { h: 86, cls: "from-orange-200 via-orange-300 to-orange-400", trophy: "text-orange-50" },
];

function Podium({ s, compact }: { s: DemoState; compact?: boolean }) {
  const r = ranked(s);
  const order = [1, 0, 2]; // 2nd, 1st, 3rd
  return (
    <div className={cn("relative flex items-end justify-center", compact ? "gap-2 px-2 pt-8" : "gap-6 px-6 pt-8")}>
      {order.map((rank) => {
        const p = r[rank];
        const ped = PEDESTAL[rank];
        return (
          <motion.div
            key={p.name}
            layout
            transition={{ type: "spring", stiffness: 160, damping: 20 }}
            className={cn("flex flex-col items-center", compact ? "w-[86px]" : "w-[150px]")}
          >
            <div className="relative mb-2">
              <AnimatePresence>
                {rank === 0 && (
                  <motion.span
                    key={`crown-${p.name}`}
                    initial={{ y: -16, opacity: 0, rotate: -15 }}
                    animate={{ y: 0, opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 14 }}
                    className="absolute -top-7 left-1/2 -translate-x-1/2"
                  >
                    <Crown className={cn("text-amber-500 drop-shadow-[0_2px_8px_rgba(251,191,36,0.8)]", compact ? "h-6 w-6" : "h-8 w-8")} />
                  </motion.span>
                )}
              </AnimatePresence>
              <span
                className={cn(
                  "flex items-center justify-center rounded-full font-bold text-white ring-4",
                  p.color,
                  rank === 0 ? "ring-amber-300" : rank === 1 ? "ring-slate-300" : "ring-orange-300",
                  compact ? (rank === 0 ? "h-12 w-12 text-[13px]" : "h-10 w-10 text-[12px]") : rank === 0 ? "h-16 w-16 text-[16px]" : "h-14 w-14 text-[14px]",
                )}
              >
                {p.initials}
              </span>
            </div>
            <p className={cn("font-semibold text-[#171717]", compact ? "text-[12px]" : "text-[14px]")}>{p.name}</p>
            <p className={cn("mb-2 font-bold tabular-nums text-orange-600", compact ? "text-[12px]" : "text-[15px]")}>
              {p.pts.toLocaleString("en-IN")}
            </p>
            <motion.div
              layout
              style={{ height: compact ? ped.h * 0.62 : ped.h }}
              className={cn("relative flex w-full items-start justify-center rounded-t-xl bg-gradient-to-b pt-3 shadow-inner", ped.cls)}
            >
              {!compact && <Trophy className={cn("h-6 w-6", ped.trophy)} />}
              <span className={cn("absolute font-black text-white/90", compact ? "inset-0 flex items-center justify-center text-[20px]" : "bottom-1.5 text-[24px]")}>{rank + 1}</span>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}

function PowerScoreScreen({ s, compact }: { s: DemoState; compact?: boolean }) {
  const r = ranked(s);
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn("h-full bg-gradient-to-b from-slate-50 to-white", compact ? "px-3 pt-3" : "px-6 pt-5")}
    >
      <div className="flex items-center gap-3">
        <span className={cn("flex items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30", compact ? "h-9 w-9" : "h-11 w-11")}>
          <Zap className={compact ? "h-5 w-5" : "h-6 w-6"} />
        </span>
        <div className="min-w-0">
          <p className={cn("bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text font-bold text-transparent", compact ? "text-[18px]" : "text-[24px] leading-tight")}>
            PowerScore
          </p>
          <p className={cn("truncate text-[#595959]", compact ? "text-[11px]" : "text-[13px]")}>Gamified leaderboard - earn points for your actions</p>
        </div>
        {!compact && (
          <span className="ml-auto flex h-9 w-9 items-center justify-center rounded-md border border-[#e3e3e3] text-[#404040]">
            <RefreshCw className="h-4 w-4" />
          </span>
        )}
      </div>

      <div className={cn("mt-3 inline-flex rounded-lg bg-white p-1 shadow-sm", compact ? "text-[11px]" : "text-[13px]")}>
        {(compact ? ["Today", "This Week", "This Month"] : ["Today", "Yesterday", "This Week", "This Month", "Last Month", "All Time"]).map((tab) => (
          <span
            key={tab}
            className={cn("rounded-md px-2.5 py-1", tab === "This Month" ? "bg-gradient-to-r from-amber-500 to-orange-500 font-medium text-white" : "text-[#404040]")}
          >
            {tab}
          </span>
        ))}
      </div>

      <div className="relative mt-3 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50/70 to-white shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_70%,rgba(251,191,36,0.18),transparent_70%)]" />
        <Podium s={s} compact={compact} />
      </div>

      <div className={cn("mt-3 space-y-1.5", compact && "pb-16")}>
        {r.slice(3).map((p, i) => (
          <motion.div
            layout
            key={p.name}
            className={cn("flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 shadow-sm", compact ? "h-10" : "h-11")}
          >
            <span className="w-5 text-center text-[13px] font-bold text-[#737373]">{i + 4}</span>
            <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white", p.color)}>{p.initials}</span>
            <span className="text-[13px] font-medium text-[#171717]">{p.name}</span>
            <span className="ml-auto text-[13px] font-bold tabular-nums text-orange-600">{p.pts.toLocaleString("en-IN")}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------ dropdown menu */

function Menu({
  options,
  hover,
  optRef,
  target,
  compact,
  title,
}: {
  options: string[];
  hover: boolean;
  optRef?: React.Ref<HTMLDivElement>;
  target: string;
  compact?: boolean;
  title?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "z-30 rounded-md border border-[#e6e6e6] bg-white p-1 text-[13px] text-[#171717] shadow-xl",
        compact ? "w-full" : "absolute left-1 top-[40px] w-[150px]",
      )}
    >
      {title && <p className="px-2 pb-1 pt-1.5 text-[12px] font-semibold text-[#595959]">{title}</p>}
      {options.map((o) => (
        <div
          key={o}
          ref={o === target ? optRef : undefined}
          className={cn("flex items-center rounded px-2", compact ? "h-9" : "h-8", o === target && hover && "bg-[#0848a8] text-white")}
        >
          {o}
        </div>
      ))}
    </motion.div>
  );
}

/* ------------------------------------------------------ desktop screen */

const SIDEBAR = [
  { icon: LayoutGrid, label: "My Sheets", key: "sheet" },
  { icon: ListChecks, label: "Tasks" },
  { icon: Clock, label: "Attendance" },
  { icon: BarChart3, label: "Reports" },
  { icon: Users, label: "Team Performance" },
  { icon: Trophy, label: "Leaderboard" },
  { icon: Sparkles, label: "PowerScore", key: "score" },
  { icon: Star, label: "Vision Board" },
  { icon: MapPin, label: "Visit Schedules" },
  { icon: Phone, label: "Call Schedule" },
  { icon: Webhook, label: "Webhooks" },
];

const COLS = [
  { label: "Full Name", w: 126 },
  { label: "Mobile No", w: 122 },
  { label: "Lead Status", w: 130 },
  { label: "Next Follow-up Date", w: 128 },
  { label: "Visit Status", w: 102 },
  { label: "AI Insights", w: 100 },
];
const ACTIONS_W = 104; // 104 + columns = 812 of the 820px grid
const CANVAS_W = 1040;
const CANVAS_H = 600;

function Cell({ w, children, className, cellRef }: { w: number; children: ReactNode; className?: string; cellRef?: React.Ref<HTMLDivElement> }) {
  return (
    <div ref={cellRef} style={{ width: w }} className={cn("relative flex shrink-0 items-center border-r border-[#ebebeb] px-3 last:border-r-0", className)}>
      {children}
    </div>
  );
}

const FLASH_BG: Record<Exclude<RowFlash, undefined>, string> = {
  new: "bg-[#0848a8]/[0.07]",
  updated: "bg-sky-50",
  closed: "bg-emerald-50",
};

type RowRefs = {
  edit?: React.Ref<HTMLSpanElement>;
  visitCell?: React.Ref<HTMLDivElement>;
  statusCell?: React.Ref<HTMLDivElement>;
  visitOpt?: React.Ref<HTMLDivElement>;
  statusOpt?: React.Ref<HTMLDivElement>;
};

function GridRow({ lead, flash, refs, s }: { lead: Lead; flash?: RowFlash; refs?: RowRefs; s?: DemoState }) {
  return (
    <div
      className={cn(
        "relative flex h-[46px] border-b border-[#ebebeb] text-[13px] text-[#171717] transition-colors duration-700",
        lead.highlight === "overdue" && "bg-red-50",
        flash && FLASH_BG[flash],
      )}
    >
      <Cell w={ACTIONS_W} className="gap-2.5 text-[#737373]">
        <span className="h-4 w-4 rounded-[4px] border border-[#0848a8]/70" />
        <span
          ref={refs?.edit}
          className={cn("flex h-6 w-6 items-center justify-center rounded transition-all", s?.pressing && s.cursor === "edit" && "scale-90 bg-[#ebebeb]")}
        >
          <Pencil className="h-3.5 w-3.5" />
        </span>
        <History className="h-3.5 w-3.5" />
        <EyeOff className="h-3.5 w-3.5" />
      </Cell>
      <Cell w={COLS[0].w} className="font-medium">
        <span className="truncate">{lead.name}</span>
      </Cell>
      <Cell w={COLS[1].w} className="gap-1 tabular-nums">
        {lead.mobile}
        <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
      </Cell>
      <Cell
        w={COLS[2].w}
        cellRef={refs?.statusCell}
        className={cn(s?.statusMenu && "ring-2 ring-inset ring-[#0848a8]", s && lead.status === "Converted" && "font-semibold text-emerald-700")}
      >
        {s ? <Changing value={lead.status} /> : <span className="truncate">{lead.status}</span>}
        <AnimatePresence>
          {s?.statusMenu && <Menu options={STATUS_OPTIONS} hover={s.statusHover} optRef={refs?.statusOpt} target="Converted" />}
        </AnimatePresence>
      </Cell>
      <Cell w={COLS[3].w} className={cn("tabular-nums", lead.highlight === "overdue" && "font-medium text-red-600")}>
        {s ? <Changing value={lead.nfdt} /> : lead.nfdt}
      </Cell>
      <Cell w={COLS[4].w} cellRef={refs?.visitCell} className={cn(s?.visitMenu && "ring-2 ring-inset ring-[#0848a8]")}>
        {s ? <Changing value={lead.visit} /> : lead.visit}
        <AnimatePresence>
          {s?.visitMenu && <Menu options={VISIT_OPTIONS} hover={s.visitHover} optRef={refs?.visitOpt} target="Visited" />}
        </AnimatePresence>
      </Cell>
      <Cell w={COLS[5].w}>
        <AiBadge rating={lead.ai} />
      </Cell>
    </div>
  );
}

function DesktopScreen({ s }: { s: DemoState }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const edit = useRef<HTMLSpanElement>(null);
  const save = useRef<HTMLButtonElement>(null);
  const visitCell = useRef<HTMLDivElement>(null);
  const visitOpt = useRef<HTMLDivElement>(null);
  const statusCell = useRef<HTMLDivElement>(null);
  const statusOpt = useRef<HTMLDivElement>(null);
  const sidebar = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 880, y: 440 });

  // The canvas is CSS-scaled, so convert screen rects back to canvas units.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const targets: Record<CursorTarget, HTMLElement | null> = {
      rest: null,
      edit: edit.current,
      save: save.current,
      visitCell: visitCell.current,
      visitOpt: visitOpt.current,
      statusCell: statusCell.current,
      statusOpt: statusOpt.current,
      sidebar: sidebar.current,
    };
    const el = targets[s.cursor];
    if (!el) {
      setPos({ x: 880, y: 440 });
      return;
    }
    const c = canvas.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const scale = c.width / CANVAS_W || 1;
    const x = s.cursor === "visitCell" || s.cursor === "statusCell" || s.cursor === "sidebar" ? r.left + 40 : r.left + r.width / 2;
    setPos({ x: (x - c.left) / scale, y: (r.top + r.height / 2 - c.top) / scale });
  }, [s.cursor, s.dialogOpen, s.visitMenu, s.statusMenu]);

  const rows = s.newLead ? 8 : 7;

  return (
    <div ref={canvasRef} style={{ width: CANVAS_W, height: CANVAS_H }} className="relative flex select-none overflow-hidden bg-white font-[Inter,sans-serif] text-[#171717]">
      <aside className="flex w-[196px] shrink-0 flex-col border-r border-[#ebebeb] bg-[#f5f5f5] px-2 py-3">
        <p className="px-3 pb-2 text-[17px] font-semibold text-[#595959]">Leadani LFS</p>
        <nav className="space-y-0.5">
          {SIDEBAR.map(({ icon: Icon, label, key }) => (
            <div
              key={label}
              ref={key === "score" ? sidebar : undefined}
              className={cn(
                "flex h-8 items-center gap-2.5 rounded-md px-3 text-[13px] transition-colors",
                key === s.screen ? "bg-[#ebebeb] font-medium text-[#171717]" : "text-[#262626]",
              )}
            >
              <Icon className="h-4 w-4 text-[#404040]" />
              {label}
            </div>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-2.5 border-t border-[#e6e6e6] px-2 pt-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e6e6e6] text-[11px] font-semibold text-[#404040]">PR</span>
          <div className="leading-tight">
            <p className="text-[13px] font-medium">Priya Sharma</p>
            <p className="text-[11px] text-[#737373]">Skyline Homes</p>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-[48px] shrink-0 items-center gap-3 border-b border-[#ebebeb] px-4 text-[#404040]">
          <PanelLeft className="h-4 w-4" />
          <span className="relative">
            <span className="text-[15px]">🎯</span>
            <span className="absolute -right-1 -top-0.5 h-1.5 w-1.5 rounded-full bg-amber-400" />
          </span>
          <Search className="h-4 w-4" />
          {s.screen === "sheet" ? (
            <>
              <span className="h-5 w-px bg-[#e6e6e6]" />
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-emerald-300 text-emerald-600">
                <Star className="h-3.5 w-3.5" />
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-amber-300 text-amber-500">
                <HelpCircle className="h-3.5 w-3.5" />
              </span>
              <span className="flex items-center gap-1 text-[12px]">
                <FilterX className="h-3.5 w-3.5" /> Clear
              </span>
              <span className="ml-auto flex items-center gap-3">
                <Eye className="h-4 w-4" />
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-md text-white", PRIMARY)}>
                  <Plus className="h-4 w-4" />
                </span>
                <Moon className="h-4 w-4" />
              </span>
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              <Moon className="h-4 w-4" />
            </>
          )}
        </div>

        {s.screen === "score" ? (
          <PowerScoreScreen s={s} />
        ) : (
          <div className="m-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-[#e6e6e6]">
            <div className="flex h-[64px] shrink-0 border-b-2 border-[#e6e6e6] text-[11px] font-medium uppercase tracking-wide text-[#262626]">
              <Cell w={ACTIONS_W} className="gap-2 normal-case tracking-normal text-[#595959]">
                <span className="h-4 w-4 rounded-[4px] border border-[#0848a8]/70" />
                <span className="text-[12px]">Actions</span>
              </Cell>
              {COLS.map((c) => (
                <div key={c.label} style={{ width: c.w }} className="relative flex shrink-0 flex-col justify-center gap-1.5 border-r border-[#ebebeb] px-3 last:border-r-0">
                  <GripVertical className="absolute -left-[7px] top-1/2 h-3 w-3 -translate-y-1/2 text-[#a3a3a3]" />
                  <span className="flex items-center justify-between gap-1 leading-tight">
                    <span className="line-clamp-2">{c.label}</span>
                    <ChevronDown className="h-3 w-3 shrink-0 text-[#737373]" />
                  </span>
                  <span className="flex h-6 items-center rounded border border-[#e3e3e3] px-2 text-[11px] font-normal normal-case tracking-normal text-[#a3a3a3]">
                    Filter...
                  </span>
                </div>
              ))}
            </div>

            <div className="relative min-h-0 flex-1">
              <AnimatePresence initial={false}>
                {s.newLead && (
                  <motion.div
                    key="new"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 46, opacity: 1 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="relative z-10"
                  >
                    <GridRow lead={s.lead} flash={s.flash} s={s} refs={{ edit, visitCell, visitOpt, statusCell, statusOpt }} />
                  </motion.div>
                )}
              </AnimatePresence>
              {LEADS.map((l) => (
                <GridRow key={l.name} lead={l} />
              ))}
            </div>

            <div className="flex h-[40px] shrink-0 items-center justify-between border-t border-[#e6e6e6] px-4 text-[12.5px] text-[#595959]">
              <span>Showing {rows} of {rows} leads</span>
              <span>All leads loaded</span>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {s.dialogOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/50"
          >
            <UpdateDialog s={s} saveRef={save} />
          </motion.div>
        )}
      </AnimatePresence>

      <Confetti show={s.toast === "closed"} />
      <Toast s={s} />

      <motion.div
        className="pointer-events-none absolute left-0 top-0 z-40"
        animate={{ x: pos.x - 3, y: pos.y - 2, scale: s.pressing ? 0.85 : 1 }}
        transition={{ type: "spring", stiffness: 140, damping: 20, mass: 0.8 }}
      >
        <MousePointer2 className="h-5 w-5 fill-[#171717] text-white drop-shadow" />
      </motion.div>
    </div>
  );
}

/* -------------------------------------------------------- phone screen */

function PhoneCard({ lead, flash, s }: { lead: Lead; flash?: RowFlash; s?: DemoState }) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-white p-3 transition-colors duration-700",
        flash === "new" ? "border-[#0848a8]/40 bg-[#0848a8]/[0.05]"
          : flash === "updated" ? "border-sky-300 bg-sky-50"
          : flash === "closed" ? "border-emerald-300 bg-emerald-50"
          : lead.highlight === "overdue" ? "border-red-200 bg-red-50"
          : "border-[#e6e6e6]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[14px] font-semibold text-[#171717]">
          {lead.name} <span className="font-normal text-[#595959]">{lead.mobile}</span>
        </p>
        <AiBadge rating={lead.ai} />
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-[12px] text-[#595959]">
        {s ? <Changing value={lead.status} className={cn(lead.status === "Converted" && "font-semibold text-emerald-700")} /> : <span className="truncate">{lead.status}</span>}
        <span className="text-[#c4c4c4]">·</span>
        {s ? <Changing value={`Visit: ${lead.visit}`} /> : <span className="truncate">Visit: {lead.visit}</span>}
        <span className={cn("ml-auto shrink-0 tabular-nums", lead.highlight === "overdue" && "font-medium text-red-600")}>{lead.nfdt}</span>
      </div>
      <div className="mt-2.5 flex items-center gap-1.5 border-t border-[#ebebeb] pt-2.5 text-[#404040]">
        <span
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[12px] font-medium text-white transition-transform",
            PRIMARY,
            s?.pressing && ["edit", "visitCell", "statusCell"].includes(s.cursor) && "scale-90",
          )}
        >
          <Pencil className="h-3 w-3" /> Edit
        </span>
        {[Pencil, History, Phone, MessageCircle].map((Icon, i) => (
          <span key={i} className="flex h-7 w-7 items-center justify-center rounded-md border border-[#e6e6e6]">
            <Icon className="h-3.5 w-3.5" />
          </span>
        ))}
        <span className="ml-auto flex h-7 w-7 items-center justify-center rounded-md border border-[#e6e6e6]">
          <EyeOff className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
}

function PhoneScreen({ s }: { s: DemoState }) {
  const count = s.newLead ? 8 : 7;
  const tabs = [
    { icon: ListChecks, label: "Leads", key: "sheet" },
    { icon: Eye, label: "Watchlist" },
    { icon: Trophy, label: "Leaderboard", key: "score" },
    { icon: BarChart3, label: "Reports" },
    { icon: CalendarCheck, label: "Visits" },
  ];
  return (
    <div className="relative h-[600px] w-full select-none overflow-hidden bg-white font-[Inter,sans-serif] text-[#171717]">
      <div className="flex h-12 items-center justify-between border-b border-[#ebebeb] px-3 text-[#404040]">
        <PanelLeft className="h-4 w-4" />
        <span className="text-[15px]">🎯</span>
        <Search className="h-4 w-4" />
        <span className="inline-flex h-8 items-center rounded-md border border-[#e6e6e6] px-2.5 text-[12px] font-medium">Filters</span>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-md text-white", PRIMARY)}>
          <Plus className="h-4 w-4" />
        </span>
        <Moon className="h-4 w-4" />
      </div>

      {s.screen === "score" ? (
        <PowerScoreScreen s={s} compact />
      ) : (
        <>
          <div className="flex items-center gap-2 px-3 py-2.5 text-[12px] text-[#595959]">
            <span className="tabular-nums">{count}/{count}</span>
            <span className="rounded-md border border-[#e6e6e6] px-2 py-0.5 font-medium text-[#171717]">Created ↓</span>
          </div>
          <div className="space-y-2 px-3">
            <AnimatePresence initial={false}>
              {s.newLead && (
                <motion.div key="new" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} transition={{ duration: 0.45 }} className="overflow-hidden">
                  <PhoneCard lead={s.lead} flash={s.flash} s={s} />
                </motion.div>
              )}
            </AnimatePresence>
            {LEADS.slice(0, 4).map((l) => (
              <PhoneCard key={l.name} lead={l} />
            ))}
          </div>
        </>
      )}

      <div className="absolute inset-x-0 bottom-0 flex h-14 items-center justify-around border-t border-[#ebebeb] bg-white text-[10px] text-[#595959]">
        {tabs.map(({ icon: Icon, label, key }) => (
          <span key={label} className={cn("flex flex-col items-center gap-0.5", key === s.screen && "font-medium text-[#0848a8]")}>
            <Icon className="h-4 w-4" />
            {label}
          </span>
        ))}
      </div>

      <AnimatePresence>
        {s.dialogOpen && (
          <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-20 flex items-center bg-black/50 px-3">
            <UpdateDialog s={s} compact />
          </motion.div>
        )}
        {(s.visitMenu || s.statusMenu) && (
          <motion.div key="picker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-20 flex items-end bg-black/40 p-3 pb-16">
            {s.visitMenu ? (
              <Menu compact title="Visit Status" options={VISIT_OPTIONS} hover={s.visitHover} target="Visited" />
            ) : (
              <Menu compact title="Lead Status" options={STATUS_OPTIONS} hover={s.statusHover} target="Converted" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Confetti show={s.toast === "closed"} />
      <Toast s={s} compact />
    </div>
  );
}

/* -------------------------------------------------------------- public */

function StepRail({ s }: { s: DemoState }) {
  return (
    <ol className="mx-auto mt-8 grid max-w-5xl grid-cols-6 gap-2 sm:gap-3">
      {STEPS.map((step, i) => {
        const active = i === s.step;
        const done = i < s.step;
        const pct = active ? Math.min(100, ((s.t - step.from) / (step.to - step.from)) * 100) : done ? 100 : 0;
        return (
          <li key={step.title} className="min-w-0">
            <div className="h-[3px] overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#22d3ee] via-[#6366f1] to-[#c084fc]"
                style={{ width: `${pct}%`, transition: active ? "width 50ms linear" : "none" }}
              />
            </div>
            <p className={cn("mt-2.5 truncate text-[11px] font-medium sm:text-[13px]", active ? "text-white" : "text-white/40")}>
              <span className="text-white/30 md:mr-1">0{i + 1}</span>
              <span className="hidden md:inline">{step.title}</span>
            </p>
            <p className={cn("mt-1 hidden text-[12px] leading-snug transition-colors lg:block", active ? "text-white/65" : "text-white/25")}>{step.text}</p>
          </li>
        );
      })}
    </ol>
  );
}

export function SheetDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const { t, phase, count } = useDemoClock(rootRef);
  const s = deriveState(t);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / CANVAS_W));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const current = STEPS[s.step];

  return (
    <div ref={rootRef} className="relative mx-auto w-full max-w-5xl">
      <div className="pointer-events-none absolute -inset-x-10 -top-10 bottom-10 rounded-[40px] bg-[radial-gradient(60%_60%_at_50%_30%,rgba(99,102,241,0.35),transparent_70%)] blur-2xl" />

      <p className="sr-only">
        Animated demo of the Leadani sheet: a lead arrives from an ad, the caller logs a call that AI
        checks for quality, schedules and completes a site visit, closes the deal, and climbs the
        monthly PowerScore leaderboard.
      </p>

      {/* Desktop / tablet: the real web app */}
      <div className="relative hidden overflow-hidden rounded-[18px] border border-white/10 bg-[#0a0c1b] shadow-[0_40px_120px_-30px_rgba(79,70,229,0.6)] md:block" aria-hidden="true">
        <div className="flex h-9 items-center gap-2 border-b border-white/[0.06] px-4">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="mx-auto rounded-md bg-white/[0.05] px-3 py-0.5 text-[11px] text-white/40">
            leadani.com/{s.screen === "score" ? "powerscore" : "dashboard"}
          </span>
        </div>
        <div ref={wrapRef} style={{ height: CANVAS_H * scale }} className="relative w-full overflow-hidden">
          <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }} className="absolute left-0 top-0">
            <DesktopScreen s={s} />
          </div>
          <Countdown phase={phase} count={count} />
        </div>
      </div>

      {/* Phone: the real mobile app */}
      <div className="relative md:hidden">
        <div className="mx-auto w-full max-w-[340px] rounded-[42px] border border-white/15 bg-[#0b0d1d] p-2.5 shadow-[0_40px_100px_-30px_rgba(79,70,229,0.7)]" aria-hidden="true">
          <div className="relative overflow-hidden rounded-[32px]">
            <PhoneScreen s={s} />
            <Countdown phase={phase} count={count} />
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={current.title}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="mx-auto mt-6 max-w-[340px] text-center"
          >
            <p className="text-[15px] font-semibold text-white">{current.title}</p>
            <p className="mt-1 text-[13.5px] text-white/55">{current.text}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <StepRail s={s} />
    </div>
  );
}

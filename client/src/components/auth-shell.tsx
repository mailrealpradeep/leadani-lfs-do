import { useEffect, type ReactNode } from "react";
import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { BrandLogo, BrandMark } from "@/components/brand-logo";

/** Shared input style for the dark auth pages (login, signup). */
export const AUTH_INPUT =
  "h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-[15px] text-white placeholder:text-white/30 outline-none transition focus:border-indigo-400/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-indigo-500/15 disabled:opacity-60";

export const AUTH_BUTTON =
  "group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-[15px] font-semibold text-[#070814] shadow-[0_10px_40px_-10px_rgba(129,140,248,0.8)] transition hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060f] disabled:cursor-not-allowed disabled:opacity-70";

/**
 * Split layout used by the login and signup pages: the form on the left, a
 * brand panel on the right (desktop only). On phones only the form shows.
 */
export function AuthShell({
  title,
  children,
  panel,
}: {
  title: string;
  children: ReactNode;
  panel: ReactNode;
}) {
  const reduce = useReducedMotion();

  useEffect(() => {
    const prev = document.title;
    document.title = title;
    return () => {
      document.title = prev;
    };
  }, [title]);

  return (
    <div className="flex min-h-screen bg-[#05060f] font-[Inter,sans-serif] text-white antialiased selection:bg-indigo-500/40">
      <div className="relative flex w-full flex-col lg:w-[52%]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(79,70,229,0.22),transparent_70%)] lg:hidden" />

        <div className="relative flex h-16 items-center justify-between px-5 sm:px-8">
          <Link href="/" asChild>
            <a className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" data-testid="link-home-logo">
              <BrandLogo textClassName="text-white" />
            </a>
          </Link>
          <Link href="/" asChild>
            <a className="inline-flex items-center gap-1.5 text-sm text-white/50 transition hover:text-white">
              <ArrowLeft className="h-4 w-4" /> Home
            </a>
          </Link>
        </div>

        <main className="relative flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[420px]"
          >
            {children}
          </motion.div>
        </main>
      </div>

      <aside className="relative hidden flex-1 overflow-hidden border-l border-white/[0.06] lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_30%_20%,rgba(79,70,229,0.45),transparent_65%),radial-gradient(50%_50%_at_90%_90%,rgba(217,70,239,0.25),transparent_70%),radial-gradient(40%_40%_at_10%_95%,rgba(34,211,238,0.18),transparent_70%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_40%,#000_30%,transparent_100%)]" />
        <div className="relative m-auto w-full max-w-md px-10 py-16">
          <BrandMark className="h-16 w-16" />
          {panel}
        </div>
      </aside>
    </div>
  );
}

export function AuthPanelHeadline() {
  return (
    <h2 className="mt-10 font-[Geist,Inter,sans-serif] text-[40px] font-semibold leading-[1.05] tracking-[-0.035em]">
      Every lead,
      <br />
      followed up.
      <br />
      <span className="bg-gradient-to-r from-[#5eead4] via-[#60a5fa] to-[#c084fc] bg-clip-text text-transparent">
        Every deal, closed.
      </span>
    </h2>
  );
}

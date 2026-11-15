"use client";
import { AnimatePresence, motion } from "motion/react";
import { CalendarClock, CheckCircle2, Inbox, LayoutDashboard, Loader2, Mail, Users } from "lucide-react";
import type { AutomationRun, StepKey } from "@/lib/types";
import { formatTime } from "@/lib/time";
import { cn } from "cn";

const ICON: Record<StepKey, typeof Mail> = { recorded: Inbox, email: Mail, crm: Users, calendar: CalendarClock, dashboard: LayoutDashboard };
const SUB: Record<StepKey, string> = {
  recorded: "The buyer's request is in",
  email: "An email lands in your inbox with every detail",
  crm: "The buyer is added to Follow Up Boss as a new lead",
  calendar: "A tentative hold goes on your Google Calendar",
  dashboard: "Your dashboard shows the new request",
};

export function AutomationProgress({ run }: { run: AutomationRun }) {
  const doneCount = run.steps.filter((s) => s.status === "done").length;
  return (
    <div className="min-w-0 rounded-lg border bg-card p-5 md:p-6" data-tour="automation" data-testid="automation">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Happening automatically</p>
          <h2 className="mt-1 text-[22px]">{run.done ? "All steps complete" : "Sending it to you…"}</h2>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-[12.5px] font-semibold tabular">{doneCount} / {run.steps.length}</span>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"><motion.div className="h-full bg-emerald" animate={{ width: `${(doneCount / run.steps.length) * 100}%` }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} /></div>
      <ol className="relative mt-6">
        {run.steps.map((s, i) => {
          const Icon = ICON[s.key];
          return (
            <li key={s.key} className="relative flex gap-4 pb-6 last:pb-0" data-step={s.key} data-status={s.status}>
              {i < run.steps.length - 1 && <span className="absolute left-[19px] top-10 h-[calc(100%-36px)] w-px bg-border"><motion.span className="block w-px bg-emerald" initial={false} animate={{ height: s.status === "done" ? "100%" : "0%" }} transition={{ duration: 0.5 }} /></span>}
              <span className={cn("relative z-10 grid size-10 shrink-0 place-items-center rounded-full border transition-colors duration-500", s.status === "done" ? "border-emerald bg-emerald text-white" : s.status === "running" ? "border-gold bg-gold/15 text-[#6b5126]" : "bg-card text-muted-foreground")}>
                <AnimatePresence mode="wait" initial={false}>
                  {s.status === "done" ? (
                    <motion.span key="d" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 400, damping: 18 }}><CheckCircle2 className="size-5" /></motion.span>
                  ) : s.status === "running" ? (
                    <motion.span key="r" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><Loader2 className="size-5 animate-spin" /></motion.span>
                  ) : (
                    <motion.span key="p" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><Icon className="size-[18px]" /></motion.span>
                  )}
                </AnimatePresence>
              </span>
              <div className="min-w-0 flex-1 pt-1 [overflow-wrap:anywhere]">
                <p className={cn("text-[15px] font-semibold transition-colors", s.status === "pending" && "text-muted-foreground")}>{s.status === "done" ? "✓ " : ""}{s.label}</p>
                <p className="text-[13px] text-muted-foreground">{SUB[s.key]}</p>
                <AnimatePresence>{s.status === "done" && s.detail && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-1 text-[12.5px] font-medium text-foreground/80">{s.detail}{s.at ? ` · ${formatTime(s.at)}` : ""}</motion.p>}</AnimatePresence>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

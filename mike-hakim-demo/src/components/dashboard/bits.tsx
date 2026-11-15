"use client";
import { Inbox, Mail, Users, CalendarClock, LayoutDashboard, Globe } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActivitySystem, LeadStage, ShowingStatus } from "@/lib/types";
import { STAGE_LABEL, SHOWING_STATUS, stageTone, showingTone } from "@/lib/labels";
import { cn } from "cn";

export function PageHead({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-[26px] font-medium leading-tight md:text-[32px]">{title}</h1>{sub && <p className="mt-1 text-[14px] text-muted-foreground">{sub}</p>}</div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
export function Panel({ title, action, children, className, ...rest }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("min-w-0 rounded-lg border bg-card", className)} {...rest}>
      {title && <div className="flex items-center justify-between gap-3 border-b px-4 py-3"><h2 className="font-sans text-[14px] font-bold">{title}</h2>{action}</div>}
      {children}
    </section>
  );
}
export function StageBadge({ stage, className }: { stage: LeadStage; className?: string }) {
  return <span className={cn("inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset", stageTone[stage], className)}>{STAGE_LABEL[stage]}</span>;
}
export function ShowingBadge({ status }: { status: ShowingStatus }) {
  return <span className={cn("inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset", showingTone[status])}>{SHOWING_STATUS[status]}</span>;
}
export function SimBadge({ label = "Simulated" }: { label?: string }) {
  return <span className="inline-flex items-center rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-bold text-[#6b5126]">{label}</span>;
}
const SYS: Record<ActivitySystem, { icon: typeof Mail; tone: string; label: string }> = {
  website: { icon: Globe, tone: "bg-primary/10 text-primary", label: "Website" },
  email: { icon: Mail, tone: "bg-gold/15 text-[#6b5126]", label: "Email (sim)" },
  crm: { icon: Users, tone: "bg-emerald/10 text-emerald", label: "CRM (sim)" },
  calendar: { icon: CalendarClock, tone: "bg-sky-100 text-sky-900", label: "Calendar" },
  dashboard: { icon: LayoutDashboard, tone: "bg-muted text-foreground", label: "Dashboard" },
};
export function SystemIcon({ system }: { system: ActivitySystem }) {
  const S = SYS[system] ?? { icon: Inbox, tone: "bg-muted", label: "" };
  return <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", S.tone)} title={S.label}><S.icon className="size-4" /></span>;
}
export const systemLabel = (s: ActivitySystem) => SYS[s]?.label ?? s;
export function DashSkeleton() {
  return <div className="grid gap-4"><Skeleton className="h-10 w-64" /><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div><Skeleton className="h-72" /></div>;
}

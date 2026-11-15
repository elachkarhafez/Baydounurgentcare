import type { BuyerStatus, EventStatus, Financing, LeadStage, ShowingStatus } from "@/lib/types";

export const STAGES: { key: LeadStage; label: string }[] = [
  { key: "new", label: "New Lead" },
  { key: "contacted", label: "Contacted" },
  { key: "showing_requested", label: "Showing Requested" },
  { key: "showing_scheduled", label: "Showing Scheduled" },
  { key: "follow_up", label: "Follow-Up Needed" },
  { key: "closed", label: "Closed" },
];
export const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.key, s.label])) as Record<LeadStage, string>;

export const BUYER_STATUS: Record<BuyerStatus, string> = {
  first_time: "First-time buyer",
  searching: "Currently searching",
  ready: "Ready to purchase",
  exploring: "Just exploring",
};
export const FINANCING: Record<Financing, string> = {
  pre_approved: "Pre-approved",
  cash: "Cash buyer",
  not_yet: "Not yet pre-approved",
};
export const SHOWING_STATUS: Record<ShowingStatus, string> = {
  requested: "Requested (tentative)",
  confirmed: "Confirmed",
  rescheduled: "Rescheduled",
  cancelled: "Cancelled",
  completed: "Completed",
};
export const EVENT_STATUS: Record<EventStatus, string> = { tentative: "Tentative", confirmed: "Confirmed", cancelled: "Cancelled" };

export const stageTone: Record<LeadStage, string> = {
  new: "bg-gold/15 text-[#7a5d2c] ring-gold/30",
  contacted: "bg-sky-100 text-sky-900 ring-sky-200",
  showing_requested: "bg-amber-100 text-amber-900 ring-amber-200",
  showing_scheduled: "bg-emerald/10 text-emerald ring-emerald/25",
  follow_up: "bg-rose-100 text-rose-900 ring-rose-200",
  closed: "bg-muted text-muted-foreground ring-border",
};
export const showingTone: Record<ShowingStatus, string> = {
  requested: "bg-amber-100 text-amber-900 ring-amber-200",
  confirmed: "bg-emerald/10 text-emerald ring-emerald/25",
  rescheduled: "bg-sky-100 text-sky-900 ring-sky-200",
  cancelled: "bg-muted text-muted-foreground ring-border line-through",
  completed: "bg-primary/10 text-primary ring-primary/20",
};

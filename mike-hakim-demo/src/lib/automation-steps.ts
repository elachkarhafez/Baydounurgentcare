import type { StepKey } from "@/lib/types";
export const STEP_LABELS: Record<StepKey, string> = {
  recorded: "Showing request received",
  email: "Email notification generated (Demo)",
  crm: "Follow Up Boss lead created (Demo)",
  calendar: "Calendar event created (Demo)",
  dashboard: "Realtor dashboard updated",
};
export const STEP_ORDER: StepKey[] = ["recorded", "email", "crm", "calendar", "dashboard"];

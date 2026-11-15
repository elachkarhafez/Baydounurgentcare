import { DEMO_MODE } from "@/config/demo";
import type { IntegrationAdapters } from "@/integrations/types";
import { simulatedEmail } from "@/integrations/simulated/email";
import { simulatedCrm } from "@/integrations/simulated/crm";
import { simulatedCalendar } from "@/integrations/simulated/calendar";

/**
 * The only place adapters are chosen. With DEMO_MODE on, live adapters can't be
 * returned. Switching to live is a deliberate code change, not a config toggle.
 */
export function getAdapters(): IntegrationAdapters {
  if (DEMO_MODE) return { email: simulatedEmail, crm: simulatedCrm, calendar: simulatedCalendar };
  throw new Error("Live integrations are not implemented in this build.");
}

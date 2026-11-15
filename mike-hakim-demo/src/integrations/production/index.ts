import { IntegrationNotConfiguredError, type CalendarAdapter, type CrmAdapter, type EmailNotificationAdapter } from "@/integrations/types";

/**
 * Placeholders for live providers. They are intentionally inert: every method
 * throws until a future phase implements them server-side with approved
 * credentials. Planned approach:
 *  - Email: a transactional provider (e.g. Resend or Postmark) or a connected
 *    mailbox, sending from a verified domain, called from a route handler.
 *  - CRM: Follow Up Boss via authenticated server-side requests (an inquiry
 *    event with person and property, plus notes), after confirming which API
 *    operations Mike's account and plan support.
 *  - Calendar: Google Calendar API with OAuth consent from Mike, creating
 *    tentative events on a chosen calendar.
 */
const fail = (s: string) => () => Promise.reject(new IntegrationNotConfiguredError(s));

export const liveEmail: EmailNotificationAdapter = { name: "Email (live)", mode: "live", sendShowingNotification: fail("Email") };
export const liveCrm: CrmAdapter = { name: "Follow Up Boss (live)", mode: "live", upsertLeadFromShowing: fail("Follow Up Boss"), updateStage: fail("Follow Up Boss"), addNote: fail("Follow Up Boss") };
export const liveCalendar: CalendarAdapter = { name: "Google Calendar (live)", mode: "live", createTentativeShowing: fail("Google Calendar") };

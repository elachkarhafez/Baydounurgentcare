import type { CalendarEvent, CrmLog, EmailMessage, Lead, Listing, ShowingRequest } from "@/lib/types";

/**
 * Adapter contracts. The demo ships simulated implementations only. A future
 * phase can add live implementations behind the same interfaces, called from
 * server-side route handlers with credentials kept in environment variables.
 */
export interface ShowingContext {
  showing: ShowingRequest;
  lead: Lead;
  listing: Listing;
}

export type AdapterMode = "simulated" | "live";

export interface EmailNotificationAdapter {
  readonly name: string;
  readonly mode: AdapterMode;
  /** Build (and in live mode, send) the agent notification for a showing request. */
  sendShowingNotification(ctx: ShowingContext): Promise<EmailMessage>;
}

export interface CrmAdapter {
  readonly name: string;
  readonly mode: AdapterMode;
  /** Create or update the person and log the showing request as an inquiry. */
  upsertLeadFromShowing(ctx: ShowingContext): Promise<CrmLog>;
  updateStage(lead: Lead, stageLabel: string): Promise<CrmLog>;
  addNote(lead: Lead, text: string): Promise<CrmLog>;
}

export interface CalendarAdapter {
  readonly name: string;
  readonly mode: AdapterMode;
  /** Create a TENTATIVE hold for the buyer's first-choice time. */
  createTentativeShowing(ctx: ShowingContext): Promise<CalendarEvent>;
}

export interface IntegrationAdapters {
  email: EmailNotificationAdapter;
  crm: CrmAdapter;
  calendar: CalendarAdapter;
}

export class IntegrationNotConfiguredError extends Error {
  constructor(service: string) {
    super(`${service} is not configured. Live integrations are disabled in this demo.`);
    this.name = "IntegrationNotConfiguredError";
  }
}

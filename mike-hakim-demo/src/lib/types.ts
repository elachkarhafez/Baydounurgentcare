export type PropertyType = "Single Family" | "Condo" | "Townhouse" | "Multi-Family" | "Ranch";
export type ListingStatus = "Active" | "Coming Soon" | "Pending" | "Open House";

export interface OpenHouse {
  date: string; // YYYY-MM-DD in Detroit time
  start: string; // HH:mm
  end: string;
}

export interface Listing {
  id: string; // e.g. MH-24017
  address: string;
  city: string;
  state: "MI";
  zip: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  lotAcres: number;
  yearBuilt: number;
  type: PropertyType;
  status: Exclude<ListingStatus, "Open House">;
  openHouse?: OpenHouse;
  daysListed: number;
  headline: string;
  description: string;
  photos: string[];
  lat: number;
  lng: number;
  features: string[];
  interior: string[];
  exterior: string[];
  garage: string;
  heating: string;
  cooling: string;
  hoa?: number;
  taxesYearly: number;
  featured?: boolean;
  /** Sample price reduction, for the card badge. */
  priceCut?: { amount: number; daysAgo: number };
}

export type LeadStage =
  | "new"
  | "contacted"
  | "showing_requested"
  | "showing_scheduled"
  | "follow_up"
  | "closed";

export type BuyerStatus = "first_time" | "searching" | "ready" | "exploring";
export type Financing = "pre_approved" | "cash" | "not_yet";

export interface Note {
  id: string;
  at: string;
  text: string;
}

export interface DocumentMeta {
  name: string;
  type: "PDF" | "JPG" | "PNG";
  size: number;
}

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  stage: LeadStage;
  source: "Website" | "Instagram" | "Referral" | "Open House";
  buyerStatus: BuyerStatus;
  financing: Financing;
  listingIds: string[];
  notes: Note[];
  createdAt: string;
  updatedAt: string;
  sample?: boolean;
}

export type ShowingStatus = "requested" | "confirmed" | "rescheduled" | "cancelled" | "completed";

export interface TimeSlot {
  date: string; // YYYY-MM-DD (Detroit)
  time: string; // HH:mm (Detroit)
  start: string; // ISO UTC
  end: string; // ISO UTC
}

export interface ShowingRequest {
  id: string;
  ref: string; // human reference, e.g. SR-7F3K2
  listingId: string;
  leadId: string;
  preferred: TimeSlot;
  alternate?: TimeSlot;
  status: ShowingStatus;
  notes: string;
  document: DocumentMeta | null;
  createdAt: string;
  updatedAt: string;
  sample?: boolean;
}

export type EventKind = "showing" | "open_house" | "appointment";
export type EventStatus = "tentative" | "confirmed" | "cancelled";

export interface CalendarEvent {
  id: string;
  kind: EventKind;
  title: string;
  start: string;
  end: string;
  status: EventStatus;
  listingId?: string;
  leadId?: string;
  showingId?: string;
  notes?: string;
}

export type ActivitySystem = "website" | "email" | "crm" | "calendar" | "dashboard";

export interface Activity {
  id: string;
  at: string;
  system: ActivitySystem;
  message: string;
  leadId?: string;
  showingId?: string;
}

export interface EmailMessage {
  id: string;
  showingId: string;
  to: string;
  from: string;
  subject: string;
  createdAt: string;
  fields: { label: string; value: string }[];
  notes: string;
  status: "simulated";
}

export interface CrmLog {
  id: string;
  at: string;
  leadId: string;
  operation: "create_lead" | "update_stage" | "add_note" | "log_event" | "test";
  summary: string;
  payload: Record<string, unknown>;
  result: "simulated";
}

export type StepKey = "recorded" | "email" | "crm" | "calendar" | "dashboard";
export type StepStatus = "pending" | "running" | "done" | "error";

export interface AutomationStep {
  key: StepKey;
  label: string;
  status: StepStatus;
  at?: string;
  detail?: string;
}

export interface AutomationRun {
  id: string;
  showingId: string;
  createdAt: string;
  steps: AutomationStep[];
  done: boolean;
}

export interface DemoState {
  version: number;
  seededAt: string;
  leads: Lead[];
  showings: ShowingRequest[];
  events: CalendarEvent[];
  activities: Activity[];
  emails: EmailMessage[];
  crmLogs: CrmLog[];
  runs: AutomationRun[];
  favorites: string[];
  compare: string[];
}

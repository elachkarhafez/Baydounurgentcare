import type { CalendarAdapter, ShowingContext } from "@/integrations/types";
import type { CalendarEvent } from "@/lib/types";
import { uid } from "@/lib/ids";

/** Simulated calendar: returns a TENTATIVE event. Nothing is written to Google. */
export const simulatedCalendar: CalendarAdapter = {
  name: "Google Calendar (simulated)",
  mode: "simulated",
  async createTentativeShowing({ showing, lead, listing }: ShowingContext): Promise<CalendarEvent> {
    return {
      id: uid("evt-"),
      kind: "showing",
      title: `Showing Requested: ${listing.address}`,
      start: showing.preferred.start,
      end: showing.preferred.end,
      status: "tentative",
      listingId: listing.id,
      leadId: lead.id,
      showingId: showing.id,
      notes: `${lead.firstName} ${lead.lastName} · ${lead.phone}${showing.alternate ? " · has an alternate time" : ""}`,
    };
  },
};

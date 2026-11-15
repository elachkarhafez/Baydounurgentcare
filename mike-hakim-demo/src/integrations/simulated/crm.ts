import type { CrmAdapter, ShowingContext } from "@/integrations/types";
import type { CrmLog, Lead } from "@/lib/types";
import { fullAddress } from "@/data/listings";
import { FINANCING } from "@/lib/labels";
import { uid } from "@/lib/ids";

/**
 * Simulated CRM. The payload mirrors what a live Follow Up Boss integration
 * would send (an inquiry event with person and property), but no request is made.
 * Field mapping must be verified against FUB's current API before going live.
 */
export const simulatedCrm: CrmAdapter = {
  name: "Follow Up Boss (simulated)",
  mode: "simulated",
  async upsertLeadFromShowing({ showing, lead, listing }: ShowingContext): Promise<CrmLog> {
    return {
      id: uid("crm-"),
      at: new Date().toISOString(),
      leadId: lead.id,
      operation: "create_lead",
      summary: `Lead ${lead.firstName} ${lead.lastName} created from website showing request`,
      payload: {
        source: "Website",
        type: "Property Inquiry",
        person: { firstName: lead.firstName, lastName: lead.lastName, emails: [lead.email], phones: [lead.phone] },
        property: { street: listing.address, city: listing.city, state: listing.state, code: listing.zip, price: listing.price, mlsNumber: listing.id },
        requestedTime: showing.preferred.start,
        financing: FINANCING[lead.financing],
        preApproval: showing.document ? { name: showing.document.name, type: showing.document.type } : null,
        stage: "Showing Requested",
        message: `Showing request ${showing.ref} for ${fullAddress(listing)}`,
      },
      result: "simulated",
    };
  },
  async updateStage(lead: Lead, stageLabel: string): Promise<CrmLog> {
    return { id: uid("crm-"), at: new Date().toISOString(), leadId: lead.id, operation: "update_stage", summary: `Stage for ${lead.firstName} ${lead.lastName} set to ${stageLabel}`, payload: { stage: stageLabel }, result: "simulated" };
  },
  async addNote(lead: Lead, text: string): Promise<CrmLog> {
    return { id: uid("crm-"), at: new Date().toISOString(), leadId: lead.id, operation: "add_note", summary: `Note added to ${lead.firstName} ${lead.lastName}`, payload: { body: text }, result: "simulated" };
  },
};

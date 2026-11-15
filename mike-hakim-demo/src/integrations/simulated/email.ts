import type { EmailMessage, Lead, Listing, ShowingRequest } from "@/lib/types";
import type { EmailNotificationAdapter, ShowingContext } from "@/integrations/types";
import { fullAddress } from "@/data/listings";
import { formatDateLong, formatTime, formatTz } from "@/lib/time";
import { FINANCING } from "@/lib/labels";
import { usd } from "@/lib/format";
import { uid } from "@/lib/ids";
import { BRAND } from "@/config/demo";

export function buildNotificationEmail({ showing, lead, listing, id = uid("mail-"), at = new Date().toISOString() }: { showing: ShowingRequest; lead: Lead; listing: Listing; id?: string; at?: string }): EmailMessage {
  const p = showing.preferred;
  const fields = [
    { label: "Property", value: fullAddress(listing) },
    { label: "List price", value: usd(listing.price) },
    { label: "Buyer", value: `${lead.firstName} ${lead.lastName}` },
    { label: "Email", value: lead.email },
    { label: "Phone", value: lead.phone },
    { label: "Preferred date", value: formatDateLong(p.start) },
    { label: "Preferred time", value: `${formatTime(p.start)} ${formatTz(p.start)}` },
  ];
  if (showing.alternate) fields.push({ label: "Alternate time", value: `${formatDateLong(showing.alternate.start)}, ${formatTime(showing.alternate.start)}` });
  fields.push(
    { label: "Financing status", value: FINANCING[lead.financing] },
    { label: "Pre-approval letter", value: showing.document ? `${showing.document.name} (sample)` : "None" },
    { label: "Request reference", value: showing.ref },
  );
  return {
    id,
    showingId: showing.id,
    to: `${BRAND.agent} <${BRAND.email}>`,
    from: `${BRAND.name} Website <notifications@example.com>`,
    subject: `New Showing Request — ${listing.address}`,
    createdAt: at,
    fields,
    notes: showing.notes,
    status: "simulated",
  };
}

/** Builds the message only. Nothing is sent. */
export const simulatedEmail: EmailNotificationAdapter = {
  name: "Email notifications (simulated)",
  mode: "simulated",
  async sendShowingNotification(ctx: ShowingContext) {
    return buildNotificationEmail(ctx);
  },
};

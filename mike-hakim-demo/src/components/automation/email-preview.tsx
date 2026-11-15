import Link from "next/link";
import { MailWarning } from "lucide-react";
import type { EmailMessage } from "@/lib/types";
import { formatDateTime } from "@/lib/time";
import { Monogram } from "@/components/site/logo";

export function EmailPreview({ email, compact = false }: { email: EmailMessage; compact?: boolean }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border bg-card shadow-soft" data-testid="email-preview" data-tour="email-preview">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/60 px-4 py-2.5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-2.5 py-1 text-[11.5px] font-bold text-[#6b5126]"><MailWarning className="size-3.5" /> Simulated Email — Not Sent</span>
        <span className="text-[12px] text-muted-foreground">{formatDateTime(email.createdAt)}</span>
      </div>
      <div className="space-y-1 border-b px-4 py-3 text-[13px] [overflow-wrap:anywhere]">
        <p><span className="inline-block w-16 text-muted-foreground">From</span>{email.from}</p>
        <p><span className="inline-block w-16 text-muted-foreground">To</span>{email.to}</p>
        <p className="font-semibold"><span className="inline-block w-16 font-normal text-muted-foreground">Subject</span><span data-testid="email-subject">{email.subject}</span></p>
      </div>
      <div className={compact ? "bg-background p-3" : "bg-background p-4 md:p-8"}>
        <div className="mx-auto max-w-lg rounded-lg bg-card p-4 hairline sm:p-6">
          <div className="flex items-center gap-2.5 border-b pb-4">
            <span className="grid size-8 place-items-center rounded bg-primary text-primary-foreground"><Monogram className="size-5" /></span>
            <span className="font-display text-[16px] font-semibold">Mike Hakim Real Estate</span>
          </div>
          <p className="mt-5 text-[15px] font-semibold">You have received a new showing request.</p>
          <dl className="mt-4 divide-y text-[14px]">
            {email.fields.map((f) => (
              <div key={f.label} className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 py-2 sm:grid-cols-[130px_minmax(0,1fr)]"><dt className="text-muted-foreground">{f.label}:</dt><dd className="min-w-0 font-medium [overflow-wrap:anywhere]">{f.value}</dd></div>
            ))}
          </dl>
          <div className="mt-4">
            <p className="text-[13px] font-semibold text-muted-foreground">Additional Notes:</p>
            <p className="mt-1 text-[14px]">{email.notes || "None"}</p>
          </div>
          <Link href={`/dashboard/showings?showing=${email.showingId}`} className="mt-6 inline-flex h-11 items-center rounded-md bg-primary px-5 text-[14px] font-semibold text-primary-foreground hover:bg-primary/90">View Request</Link>
          <p className="mt-6 border-t pt-3 text-[11.5px] text-muted-foreground">Demo preview. In this demo no email was actually sent.</p>
        </div>
      </div>
    </div>
  );
}

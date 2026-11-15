import Link from "next/link";
import { Logo } from "@/components/site/logo";
import { BRAND } from "@/config/demo";

export function Footer() {
  return (
    <footer className="border-t bg-card pb-20 md:pb-0" id="contact">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-6">
        <div>
          <Logo />
          <p className="mt-3 text-[13px] text-muted-foreground">Mike Hakim, {BRAND.brokerageNote} Serving Dearborn and Southeast Michigan.</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-[14px] font-semibold">
          <a href={BRAND.phoneHref} className="hover:underline">{BRAND.phone}</a>
          <a href={`mailto:${BRAND.email}`} className="hover:underline">{BRAND.email}</a>
          <a href={BRAND.instagramUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{BRAND.instagram}</a>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1600px] flex-wrap justify-between gap-2 border-t px-4 py-4 text-[12px] text-muted-foreground md:px-6">
        <p>© {new Date().getFullYear()} {BRAND.name}. Demo website: listings are samples and contact details are placeholders.</p>
        <p className="flex gap-4"><span>Equal Housing Opportunity</span><Link href="/dashboard" className="hover:text-foreground">Mike&apos;s dashboard</Link></p>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { AtSign, Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/site/logo";
import { BRAND } from "@/config/demo";

export function Footer() {
  return (
    <footer className="bg-ink text-white/70" id="contact">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:px-6">
        <div>
          <Logo light />
          <p className="mt-5 max-w-sm text-[14px] leading-relaxed">Helping buyers and sellers across Dearborn and Southeast Michigan find the right place and get through the process without the guesswork.</p>
          <p className="mt-4 text-[12.5px] text-white/50">{BRAND.brokerageNote}</p>
        </div>
        <div>
          <h3 className="font-sans text-[12px] font-bold uppercase tracking-[0.2em] text-gold-soft">Explore</h3>
          <ul className="mt-4 space-y-2.5 text-[14px]">
            <li><Link className="hover:text-white" href="/homes">Search homes</Link></li>
            <li><Link className="hover:text-white" href="/homes?open=1">Open houses</Link></li>
            <li><Link className="hover:text-white" href="/homes?saved=1">Saved homes</Link></li>
            <li><Link className="hover:text-white" href="/compare">Compare</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-sans text-[12px] font-bold uppercase tracking-[0.2em] text-gold-soft">Areas</h3>
          <ul className="mt-4 space-y-2.5 text-[14px]">
            {["Dearborn", "Dearborn Heights", "Detroit", "Canton", "Northville", "Birmingham"].map((c) => (
              <li key={c}><Link className="hover:text-white" href={`/homes?q=${encodeURIComponent(c)}`}>{c}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-sans text-[12px] font-bold uppercase tracking-[0.2em] text-gold-soft">Contact</h3>
          <ul className="mt-4 space-y-3 text-[14px]">
            <li className="flex items-center gap-2.5"><Phone className="size-4 text-gold-soft" /><a href={BRAND.phoneHref} className="hover:text-white">{BRAND.phone}</a></li>
            <li className="flex items-center gap-2.5"><Mail className="size-4 text-gold-soft" /><a href={`mailto:${BRAND.email}`} className="hover:text-white">{BRAND.email}</a></li>
            <li className="flex items-center gap-2.5"><MapPin className="size-4 text-gold-soft" />{BRAND.officeArea}</li>
            <li className="flex items-center gap-2.5"><AtSign className="size-4 text-gold-soft" /><a href={BRAND.instagramUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white">{BRAND.instagram}</a></li>
          </ul>
          <p className="mt-3 text-[11.5px] text-white/40">Phone and email are placeholders for the demo.</p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-[12px] text-white/45 md:flex-row md:items-center md:justify-between md:px-6">
          <p>© {new Date().getFullYear()} {BRAND.name}. Demonstration website. Listings are sample data and are not offered for sale.</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <span>Equal Housing Opportunity</span>
            <Link href="/dashboard/settings" className="hover:text-white">Demo &amp; integrations</Link>
            <Link href="/dashboard" className="hover:text-white">Realtor view</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}

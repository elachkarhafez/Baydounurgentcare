"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Bath, BedDouble, Check, Ruler, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Gallery } from "@/components/listings/gallery";
import { MortgageCalculator } from "@/components/listings/mortgage-calculator";
import { PropertyCard, cardBadge, saleLabel, openLabel } from "@/components/listings/property-card";
import { FavoriteButton } from "@/components/listings/listing-actions";
import { ShowingWizard, earliestLabel } from "@/components/showing/showing-wizard";
import { AskQuestion } from "@/components/listings/ask-question";
import { Monogram } from "@/components/site/logo";
import { LISTINGS, fullAddress } from "@/data/listings";
import { similarListings } from "@/lib/search";
import { usd, num, usdShort } from "@/lib/format";
import { onTour } from "@/components/tour/tour-bus";
import { session } from "@/lib/storage";
import type { Listing } from "@/lib/types";
import { cn } from "cn";

const ListingsMap = dynamic(() => import("@/components/listings/listings-map").then((m) => m.ListingsMap), { ssr: false, loading: () => <div className="h-full animate-pulse bg-muted" /> });

function TourButtons({ onTour: tour, onContact, earliest, className }: { onTour: () => void; onContact: () => void; earliest: string; className?: string }) {
  return (
    <div className={cn("grid grid-cols-[1fr_1.25fr] gap-2.5", className)}>
      <button onClick={onContact} className="flex h-14 min-w-0 items-center gap-2.5 rounded-xl border-2 border-primary/20 bg-card px-3 text-left transition hover:border-primary/50" aria-label="Contact Mike">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><Monogram className="size-6" /></span>
        <span className="min-w-0 leading-tight"><span className="block text-[12px] font-semibold text-muted-foreground">Contact</span><span className="block truncate text-[15px] font-extrabold text-primary">Mike</span></span>
      </button>
      <button onClick={tour} className="flex h-14 min-w-0 flex-col items-center justify-center rounded-xl bg-primary px-3 text-primary-foreground shadow-sm transition hover:bg-primary/90" data-tour="request-showing">
        <span className="text-[16px] font-extrabold leading-tight">Request a tour</span>
        {earliest && <span className="max-w-full truncate text-[12px] font-medium text-primary-foreground/75">as early as {earliest}</span>}
      </button>
    </div>
  );
}

export function ListingDetail({ l }: { l: Listing }) {
  const params = useSearchParams();
  const router = useRouter();
  const [wizard, setWizard] = useState<{ open: boolean; step: number; sample: boolean }>({ open: false, step: 0, sample: false });
  const [ask, setAsk] = useState(false);
  const [back, setBack] = useState("/homes");
  const [earliest, setEarliest] = useState("");

  useEffect(() => { setEarliest(earliestLabel()); const s = session.get("mh-last-search"); if (s !== null) setBack(`/homes${s ? `?${s}` : ""}`); }, []);
  useEffect(() => {
    const r = params.get("request");
    if (r === "sample" || r === "1") { setWizard({ open: true, step: 0, sample: r === "sample" }); router.replace(`/homes/${l.id}`, { scroll: false }); }
  }, [params, l.id, router]);
  useEffect(() => onTour((a) => { if (a.type === "open-wizard" && a.listingId === l.id) { setWizard({ open: true, step: a.step ?? 0, sample: !!a.sample }); return true; } }), [l.id]);

  const share = async () => {
    const url = window.location.href.split("?")[0];
    try {
      if (navigator.share) await navigator.share({ title: `${l.address}, ${l.city}`, text: `${usd(l.price)} · ${l.beds} bd · ${l.baths} ba`, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch { /* cancelled */ }
  };
  const openTour = () => setWizard({ open: true, step: 0, sample: false });
  const similar = similarListings(LISTINGS, l, 4);
  const badge = cardBadge(l);
  const facts: [string, string | number][] = [
    ["Type", l.type], ["Year built", l.yearBuilt], ["Lot", l.lotAcres ? `${l.lotAcres} acres` : "Shared grounds"], ["Garage", l.garage],
    ["Heating", l.heating], ["Cooling", l.cooling], ["Price/sqft", usd(l.price / l.sqft)], ["On the market", l.daysListed === 0 ? "Coming soon" : `${l.daysListed} days`],
    ...(l.hoa ? [["HOA", `${usd(l.hoa)}/mo`] as [string, string]] : []), ["Est. taxes", `${usd(l.taxesYearly)}/yr`],
  ];
  const iconBtn = "grid size-10 place-items-center rounded-full bg-white/95 text-ink shadow-md backdrop-blur transition hover:scale-105";

  return (
    <div className="pb-28 md:pb-16">
      <div className="mx-auto max-w-[1280px] md:px-6 md:pt-5">
        <div className="mb-3 hidden items-center justify-between md:flex">
          <Link href={back} className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Back to search</Link>
          <div className="flex gap-2"><FavoriteButton id={l.id} label className="rounded-full" /><Button variant="outline" className="h-10 rounded-full" onClick={share}><Share2 /> Share</Button></div>
        </div>
        <Gallery photos={l.photos} alt={`${l.address}, ${l.city}`} overlay={
          <>
            <div className="absolute inset-x-3 top-3 flex justify-between">
              <Link href={back} className={iconBtn} aria-label="Back to search"><ArrowLeft className="size-5" /></Link>
              <div className="flex gap-2"><FavoriteButton id={l.id} className="size-10" /><button onClick={share} className={iconBtn} aria-label="Share"><Share2 className="size-[18px]" /></button></div>
            </div>
            {badge && <span className={cn("pointer-events-none absolute bottom-3 left-3 rounded-md px-2.5 py-1 text-[12.5px] font-bold shadow-sm", badge.tone)}>{badge.text}</span>}
          </>
        } />
      </div>

      <div className="mx-auto mt-5 grid max-w-[1280px] gap-10 px-4 md:px-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-[13px] font-bold"><span className={cn("size-2 rounded-full", l.status === "Active" ? "bg-[#d9443b]" : l.status === "Pending" ? "bg-amber-500" : "bg-gold")} />{saleLabel(l)}</span>
            {l.priceCut && <span className="rounded-full bg-[#b23b2e] px-3 py-1 text-[13px] font-bold text-white">Price cut: {usdShort(l.priceCut.amount)}</span>}
            {openLabel(l) && <span className="rounded-full bg-gold/20 px-3 py-1 text-[13px] font-bold text-[#6b5126]">{openLabel(l)}</span>}
          </div>
          <h1 className="mt-3 text-[34px] leading-none tracking-[-0.03em] tabular md:text-[40px]">{usd(l.price)}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[16px]">
            <span className="inline-flex items-center gap-2"><BedDouble className="size-5 text-muted-foreground" /><b>{l.beds}</b> {l.beds === 1 ? "bed" : "beds"}</span>
            <span className="inline-flex items-center gap-2"><Bath className="size-5 text-muted-foreground" /><b>{l.baths}</b> {l.baths === 1 ? "bath" : "baths"}</span>
            <span className="inline-flex items-center gap-2"><Ruler className="size-5 text-muted-foreground" /><b>{num(l.sqft)}</b> sqft</span>
          </div>
          <p className="mt-2 text-[16px] text-foreground/85">{fullAddress(l)}</p>

          <section className="mt-8 border-t pt-7">
            <h2 className="text-[20px]">About this home</h2>
            <p className="mt-3 text-[15.5px] leading-relaxed text-foreground/80">{l.description}</p>
            <ul className="mt-4 flex flex-wrap gap-2">{l.features.map((f) => <li key={f} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13.5px] font-medium"><Check className="size-3.5 text-emerald" />{f}</li>)}</ul>
          </section>

          <section className="mt-8 border-t pt-7">
            <h2 className="text-[20px]">Facts &amp; features</h2>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              {facts.map(([k, val]) => <div key={k}><dt className="text-[12.5px] text-muted-foreground">{k}</dt><dd className="text-[15px] font-semibold">{val}</dd></div>)}
            </dl>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div><h3 className="text-[15px]">Interior</h3><ul className="mt-2 space-y-1.5 text-[14.5px] text-foreground/80">{l.interior.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="text-[15px]">Exterior</h3><ul className="mt-2 space-y-1.5 text-[14.5px] text-foreground/80">{l.exterior.map((x) => <li key={x}>{x}</li>)}</ul></div>
            </div>
          </section>

          <section className="mt-8 border-t pt-7">
            <h2 className="text-[20px]">Location</h2>
            <ListingsMap listings={[l]} activeId={l.id} single className="mt-4 h-64 rounded-xl md:h-80" />
          </section>

          <section className="mt-8 border-t pt-7"><MortgageCalculator listing={l} /></section>

          <section className="mt-8 border-t pt-7">
            <h2 className="text-[20px]">Similar homes</h2>
            <div className="-mx-4 mt-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 no-scrollbar md:mx-0 md:grid md:grid-cols-2 md:px-0 xl:grid-cols-2">
              {similar.map((x) => <div key={x.id} className="w-[82%] shrink-0 snap-start md:w-auto"><PropertyCard l={x} compact /></div>)}
            </div>
          </section>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border bg-card p-5 shadow-soft">
            <p className="text-[13px] font-semibold text-muted-foreground">Interested in this home?</p>
            <p className="mt-1 text-[17px] font-extrabold">Tour it with Mike</p>
            <TourButtons onTour={openTour} onContact={() => setAsk(true)} earliest={earliest} className="mt-4 grid-cols-1" />
            <p className="mt-4 text-[12.5px] text-muted-foreground">Pick a day and time. Mike confirms by text or call, usually the same day.</p>
            <p className="mt-3 border-t pt-3 text-[11.5px] uppercase tracking-[0.08em] text-muted-foreground">Mike Hakim · eXp Realty · {l.id}</p>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur lg:hidden">
        <TourButtons onTour={openTour} onContact={() => setAsk(true)} earliest={earliest} className="mx-auto max-w-xl" />
      </div>

      <ShowingWizard listingId={l.id} open={wizard.open} onOpenChange={(o) => setWizard((w) => ({ ...w, open: o }))} initialStep={wizard.step} sample={wizard.sample} />
      <AskQuestion listing={l} open={ask} onOpenChange={setAsk} />
    </div>
  );
}

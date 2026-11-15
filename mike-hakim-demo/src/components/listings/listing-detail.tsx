"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Bath, BedDouble, CalendarCheck, CalendarDays, Car, Check, Flame, Home, MessageCircle, Ruler, Share2, Snowflake, Trees, Hash, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Gallery } from "@/components/listings/gallery";
import { MortgageCalculator } from "@/components/listings/mortgage-calculator";
import { PropertyCard, StatusBadge } from "@/components/listings/property-card";
import { FavoriteButton, CompareToggle } from "@/components/listings/listing-actions";
import { ShowingWizard } from "@/components/showing/showing-wizard";
import { AskQuestion } from "@/components/listings/ask-question";
import { Reveal } from "@/components/site/reveal";
import { LISTINGS, fullAddress } from "@/data/listings";
import { similarListings } from "@/lib/search";
import { usd, num } from "@/lib/format";
import { hmLabel, ymdLabel } from "@/lib/time";
import { onTour } from "@/components/tour/tour-bus";
import { session } from "@/lib/storage";
import type { Listing } from "@/lib/types";

const ListingsMap = dynamic(() => import("@/components/listings/listings-map").then((m) => m.ListingsMap), { ssr: false, loading: () => <div className="h-full animate-pulse bg-muted" /> });

export function ListingDetail({ l }: { l: Listing }) {
  const params = useSearchParams();
  const router = useRouter();
  const [wizard, setWizard] = useState<{ open: boolean; step: number; sample: boolean }>({ open: false, step: 0, sample: false });
  const [ask, setAsk] = useState(false);
  const [back, setBack] = useState("/homes");

  useEffect(() => { const s = session.get("mh-last-search"); if (s !== null) setBack(`/homes${s ? `?${s}` : ""}`); }, []);
  useEffect(() => {
    if (params.get("request") === "sample") { setWizard({ open: true, step: 1, sample: true }); router.replace(`/homes/${l.id}`, { scroll: false }); }
    else if (params.get("request") === "1") { setWizard({ open: true, step: 0, sample: false }); router.replace(`/homes/${l.id}`, { scroll: false }); }
  }, [params, l.id, router]);
  useEffect(() => onTour((a) => { if (a.type === "open-wizard" && a.listingId === l.id) setWizard({ open: true, step: a.step ?? 0, sample: !!a.sample }); }), [l.id]);

  const share = async () => {
    const url = window.location.href.split("?")[0];
    try {
      if (navigator.share) await navigator.share({ title: `${l.address}, ${l.city}`, text: `${usd(l.price)} · ${l.beds} bd · ${l.baths} ba (sample listing)`, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch { /* user cancelled */ }
  };
  const openWizard = () => setWizard({ open: true, step: 0, sample: false });
  const similar = similarListings(LISTINGS, l, 3);
  const facts = [
    { i: BedDouble, k: "Bedrooms", v: l.beds },
    { i: Bath, k: "Bathrooms", v: l.baths },
    { i: Ruler, k: "Square feet", v: num(l.sqft) },
    { i: Trees, k: "Lot", v: l.lotAcres ? `${l.lotAcres} acres` : "Shared grounds" },
    { i: Home, k: "Type", v: l.type },
    { i: CalendarDays, k: "Year built", v: l.yearBuilt },
    { i: Car, k: "Garage", v: l.garage },
    { i: Flame, k: "Heating", v: l.heating },
    { i: Snowflake, k: "Cooling", v: l.cooling },
    { i: Clock, k: "Days listed", v: l.daysListed === 0 ? "Coming soon" : l.daysListed },
    { i: Hash, k: "Listing ID", v: l.id },
    { i: Hash, k: "Est. taxes", v: `${usd(l.taxesYearly)}/yr` },
  ];

  const ActionPanel = (
    <div className="rounded-lg border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between"><StatusBadge l={l} /><span className="text-[12px] text-muted-foreground">Sample listing</span></div>
      <p className="mt-3 font-display text-[34px] font-medium leading-none tracking-[-0.02em] tabular">{usd(l.price)}</p>
      <p className="mt-2 text-[14px] text-muted-foreground">{l.beds} bd · {l.baths} ba · {num(l.sqft)} sq ft</p>
      {l.openHouse && <p className="mt-3 flex items-center gap-2 rounded-md bg-gold/10 px-3 py-2 text-[13px] font-semibold text-[#6b5126]"><CalendarDays className="size-4" /> Open house {ymdLabel(l.openHouse.date, { weekday: "long", month: "short", day: "numeric" })}, {hmLabel(l.openHouse.start)}–{hmLabel(l.openHouse.end)}</p>}
      <div className="mt-4 grid gap-2">
        <Button size="lg" onClick={openWizard} data-tour="request-showing"><CalendarCheck /> Request a Showing</Button>
        <Button size="lg" variant="outline" onClick={() => setAsk(true)}><MessageCircle /> Ask Mike a Question</Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <FavoriteButton id={l.id} label className="min-w-[8rem] flex-1" />
        <Button variant="outline" className="h-10 min-w-[8rem] flex-1" onClick={share}><Share2 /> Share</Button>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 pt-5 md:px-6 md:pb-20">
      <div className="flex items-center justify-between gap-3">
        <Link href={back} className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Back to results</Link>
        <CompareToggle id={l.id} className="border bg-card" />
      </div>
      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <Gallery photos={l.photos} alt={l.headline} />
          <div className="mt-6">
            <p className="eyebrow">{l.city}, Michigan · Sample MLS Listing — Demo Data</p>
            <h1 className="mt-2 text-[28px] font-medium leading-tight md:text-[38px]">{l.address}</h1>
            <p className="mt-1 text-[15px] text-muted-foreground">{fullAddress(l)}</p>
            <div className="mt-4 lg:hidden">{ActionPanel}</div>
            <div className="mt-6 grid grid-cols-3 divide-x rounded-lg border bg-card text-center">
              <div className="p-4"><p className="font-display text-[26px] font-medium tabular">{l.beds}</p><p className="text-[12px] text-muted-foreground">Bedrooms</p></div>
              <div className="p-4"><p className="font-display text-[26px] font-medium tabular">{l.baths}</p><p className="text-[12px] text-muted-foreground">Bathrooms</p></div>
              <div className="p-4"><p className="font-display text-[26px] font-medium tabular">{num(l.sqft)}</p><p className="text-[12px] text-muted-foreground">Square feet</p></div>
            </div>
          </div>

          <Reveal className="mt-10">
            <h2 className="text-[24px] font-medium">{l.headline}</h2>
            <p className="mt-3 max-w-3xl text-[15.5px] leading-relaxed text-foreground/80">{l.description}</p>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {l.features.map((f) => <li key={f} className="flex items-center gap-2.5 text-[14.5px]"><Check className="size-4 text-gold" />{f}</li>)}
            </ul>
          </Reveal>

          <Reveal className="mt-10">
            <h2 className="text-[24px] font-medium">Property details</h2>
            <dl className="mt-4 grid gap-px overflow-hidden rounded-lg bg-border hairline sm:grid-cols-2 lg:grid-cols-3">
              {facts.map((x) => (
                <div key={x.k} className="flex items-start gap-3 bg-card p-4">
                  <x.i className="mt-0.5 size-4 shrink-0 text-gold" />
                  <div><dt className="text-[12px] text-muted-foreground">{x.k}</dt><dd className="text-[14.5px] font-semibold">{x.v}</dd></div>
                </div>
              ))}
            </dl>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div><h3 className="font-sans text-[13px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Interior</h3><ul className="mt-3 space-y-2 text-[14.5px]">{l.interior.map((x) => <li key={x} className="flex gap-2.5"><span className="mt-2 size-1.5 shrink-0 rotate-45 bg-gold" />{x}</li>)}</ul></div>
              <div><h3 className="font-sans text-[13px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Exterior</h3><ul className="mt-3 space-y-2 text-[14.5px]">{[...l.exterior, `Garage: ${l.garage}`].map((x) => <li key={x} className="flex gap-2.5"><span className="mt-2 size-1.5 shrink-0 rotate-45 bg-gold" />{x}</li>)}</ul></div>
            </div>
            {l.hoa && <p className="mt-4 text-[14px] text-muted-foreground">HOA: {usd(l.hoa)} per month (sample).</p>}
          </Reveal>

          <Reveal className="mt-10">
            <h2 className="text-[24px] font-medium">Location</h2>
            <p className="mt-1 text-[14px] text-muted-foreground">Approximate location for a sample listing in {l.city}.</p>
            <ListingsMap listings={[l]} activeId={l.id} single className="mt-4 h-72 md:h-80" />
          </Reveal>

          <Reveal className="mt-10"><MortgageCalculator listing={l} /></Reveal>

          <Reveal className="mt-12">
            <div className="flex items-end justify-between"><h2 className="text-[24px] font-medium">Similar homes</h2><Link href={`/homes?q=${encodeURIComponent(l.city)}`} className="text-[13.5px] font-semibold text-gold hover:underline">More in {l.city}</Link></div>
            <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{similar.map((x) => <PropertyCard key={x.id} l={x} />)}</div>
          </Reveal>
        </div>
        <aside className="hidden lg:block"><div className="sticky top-24">{ActionPanel}</div></aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl gap-2">
          <Button size="lg" className="flex-1" onClick={openWizard}><CalendarCheck /> Request a Showing</Button>
          <Button size="lg" variant="outline" onClick={() => setAsk(true)} aria-label="Ask Mike a question"><MessageCircle /></Button>
        </div>
      </div>

      <ShowingWizard listingId={l.id} open={wizard.open} onOpenChange={(o) => setWizard((w) => ({ ...w, open: o }))} initialStep={wizard.step} sample={wizard.sample} />
      <AskQuestion listing={l} open={ask} onOpenChange={setAsk} />
    </div>
  );
}

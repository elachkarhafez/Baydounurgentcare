"use client";
import Image from "next/image";
import Link from "next/link";
import { Scale, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDemoState } from "@/lib/use-demo";
import { getListing } from "@/data/listings";
import { clearCompare, toggleCompare } from "@/lib/store";
import { usd, num } from "@/lib/format";
import type { Listing } from "@/lib/types";

const ROWS: { k: string; v: (l: Listing) => string | number; best?: "min" | "max"; raw?: (l: Listing) => number }[] = [
  { k: "Price", v: (l) => usd(l.price), best: "min", raw: (l) => l.price },
  { k: "Price per sq ft", v: (l) => usd(l.price / l.sqft), best: "min", raw: (l) => l.price / l.sqft },
  { k: "Bedrooms", v: (l) => l.beds, best: "max", raw: (l) => l.beds },
  { k: "Bathrooms", v: (l) => l.baths, best: "max", raw: (l) => l.baths },
  { k: "Square feet", v: (l) => num(l.sqft), best: "max", raw: (l) => l.sqft },
  { k: "Lot", v: (l) => (l.lotAcres ? `${l.lotAcres} ac` : "n/a"), best: "max", raw: (l) => l.lotAcres },
  { k: "Year built", v: (l) => l.yearBuilt, best: "max", raw: (l) => l.yearBuilt },
  { k: "Type", v: (l) => l.type },
  { k: "Garage", v: (l) => l.garage },
  { k: "Status", v: (l) => l.status },
  { k: "Est. taxes", v: (l) => `${usd(l.taxesYearly)}/yr`, best: "min", raw: (l) => l.taxesYearly },
];

export function CompareView() {
  const s = useDemoState();
  if (!s) return <div className="mx-auto max-w-6xl px-4 py-12"><Skeleton className="h-96" /></div>;
  const ls = s.compare.map(getListing).filter(Boolean) as Listing[];
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="eyebrow">Compare</p><h1 className="mt-2 text-[28px] font-medium md:text-[38px]">Side by side</h1></div>
        {ls.length > 0 && <Button variant="outline" onClick={clearCompare}>Clear all</Button>}
      </div>
      {ls.length < 2 ? (
        <div className="mt-8 grid place-items-center rounded-lg border border-dashed bg-card px-6 py-16 text-center">
          <Scale className="size-8 text-gold" strokeWidth={1.5} />
          <h2 className="mt-4 text-[22px] font-medium">{ls.length === 1 ? "Add one more home" : "Pick at least two homes"}</h2>
          <p className="mt-2 max-w-sm text-[14px] text-muted-foreground">Tap Compare on any listing card to add it here. You can compare up to four.</p>
          <Button asChild className="mt-5"><Link href="/homes">Browse homes</Link></Button>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[640px] text-[14px]">
            <thead>
              <tr>
                <th className="w-40 p-4 text-left align-bottom text-[12px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Home</th>
                {ls.map((l) => (
                  <th key={l.id} className="p-4 text-left align-top font-normal">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-md"><Image src={l.photos[0]} alt={l.headline} fill sizes="260px" className="object-cover" />
                      <button onClick={() => toggleCompare(l.id)} className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-white/90 text-ink" aria-label={`Remove ${l.address}`}><X className="size-4" /></button></div>
                    <Link href={`/homes/${l.id}`} className="mt-2 block font-semibold hover:underline">{l.address}</Link>
                    <span className="text-[13px] text-muted-foreground">{l.city}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => {
                const vals = r.raw ? ls.map(r.raw) : [];
                const best = r.best && vals.length ? (r.best === "min" ? Math.min(...vals) : Math.max(...vals)) : null;
                return (
                  <tr key={r.k} className="border-t">
                    <th className="p-4 text-left text-[13px] font-semibold text-muted-foreground">{r.k}</th>
                    {ls.map((l) => <td key={l.id} className={`p-4 font-semibold tabular ${best !== null && r.raw!(l) === best && new Set(vals).size > 1 ? "text-emerald" : ""}`}>{r.v(l)}</td>)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

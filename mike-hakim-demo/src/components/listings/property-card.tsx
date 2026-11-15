"use client";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import type { Listing } from "@/lib/types";
import { usd, num, usdShort } from "@/lib/format";
import { ymdLabel, hmLabel } from "@/lib/time";
import { FavoriteButton } from "@/components/listings/listing-actions";
import { cn } from "cn";

const TYPE_WORD: Record<Listing["type"], string> = { "Single Family": "House", Ranch: "House", Condo: "Condo", Townhouse: "Townhouse", "Multi-Family": "Multi-family" };
export function saleLabel(l: Listing) {
  if (l.status === "Coming Soon") return `${TYPE_WORD[l.type]} coming soon`;
  if (l.status === "Pending") return "Pending";
  return `${TYPE_WORD[l.type]} for sale`;
}
const shortHm = (hm: string) => hmLabel(hm).replace(":00", "").replace(" ", "").toLowerCase();
export function openLabel(l: Listing) {
  if (!l.openHouse) return null;
  return `Open: ${ymdLabel(l.openHouse.date, { weekday: "short" })} ${shortHm(l.openHouse.start)}–${shortHm(l.openHouse.end)}`;
}
export function cardBadge(l: Listing): { text: string; tone: string } | null {
  const open = openLabel(l);
  if (open) return { text: open, tone: "bg-white text-ink" };
  if (l.priceCut) return { text: `Price cut: ${usdShort(l.priceCut.amount)}`, tone: "bg-white text-[#b23b2e]" };
  if (l.status === "Coming Soon") return { text: "Coming soon", tone: "bg-gold text-ink" };
  if (l.daysListed <= 3) return { text: "New listing", tone: "bg-white text-ink" };
  return null;
}

export function PropertyCard({ l, highlighted = false, onHover, priority = false, compact = false }: { l: Listing; highlighted?: boolean; onHover?: (id: string | null) => void; priority?: boolean; compact?: boolean }) {
  const strip = useRef<HTMLDivElement>(null);
  const [slide, setSlide] = useState(0);
  const photos = l.photos.slice(0, 4);
  const badge = cardBadge(l);
  return (
    <article
      onMouseEnter={() => onHover?.(l.id)}
      onMouseLeave={() => onHover?.(null)}
      id={`card-${l.id}`}
      data-listing={l.id}
      className={cn("group relative overflow-hidden rounded-xl bg-card shadow-[0_1px_3px_rgba(13,22,36,.08),0_8px_24px_-16px_rgba(13,22,36,.25)] ring-1 ring-black/5 transition hover:shadow-[0_2px_6px_rgba(13,22,36,.1),0_18px_40px_-20px_rgba(13,22,36,.35)]", highlighted && "ring-2 ring-gold")}
    >
      <Link href={`/homes/${l.id}`} className="absolute inset-0 z-[1]" aria-label={`${usd(l.price)}, ${l.address}, ${l.city}`} />
      <div className="relative aspect-[16/11] bg-muted">
        <div ref={strip} onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))} className="relative z-[2] flex h-full snap-x snap-mandatory overflow-x-auto no-scrollbar">
          {photos.map((p, i) => (
            <Link key={p} href={`/homes/${l.id}`} tabIndex={-1} aria-hidden="true" className="relative h-full w-full shrink-0 snap-center">
              <Image src={p} alt="" fill sizes={compact ? "320px" : "(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"} className="object-cover" priority={priority && i === 0} draggable={false} />
            </Link>
          ))}
        </div>
        {badge && <span className={cn("pointer-events-none absolute left-3 top-3 z-[3] rounded-md px-2.5 py-1 text-[12.5px] font-bold shadow-sm", badge.tone)}>{badge.text}</span>}
        <div className="absolute right-3 top-3 z-[3]"><FavoriteButton id={l.id} /></div>
        {photos.length > 1 && (
          <>
            <div className="pointer-events-none absolute bottom-2.5 left-1/2 z-[3] flex -translate-x-1/2 gap-1.5 rounded-full bg-black/25 px-2 py-1">
              {photos.map((_, i) => <span key={i} className={cn("size-1.5 rounded-full transition", i === slide ? "bg-white" : "bg-white/50")} />)}
            </div>
            <button type="button" aria-label="Next photo" onClick={(e) => { e.preventDefault(); const el = strip.current!; el.scrollTo({ left: ((slide + 1) % photos.length) * el.clientWidth, behavior: "smooth" }); }}
              className="absolute right-2 top-1/2 z-[3] hidden size-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink opacity-0 shadow transition group-hover:opacity-100 md:grid">›</button>
          </>
        )}
      </div>
      <div className="px-4 pb-4 pt-3">
        <p className="text-[22px] font-extrabold tracking-[-0.02em] tabular">{usd(l.price)}</p>
        <p className="mt-0.5 text-[14px] text-foreground/85"><b className="font-bold">{l.beds}</b> bds <span className="text-muted-foreground/60">|</span> <b className="font-bold">{l.baths}</b> ba <span className="text-muted-foreground/60">|</span> <b className="font-bold">{num(l.sqft)}</b> sqft <span className="text-muted-foreground/60">|</span> {saleLabel(l)}</p>
        <p className="mt-0.5 truncate text-[14px] text-foreground/85">{l.address}, {l.city}, MI {l.zip}</p>
        <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Mike Hakim · eXp Realty</p>
      </div>
    </article>
  );
}

export function PropertyCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-black/5">
      <div className="aspect-[16/11] animate-pulse bg-muted" />
      <div className="space-y-2.5 p-4"><div className="h-6 w-1/3 animate-pulse rounded bg-muted" /><div className="h-4 w-3/4 animate-pulse rounded bg-muted" /><div className="h-4 w-2/3 animate-pulse rounded bg-muted" /></div>
    </div>
  );
}

"use client";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { Bath, BedDouble, CalendarDays, Ruler } from "lucide-react";
import type { Listing } from "@/lib/types";
import { usd, num } from "@/lib/format";
import { ymdLabel, hmLabel } from "@/lib/time";
import { CompareToggle, FavoriteButton } from "@/components/listings/listing-actions";
import { cn } from "cn";

export function StatusBadge({ l, className }: { l: Listing; className?: string }) {
  const tone = l.status === "Active" ? "bg-emerald text-white" : l.status === "Coming Soon" ? "bg-gold text-ink" : "bg-white text-ink";
  return <span className={cn("rounded px-2 py-1 text-[10.5px] font-bold uppercase tracking-[0.12em]", tone, className)}>{l.status}</span>;
}

export function PropertyCard({ l, layout = "grid", highlighted = false, onHover, priority = false }: { l: Listing; layout?: "grid" | "list"; highlighted?: boolean; onHover?: (id: string | null) => void; priority?: boolean }) {
  const list = layout === "list";
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => onHover?.(l.id)}
      onMouseLeave={() => onHover?.(null)}
      id={`card-${l.id}`}
      className={cn("group relative overflow-hidden rounded-lg bg-card shadow-soft hairline transition-shadow duration-300 hover:shadow-lift", highlighted && "ring-2 ring-gold", list && "sm:grid sm:grid-cols-[minmax(0,300px)_1fr]")}
      data-listing={l.id}
    >
      <Link href={`/homes/${l.id}`} className="absolute inset-0 z-[1]" aria-label={`${l.address}, ${l.city}. ${usd(l.price)}`} />
      <div className={cn("relative overflow-hidden bg-muted", list ? "aspect-[4/3] sm:aspect-auto sm:h-full" : "aspect-[4/3]")}>
        <Image src={l.photos[0]} alt={`${l.headline}, ${l.city}`} fill sizes={list ? "(min-width: 640px) 300px, 100vw" : "(min-width: 1280px) 400px, (min-width: 640px) 50vw, 100vw"} className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.05]" priority={priority} />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <div className="flex flex-col items-start gap-1.5">
            <StatusBadge l={l} />
            {l.openHouse && <span className="inline-flex items-center gap-1 rounded bg-white/95 px-2 py-1 text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink"><CalendarDays className="size-3" /> Open {ymdLabel(l.openHouse.date, { weekday: "short" })} {hmLabel(l.openHouse.start).replace(":00", "")}</span>}
          </div>
          <div className="relative z-[2]"><FavoriteButton id={l.id} /></div>
        </div>
        <div className="absolute bottom-3 left-3 z-[2]"><CompareToggle id={l.id} /></div>
      </div>
      <div className="p-4 md:p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-display text-[24px] font-medium tracking-[-0.02em] tabular">{usd(l.price)}</p>
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{l.daysListed === 0 ? "New" : `${l.daysListed}d listed`}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px] font-semibold text-foreground/85">
          <span className="inline-flex items-center gap-1.5"><BedDouble className="size-4 text-gold" />{l.beds} bd</span>
          <span className="inline-flex items-center gap-1.5"><Bath className="size-4 text-gold" />{l.baths} ba</span>
          <span className="inline-flex items-center gap-1.5"><Ruler className="size-4 text-gold" />{num(l.sqft)} sq ft</span>
        </div>
        <p className="mt-2.5 truncate text-[14px] text-muted-foreground">{l.address}, {l.city}, MI {l.zip}</p>
        {list && <p className="mt-2 line-clamp-2 text-[14px] text-foreground/75">{l.headline}. {l.description}</p>}
        <p className="mt-3 text-[11px] text-muted-foreground/80">{l.type} · {l.id} · Sample listing</p>
      </div>
    </motion.article>
  );
}

export function PropertyCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg bg-card hairline">
      <div className="aspect-[4/3] animate-pulse bg-muted" />
      <div className="space-y-3 p-5">
        <div className="h-6 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

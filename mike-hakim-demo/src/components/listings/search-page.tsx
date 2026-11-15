"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, LayoutGrid, List, Map as MapIcon, Search, SlidersHorizontal, X, Heart, Scale, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PropertyCard, PropertyCardSkeleton } from "@/components/listings/property-card";
import { BedBathFields, MoreFields, PriceFields, TypeFields } from "@/components/listings/filters";
import { LISTINGS, getListing } from "@/data/listings";
import { DEFAULT_FILTERS, SORT_LABELS, activeFilterCount, filtersFromParams, filtersToParams, searchListings, type SearchFilters, type SortKey } from "@/lib/search";
import { usdShort } from "@/lib/format";
import { useDemoState } from "@/lib/use-demo";
import { clearCompare, toggleCompare } from "@/lib/store";
import { session } from "@/lib/storage";
import { cn } from "cn";

const ListingsMap = dynamic(() => import("@/components/listings/listings-map").then((m) => m.ListingsMap), { ssr: false, loading: () => <div className="h-full animate-pulse rounded-lg bg-muted" /> });

function chipLabels(f: SearchFilters): { key: string; label: string; clear: Partial<SearchFilters> }[] {
  const c: { key: string; label: string; clear: Partial<SearchFilters> }[] = [];
  if (f.minPrice || f.maxPrice) c.push({ key: "price", label: `${f.minPrice ? usdShort(f.minPrice) : "Any"} – ${f.maxPrice ? usdShort(f.maxPrice) : "Any"}`, clear: { minPrice: null, maxPrice: null } });
  if (f.beds) c.push({ key: "beds", label: `${f.beds}+ beds`, clear: { beds: 0 } });
  if (f.baths) c.push({ key: "baths", label: `${f.baths}+ baths`, clear: { baths: 0 } });
  f.types.forEach((t) => c.push({ key: `t-${t}`, label: t, clear: { types: f.types.filter((x) => x !== t) } }));
  if (f.minSqft) c.push({ key: "sqft", label: `${f.minSqft.toLocaleString()}+ sq ft`, clear: { minSqft: null } });
  if (f.status !== "any") c.push({ key: "status", label: f.status, clear: { status: "any" } });
  if (f.openHouse) c.push({ key: "open", label: "Open houses", clear: { openHouse: false } });
  if (f.saved) c.push({ key: "saved", label: "Saved homes", clear: { saved: false } });
  return c;
}

function FilterPop({ label, active, children }: { label: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("bg-card", active && "border-primary bg-primary/5")}>{label} <ChevronDown className="opacity-60" /></Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-4">{children}</PopoverContent>
    </Popover>
  );
}

export function SearchPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const s = useDemoState();
  const f = useMemo(() => filtersFromParams(new URLSearchParams(params.toString())), [params]);
  const view = params.get("view") === "list" ? "list" : "grid";
  const showMap = params.get("map") === "1";
  const [q, setQ] = useState(f.q);
  const [active, setActive] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [mobileMap, setMobileMap] = useState(false);
  const qTimer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => setQ(f.q), [f.q]);
  useEffect(() => { session.set("mh-last-search", params.toString()); }, [params]);

  const push = useCallback((next: SearchFilters, extra: Record<string, string | null> = {}) => {
    const p = filtersToParams(next, new URLSearchParams(params.toString()));
    Object.entries(extra).forEach(([k, v]) => (v === null ? p.delete(k) : p.set(k, v)));
    const qs = p.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [params, pathname, router]);
  const set = useCallback((patch: Partial<SearchFilters>) => push({ ...f, ...patch }), [f, push]);
  const onQ = (v: string) => {
    setQ(v);
    if (qTimer.current) clearTimeout(qTimer.current);
    qTimer.current = setTimeout(() => set({ q: v }), 250);
  };
  const clearAll = () => { setQ(""); push(DEFAULT_FILTERS); };

  const results = useMemo(() => searchListings(LISTINGS, f, s?.favorites ?? []), [f, s?.favorites]);
  const count = activeFilterCount(f);
  const chips = chipLabels(f);
  const select = useCallback((id: string) => {
    setActive(id);
    document.getElementById(`card-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);
  const compare = s?.compare ?? [];

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-28 pt-6 md:px-6 md:pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Sample MLS Listings — Demo Data</p>
          <h1 className="mt-2 text-[28px] font-medium leading-tight md:text-[38px]">Homes for sale in Southeast Michigan</h1>
        </div>
      </div>

      <div className="sticky top-16 z-30 -mx-4 mt-5 border-y bg-background/95 px-4 py-3 backdrop-blur md:top-[72px] md:-mx-6 md:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative flex-1 lg:max-w-md" data-tour="search">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gold" />
            <input value={q} onChange={(e) => onQ(e.target.value)} placeholder="City, ZIP, street or listing ID" aria-label="Search by city, ZIP, street or listing ID" className="h-11 w-full rounded-md border bg-card pl-9 pr-9 text-[15px] font-medium outline-none transition focus:border-primary focus:ring-3 focus:ring-ring/30" />
            {q && <button onClick={() => { setQ(""); set({ q: "" }); }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted" aria-label="Clear search"><X className="size-4" /></button>}
          </label>
          <div className="flex flex-wrap items-center gap-2" data-tour="filters">
            <div className="hidden flex-wrap gap-2 md:flex">
              <FilterPop label="Price" active={!!(f.minPrice || f.maxPrice)}><PriceFields f={f} set={set} /></FilterPop>
              <FilterPop label="Beds & baths" active={!!(f.beds || f.baths)}><BedBathFields f={f} set={set} /></FilterPop>
              <FilterPop label="Home type" active={f.types.length > 0}><TypeFields f={f} set={set} /></FilterPop>
              <FilterPop label="More" active={!!(f.minSqft || f.status !== "any" || f.openHouse || f.saved)}><MoreFields f={f} set={set} /></FilterPop>
            </div>
            <Button variant="outline" size="sm" className="bg-card md:hidden" onClick={() => setDrawer(true)}>
              <SlidersHorizontal /> Filters {count > 0 && <span className="rounded-full bg-primary px-1.5 text-[11px] text-primary-foreground">{count}</span>}
            </Button>
            <Select value={f.sort} onValueChange={(v) => set({ sort: v as SortKey })}>
              <SelectTrigger size="sm" className="h-9 w-[150px] bg-card" aria-label="Sort results"><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(SORT_LABELS) as SortKey[]).map((k) => <SelectItem key={k} value={k}>{SORT_LABELS[k]}</SelectItem>)}</SelectContent>
            </Select>
            <div className="ml-auto flex items-center gap-1 rounded-md border bg-card p-0.5 lg:ml-0">
              <button aria-label="Grid view" aria-pressed={view === "grid"} onClick={() => push(f, { view: null })} className={cn("rounded p-1.5", view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}><LayoutGrid className="size-4" /></button>
              <button aria-label="List view" aria-pressed={view === "list"} onClick={() => push(f, { view: "list" })} className={cn("rounded p-1.5", view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}><List className="size-4" /></button>
            </div>
            <Button variant={showMap ? "default" : "outline"} size="sm" className={cn("hidden lg:inline-flex", !showMap && "bg-card")} onClick={() => push(f, { map: showMap ? null : "1" })} aria-pressed={showMap}><MapIcon /> {showMap ? "Hide map" : "Show map"}</Button>
            <Button variant="outline" size="sm" className="bg-card lg:hidden" onClick={() => setMobileMap(true)}><MapIcon /> Map</Button>
          </div>
        </div>
        {(chips.length > 0 || f.q) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {f.q && <span className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1 text-[12.5px] font-semibold">“{f.q}”<button onClick={() => { setQ(""); set({ q: "" }); }} aria-label="Remove search text"><X className="size-3.5" /></button></span>}
            {chips.map((c) => (
              <span key={c.key} className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1 text-[12.5px] font-semibold">{c.label}<button onClick={() => set(c.clear)} aria-label={`Remove ${c.label}`}><X className="size-3.5" /></button></span>
            ))}
            <button onClick={clearAll} className="text-[12.5px] font-semibold text-gold underline-offset-2 hover:underline">Clear all filters</button>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-[14px] text-muted-foreground" aria-live="polite"><b className="font-semibold text-foreground tabular" data-testid="result-count">{results.length}</b> {results.length === 1 ? "home" : "homes"} match{results.length === 1 ? "es" : ""}</p>
        {f.saved && <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground"><Heart className="size-4" /> Showing saved homes</span>}
      </div>

      <div className={cn("mt-4 grid gap-6", showMap && "lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]")}>
        <div>
          {!s ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <PropertyCardSkeleton key={i} />)}</div>
          ) : results.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid place-items-center rounded-lg border border-dashed bg-card px-6 py-16 text-center">
              <SearchX className="size-8 text-gold" strokeWidth={1.5} />
              <h2 className="mt-4 text-[22px] font-medium">No homes match those filters</h2>
              <p className="mt-2 max-w-sm text-[14px] text-muted-foreground">{f.saved ? "You haven't saved any homes that fit. Tap the heart on a listing to save it." : "Try widening the price range or removing a filter or two."}</p>
              <Button className="mt-5" onClick={clearAll}>Clear all filters</Button>
            </motion.div>
          ) : (
            <motion.div layout className={cn("grid gap-5", view === "list" ? "grid-cols-1" : showMap ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3")}>
              <AnimatePresence mode="popLayout">
                {results.map((l, i) => <PropertyCard key={l.id} l={l} layout={view} highlighted={active === l.id} onHover={setActive} priority={i < 3} />)}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
        {showMap && (
          <div className="hidden lg:block">
            <div className="sticky top-[150px] h-[calc(100vh-170px)]"><ListingsMap listings={results} activeId={active} onSelect={select} className="h-full" /></div>
          </div>
        )}
      </div>

      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent side="bottom" className="h-[100dvh] max-h-[100dvh] gap-0 rounded-none p-0">
          <SheetHeader className="border-b px-4 py-4"><SheetTitle className="text-left">Filters</SheetTitle></SheetHeader>
          <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
            <section><h3 className="mb-3 font-sans text-[13px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Price</h3><PriceFields f={f} set={set} /></section>
            <section><BedBathFields f={f} set={set} /></section>
            <section><h3 className="mb-3 font-sans text-[13px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Home type</h3><TypeFields f={f} set={set} /></section>
            <section><h3 className="mb-3 font-sans text-[13px] font-bold uppercase tracking-[0.14em] text-muted-foreground">More</h3><MoreFields f={f} set={set} /></section>
          </div>
          <SheetFooter className="flex-row gap-2 border-t p-4">
            <Button variant="outline" className="flex-1" onClick={clearAll}>Clear all</Button>
            <Button className="flex-1" onClick={() => setDrawer(false)}>Show {results.length} homes</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={mobileMap} onOpenChange={setMobileMap}>
        <SheetContent side="bottom" className="h-[100dvh] max-h-[100dvh] gap-0 rounded-none p-0">
          <SheetHeader className="border-b px-4 py-4"><SheetTitle className="text-left">{results.length} homes on the map</SheetTitle></SheetHeader>
          <div className="relative flex-1">{mobileMap && <ListingsMap listings={results} activeId={active} onSelect={setActive} className="absolute inset-0 rounded-none" />}</div>
          {active && getListing(active) && (
            <Link href={`/homes/${active}`} className="flex items-center gap-3 border-t bg-card p-3">
              <Image src={getListing(active)!.photos[0]} alt="" width={96} height={64} className="h-16 w-24 rounded object-cover" />
              <span className="min-w-0"><b className="block font-display text-[18px] font-medium">{usdShort(getListing(active)!.price)}</b><span className="block truncate text-[13px] text-muted-foreground">{getListing(active)!.address}, {getListing(active)!.city}</span></span>
            </Link>
          )}
        </SheetContent>
      </Sheet>

      <AnimatePresence>
        {compare.length > 0 && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-2xl items-center gap-3 rounded-lg bg-ink p-3 text-white shadow-lift">
            <Scale className="ml-1 size-5 shrink-0 text-gold-soft" />
            <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto no-scrollbar">
              {compare.map((id) => { const l = getListing(id); return l ? (
                <span key={id} className="relative shrink-0">
                  <Image src={l.photos[0]} alt={l.address} width={64} height={44} className="h-11 w-16 rounded object-cover" />
                  <button onClick={() => toggleCompare(id)} className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-white text-ink" aria-label={`Remove ${l.address} from compare`}><X className="size-3" /></button>
                </span>) : null; })}
            </div>
            <button onClick={clearCompare} className="hidden text-[12.5px] text-white/60 hover:text-white sm:block">Clear</button>
            <Button asChild variant="gold" size="sm"><Link href="/compare">Compare {compare.length}</Link></Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

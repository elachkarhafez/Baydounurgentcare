"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ChevronDown, List, Map as MapIcon, Search, SlidersHorizontal, X, SearchX } from "lucide-react";
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
import { session } from "@/lib/storage";
import { cn } from "cn";

const ListingsMap = dynamic(() => import("@/components/listings/listings-map").then((m) => m.ListingsMap), { ssr: false, loading: () => <div className="h-full animate-pulse bg-muted" /> });

function Pill({ label, active, children }: { label: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn("inline-flex h-10 items-center gap-1.5 rounded-full border bg-card px-4 text-[14px] font-semibold transition hover:border-foreground/40", active && "border-primary bg-primary/5 text-primary")}>{label} <ChevronDown className="size-4 opacity-60" /></button>
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
  const [q, setQ] = useState(f.q);
  const [active, setActive] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [mobileMap, setMobileMap] = useState(false);
  const qTimer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => setQ(f.q), [f.q]);
  useEffect(() => { session.set("mh-last-search", params.toString()); }, [params]);

  const push = useCallback((next: SearchFilters) => {
    const qs = filtersToParams(next, new URLSearchParams(params.toString())).toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [params, pathname, router]);
  const set = useCallback((patch: Partial<SearchFilters>) => push({ ...f, ...patch }), [f, push]);
  const onQ = (v: string) => { setQ(v); if (qTimer.current) clearTimeout(qTimer.current); qTimer.current = setTimeout(() => set({ q: v }), 250); };
  const clearAll = () => { setQ(""); push(DEFAULT_FILTERS); };

  const results = useMemo(() => searchListings(LISTINGS, f, s?.favorites ?? []), [f, s?.favorites]);
  const count = activeFilterCount(f);
  const select = useCallback((id: string) => { setActive(id); document.getElementById(`card-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, []);
  const where = f.q ? f.q.replace(/\b\w/g, (c) => c.toUpperCase()) : "Southeast Michigan";
  const priceLabel = f.minPrice || f.maxPrice ? `${f.minPrice ? usdShort(f.minPrice) : "$0"}–${f.maxPrice ? usdShort(f.maxPrice) : "Any"}` : "Price";
  const bbLabel = f.beds || f.baths ? `${f.beds || "Any"} bd, ${f.baths || "Any"} ba` : "Beds & baths";

  return (
    <div className="pb-28 lg:pb-0">
      <div className="sticky top-14 z-30 border-b bg-background/95 backdrop-blur md:top-16">
        <div className="mx-auto flex max-w-[1600px] items-center gap-2 px-4 py-3 md:px-6" data-tour="filters">
          <label className="relative min-w-0 flex-1 lg:max-w-md" data-tour="search">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => onQ(e.target.value)} placeholder="City, ZIP or address" aria-label="Search by city, ZIP, street or listing ID" className="h-11 w-full rounded-full border bg-card pl-11 pr-10 text-[15px] font-medium shadow-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-ring/25" />
            {q && <button onClick={() => { setQ(""); set({ q: "" }); }} className="absolute right-2.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-muted text-muted-foreground hover:text-foreground" aria-label="Clear search"><X className="size-4" /></button>}
          </label>
          <div className="hidden items-center gap-2 lg:flex">
            <Pill label={priceLabel} active={!!(f.minPrice || f.maxPrice)}><PriceFields f={f} set={set} /></Pill>
            <Pill label={bbLabel} active={!!(f.beds || f.baths)}><BedBathFields f={f} set={set} /></Pill>
            <Pill label={f.types.length ? f.types.join(", ") : "Home type"} active={f.types.length > 0}><TypeFields f={f} set={set} /></Pill>
          </div>
          <button onClick={() => setDrawer(true)} className={cn("relative grid size-11 shrink-0 place-items-center rounded-full border bg-card shadow-sm transition hover:border-foreground/40 lg:flex lg:h-10 lg:w-auto lg:gap-1.5 lg:px-4 lg:text-[14px] lg:font-semibold lg:shadow-none", count > 0 && "border-primary text-primary")} aria-label="Filters">
            <SlidersHorizontal className="size-[18px]" /><span className="hidden lg:inline">Filters</span>
            {count > 0 && <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground lg:static lg:size-auto lg:px-1.5">{count}</span>}
          </button>
          {count > 0 && <button onClick={clearAll} className="hidden shrink-0 text-[13px] font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline lg:block">Clear all filters</button>}
        </div>
      </div>

      <div className="mx-auto grid max-w-[1600px] lg:grid-cols-[minmax(0,1fr)_minmax(0,760px)]">
        <div className="hidden lg:block">
          <div className="sticky top-[129px] h-[calc(100dvh-129px)]"><ListingsMap listings={results} activeId={active} onSelect={select} className="h-full rounded-none ring-0" /></div>
        </div>
        <div className="min-w-0 px-4 py-4 md:px-6 lg:py-5">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h1 className="text-[20px] leading-tight md:text-[22px]">{where} homes for sale</h1>
              <p className="mt-0.5 text-[13.5px] text-muted-foreground" aria-live="polite"><b className="font-bold text-foreground tabular" data-testid="result-count">{results.length}</b> {results.length === 1 ? "home" : "homes"}</p>
            </div>
            <Select value={f.sort} onValueChange={(v) => set({ sort: v as SortKey })}>
              <SelectTrigger size="sm" className="h-9 w-auto gap-1 rounded-full border-0 bg-transparent px-2 text-[13.5px] font-semibold shadow-none" aria-label="Sort results"><span className="text-muted-foreground">Sort:</span> <SelectValue /></SelectTrigger>
              <SelectContent align="end">{(Object.keys(SORT_LABELS) as SortKey[]).map((k) => <SelectItem key={k} value={k}>{SORT_LABELS[k]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {!s ? (
            <div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <PropertyCardSkeleton key={i} />)}</div>
          ) : results.length === 0 ? (
            <div className="grid place-items-center rounded-xl border border-dashed bg-card px-6 py-16 text-center">
              <SearchX className="size-8 text-muted-foreground" strokeWidth={1.5} />
              <h2 className="mt-4 text-[20px]">No homes match those filters</h2>
              <p className="mt-2 max-w-sm text-[14px] text-muted-foreground">{f.saved ? "You haven't saved any homes that fit. Tap the heart on a listing to save it." : "Try a different area, or widen the price range."}</p>
              <Button className="mt-5 rounded-full" onClick={clearAll}>Clear all filters</Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {results.map((l, i) => <PropertyCard key={l.id} l={l} highlighted={active === l.id} onHover={setActive} priority={i < 2} />)}
            </div>
          )}
          <p className="mt-6 text-center text-[12px] text-muted-foreground">Sample listings for this demo.</p>
        </div>
      </div>

      <button onClick={() => setMobileMap(true)} className="fixed bottom-20 left-1/2 z-30 inline-flex h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-5 text-[14px] font-bold text-primary-foreground shadow-lift lg:hidden"><MapIcon className="size-4" /> Map</button>

      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b px-5 py-4"><SheetTitle className="text-left text-[18px] font-extrabold">Filters</SheetTitle></SheetHeader>
          <div className="flex-1 space-y-7 overflow-y-auto px-5 py-5">
            <section><h3 className="mb-3 text-[15px]">Price</h3><PriceFields f={f} set={set} /></section>
            <section><BedBathFields f={f} set={set} /></section>
            <section><h3 className="mb-3 text-[15px]">Home type</h3><TypeFields f={f} set={set} /></section>
            <section><h3 className="mb-3 text-[15px]">More</h3><MoreFields f={f} set={set} /></section>
          </div>
          <SheetFooter className="flex-row gap-2 border-t p-4">
            <Button variant="outline" className="h-11 flex-1 rounded-full" onClick={clearAll}>Reset</Button>
            <Button className="h-11 flex-1 rounded-full" onClick={() => setDrawer(false)}>Show {results.length} homes</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={mobileMap} onOpenChange={setMobileMap}>
        <SheetContent side="bottom" showCloseButton={false} className="h-[100dvh] max-h-[100dvh] gap-0 rounded-none p-0">
          <SheetHeader className="sr-only"><SheetTitle>{results.length} homes on the map</SheetTitle></SheetHeader>
          <div className="relative flex-1">
            {mobileMap && <ListingsMap listings={results} activeId={active} onSelect={setActive} className="absolute inset-0 rounded-none ring-0" />}
            <button onClick={() => setMobileMap(false)} className="absolute bottom-6 left-1/2 z-[600] inline-flex h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-5 text-[14px] font-bold text-primary-foreground shadow-lift"><List className="size-4" /> List</button>
            {active && getListing(active) && <div className="absolute inset-x-3 bottom-20 z-[600]"><PropertyCard l={getListing(active)!} compact /></div>}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

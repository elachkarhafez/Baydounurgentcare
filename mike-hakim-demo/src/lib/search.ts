import type { Listing } from "@/lib/types";

export type SortKey = "newest" | "price_asc" | "price_desc" | "sqft_desc";
export type StatusFilter = "any" | "Active" | "Coming Soon" | "Pending";

export interface SearchFilters {
  q: string;
  minPrice: number | null;
  maxPrice: number | null;
  beds: number; // minimum, 0 = any
  baths: number;
  types: string[];
  minSqft: number | null;
  status: StatusFilter;
  openHouse: boolean;
  saved: boolean;
  sort: SortKey;
}

export const DEFAULT_FILTERS: SearchFilters = {
  q: "", minPrice: null, maxPrice: null, beds: 0, baths: 0, types: [], minSqft: null, status: "any", openHouse: false, saved: false, sort: "newest",
};

const n = (v: string | null) => (v && !isNaN(+v) && +v > 0 ? +v : null);

export function filtersFromParams(p: URLSearchParams): SearchFilters {
  return {
    q: p.get("q") ?? "",
    minPrice: n(p.get("min")),
    maxPrice: n(p.get("max")),
    beds: n(p.get("beds")) ?? 0,
    baths: n(p.get("baths")) ?? 0,
    types: (p.get("type") ?? "").split(",").filter(Boolean),
    minSqft: n(p.get("sqft")),
    status: (["Active", "Coming Soon", "Pending"].includes(p.get("status") ?? "") ? p.get("status") : "any") as StatusFilter,
    openHouse: p.get("open") === "1",
    saved: p.get("saved") === "1",
    sort: (["newest", "price_asc", "price_desc", "sqft_desc"].includes(p.get("sort") ?? "") ? p.get("sort") : "newest") as SortKey,
  };
}

export function filtersToParams(f: SearchFilters, base?: URLSearchParams) {
  const p = new URLSearchParams(base);
  const set = (k: string, v: string | number | null | boolean | undefined, def: unknown = null) => {
    if (v === null || v === undefined || v === "" || v === def || v === false || v === 0) p.delete(k);
    else p.set(k, v === true ? "1" : String(v));
  };
  set("q", f.q.trim());
  set("min", f.minPrice);
  set("max", f.maxPrice);
  set("beds", f.beds);
  set("baths", f.baths);
  set("type", f.types.join(","));
  set("sqft", f.minSqft);
  set("status", f.status, "any");
  set("open", f.openHouse);
  set("saved", f.saved);
  set("sort", f.sort, "newest");
  return p;
}

export function activeFilterCount(f: SearchFilters) {
  return [f.minPrice, f.maxPrice, f.beds || null, f.baths || null, f.types.length || null, f.minSqft, f.status !== "any" || null, f.openHouse || null, f.saved || null].filter(Boolean).length;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

export function matchesQuery(l: Listing, q: string) {
  const t = norm(q);
  if (!t) return true;
  const hay = norm(`${l.address} ${l.city} ${l.zip} ${l.state} ${l.id} ${l.type} ${l.headline}`);
  return t.split(" ").every((w) => hay.includes(w));
}

export function searchListings(all: Listing[], f: SearchFilters, favorites: string[] = []) {
  const out = all.filter((l) => {
    if (!matchesQuery(l, f.q)) return false;
    if (f.minPrice && l.price < f.minPrice) return false;
    if (f.maxPrice && l.price > f.maxPrice) return false;
    if (f.beds && l.beds < f.beds) return false;
    if (f.baths && l.baths < f.baths) return false;
    if (f.types.length && !f.types.includes(l.type)) return false;
    if (f.minSqft && l.sqft < f.minSqft) return false;
    if (f.status !== "any" && l.status !== f.status) return false;
    if (f.openHouse && !l.openHouse) return false;
    if (f.saved && !favorites.includes(l.id)) return false;
    return true;
  });
  const by: Record<SortKey, (a: Listing, b: Listing) => number> = {
    newest: (a, b) => a.daysListed - b.daysListed || b.price - a.price,
    price_asc: (a, b) => a.price - b.price,
    price_desc: (a, b) => b.price - a.price,
    sqft_desc: (a, b) => b.sqft - a.sqft,
  };
  return out.sort(by[f.sort]);
}

export function similarListings(all: Listing[], l: Listing, count = 3) {
  return all
    .filter((x) => x.id !== l.id)
    .map((x) => ({ x, score: Math.abs(x.price - l.price) / l.price + (x.city === l.city ? -0.25 : 0) + Math.abs(x.beds - l.beds) * 0.1 }))
    .sort((a, b) => a.score - b.score)
    .slice(0, count)
    .map((s) => s.x);
}

export const PRICE_STEPS = [150000, 200000, 250000, 300000, 350000, 400000, 450000, 500000, 600000, 700000, 800000, 1000000, 1500000, 2000000, 3000000];
export const SORT_LABELS: Record<SortKey, string> = { newest: "Newest", price_asc: "Lowest price", price_desc: "Highest price", sqft_desc: "Largest" };

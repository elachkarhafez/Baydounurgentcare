"use client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRICE_STEPS, type SearchFilters, type StatusFilter } from "@/lib/search";
import { PROPERTY_TYPES } from "@/data/listings";
import { usdShort } from "@/lib/format";
import { cn } from "cn";

type Set = (patch: Partial<SearchFilters>) => void;
const ANY = "any";

export function PriceFields({ f, set }: { f: SearchFilters; set: Set }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="grid gap-1.5">
        <Label className="text-[12px] text-muted-foreground">Min price</Label>
        <Select value={f.minPrice ? String(f.minPrice) : ANY} onValueChange={(v) => set({ minPrice: v === ANY ? null : +v })}>
          <SelectTrigger className="w-full" aria-label="Minimum price"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value={ANY}>No min</SelectItem>{PRICE_STEPS.slice(0, -1).map((p) => <SelectItem key={p} value={String(p)}>{usdShort(p)}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label className="text-[12px] text-muted-foreground">Max price</Label>
        <Select value={f.maxPrice ? String(f.maxPrice) : ANY} onValueChange={(v) => set({ maxPrice: v === ANY ? null : +v })}>
          <SelectTrigger className="w-full" aria-label="Maximum price"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value={ANY}>No max</SelectItem>{PRICE_STEPS.slice(1).map((p) => <SelectItem key={p} value={String(p)}>{usdShort(p)}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </div>
  );
}

function Segmented({ label, value, onChange, options }: { label: string; value: number; onChange: (v: number) => void; options: number[] }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
      <div className="flex overflow-hidden rounded-md border bg-card" role="radiogroup" aria-label={label}>
        {[0, ...options].map((o) => (
          <button key={o} type="button" role="radio" aria-checked={value === o} onClick={() => onChange(o)} className={cn("h-10 flex-1 border-r text-[13.5px] font-semibold last:border-r-0 transition-colors", value === o ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
            {o === 0 ? "Any" : `${o}+`}
          </button>
        ))}
      </div>
    </div>
  );
}

export function BedBathFields({ f, set }: { f: SearchFilters; set: Set }) {
  return (
    <div className="grid gap-4">
      <Segmented label="Bedrooms" value={f.beds} onChange={(v) => set({ beds: v })} options={[1, 2, 3, 4, 5]} />
      <Segmented label="Bathrooms" value={f.baths} onChange={(v) => set({ baths: v })} options={[1, 2, 3, 4]} />
    </div>
  );
}

export function TypeFields({ f, set }: { f: SearchFilters; set: Set }) {
  return (
    <div className="grid gap-2.5">
      {PROPERTY_TYPES.map((t) => (
        <label key={t} className="flex cursor-pointer items-center gap-2.5 text-[14px] font-medium">
          <Checkbox checked={f.types.includes(t)} onCheckedChange={(c) => set({ types: c ? [...f.types, t] : f.types.filter((x) => x !== t) })} />
          {t}
        </label>
      ))}
    </div>
  );
}

export function MoreFields({ f, set }: { f: SearchFilters; set: Set }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label className="text-[12px] text-muted-foreground">Square footage</Label>
        <Select value={f.minSqft ? String(f.minSqft) : ANY} onValueChange={(v) => set({ minSqft: v === ANY ? null : +v })}>
          <SelectTrigger className="w-full" aria-label="Minimum square footage"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value={ANY}>Any size</SelectItem>{[1000, 1500, 2000, 2500, 3000, 4000].map((s) => <SelectItem key={s} value={String(s)}>{s.toLocaleString()}+ sq ft</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label className="text-[12px] text-muted-foreground">Listing status</Label>
        <Select value={f.status} onValueChange={(v) => set({ status: v as StatusFilter })}>
          <SelectTrigger className="w-full" aria-label="Listing status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Coming Soon">Coming soon</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <label className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2.5 text-[14px] font-medium">
        Open houses only
        <Switch checked={f.openHouse} onCheckedChange={(c) => set({ openHouse: c })} aria-label="Open houses only" />
      </label>
      <label className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2.5 text-[14px] font-medium">
        Saved homes only
        <Switch checked={f.saved} onCheckedChange={(c) => set({ saved: c })} aria-label="Saved homes only" />
      </label>
    </div>
  );
}

"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRICE_STEPS, DEFAULT_FILTERS, filtersToParams } from "@/lib/search";
import { PROPERTY_TYPES } from "@/data/listings";
import { usdShort } from "@/lib/format";

const ANY = "any";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 px-1">
      <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [min, setMin] = useState(ANY);
  const [max, setMax] = useState(ANY);
  const [beds, setBeds] = useState(ANY);
  const [type, setType] = useState(ANY);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = filtersToParams({ ...DEFAULT_FILTERS, q, minPrice: min === ANY ? null : +min, maxPrice: max === ANY ? null : +max, beds: beds === ANY ? 0 : +beds, types: type === ANY ? [] : [type] });
    router.push(`/homes${p.toString() ? `?${p}` : ""}`);
  };
  const trig = "h-10 w-full border-0 bg-transparent px-0 text-[15px] font-semibold shadow-none focus-visible:ring-0 data-[placeholder]:text-muted-foreground";
  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg bg-card p-3 shadow-lift md:grid-cols-[1.6fr_1fr_1fr_0.8fr_1fr_auto] md:items-end md:gap-0 md:divide-x md:divide-border md:p-2 md:pl-4" role="search" aria-label="Search homes" data-tour="hero-search">
      <Field label="City or ZIP">
        <div className="flex items-center gap-2">
          <Search className="size-4 shrink-0 text-gold" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Dearborn, 48124, Novi…" className="h-10 w-full min-w-0 bg-transparent text-[15px] font-semibold outline-none placeholder:font-medium placeholder:text-muted-foreground" aria-label="City or ZIP code" />
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3 md:contents">
        <div className="md:px-3"><Field label="Min price">
          <Select value={min} onValueChange={setMin}><SelectTrigger className={trig} aria-label="Minimum price"><SelectValue placeholder="No min" /></SelectTrigger>
            <SelectContent><SelectItem value={ANY}>No min</SelectItem>{PRICE_STEPS.slice(0, -1).map((p) => <SelectItem key={p} value={String(p)}>{usdShort(p)}</SelectItem>)}</SelectContent></Select>
        </Field></div>
        <div className="md:px-3"><Field label="Max price">
          <Select value={max} onValueChange={setMax}><SelectTrigger className={trig} aria-label="Maximum price"><SelectValue placeholder="No max" /></SelectTrigger>
            <SelectContent><SelectItem value={ANY}>No max</SelectItem>{PRICE_STEPS.slice(1).map((p) => <SelectItem key={p} value={String(p)}>{usdShort(p)}</SelectItem>)}</SelectContent></Select>
        </Field></div>
        <div className="md:px-3"><Field label="Beds">
          <Select value={beds} onValueChange={setBeds}><SelectTrigger className={trig} aria-label="Bedrooms"><SelectValue placeholder="Any" /></SelectTrigger>
            <SelectContent><SelectItem value={ANY}>Any</SelectItem>{[1, 2, 3, 4, 5].map((b) => <SelectItem key={b} value={String(b)}>{b}+</SelectItem>)}</SelectContent></Select>
        </Field></div>
        <div className="md:px-3"><Field label="Type">
          <Select value={type} onValueChange={setType}><SelectTrigger className={trig} aria-label="Property type"><SelectValue placeholder="Any type" /></SelectTrigger>
            <SelectContent><SelectItem value={ANY}>Any type</SelectItem>{PROPERTY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
        </Field></div>
      </div>
      <div className="md:border-0 md:pl-2"><Button type="submit" size="lg" className="w-full md:w-auto">Explore Homes</Button></div>
    </form>
  );
}

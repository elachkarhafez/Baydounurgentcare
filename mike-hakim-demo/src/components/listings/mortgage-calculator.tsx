"use client";
import { useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { monthlyPayment } from "@/lib/mortgage";
import { usd } from "@/lib/format";
import type { Listing } from "@/lib/types";

function NumField({ id, label, value, onChange, prefix, suffix, step = 1, min = 0, max }: { id: string; label: string; value: number; onChange: (v: number) => void; prefix?: string; suffix?: string; step?: number; min?: number; max?: number }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-[12.5px] text-muted-foreground">{label}</Label>
      <div className="flex h-11 items-center rounded-md border bg-card px-3 focus-within:border-primary focus-within:ring-3 focus-within:ring-ring/30">
        {prefix && <span className="mr-1 text-muted-foreground">{prefix}</span>}
        <input id={id} type="number" inputMode="decimal" value={Number.isFinite(value) ? value : ""} step={step} min={min} max={max} onChange={(e) => onChange(e.target.value === "" ? 0 : Math.max(min, +e.target.value))} className="w-full min-w-0 bg-transparent text-[15px] font-semibold outline-none tabular" />
        {suffix && <span className="ml-1 text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

export function MortgageCalculator({ listing }: { listing: Listing }) {
  const [downPct, setDownPct] = useState(listing.price > 900000 ? 20 : 10);
  const [rate, setRate] = useState(6.5);
  const [years, setYears] = useState(30);
  const [tax, setTax] = useState(listing.taxesYearly);
  const [ins, setIns] = useState(Math.round((listing.price * 0.004) / 10) * 10);
  const r = useMemo(() => monthlyPayment({ price: listing.price, downPct, rate, years, taxYearly: tax, insuranceYearly: ins, hoaMonthly: listing.hoa }), [listing, downPct, rate, years, tax, ins]);
  const parts = [
    { k: "Principal & interest", v: r.pi, c: "bg-primary" },
    { k: "Property tax", v: r.tax, c: "bg-gold" },
    { k: "Home insurance", v: r.ins, c: "bg-emerald" },
    ...(r.hoa ? [{ k: "HOA", v: r.hoa, c: "bg-muted-foreground" }] : []),
  ];
  return (
    <div className="rounded-lg border bg-card p-5 md:p-6" id="calculator">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[22px] font-medium">Payment estimate</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">Adjust the numbers to see an estimated monthly payment.</p>
        </div>
        <div className="text-right">
          <p className="font-display text-[34px] font-medium leading-none tracking-[-0.02em] tabular" data-testid="monthly-payment">{usd(r.total)}</p>
          <p className="mt-1 text-[12px] text-muted-foreground">estimated per month</p>
        </div>
      </div>
      <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        {parts.map((p) => <span key={p.k} className={p.c} style={{ width: `${(p.v / r.total) * 100}%`, transition: "width .5s cubic-bezier(.16,1,.3,1)" }} />)}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-4">
        {parts.map((p) => <div key={p.k}><dt className="flex items-center gap-1.5 text-muted-foreground"><span className={`size-2 rounded-full ${p.c}`} />{p.k}</dt><dd className="font-semibold tabular">{usd(p.v)}</dd></div>)}
      </dl>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div className="grid gap-2 md:col-span-2">
          <div className="flex justify-between text-[12.5px]"><Label htmlFor="down" className="text-muted-foreground">Down payment</Label><span className="font-semibold tabular">{downPct}% · {usd(r.down)}</span></div>
          <Slider id="down" value={[downPct]} min={0} max={50} step={1} onValueChange={([v]) => setDownPct(v)} aria-label="Down payment percent" />
        </div>
        <NumField id="rate" label="Interest rate" value={rate} onChange={(v) => setRate(Math.min(20, v))} suffix="%" step={0.125} max={20} />
        <div className="grid gap-1.5">
          <Label className="text-[12.5px] text-muted-foreground">Loan term</Label>
          <Select value={String(years)} onValueChange={(v) => setYears(+v)}>
            <SelectTrigger className="h-11 w-full bg-card" aria-label="Loan term"><SelectValue /></SelectTrigger>
            <SelectContent>{[30, 20, 15, 10].map((y) => <SelectItem key={y} value={String(y)}>{y}-year fixed</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <NumField id="tax" label="Property tax (per year)" value={tax} onChange={setTax} prefix="$" step={100} />
        <NumField id="ins" label="Home insurance (per year)" value={ins} onChange={setIns} prefix="$" step={50} />
      </div>
      <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">Estimate only, for illustration. It isn&apos;t a loan offer or a rate quote. Taxes and insurance are rough estimates for sample listings. Talk to a lender for real numbers.</p>
    </div>
  );
}

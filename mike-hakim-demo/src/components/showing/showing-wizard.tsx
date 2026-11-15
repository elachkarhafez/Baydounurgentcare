"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Bath, BedDouble, CalendarClock, Check, Info, Pencil, Ruler, Sparkles, Workflow, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Uploader, SAMPLE_DOC } from "@/components/showing/uploader";
import { showingSchema, formatPhone, type ShowingForm } from "@/lib/schemas";
import { slotsFor } from "@/lib/slots";
import { addDaysYmd, detroitYmd, hmLabel, localDateToYmd, makeSlot, ymdLabel, ymdToLocalDate, formatTz, detroitToUtc } from "@/lib/time";
import { BUYER_STATUS, FINANCING } from "@/lib/labels";
import { usd, num, bytes } from "@/lib/format";
import { submitShowingRequest } from "@/lib/store";
import { getListing } from "@/data/listings";
import { onTour, emitSubmitted } from "@/components/tour/tour-bus";
import { useTour } from "@/components/tour/tour-provider";
import type { ShowingRequest } from "@/lib/types";
import { cn } from "cn";

const STEPS = ["Property", "Date & time", "Your details", "Pre-approval", "Review"];
const FIELDS: (keyof ShowingForm)[][] = [[], ["date", "time", "altDate", "altTime"], ["firstName", "lastName", "email", "phone", "buyerStatus", "financing", "notes"], ["document"], []];

function nextOpenDay() {
  let d = addDaysYmd(detroitYmd(), 1);
  for (let i = 0; i < 7; i++) {
    if (slotsFor(d).some((s) => !s.taken && !s.past)) return d;
    d = addDaysYmd(d, 1);
  }
  return d;
}
function firstFree(ymd: string, prefer: string[]) {
  const sl = slotsFor(ymd);
  for (const p of prefer) if (sl.find((s) => s.time === p && !s.taken && !s.past)) return p;
  return sl.find((s) => !s.taken && !s.past)?.time ?? "";
}

export function sampleValues(): ShowingForm {
  const d1 = nextOpenDay();
  const d2 = addDaysYmd(d1, 1);
  return {
    date: d1, time: firstFree(d1, ["17:30", "16:00", "12:00"]), altDate: d2, altTime: firstFree(d2, ["11:00", "13:30", "10:00"]),
    firstName: "Alex", lastName: "Morgan", email: "alex.morgan.sample@example.com", phone: "(313) 555-0142",
    buyerStatus: "ready", financing: "pre_approved", notes: "Sample request from the demo. Interested in the garage and the basement.",
    document: null, docSkipped: false,
  };
}
const EMPTY: ShowingForm = { date: "", time: "", altDate: "", altTime: "", firstName: "", lastName: "", email: "", phone: "", buyerStatus: undefined as never, financing: undefined as never, notes: "", document: null, docSkipped: false };

function FieldError({ msg }: { msg?: string }) {
  return <AnimatePresence>{msg && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[12.5px] font-medium text-destructive" role="alert">{msg}</motion.p>}</AnimatePresence>;
}

export function SlotPicker({ date, value, onChange, label, idPrefix }: { date: string; value: string; onChange: (t: string) => void; label: string; idPrefix: string }) {
  const slots = useMemo(() => (date ? slotsFor(date) : []), [date]);
  if (!date) return <p className="rounded-md border border-dashed px-3 py-6 text-center text-[13px] text-muted-foreground">Pick a date to see sample times.</p>;
  const morning = slots.filter((s) => +s.time.slice(0, 2) < 12);
  const later = slots.filter((s) => +s.time.slice(0, 2) >= 12);
  const group = (title: string, arr: typeof slots) => arr.length > 0 && (
    <div>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4" role="radiogroup" aria-label={`${label}, ${title}`}>
        {arr.map((s) => {
          const disabled = s.taken || s.past;
          const on = value === s.time;
          return (
            <button key={s.time} id={`${idPrefix}-${s.time}`} type="button" role="radio" aria-checked={on} disabled={disabled} onClick={() => onChange(on ? "" : s.time)}
              className={cn("h-10 rounded-md border text-[13px] font-semibold transition tabular", on ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/50", disabled && "cursor-not-allowed bg-muted text-muted-foreground/60 line-through hover:border-border")}
              title={s.taken ? "Taken (sample)" : s.past ? "Too soon" : undefined}>
              {hmLabel(s.time)}
            </button>
          );
        })}
      </div>
    </div>
  );
  return <div className="grid gap-3">{group("Morning", morning)}{group("Afternoon & evening", later)}</div>;
}

export function ShowingWizard({ listingId, open, onOpenChange, initialStep = 0, sample = false }: { listingId: string; open: boolean; onOpenChange: (o: boolean) => void; initialStep?: number; sample?: boolean }) {
  const listing = getListing(listingId)!;
  const tour = useTour();
  const [step, setStep] = useState(initialStep);
  const [dir, setDir] = useState(1);
  const [done, setDone] = useState<ShowingRequest | null>(null);
  const [sampleDoc, setSampleDoc] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<ShowingForm>({ resolver: zodResolver(showingSchema), defaultValues: sample ? sampleValues() : EMPTY, mode: "onTouched" });
  const { register, control, handleSubmit, trigger, watch, setValue, reset, formState: { errors } } = form;
  const v = watch();
  const today = detroitYmd();

  useEffect(() => {
    if (open) { setStep(initialStep); setDone(null); reset(sample ? sampleValues() : EMPTY); }
  }, [open, initialStep, sample, reset]);

  const go = useCallback(async (to: number) => {
    if (to > step) {
      for (let i = step; i < to; i++) {
        const ok = await trigger(FIELDS[i] as never);
        if (!ok) { setDir(1); setStep(i); return false; }
      }
    }
    setDir(to > step ? 1 : -1);
    setStep(Math.max(0, Math.min(STEPS.length - 1, to)));
    return true;
  }, [step, trigger]);

  const onSubmit = handleSubmit(async (data) => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 650));
    const sh = submitShowingRequest({
      listingId,
      preferred: makeSlot(data.date, data.time),
      alternate: data.altDate && data.altTime ? makeSlot(data.altDate, data.altTime) : undefined,
      firstName: data.firstName.trim(), lastName: data.lastName.trim(), email: data.email.trim(), phone: formatPhone(data.phone),
      buyerStatus: data.buyerStatus, financing: data.financing, notes: data.notes ?? "", document: data.document,
    });
    setSubmitting(false);
    setDone(sh);
    emitSubmitted({ ref: sh.ref, showingId: sh.id, leadId: sh.leadId });
  }, () => {
    const order: (keyof ShowingForm)[] = ["date", "time", "altTime", "firstName", "lastName", "email", "phone", "buyerStatus", "financing", "document"];
    const first = order.find((k) => errors[k]);
    const idx = FIELDS.findIndex((f) => first && f.includes(first));
    if (idx >= 0) { setDir(-1); setStep(idx); }
  });

  useEffect(() => onTour((a) => {
    if (a.type === "wizard-step") setStep(a.step);
    if (a.type === "wizard-sample-doc") { setValue("docSkipped", false); setSampleDoc((n) => n + 1); }
    if (a.type === "wizard-submit") onSubmit();
    if (a.type === "close-wizard") onOpenChange(false);
  }), [setValue, onSubmit, onOpenChange]);

  const pct = done ? 100 : ((step + 1) / STEPS.length) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={!tour.active}>
      <DialogContent showCloseButton={false} onInteractOutside={(e) => tour.active && e.preventDefault()} className="flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[92vh] sm:max-w-2xl sm:rounded-lg">
        <div className="border-b px-5 pb-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="font-display text-[22px] font-medium">{done ? "Request sent" : "Request a showing"}</DialogTitle>
              <DialogDescription className="mt-0.5 text-[13px]">{listing.address}, {listing.city} · Demo request, not a confirmed appointment</DialogDescription>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={() => onOpenChange(false)} aria-label="Close"><X /></Button>
          </div>
          {!done && (
            <>
              <div className="mt-4 h-1 overflow-hidden rounded-full bg-muted"><motion.div className="h-full bg-gold" animate={{ width: `${pct}%` }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} /></div>
              <ol className="mt-2.5 hidden grid-cols-5 gap-2 sm:grid" aria-label="Steps">
                {STEPS.map((s, i) => (
                  <li key={s}>
                    <button type="button" onClick={() => go(i)} className={cn("text-left text-[11.5px] font-semibold transition", i === step ? "text-foreground" : i < step ? "text-gold" : "text-muted-foreground")} aria-current={i === step ? "step" : undefined}>
                      {i < step ? <Check className="mr-1 inline size-3" /> : `${i + 1}. `}{s}
                    </button>
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-[12px] font-semibold text-muted-foreground sm:hidden">Step {step + 1} of {STEPS.length} · {STEPS[step]}</p>
            </>
          )}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); if (step === STEPS.length - 1) onSubmit(); else go(step + 1); }} className="flex min-h-0 flex-1 flex-col" noValidate>
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-5">
            {done ? (
              <Success request={done} onClose={() => onOpenChange(false)} />
            ) : (
              <AnimatePresence mode="wait" custom={dir} initial={false}>
                <motion.div key={step} custom={dir} initial={{ opacity: 0, x: dir * 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -28 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
                  {step === 0 && (
                    <div className="grid gap-4">
                      <div className="overflow-hidden rounded-lg border bg-card">
                        <div className="relative aspect-[16/9]"><Image src={listing.photos[0]} alt={listing.headline} fill sizes="640px" className="object-cover" /></div>
                        <div className="p-4">
                          <p className="font-display text-[26px] font-medium tabular">{usd(listing.price)}</p>
                          <p className="text-[14.5px] font-semibold">{listing.address}</p>
                          <p className="text-[13.5px] text-muted-foreground">{listing.city}, MI {listing.zip} · {listing.id}</p>
                          <div className="mt-3 flex flex-wrap gap-4 text-[13.5px] font-semibold">
                            <span className="inline-flex items-center gap-1.5"><BedDouble className="size-4 text-gold" />{listing.beds} beds</span>
                            <span className="inline-flex items-center gap-1.5"><Bath className="size-4 text-gold" />{listing.baths} baths</span>
                            <span className="inline-flex items-center gap-1.5"><Ruler className="size-4 text-gold" />{num(listing.sqft)} sq ft</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2.5 rounded-md bg-muted px-3.5 py-3 text-[13px] text-muted-foreground"><Info className="mt-0.5 size-4 shrink-0 text-gold" />Sending a request doesn&apos;t book an appointment. Mike reviews it and confirms a time with you.</div>
                      {!sample && <Button type="button" variant="outline" onClick={() => reset({ ...sampleValues(), document: SAMPLE_DOC })}><Sparkles className="text-gold" /> Fill with sample details</Button>}
                    </div>
                  )}

                  {step === 1 && (
                    <div className="grid gap-5" data-tour="wizard-datetime">
                      <div className="grid gap-5 md:grid-cols-[auto_1fr]">
                        <div>
                          <Label className="mb-2 block text-[13px] font-semibold">Preferred date</Label>
                          <Controller control={control} name="date" render={({ field }) => (
                            <Calendar mode="single" selected={field.value ? ymdToLocalDate(field.value) : undefined} onSelect={(d) => { field.onChange(d ? localDateToYmd(d) : ""); setValue("time", ""); }}
                              disabled={[{ before: ymdToLocalDate(today) }, { after: ymdToLocalDate(addDaysYmd(today, 60)) }]} startMonth={ymdToLocalDate(today)} endMonth={ymdToLocalDate(addDaysYmd(today, 60))}
                              className="rounded-lg border bg-card p-2 [--cell-size:2.6rem]" />
                          )} />
                          <FieldError msg={errors.date?.message} />
                        </div>
                        <div className="min-w-0">
                          <Label className="mb-2 block text-[13px] font-semibold">Preferred time {v.date && <span className="font-normal text-muted-foreground">· {ymdLabel(v.date, { weekday: "long", month: "long", day: "numeric" })}</span>}</Label>
                          <Controller control={control} name="time" render={({ field }) => <SlotPicker date={v.date ?? ""} value={field.value} onChange={field.onChange} label="Preferred time" idPrefix="t1" />} />
                          <FieldError msg={errors.time?.message} />
                        </div>
                      </div>
                      <details className="group rounded-lg border bg-card p-4" open={!!(v.altDate || v.altTime)}>
                        <summary className="flex cursor-pointer list-none items-center justify-between text-[14px] font-semibold">Add a backup time (optional)<span className="text-[12px] font-normal text-muted-foreground group-open:hidden">Recommended</span></summary>
                        <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr]">
                          <div className="grid gap-1.5">
                            <Label htmlFor="altDate" className="text-[12.5px] text-muted-foreground">Backup date</Label>
                            <Input id="altDate" type="date" min={today} max={addDaysYmd(today, 60)} {...register("altDate", { onChange: () => setValue("altTime", "") })} />
                            {v.altDate && <button type="button" className="justify-self-start text-[12px] font-semibold text-muted-foreground underline" onClick={() => { setValue("altDate", ""); setValue("altTime", ""); }}>Remove backup</button>}
                          </div>
                          <Controller control={control} name="altTime" render={({ field }) => <SlotPicker date={v.altDate ?? ""} value={field.value ?? ""} onChange={field.onChange} label="Backup time" idPrefix="t2" />} />
                        </div>
                        <FieldError msg={errors.altTime?.message} />
                      </details>
                      <p className="flex items-start gap-2 text-[12.5px] text-muted-foreground"><CalendarClock className="mt-0.5 size-4 shrink-0 text-gold" />Times are shown in Detroit time ({formatTz(v.date && v.time ? detroitToUtc(v.date, v.time) : new Date())}). These are sample time slots, not Mike&apos;s real availability, and a request is not a confirmed appointment.</p>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="grid gap-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-1.5"><Label htmlFor="firstName">First name</Label><Input id="firstName" autoComplete="given-name" aria-invalid={!!errors.firstName} {...register("firstName")} /><FieldError msg={errors.firstName?.message} /></div>
                        <div className="grid gap-1.5"><Label htmlFor="lastName">Last name</Label><Input id="lastName" autoComplete="family-name" aria-invalid={!!errors.lastName} {...register("lastName")} /><FieldError msg={errors.lastName?.message} /></div>
                        <div className="grid gap-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" inputMode="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} /><FieldError msg={errors.email?.message} /></div>
                        <div className="grid gap-1.5"><Label htmlFor="phone">Phone</Label><Input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(313) 555-0100" aria-invalid={!!errors.phone} {...register("phone", { onBlur: (e) => setValue("phone", formatPhone(e.target.value)) })} /><FieldError msg={errors.phone?.message} /></div>
                      </div>
                      <fieldset className="grid gap-2">
                        <legend className="mb-2 text-[13px] font-semibold">Where are you in your search?</legend>
                        <Controller control={control} name="buyerStatus" render={({ field }) => (
                          <div className="grid grid-cols-2 gap-2" role="radiogroup">
                            {Object.entries(BUYER_STATUS).map(([k, label]) => (
                              <button key={k} type="button" role="radio" aria-checked={field.value === k} onClick={() => field.onChange(k)} className={cn("min-h-11 rounded-md border px-3 py-2 text-left text-[13.5px] font-semibold transition", field.value === k ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/50")}>{label}</button>
                            ))}
                          </div>
                        )} />
                        <FieldError msg={errors.buyerStatus?.message} />
                      </fieldset>
                      <fieldset className="grid gap-2">
                        <legend className="mb-2 text-[13px] font-semibold">Financing</legend>
                        <Controller control={control} name="financing" render={({ field }) => (
                          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
                            {Object.entries(FINANCING).map(([k, label]) => (
                              <button key={k} type="button" role="radio" aria-checked={field.value === k} onClick={() => field.onChange(k)} className={cn("min-h-11 rounded-md border px-3 py-2 text-left text-[13.5px] font-semibold transition", field.value === k ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/50")}>{label}</button>
                            ))}
                          </div>
                        )} />
                        <FieldError msg={errors.financing?.message} />
                      </fieldset>
                      <div className="grid gap-1.5"><Label htmlFor="notes">Notes for Mike (optional)</Label><Textarea id="notes" rows={3} placeholder="Anything you'd like to see or ask about" {...register("notes")} /><FieldError msg={errors.notes?.message} /></div>
                      <p className="text-[12px] text-muted-foreground">Please use made-up details. This demo keeps everything in your browser and never sends it anywhere.</p>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="grid gap-3">
                      <div>
                        <h3 className="font-sans text-[15px] font-semibold">Mortgage pre-approval letter</h3>
                        <p className="text-[13px] text-muted-foreground">Optional, but it shows sellers you&apos;re serious.</p>
                      </div>
                      <Controller control={control} name="document" render={({ field }) => (
                        <Uploader value={field.value} onChange={(m) => { field.onChange(m); if (m) setValue("docSkipped", false); }} skipped={!!v.docSkipped}
                          onSkip={() => { field.onChange(null); setValue("docSkipped", true); trigger("document"); go(4); }} error={errors.document?.message} sampleSignal={sampleDoc} />
                      )} />
                    </div>
                  )}

                  {step === 4 && <Review v={v} onEdit={(i) => go(i)} listingId={listingId} />}
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {!done && (
            <div className="flex items-center justify-between gap-2 border-t bg-background px-5 py-3.5">
              <Button type="button" variant="ghost" onClick={() => (step === 0 ? onOpenChange(false) : go(step - 1))}>{step === 0 ? "Cancel" : <><ArrowLeft /> Back</>}</Button>
              {step < STEPS.length - 1 ? (
                <Button type="submit" size="lg" className="min-w-36">Continue <ArrowRight /></Button>
              ) : (
                <Button type="submit" size="lg" variant="gold" className="min-w-52" disabled={submitting} data-tour="wizard-submit">{submitting ? "Submitting…" : "Submit Showing Request"}</Button>
              )}
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Review({ v, onEdit, listingId }: { v: ShowingForm; onEdit: (i: number) => void; listingId: string }) {
  const l = getListing(listingId)!;
  const Row = ({ k, val }: { k: string; val: React.ReactNode }) => <div className="flex justify-between gap-4 py-1.5 text-[14px]"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-semibold">{val}</dd></div>;
  const Card = ({ title, step, children }: { title: string; step: number; children: React.ReactNode }) => (
    <section className="rounded-lg border bg-card p-4">
      <div className="mb-1 flex items-center justify-between"><h3 className="font-sans text-[12px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{title}</h3><button type="button" onClick={() => onEdit(step)} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-gold hover:underline"><Pencil className="size-3" /> Edit</button></div>
      <dl>{children}</dl>
    </section>
  );
  return (
    <div className="grid gap-3" data-testid="review">
      <Card title="Property" step={0}><Row k="Address" val={`${l.address}, ${l.city}`} /><Row k="Price" val={usd(l.price)} /></Card>
      <Card title="Date & time" step={1}>
        <Row k="Preferred" val={v.date && v.time ? `${ymdLabel(v.date, { weekday: "short", month: "short", day: "numeric" })} at ${hmLabel(v.time)}` : "Not set"} />
        <Row k="Backup" val={v.altDate && v.altTime ? `${ymdLabel(v.altDate)} at ${hmLabel(v.altTime)}` : "None"} />
      </Card>
      <Card title="Buyer" step={2}>
        <Row k="Name" val={`${v.firstName} ${v.lastName}`} /><Row k="Email" val={v.email} /><Row k="Phone" val={v.phone} />
        <Row k="Status" val={v.buyerStatus ? BUYER_STATUS[v.buyerStatus] : "Not set"} /><Row k="Financing" val={v.financing ? FINANCING[v.financing] : "Not set"} />
        {v.notes && <Row k="Notes" val={<span className="font-normal">{v.notes}</span>} />}
      </Card>
      <Card title="Pre-approval" step={3}><Row k="Document" val={v.document ? `${v.document.name} (${bytes(v.document.size)})` : "Skipped"} /></Card>
      <p className="flex gap-2 rounded-md bg-muted px-3.5 py-3 text-[12.5px] text-muted-foreground"><Info className="mt-0.5 size-4 shrink-0 text-gold" />This is a demo. Submitting saves the request in this browser and runs a simulated workflow. No email, CRM record or calendar event is created anywhere.</p>
    </div>
  );
}

function Success({ request, onClose }: { request: ShowingRequest; onClose: () => void }) {
  return (
    <div className="py-4 text-center" data-testid="success">
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }} className="mx-auto grid size-16 place-items-center rounded-full bg-emerald text-white">
        <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.2, duration: 0.5 }} /></svg>
      </motion.div>
      <h3 className="mt-5 text-[26px] font-medium">Your request is in</h3>
      <p className="mx-auto mt-2 max-w-sm text-[14.5px] text-muted-foreground">In the live version Mike would get it right away and reach out to confirm a time.</p>
      <div className="mx-auto mt-5 inline-flex flex-col items-center rounded-lg border bg-card px-6 py-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Demo reference</span>
        <span className="font-mono text-[20px] font-semibold tracking-wider" data-testid="ref">{request.ref}</span>
      </div>
      <p className="mt-3"><span className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-[12px] font-semibold text-[#6b5126]"><Sparkles className="size-3.5" /> Simulated request. Nothing was sent to a real service.</span></p>
      <div className="mt-6 grid gap-2 sm:flex sm:justify-center">
        <Button asChild size="lg" onClick={onClose}><Link href={`/requests/${request.ref}`}><Workflow /> View the automation</Link></Button>
        <Button asChild size="lg" variant="outline" onClick={onClose}><Link href="/homes">Browse more homes</Link></Button>
      </div>
    </div>
  );
}
export { SAMPLE_DOC };

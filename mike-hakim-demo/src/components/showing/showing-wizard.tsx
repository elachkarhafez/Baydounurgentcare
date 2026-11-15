"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, CalendarClock, Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Uploader, SAMPLE_DOC } from "@/components/showing/uploader";
import { showingSchema, formatPhone, type ShowingForm } from "@/lib/schemas";
import { slotsFor } from "@/lib/slots";
import { addDaysYmd, detroitToUtc, detroitYmd, hmLabel, makeSlot, ymdLabel } from "@/lib/time";
import { FINANCING } from "@/lib/labels";
import { usd } from "@/lib/format";
import { submitShowingRequest } from "@/lib/store";
import { getListing } from "@/data/listings";
import { onTour, emitSubmitted } from "@/components/tour/tour-bus";
import { useTour } from "@/components/tour/tour-provider";
import type { ShowingRequest } from "@/lib/types";
import { cn } from "cn";

const FIELDS: (keyof ShowingForm)[][] = [["date", "time", "altDate", "altTime"], ["firstName", "lastName", "email", "phone", "financing", "notes", "document"]];

function openDays(count = 14) {
  const today = detroitYmd();
  return Array.from({ length: count }, (_, i) => addDaysYmd(today, i)).filter((d) => slotsFor(d).some((s) => !s.taken && !s.past));
}
function firstFree(ymd: string, prefer: string[]) {
  const sl = slotsFor(ymd);
  for (const p of prefer) if (sl.find((s) => s.time === p && !s.taken && !s.past)) return p;
  return sl.find((s) => !s.taken && !s.past)?.time ?? "";
}
/** "tomorrow at 9:00 AM" style label for the earliest sample slot. */
export function earliestLabel() {
  const d = openDays(7)[0];
  if (!d) return "";
  const t = firstFree(d, []);
  const today = detroitYmd();
  const day = d === today ? "today" : d === addDaysYmd(today, 1) ? "tomorrow" : ymdLabel(d, { weekday: "short" });
  return `${day} ${hmLabel(t).replace(":00", "").replace(" ", "").toLowerCase()}`;
}

export function sampleValues(): ShowingForm {
  const days = openDays();
  const d1 = days.find((d) => d !== detroitYmd()) ?? days[0];
  const d2 = days[days.indexOf(d1) + 1] ?? d1;
  return {
    date: d1, time: firstFree(d1, ["17:30", "16:00", "12:00"]), altDate: d2, altTime: firstFree(d2, ["11:00", "13:30", "10:00"]),
    firstName: "Alex", lastName: "Morgan", email: "alex.morgan.sample@example.com", phone: "(313) 555-0142",
    buyerStatus: "ready", financing: "pre_approved", notes: "Sample request from the demo. Interested in the garage and the basement.",
    document: null,
  };
}
const EMPTY: ShowingForm = { date: "", time: "", altDate: "", altTime: "", firstName: "", lastName: "", email: "", phone: "", financing: undefined as never, notes: "", document: null };

function FieldError({ msg }: { msg?: string }) {
  return <AnimatePresence>{msg && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[12.5px] font-medium text-destructive" role="alert">{msg}</motion.p>}</AnimatePresence>;
}

function DayStrip({ value, onChange, idPrefix }: { value: string; onChange: (d: string) => void; idPrefix: string }) {
  const days = useMemo(() => openDays(), []);
  return (
    <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar" role="radiogroup" aria-label="Day">
      {days.map((d) => {
        const on = d === value;
        return (
          <button key={d} type="button" role="radio" aria-checked={on} id={`${idPrefix}-day-${d}`} data-day={d} onClick={() => onChange(d)}
            className={cn("flex w-[68px] shrink-0 flex-col items-center rounded-xl border py-2.5 transition", on ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-foreground/40")}>
            <span className={cn("text-[11.5px] font-bold uppercase", on ? "text-primary-foreground/80" : "text-muted-foreground")}>{ymdLabel(d, { weekday: "short" })}</span>
            <span className="text-[22px] font-extrabold leading-tight tabular">{+d.slice(8)}</span>
            <span className={cn("text-[11.5px] font-semibold", on ? "text-primary-foreground/80" : "text-muted-foreground")}>{ymdLabel(d, { month: "short" })}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SlotPicker({ date, value, onChange, label, idPrefix }: { date: string; value: string; onChange: (t: string) => void; label: string; idPrefix: string }) {
  const slots = useMemo(() => (date ? slotsFor(date).filter((s) => !s.past) : []), [date]);
  if (!date) return <p className="rounded-xl border border-dashed px-3 py-6 text-center text-[13px] text-muted-foreground">Pick a day to see times.</p>;
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label={label}>
      {slots.map((s) => {
        const on = value === s.time;
        return (
          <button key={s.time} id={`${idPrefix}-${s.time}`} type="button" role="radio" aria-checked={on} disabled={s.taken} onClick={() => onChange(on ? "" : s.time)}
            className={cn("h-11 rounded-xl border text-[14px] font-semibold transition tabular", on ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-foreground/40", s.taken && "cursor-not-allowed bg-muted text-muted-foreground/50 line-through hover:border-border")}
            title={s.taken ? "Not available" : undefined}>
            {hmLabel(s.time)}
          </button>
        );
      })}
    </div>
  );
}

export function ShowingWizard({ listingId, open, onOpenChange, initialStep = 0, sample = false }: { listingId: string; open: boolean; onOpenChange: (o: boolean) => void; initialStep?: number; sample?: boolean }) {
  const listing = getListing(listingId)!;
  const tour = useTour();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState<ShowingRequest | null>(null);
  const [sampleDoc, setSampleDoc] = useState(0);
  const [backup, setBackup] = useState(false);
  const [msg, setMsg] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<ShowingForm>({ resolver: zodResolver(showingSchema), defaultValues: sample ? sampleValues() : EMPTY, mode: "onTouched" });
  const { register, control, handleSubmit, trigger, watch, setValue, getValues, setError, reset, formState: { errors } } = form;
  const v = watch();

  useEffect(() => {
    if (open) { const vals = sample ? sampleValues() : EMPTY; setStep(Math.min(initialStep, 1)); setDone(null); reset(vals); setBackup(!!vals.altDate); setMsg(!!vals.notes); }
  }, [open, initialStep, sample, reset]);

  const next = useCallback(async () => {
    const ok = await trigger(FIELDS[0] as never);
    const { date, time, altDate, altTime } = getValues();
    // whole-form refinements don't run until every field is valid, so check step 1 here
    if (date && time && detroitToUtc(date, time).getTime() < Date.now()) { setError("time", { message: "That time has already passed" }); return; }
    if (!!altDate !== !!altTime) { setError("altTime", { message: "Pick a day and a time for the backup, or remove it" }); return; }
    if (altDate && altDate === date && altTime === time) { setError("altTime", { message: "The backup time should be different from your first choice" }); return; }
    if (ok) setStep(1);
  }, [trigger, getValues, setError]);

  const onSubmit = handleSubmit(async (data) => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    const sh = submitShowingRequest({
      listingId,
      preferred: makeSlot(data.date, data.time),
      alternate: data.altDate && data.altTime ? makeSlot(data.altDate, data.altTime) : undefined,
      firstName: data.firstName.trim(), lastName: data.lastName.trim(), email: data.email.trim(), phone: formatPhone(data.phone),
      buyerStatus: data.buyerStatus ?? "searching", financing: data.financing, notes: data.notes ?? "", document: data.document,
    });
    setSubmitting(false);
    setDone(sh);
    emitSubmitted({ ref: sh.ref, showingId: sh.id, leadId: sh.leadId });
  }, () => { const first = (Object.keys(errors) as (keyof ShowingForm)[])[0]; if (first && FIELDS[0].includes(first)) setStep(0); });

  useEffect(() => onTour((a) => {
    if (a.type === "open-wizard") return false;
    if (!open) return false; // wait until the form is actually open
    const ensureDoc = () => { if (!getValues("document")) setValue("document", SAMPLE_DOC); };
    if (a.type === "wizard-step") setStep(Math.min(a.step, 1));
    if (a.type === "wizard-sample-doc") setSampleDoc((n) => n + 1);
    if (a.type === "wizard-submit") { ensureDoc(); onSubmit(); }
    if (a.type === "close-wizard") onOpenChange(false);
    return true;
  }), [open, setValue, getValues, onSubmit, onOpenChange]);

  const when = v.date && v.time ? `${ymdLabel(v.date, { weekday: "long", month: "short", day: "numeric" })} at ${hmLabel(v.time)}` : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={!tour.active}>
      <DialogContent showCloseButton={false} onInteractOutside={(e) => tour.active && e.preventDefault()} className="flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-center gap-3 border-b px-5 py-3.5">
          {step === 1 && !done ? <Button variant="ghost" size="icon-sm" onClick={() => setStep(0)} aria-label="Back"><ArrowLeft /></Button> : <span className="size-9" />}
          <div className="min-w-0 flex-1 text-center">
            <DialogTitle className="text-[16px] font-extrabold">{done ? "Tour requested" : "Request a tour"}</DialogTitle>
            <DialogDescription className="truncate text-[12.5px]">{listing.address}, {listing.city}</DialogDescription>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => onOpenChange(false)} aria-label="Close"><X /></Button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); if (step === 0) next(); else onSubmit(); }} className="flex min-h-0 flex-1 flex-col" noValidate>
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-5">
            {done ? <Success request={done} onClose={() => onOpenChange(false)} /> : (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={step} initial={{ opacity: 0, x: step ? 24 : -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: step ? -24 : 24 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
                  {step === 0 ? (
                    <div className="grid gap-5" data-tour="wizard-datetime">
                      <div className="flex items-center gap-3">
                        <Image src={listing.photos[0]} alt="" width={96} height={64} className="h-14 w-20 rounded-lg object-cover" />
                        <div className="min-w-0"><p className="text-[17px] font-extrabold tabular">{usd(listing.price)}</p><p className="truncate text-[13px] text-muted-foreground">{listing.beds} bds · {listing.baths} ba · {listing.address}</p></div>
                      </div>
                      <section className="grid gap-3">
                        <h3 className="text-[16px]">Choose a day</h3>
                        <Controller control={control} name="date" render={({ field }) => <DayStrip value={field.value} onChange={(d) => { field.onChange(d); setValue("time", ""); }} idPrefix="d1" />} />
                        <FieldError msg={errors.date?.message} />
                      </section>
                      <section className="grid gap-3">
                        <h3 className="text-[16px]">Choose a time</h3>
                        <Controller control={control} name="time" render={({ field }) => <SlotPicker date={v.date ?? ""} value={field.value} onChange={field.onChange} label="Tour time" idPrefix="t1" />} />
                        <FieldError msg={errors.time?.message} />
                      </section>
                      {!backup ? (
                        <button type="button" onClick={() => setBackup(true)} className="inline-flex items-center gap-1.5 justify-self-start text-[14px] font-semibold text-primary hover:underline"><Plus className="size-4" /> Add a backup time</button>
                      ) : (
                        <section className="grid gap-3 rounded-xl border bg-muted/40 p-4">
                          <div className="flex items-center justify-between"><h3 className="text-[15px]">Backup time</h3><button type="button" className="text-[13px] font-semibold text-muted-foreground hover:text-foreground" onClick={() => { setBackup(false); setValue("altDate", ""); setValue("altTime", ""); }}>Remove</button></div>
                          <Controller control={control} name="altDate" render={({ field }) => <DayStrip value={field.value ?? ""} onChange={(d) => { field.onChange(d); setValue("altTime", ""); }} idPrefix="d2" />} />
                          <Controller control={control} name="altTime" render={({ field }) => <SlotPicker date={v.altDate ?? ""} value={field.value ?? ""} onChange={field.onChange} label="Backup time" idPrefix="t2" />} />
                          <FieldError msg={errors.altTime?.message} />
                        </section>
                      )}
                      <p className="flex items-start gap-2 text-[12.5px] text-muted-foreground"><CalendarClock className="mt-0.5 size-4 shrink-0" />Times are in Detroit time. Mike will confirm your tour with you. Requesting doesn&apos;t book it yet.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-4 py-3">
                        <div><p className="text-[12px] font-semibold text-muted-foreground">Your tour</p><p className="text-[14.5px] font-bold">{when}</p></div>
                        <button type="button" onClick={() => setStep(0)} className="text-[13px] font-semibold text-primary hover:underline">Change</button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1.5"><Label htmlFor="firstName">First name</Label><Input id="firstName" autoComplete="given-name" aria-invalid={!!errors.firstName} {...register("firstName")} /><FieldError msg={errors.firstName?.message} /></div>
                        <div className="grid gap-1.5"><Label htmlFor="lastName">Last name</Label><Input id="lastName" autoComplete="family-name" aria-invalid={!!errors.lastName} {...register("lastName")} /><FieldError msg={errors.lastName?.message} /></div>
                      </div>
                      <div className="grid gap-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" inputMode="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} /><FieldError msg={errors.email?.message} /></div>
                      <div className="grid gap-1.5"><Label htmlFor="phone">Phone</Label><Input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(313) 555-0100" aria-invalid={!!errors.phone} {...register("phone", { onBlur: (e) => setValue("phone", formatPhone(e.target.value)) })} /><FieldError msg={errors.phone?.message} /></div>
                      <fieldset className="grid gap-2">
                        <legend className="mb-2 text-[14px] font-semibold">How are you paying?</legend>
                        <Controller control={control} name="financing" render={({ field }) => (
                          <div className="grid grid-cols-3 gap-2" role="radiogroup">
                            {Object.entries(FINANCING).map(([k, label]) => (
                              <button key={k} type="button" role="radio" aria-checked={field.value === k} onClick={() => field.onChange(k)} className={cn("min-h-11 rounded-xl border px-2 py-2 text-[13px] font-semibold leading-tight transition", field.value === k ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-foreground/40")}>{label}</button>
                            ))}
                          </div>
                        )} />
                        <FieldError msg={errors.financing?.message} />
                      </fieldset>
                      <div className="grid gap-2" data-tour="wizard-upload">
                        <Controller control={control} name="document" render={({ field }) => (
                          <Uploader value={field.value} onChange={field.onChange} error={errors.document?.message} sampleSignal={sampleDoc} />
                        )} />
                      </div>
                      {msg ? (
                        <div className="grid gap-1.5"><Label htmlFor="notes">Message (optional)</Label><Textarea id="notes" rows={3} placeholder="Anything Mike should know?" {...register("notes")} /><FieldError msg={errors.notes?.message} /></div>
                      ) : (
                        <button type="button" onClick={() => setMsg(true)} className="inline-flex items-center gap-1.5 justify-self-start text-[14px] font-semibold text-primary hover:underline"><Plus className="size-4" /> Add a message</button>
                      )}
                      <p className="text-[11.5px] text-muted-foreground">Demo: please use made-up details. Nothing is sent anywhere.</p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
          {!done && (
            <div className="border-t bg-background px-5 py-3.5">
              {step === 0
                ? <Button type="submit" size="lg" className="h-12 w-full rounded-full text-[15px]">Next</Button>
                : <Button type="submit" size="lg" className="h-12 w-full rounded-full text-[15px]" disabled={submitting} data-tour="wizard-submit">{submitting ? "Sending…" : "Request tour"}</Button>}
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Success({ request, onClose }: { request: ShowingRequest; onClose: () => void }) {
  const l = getListing(request.listingId)!;
  return (
    <div className="py-4 text-center" data-testid="success">
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }} className="mx-auto grid size-16 place-items-center rounded-full bg-emerald text-white">
        <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.2, duration: 0.5 }} /></svg>
      </motion.div>
      <h3 className="mt-5 text-[24px]">Tour requested</h3>
      <p className="mx-auto mt-2 max-w-xs text-[14.5px] text-muted-foreground">{ymdLabel(request.preferred.date, { weekday: "long", month: "long", day: "numeric" })} at {hmLabel(request.preferred.time)}, {l.address}. Mike will reach out to confirm.</p>
      <p className="mt-4 text-[12px] text-muted-foreground">Demo reference <span className="font-mono font-semibold text-foreground" data-testid="ref">{request.ref}</span> · simulated, nothing was sent</p>
      <div className="mt-6 grid gap-2">
        <Button asChild size="lg" className="h-12 rounded-full" onClick={onClose}><Link href={`/requests/${request.ref}`}>See what Mike receives</Link></Button>
        <Button asChild size="lg" variant="outline" className="h-12 rounded-full" onClick={onClose}><Link href="/homes">Keep browsing</Link></Button>
      </div>
    </div>
  );
}
export { SAMPLE_DOC };

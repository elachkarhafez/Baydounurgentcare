"use client";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { SlotPicker } from "@/components/showing/showing-wizard";
import { addDaysYmd, detroitYmd, localDateToYmd, makeSlot, ymdToLocalDate, detroitYmd as toYmd, detroitParts } from "@/lib/time";
import type { TimeSlot } from "@/lib/types";

export function RescheduleDialog({ open, onOpenChange, currentStart, onConfirm, title = "Reschedule (demo)" }: { open: boolean; onOpenChange: (o: boolean) => void; currentStart: string; onConfirm: (slot: TimeSlot) => void; title?: string }) {
  const today = detroitYmd();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  useEffect(() => {
    if (open) {
      const d = toYmd(currentStart);
      setDate(d < today ? today : d);
      const p = detroitParts(currentStart);
      setTime("");
      void p;
    }
  }, [open, currentStart, today]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-[22px] font-medium">{title}</DialogTitle>
          <DialogDescription>Pick a new date and a sample time slot (Detroit time). In this demo the change updates the request and the calendar. Nobody is notified.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-[auto_1fr]">
          <Calendar mode="single" selected={date ? ymdToLocalDate(date) : undefined} onSelect={(d) => { setDate(d ? localDateToYmd(d) : ""); setTime(""); }} disabled={[{ before: ymdToLocalDate(today) }, { after: ymdToLocalDate(addDaysYmd(today, 60)) }]} className="rounded-lg border bg-card p-2 [--cell-size:2.5rem]" />
          <SlotPicker date={date} value={time} onChange={setTime} label="New time" idPrefix="rs" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!date || !time} onClick={() => { onConfirm(makeSlot(date, time)); onOpenChange(false); }}>Save new time</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

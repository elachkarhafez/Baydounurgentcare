"use client";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { ChevronLeft, ChevronRight, Grid2X2, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "cn";

const LABELS = ["Front exterior", "Living area", "Kitchen", "Bedroom", "Bathroom", "Additional view"];

function Fullscreen({ photos, alt, start, open, onOpenChange }: { photos: string[]; alt: string; start: number; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [index, setI] = useState(start);
  const [dir, setDir] = useState(1);
  const n = photos.length;
  const go = useCallback((i: number, d: number) => { setDir(d); setI(((i % n) + n) % n); }, [n]);
  useEffect(() => { if (open) setI(start); }, [open, start]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "ArrowRight") go(index + 1, 1); if (e.key === "ArrowLeft") go(index - 1, -1); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, index, go]);
  const onDragEnd = (_: unknown, info: PanInfo) => { if (info.offset.x < -60) go(index + 1, 1); else if (info.offset.x > 60) go(index - 1, -1); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="h-[100dvh] max-h-none w-screen max-w-none rounded-none border-0 bg-black p-0 sm:max-w-none">
        <DialogTitle className="sr-only">Photos of {alt}</DialogTitle>
        <div className="relative h-full w-full">
          <AnimatePresence initial={false} custom={dir} mode="popLayout">
            <motion.div key={index} className="absolute inset-0 touch-pan-y" initial={{ opacity: 0, x: dir * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -40 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2} onDragEnd={onDragEnd}>
              <Image src={photos[index]} alt={`${alt}, ${LABELS[index] ?? `photo ${index + 1}`}`} fill sizes="100vw" className="pointer-events-none select-none object-contain" draggable={false} />
            </motion.div>
          </AnimatePresence>
          {[-1, 1].map((d) => (
            <button key={d} onClick={() => go(index + d, d)} aria-label={d > 0 ? "Next photo" : "Previous photo"} className={cn("absolute top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow", d > 0 ? "right-4" : "left-4")}>
              {d > 0 ? <ChevronRight className="size-5" /> : <ChevronLeft className="size-5" />}
            </button>
          ))}
          <div className="absolute left-4 top-4 z-10 rounded-full bg-white/15 px-3 py-1.5 text-[13px] font-semibold text-white tabular" aria-live="polite">{index + 1} / {n} · {LABELS[index]}</div>
          <button onClick={() => onOpenChange(false)} className="absolute right-4 top-4 z-10 grid size-10 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25" aria-label="Close gallery"><X className="size-5" /></button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Phone: full-width swipe carousel. Desktop: one large photo and a grid of four. */
export function Gallery({ photos, alt, overlay }: { photos: string[]; alt: string; overlay?: React.ReactNode }) {
  const [full, setFull] = useState<number | null>(null);
  const [slide, setSlide] = useState(0);
  return (
    <div data-tour="gallery">
      <div className="relative md:hidden">
        <div onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))} className="flex aspect-[4/3] snap-x snap-mandatory overflow-x-auto no-scrollbar">
          {photos.map((p, i) => (
            <button key={p + i} onClick={() => setFull(i)} className="relative h-full w-full shrink-0 snap-center" aria-label={`Open photo ${i + 1}`}>
              <Image src={p} alt={i === 0 ? alt : ""} fill sizes="100vw" className="object-cover" priority={i === 0} />
            </button>
          ))}
        </div>
        {overlay}
        <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[12px] font-bold text-white tabular">{slide + 1} / {photos.length}</span>
      </div>
      <div className="relative hidden h-[440px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl md:grid lg:h-[480px]">
        {photos.slice(0, 5).map((p, i) => (
          <button key={p + i} onClick={() => setFull(i)} className={cn("group relative overflow-hidden bg-muted", i === 0 && "col-span-2 row-span-2")} aria-label={`Open ${LABELS[i]}`}>
            <Image src={p} alt={i === 0 ? alt : ""} fill sizes={i === 0 ? "50vw" : "25vw"} className="object-cover transition duration-500 group-hover:scale-[1.03]" priority={i === 0} />
          </button>
        ))}
        <button onClick={() => setFull(0)} className="absolute bottom-4 right-4 inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[13.5px] font-bold text-ink shadow-lift"><Grid2X2 className="size-4" /> See all {photos.length} photos</button>
      </div>
      <Fullscreen photos={photos} alt={alt} start={full ?? 0} open={full !== null} onOpenChange={(o) => !o && setFull(null)} />
    </div>
  );
}

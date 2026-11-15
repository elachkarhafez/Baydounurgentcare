"use client";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "cn";

const LABELS = ["Front exterior", "Living area", "Kitchen", "Bedroom", "Bathroom", "Additional view"];

function Slides({ photos, index, setIndex, dir, alt, sizes, fit = "cover" }: { photos: string[]; index: number; setIndex: (i: number, d: number) => void; dir: number; alt: string; sizes: string; fit?: "cover" | "contain" }) {
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60) setIndex(index + 1, 1);
    else if (info.offset.x > 60) setIndex(index - 1, -1);
  };
  return (
    <AnimatePresence initial={false} custom={dir} mode="popLayout">
      <motion.div
        key={index}
        custom={dir}
        className="absolute inset-0 touch-pan-y"
        initial={{ opacity: 0, x: dir * 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: dir * -40 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={onDragEnd}
      >
        <Image src={photos[index]} alt={`${alt}, ${LABELS[index] ?? `photo ${index + 1}`}`} fill sizes={sizes} className={cn("pointer-events-none select-none", fit === "cover" ? "object-cover" : "object-contain")} priority={index === 0} draggable={false} />
      </motion.div>
    </AnimatePresence>
  );
}

export function Gallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [index, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [full, setFull] = useState(false);
  const n = photos.length;
  const setIndex = useCallback((i: number, d: number) => { setDir(d); setI(((i % n) + n) % n); }, [n]);
  useEffect(() => {
    if (!full) return;
    const k = (e: KeyboardEvent) => { if (e.key === "ArrowRight") setIndex(index + 1, 1); if (e.key === "ArrowLeft") setIndex(index - 1, -1); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [full, index, setIndex]);
  const Arrow = ({ d, className }: { d: 1 | -1; className?: string }) => (
    <button onClick={() => setIndex(index + d, d)} aria-label={d > 0 ? "Next photo" : "Previous photo"} className={cn("absolute top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-soft transition hover:scale-105", d > 0 ? "right-3" : "left-3", className)}>
      {d > 0 ? <ChevronRight className="size-5" /> : <ChevronLeft className="size-5" />}
    </button>
  );
  return (
    <div data-tour="gallery">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted md:aspect-[16/9]">
        <Slides photos={photos} index={index} setIndex={setIndex} dir={dir} alt={alt} sizes="(min-width: 1024px) 66vw, 100vw" />
        <Arrow d={-1} /><Arrow d={1} />
        <div className="absolute bottom-3 left-3 z-10 rounded bg-ink/75 px-2.5 py-1 text-[12px] font-semibold text-white tabular" aria-live="polite">{index + 1} / {n} · {LABELS[index]}</div>
        <button onClick={() => setFull(true)} className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded bg-white/95 px-3 py-1.5 text-[12.5px] font-semibold text-ink shadow-soft hover:bg-white"><Expand className="size-3.5" /> Fullscreen</button>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar" role="tablist" aria-label="Photo thumbnails">
        {photos.map((p, i) => (
          <button key={p + i} role="tab" aria-selected={i === index} aria-label={`Show ${LABELS[i] ?? `photo ${i + 1}`}`} onClick={() => setIndex(i, i > index ? 1 : -1)} className={cn("relative h-16 w-24 shrink-0 overflow-hidden rounded-md transition md:h-20 md:w-28", i === index ? "ring-2 ring-gold ring-offset-2 ring-offset-background" : "opacity-70 hover:opacity-100")}>
            <Image src={p} alt="" fill sizes="112px" className="object-cover" />
          </button>
        ))}
      </div>
      <Dialog open={full} onOpenChange={setFull}>
        <DialogContent showCloseButton={false} className="h-[100dvh] max-h-none w-screen max-w-none rounded-none border-0 bg-ink p-0 sm:max-w-none">
          <DialogTitle className="sr-only">Photo gallery for {alt}</DialogTitle>
          <div className="relative h-full w-full">
            <Slides photos={photos} index={index} setIndex={setIndex} dir={dir} alt={alt} sizes="100vw" fit="contain" />
            <Arrow d={-1} className="left-4" /><Arrow d={1} className="right-4" />
            <div className="absolute left-4 top-4 z-10 rounded bg-white/10 px-3 py-1.5 text-[13px] font-semibold text-white tabular">{index + 1} / {n} · {LABELS[index]}</div>
            <button onClick={() => setFull(false)} className="absolute right-4 top-4 z-10 grid size-10 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25" aria-label="Close gallery"><X className="size-5" /></button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

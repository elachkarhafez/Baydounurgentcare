import { cn } from "cn";

/** MH monogram under a roofline. Paths are stroke-drawn so the intro can animate them. */
export const MONO_PATHS = {
  roof: "M6 30 L32 8 L58 30",
  m: "M14 52 V32 L23 44 L32 32 V52",
  h: "M40 32 V52 M52 32 V52 M40 42 H52",
};

export function Monogram({ className, strokeWidth = 3.2 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 64 60" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={MONO_PATHS.roof} className="text-gold" stroke="var(--gold)" />
      <path d={MONO_PATHS.m} />
      <path d={MONO_PATHS.h} />
    </svg>
  );
}

export function Logo({ className, light = false, compact = false }: { className?: string; light?: boolean; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)} data-logo>
      <span className={cn("grid size-9 place-items-center rounded-md", light ? "bg-white/10 text-white" : "bg-primary text-primary-foreground")}>
        <Monogram className="size-6" />
      </span>
      <span className="leading-none">
        <span className={cn("block font-display text-[17px] font-semibold tracking-[-0.01em]", light ? "text-white" : "text-foreground")}>Mike Hakim</span>
        {!compact && <span className={cn("mt-1 block text-[9.5px] font-bold uppercase tracking-[0.24em]", light ? "text-white/60" : "text-muted-foreground")}>Real Estate</span>}
      </span>
    </span>
  );
}

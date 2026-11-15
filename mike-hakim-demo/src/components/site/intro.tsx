"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useAnimate } from "motion/react";
import { MONO_PATHS } from "@/components/site/logo";

/**
 * Logo opening, about 2.3s, once per visit. The MH monogram draws itself, the
 * windows under the roof light up, the wordmark rises letter by letter, a light
 * sweep crosses it, then the two halves open like front doors.
 * A tiny inline script in <head> adds `html.intro` only when it should play
 * (first visit this session, motion allowed), so nothing flashes otherwise.
 */
export const INTRO_HEAD_SCRIPT = `try{var d=document.documentElement,q=location.search;if(!/[?&]nointro/.test(q)&&location.pathname.indexOf('/dashboard')!==0&&!sessionStorage.getItem('mh-intro')&&!matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('intro')}else{sessionStorage.setItem('mh-intro','1')}}catch(e){}`;

const WORD = "MIKE HAKIM".split("");

export function Intro() {
  const [scope, animate] = useAnimate();
  const [gone, setGone] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    const html = document.documentElement;
    if (!html.classList.contains("intro")) {
      setGone(true);
      return;
    }
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    const finish = () => {
      if (done.current) return;
      done.current = true;
      try { sessionStorage.setItem("mh-intro", "1"); } catch {}
      html.classList.remove("intro");
      html.style.overflow = prevOverflow;
      setGone(true);
    };
    const skip = () => finish();
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    const run = async () => {
      const draw = { pathLength: [0, 1], opacity: [0, 1] };
      animate(".i-roof", draw, { duration: 0.7, ease: [0.65, 0, 0.35, 1] });
      animate(".i-m", draw, { duration: 0.7, delay: 0.25, ease: [0.65, 0, 0.35, 1] });
      animate(".i-h", draw, { duration: 0.6, delay: 0.42, ease: [0.65, 0, 0.35, 1] });
      animate(".i-mark", { strokeWidth: [2, 3.4] }, { duration: 0.4, delay: 0.95 });
      animate(".i-win", { scale: [0, 1], opacity: [0, 1] }, { duration: 0.35, delay: (i: number) => 0.85 + i * 0.07, ease: "backOut" } as never);
      animate(".i-l", { y: ["110%", "0%"], opacity: [0, 1] }, { duration: 0.55, delay: (i: number) => 0.7 + i * 0.045, ease: [0.16, 1, 0.3, 1] } as never);
      animate(".i-sub", { opacity: [0, 1], letterSpacing: ["0.6em", "0.38em"] }, { duration: 0.6, delay: 1.15 });
      animate(".i-shine", { x: ["-120%", "320%"] }, { duration: 0.75, delay: 1.25, ease: "easeInOut" });
      await animate(".i-glow", { opacity: [0, 0.9, 0.5], scale: [0.6, 1.1, 1] }, { duration: 1.2, delay: 0.6 });
      animate(".i-center", { scale: 0.92, opacity: 0 }, { duration: 0.45, ease: [0.7, 0, 0.84, 0] });
      animate(".i-left", { x: "-101%" }, { duration: 0.75, delay: 0.15, ease: [0.76, 0, 0.24, 1] });
      await animate(".i-right", { x: "101%" }, { duration: 0.75, delay: 0.15, ease: [0.76, 0, 0.24, 1] });
      finish();
    };
    run();
    const safety = setTimeout(finish, 4000);
    return () => {
      clearTimeout(safety);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, [animate]);

  if (gone) return null;
  return (
    <div ref={scope} className="intro-overlay fixed inset-0 z-[200] hidden" aria-hidden="true">
      <div className="i-left absolute inset-y-0 left-0 w-[50.5%] bg-ink" />
      <div className="i-right absolute inset-y-0 right-0 w-[50.5%] border-l border-gold/20 bg-ink" />
      <div className="i-center absolute inset-0 grid place-items-center">
        <div className="relative flex flex-col items-center">
          <div className="i-glow absolute -top-6 size-48 rounded-full bg-[radial-gradient(closest-side,rgba(217,195,154,.35),transparent)] opacity-0" />
          <svg viewBox="0 0 64 60" className="relative size-28 overflow-visible text-[#fbf8f2] md:size-32" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <motion.path className="i-roof i-mark" d={MONO_PATHS.roof} stroke="var(--gold)" strokeWidth={2} initial={{ pathLength: 0, opacity: 0 }} />
            <motion.path className="i-m i-mark" d={MONO_PATHS.m} stroke="currentColor" strokeWidth={2} initial={{ pathLength: 0, opacity: 0 }} />
            <motion.path className="i-h i-mark" d={MONO_PATHS.h} stroke="currentColor" strokeWidth={2} initial={{ pathLength: 0, opacity: 0 }} />
            {[[27, 20], [33, 20], [27, 26], [33, 26]].map(([x, y], i) => (
              <rect key={i} className="i-win" x={x - 2} y={y - 2} width={4} height={4} rx={0.6} fill="var(--gold-soft)" style={{ transformBox: "fill-box", transformOrigin: "center", opacity: 0 }} />
            ))}
          </svg>
          <div className="relative mt-7 overflow-hidden px-2">
            <div className="flex font-display text-[30px] font-medium tracking-[0.08em] text-[#fbf8f2] md:text-[38px]">
              {WORD.map((ch, i) => (
                <span key={i} className="inline-block overflow-hidden"><span className="i-l inline-block" style={{ opacity: 0 }}>{ch === " " ? " " : ch}</span></span>
              ))}
            </div>
            <span className="i-shine pointer-events-none absolute inset-y-0 left-0 w-1/3" style={{ transform: "translateX(-120%) skewX(-14deg)", background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,246,224,.55) 50%, rgba(255,255,255,0) 100%)", mixBlendMode: "overlay" }} />
          </div>
          <span className="i-sub mt-3 text-[11px] font-bold uppercase tracking-[0.38em] text-gold-soft" style={{ opacity: 0 }}>Real Estate</span>
        </div>
      </div>
      <span className="absolute bottom-6 left-0 right-0 text-center text-[11px] uppercase tracking-[0.3em] text-white/30">Tap to skip</span>
    </div>
  );
}

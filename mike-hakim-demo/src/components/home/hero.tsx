"use client";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroSearch } from "@/components/home/hero-search";
import { useTour } from "@/components/tour/tour-provider";
import { TOUR_LISTING_ID } from "@/data/listings";

const ease = [0.16, 1, 0.3, 1] as const;
export function Hero() {
  const reduce = useReducedMotion();
  const { start } = useTour();
  const rise = (d: number) => (reduce ? {} : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.9, delay: d, ease } });
  return (
    <section className="relative isolate overflow-hidden bg-ink">
      <motion.div className="absolute inset-0 -z-10" initial={reduce ? false : { scale: 1.08 }} animate={{ scale: 1 }} transition={{ duration: 2.4, ease }}>
        <Image src="/photos/ext-13.webp" alt="" fill priority sizes="100vw" className="object-cover object-[50%_60%]" />
      </motion.div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/70 via-ink/45 to-ink/80" />
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-14 md:px-6 md:pb-20 md:pt-28">
        <motion.p {...rise(0.1)} className="eyebrow !text-gold-soft">Dearborn · Detroit · Southeast Michigan</motion.p>
        <motion.h1 {...rise(0.2)} className="mt-4 max-w-3xl text-[38px] font-medium leading-[1.02] text-white md:text-[68px]">
          Find Your Place.<br /><em className="font-normal italic text-gold-soft">Make It Home.</em>
        </motion.h1>
        <motion.p {...rise(0.32)} className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-white/80 md:text-[17px]">
          Search homes across Southeast Michigan, save the ones you love and request a private showing with Mike Hakim in a couple of minutes.
        </motion.p>
        <motion.div {...rise(0.45)} className="mt-7 md:mt-10"><HeroSearch /></motion.div>
        <motion.div {...rise(0.55)} className="mt-5 flex flex-wrap gap-2.5">
          <Button variant="gold" onClick={() => start()}><Sparkles /> Take the Demo Tour</Button>
          <Button asChild variant="outline" className="border-white/30 bg-white/5 text-white hover:bg-white/15 hover:text-white">
            <Link href={`/homes/${TOUR_LISTING_ID}?request=sample`}>Try a Sample Showing Request <ArrowRight /></Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CalendarCheck, Compass, MapPinned, Route, Search, Home as HomeIcon, MessageCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/site/reveal";
import { PropertyCard } from "@/components/listings/property-card";
import { FEATURED } from "@/data/listings";

export function Featured() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Featured properties</p>
          <h2 className="mt-3 text-[28px] font-medium leading-tight md:text-[42px]">Homes worth a closer look</h2>
          <p className="mt-2 text-[14px] text-muted-foreground">Sample MLS Listings — Demo Data</p>
        </div>
        <Button asChild variant="outline"><Link href="/homes">View all homes <ArrowRight /></Link></Button>
      </Reveal>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 md:mt-12">
        {FEATURED.map((l, i) => (
          <Reveal key={l.id} delay={(i % 3) * 0.08}><PropertyCard l={l} priority={i < 3} /></Reveal>
        ))}
      </div>
    </section>
  );
}

const WHY = [
  { icon: Compass, t: "Searches built around you", d: "Tell Mike what matters, like schools, commute or a big garage, and he'll narrow the list before you spend a weekend driving around." },
  { icon: CalendarCheck, t: "Showings without the back-and-forth", d: "Pick two times that work and attach your pre-approval. Mike confirms by text or call." },
  { icon: MapPinned, t: "Local market knowledge", d: "Dearborn, Dearborn Heights and the surrounding suburbs, block by block. Pricing advice based on what's actually selling." },
  { icon: Route, t: "A smoother path to closing", d: "Offer, inspection, appraisal and closing day, with one person keeping it all on track and keeping you posted." },
];
export function Why() {
  return (
    <section id="why" className="scroll-mt-24 bg-card py-16 md:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 md:grid-cols-[0.9fr_1.1fr] md:gap-16 md:px-6">
        <Reveal>
          <p className="eyebrow">Why work with Mike</p>
          <h2 className="mt-3 text-[28px] font-medium leading-tight md:text-[42px]">Buying a home should feel organized, not overwhelming.</h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">Mike Hakim helps families buy and sell across Dearborn and Southeast Michigan. This site is built so you can do the searching on your own time and reach him the moment something clicks.</p>
          <div className="relative mt-8 hidden aspect-[4/3] overflow-hidden rounded-lg md:block">
            <Image src="/photos/liv-07.webp" alt="Bright living room in a sample listing" fill sizes="40vw" className="object-cover" />
          </div>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2">
          {WHY.map((w, i) => (
            <Reveal key={w.t} delay={i * 0.07} className="rounded-lg border bg-background p-6 transition-colors hover:border-gold/50">
              <w.icon className="size-6 text-gold" strokeWidth={1.6} />
              <h3 className="mt-4 text-[19px] font-medium leading-snug">{w.t}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{w.d}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const HOW = [
  { icon: Search, t: "Search for your home", d: "Filter by city, price, bedrooms and more." },
  { icon: Eye, t: "Explore the details", d: "Photos, specs, a map and a payment estimate." },
  { icon: CalendarCheck, t: "Request a private showing", d: "Choose your times and attach your pre-approval." },
  { icon: MessageCircle, t: "Connect with Mike", d: "He confirms the showing and walks you through it." },
];
export function How() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
      <Reveal className="max-w-2xl">
        <p className="eyebrow">How it works</p>
        <h2 className="mt-3 text-[28px] font-medium leading-tight md:text-[42px]">From search to showing in four steps</h2>
      </Reveal>
      <ol className="mt-10 grid gap-px overflow-hidden rounded-lg bg-border hairline sm:grid-cols-2 lg:grid-cols-4">
        {HOW.map((h, i) => (
          <Reveal as="li" key={h.t} delay={i * 0.08} className="relative bg-card p-6 md:p-7">
            <span className="font-display text-[44px] font-light leading-none text-gold/70 tabular">0{i + 1}</span>
            <h.icon className="absolute right-6 top-7 size-5 text-muted-foreground" strokeWidth={1.6} />
            <h3 className="mt-5 text-[18px] font-medium">{h.t}</h3>
            <p className="mt-1.5 text-[14px] text-muted-foreground">{h.d}</p>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

export function Cta() {
  return (
    <section className="px-4 pb-16 md:px-6 md:pb-24">
      <Reveal className="relative mx-auto max-w-7xl overflow-hidden rounded-lg bg-primary px-6 py-14 text-center md:py-20">
        <Image src="/photos/ext-08.webp" alt="" fill sizes="100vw" className="object-cover opacity-20" />
        <div className="relative">
          <HomeIcon className="mx-auto size-7 text-gold-soft" strokeWidth={1.5} />
          <h2 className="mx-auto mt-4 max-w-2xl text-[28px] font-medium leading-tight text-white md:text-[44px]">Ready to see a few homes in person?</h2>
          <p className="mx-auto mt-3 max-w-lg text-[15px] text-white/75">Browse the listings, pick a favorite and send a showing request. Mike will take it from there.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" variant="gold"><Link href="/homes">Explore Homes</Link></Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"><Link href="#contact">Contact Mike</Link></Button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

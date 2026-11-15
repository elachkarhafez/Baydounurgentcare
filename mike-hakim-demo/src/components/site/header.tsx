"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, LayoutDashboard, Phone, Search } from "lucide-react";
import { Logo } from "@/components/site/logo";
import { useDemoState } from "@/lib/use-demo";
import { BRAND } from "@/config/demo";
import { cn } from "cn";

export function Header() {
  const path = usePathname();
  const s = useDemoState();
  const fav = s?.favorites.length ?? 0;
  const link = "inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-[14px] font-semibold text-foreground/80 transition hover:bg-muted hover:text-foreground";
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-4 px-4 md:h-16 md:px-6">
        <Link href="/" aria-label="Mike Hakim Real Estate home"><Logo /></Link>
        <nav className="flex items-center gap-1" aria-label="Main">
          <Link href="/homes" className={cn(link, "hidden md:inline-flex", (path === "/" || path === "/homes") && "text-foreground")}><Search className="size-4" /> Buy</Link>
          <Link href="/homes?saved=1" className={cn(link, "hidden md:inline-flex")}><Heart className="size-4" /> Saved{fav > 0 && <span className="rounded-full bg-muted px-1.5 text-[12px] tabular">{fav}</span>}</Link>
          <a href={BRAND.phoneHref} className={cn(link, "hidden md:inline-flex")}><Phone className="size-4" /> Contact Mike</a>
          <Link href="/dashboard" className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-3.5 text-[13px] font-bold text-primary-foreground hover:bg-primary/90"><LayoutDashboard className="size-4" /> <span className="hidden sm:inline">Mike&apos;s Dashboard</span><span className="sm:hidden">Dashboard</span></Link>
        </nav>
      </div>
    </header>
  );
}

/** Phone tab bar, like the apps buyers already use. Hidden on listing pages (they have their own action bar). */
export function TabBar() {
  const path = usePathname();
  const s = useDemoState();
  if (path.startsWith("/homes/")) return null;
  const fav = s?.favorites.length ?? 0;
  const item = "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold";
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Tabs">
      <div className="flex">
        <Link href="/homes" className={cn(item, !path.includes("saved") ? "text-primary" : "text-muted-foreground")}><Search className="size-5" />Search</Link>
        <Link href="/homes?saved=1" className={cn(item, "relative text-muted-foreground")}><Heart className="size-5" />Saved{fav > 0 && <span className="absolute right-[calc(50%-18px)] top-1 rounded-full bg-gold px-1 text-[10px] text-ink">{fav}</span>}</Link>
        <a href={BRAND.phoneHref} className={cn(item, "text-muted-foreground")}><Phone className="size-5" />Contact</a>
      </div>
    </nav>
  );
}

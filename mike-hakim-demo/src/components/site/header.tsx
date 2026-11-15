"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart, LayoutDashboard, Menu, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/site/logo";
import { useDemoState } from "@/lib/use-demo";
import { cn } from "cn";

const NAV = [
  { href: "/homes", label: "Find a Home" },
  { href: "/homes?saved=1", label: "Saved" },
  { href: "/#contact", label: "Contact" },
];

export function Header() {
  const path = usePathname();
  const s = useDemoState();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => setOpen(false), [path]);
  const fav = s?.favorites.length ?? 0;
  const cmp = s?.compare.length ?? 0;

  return (
    <header className={cn("sticky top-0 z-40 transition-[background,box-shadow] duration-300", scrolled ? "bg-background/90 shadow-[0_1px_0_var(--border)] backdrop-blur-md" : "bg-background")}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:h-[72px] md:px-6">
        <Link href="/" aria-label="Mike Hakim Real Estate home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={cn("relative text-[14px] font-semibold text-muted-foreground transition-colors hover:text-foreground", path === n.href.split("?")[0] && n.href.startsWith("/homes") && !n.href.includes("saved") && "text-foreground")}>
              {n.label}
              {n.label === "Saved" && fav > 0 && <span className="ml-1.5 rounded-full bg-gold/20 px-1.5 py-0.5 text-[11px] text-[#7a5d2c] tabular">{fav}</span>}
              {n.label === "Compare" && cmp > 0 && <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[11px] text-primary-foreground tabular">{cmp}</span>}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/dashboard"><LayoutDashboard /> Mike&apos;s Dashboard</Link>
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu"><Menu className="size-5" /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[86vw] max-w-sm bg-background p-0">
              <SheetHeader className="border-b px-5 py-4"><SheetTitle><Logo /></SheetTitle></SheetHeader>
              <nav className="flex flex-col p-3" aria-label="Mobile">
                {NAV.map((n) => (
                  <Link key={n.href} href={n.href} className="flex items-center justify-between rounded-md px-3 py-3 text-[16px] font-semibold hover:bg-muted">
                    {n.label}
                    {n.label === "Saved" && fav > 0 && <span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><Heart className="size-4" />{fav}</span>}
                    {n.label === "Compare" && cmp > 0 && <span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><Scale className="size-4" />{cmp}</span>}
                  </Link>
                ))}
              </nav>
              <div className="grid gap-2 border-t p-4">
                <Button asChild><Link href="/dashboard"><LayoutDashboard /> Mike&apos;s Dashboard</Link></Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CalendarCheck, Home, LayoutDashboard, Users, Workflow } from "lucide-react";
import { Logo } from "@/components/site/logo";
import { useDemoState } from "@/lib/use-demo";
import { DemoBar } from "@/components/site/demo-bar";
import { cn } from "cn";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/leads", label: "Leads", icon: Users },
  { href: "/dashboard/showings", label: "Showings", icon: CalendarCheck },
  { href: "/dashboard/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/dashboard/automations", label: "Emails & sync", icon: Workflow },
];

export function ViewToggle() {
  const path = usePathname();
  const realtor = path.startsWith("/dashboard");
  return (
    <div className="inline-flex rounded-md border bg-card p-0.5 text-[12.5px] font-semibold" role="group" aria-label="Demo view">
      <Link href="/" className={cn("rounded px-2.5 py-1.5 transition", !realtor ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")} aria-current={!realtor ? "page" : undefined}>Buyer side</Link>
      <Link href="/dashboard" className={cn("rounded px-2.5 py-1.5 transition", realtor ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")} aria-current={realtor ? "page" : undefined}>Your side</Link>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const s = useDemoState();
  const newReq = s?.showings.filter((x) => x.status === "requested").length ?? 0;
  const isActive = (href: string) => (href === "/dashboard" ? path === href : path.startsWith(href));
  return (
    <div className="min-h-dvh bg-background">
      <DemoBar />
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-3 px-4 md:px-6">
          <Link href="/dashboard" aria-label="Dashboard home"><Logo compact /></Link>
          <div className="flex items-center gap-2">
            <ViewToggle />
          </div>
        </div>
        <nav className="mx-auto flex max-w-[1400px] gap-1 overflow-x-auto px-3 pb-2 no-scrollbar lg:hidden" aria-label="Dashboard">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-[13.5px] font-semibold", isActive(n.href) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
              <n.icon className="size-4" />{n.label}
              {n.label === "Showings" && newReq > 0 && <span className="rounded-full bg-gold px-1.5 text-[11px] text-ink tabular">{newReq}</span>}
            </Link>
          ))}
        </nav>
      </header>
      <div className="mx-auto flex max-w-[1400px] gap-8 px-4 md:px-6">
        <aside className="sticky top-16 hidden h-[calc(100dvh-64px)] w-56 shrink-0 flex-col py-6 lg:flex">
          <nav className="grid gap-1" aria-label="Dashboard">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={cn("flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[14px] font-semibold transition", isActive(n.href) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                <n.icon className="size-[18px]" />{n.label}
                {n.label === "Showings" && newReq > 0 && <span className="ml-auto rounded-full bg-gold px-1.5 text-[11px] text-ink tabular">{newReq}</span>}
              </Link>
            ))}
          </nav>
          <div className="mt-auto rounded-lg border bg-card p-4 text-[12.5px] text-muted-foreground">
            <p className="font-semibold text-foreground">Sample data</p>
            <p className="mt-1">These buyers are made up so you can click around freely.</p>
            <Link href="/" className="mt-3 inline-flex items-center gap-1.5 font-semibold text-gold hover:underline"><Home className="size-3.5" /> Back to the website</Link>
          </div>
        </aside>
        <main id="main" className="min-w-0 flex-1 py-6 md:py-8">{children}</main>
      </div>
    </div>
  );
}

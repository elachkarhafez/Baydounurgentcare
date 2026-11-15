import Link from "next/link";
import { FlaskConical } from "lucide-react";

export function DemoBanner() {
  return (
    <div className="relative z-50 bg-ink text-[12.5px] text-white/80" role="note" aria-label="Demo mode notice">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-center">
        <FlaskConical className="size-3.5 shrink-0 text-gold-soft" aria-hidden />
        <span>
          <b className="font-semibold text-white">Demo Mode.</b> Sample listings and simulated integrations. Nothing is sent to any real service.{" "}
          <Link href="/dashboard/settings" className="underline decoration-gold-soft/60 underline-offset-2 hover:text-white">How it works</Link>
        </span>
      </div>
    </div>
  );
}

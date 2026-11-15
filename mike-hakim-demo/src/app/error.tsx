"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main id="main" className="grid min-h-[70dvh] place-items-center px-4 text-center">
      <div className="max-w-md">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="mt-3 text-[30px] font-medium">That didn&apos;t load the way it should.</h1>
        <p className="mt-3 text-[15px] text-muted-foreground">Try again. If it keeps happening, use the reset button in the bar at the top.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button asChild variant="outline"><Link href="/">Back to home</Link></Button>
        </div>
      </div>
    </main>
  );
}

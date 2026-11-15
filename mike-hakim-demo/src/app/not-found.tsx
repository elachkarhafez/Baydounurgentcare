import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Monogram } from "@/components/site/logo";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-background px-4 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid size-16 place-items-center rounded-lg bg-primary text-primary-foreground"><Monogram className="size-10" /></span>
        <p className="eyebrow mt-8">404 · Page not found</p>
        <h1 className="mt-3 text-[34px] font-medium leading-tight md:text-[44px]">This door doesn&apos;t open.</h1>
        <p className="mt-3 text-[15px] text-muted-foreground">The page or listing you were looking for isn&apos;t here. It may have moved, or the link might be off by a character.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg"><Link href="/homes">Search homes</Link></Button>
          <Button asChild size="lg" variant="outline"><Link href="/">Back to home</Link></Button>
        </div>
      </div>
    </main>
  );
}

"use client";
import { Play, RotateCcw, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useTour } from "@/components/tour/tour-provider";
import { resetDemo } from "@/lib/store";

/** The one control Mike needs: run the guided demo. */
export function DemoBar() {
  const { active, start, stop } = useTour();
  return (
    <div className="relative z-50 bg-ink text-white" role="region" aria-label="Demo controls">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 md:px-6">
        <p className="min-w-0 text-[12.5px] leading-snug text-white/75">
          <b className="font-semibold text-white">Demo for Mike Hakim.</b> <span className="hidden sm:inline">Sample homes and buyers. Nothing is sent anywhere.</span>
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          {active ? (
            <Button size="sm" variant="outline" className="h-8 border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white" onClick={stop}><Square className="size-3.5" /> Exit guide</Button>
          ) : (
            <Button size="sm" variant="gold" className="h-8 px-3.5 font-bold" onClick={start} data-testid="run-demo"><Play className="size-3.5 fill-current" /> Run the demo</Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon-sm" variant="ghost" className="size-8 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Reset demo" data-testid="reset-demo"><RotateCcw className="size-4" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Start the demo fresh?</AlertDialogTitle><AlertDialogDescription>This clears the sample requests you sent and puts everything back the way it started.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { stop(); resetDemo(); toast.success("Demo reset"); }}>Reset Demo</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

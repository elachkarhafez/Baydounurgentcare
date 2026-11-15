"use client";
import { useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { TourProvider } from "@/components/tour/tour-provider";
import { resumePendingRuns } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => { resumePendingRuns(); }, []);
  return (
    <TooltipProvider delayDuration={200}>
      <TourProvider>{children}</TourProvider>
      <Toaster position="bottom-center" richColors={false} closeButton />
    </TooltipProvider>
  );
}

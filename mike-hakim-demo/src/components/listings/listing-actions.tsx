"use client";
import { Heart, Scale } from "lucide-react";
import { toast } from "sonner";
import { toggleCompare, toggleFavorite } from "@/lib/store";
import { useDemoState } from "@/lib/use-demo";
import { cn } from "cn";

export function FavoriteButton({ id, className, label = false }: { id: string; className?: string; label?: boolean }) {
  const s = useDemoState();
  const on = !!s?.favorites.includes(id);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? "Remove from saved homes" : "Save this home"}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(id); toast(on ? "Removed from saved homes" : "Saved. Find it under Saved."); }}
      className={cn("inline-flex items-center justify-center gap-2 transition", label ? "h-10 rounded-md border bg-card px-4 text-sm font-semibold hover:bg-muted" : "size-9 rounded-full bg-white/90 text-ink shadow-sm backdrop-blur hover:scale-105", className)}
    >
      <Heart className={cn("size-[18px] transition", on ? "fill-[#c0533f] text-[#c0533f]" : "")} />
      {label && (on ? "Saved" : "Save")}
    </button>
  );
}

export function CompareToggle({ id, className }: { id: string; className?: string }) {
  const s = useDemoState();
  const on = !!s?.compare.includes(id);
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!toggleCompare(id)) toast("You can compare up to 4 homes at a time."); }}
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold transition", on ? "bg-primary text-primary-foreground" : "bg-white/90 text-ink hover:bg-white", className)}
    >
      <Scale className="size-3.5" /> {on ? "Comparing" : "Compare"}
    </button>
  );
}

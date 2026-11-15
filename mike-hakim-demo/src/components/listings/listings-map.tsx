"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as LMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Listing } from "@/lib/types";
import { usdShort } from "@/lib/format";
import { cn } from "cn";

/**
 * Free, keyless map: Leaflet + OpenStreetMap tiles (with attribution).
 * Pins still render if tiles fail to load, so the map always stays usable.
 */
export function ListingsMap({ listings, activeId, onSelect, className, single = false }: { listings: Listing[]; activeId?: string | null; onSelect?: (id: string) => void; className?: string; single?: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const markers = useRef(new Map<string, Marker>());
  const L = useRef<typeof import("leaflet") | null>(null);
  const [ready, setReady] = useState(false);
  const [tileError, setTileError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const mks = markers.current;
    import("leaflet").then((mod) => {
      if (cancelled || !el.current || map.current) return;
      L.current = mod;
      const m = mod.map(el.current, { zoomControl: true, scrollWheelZoom: false, attributionControl: true }).setView([42.42, -83.3], 10);
      const tiles = mod.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(m);
      let errs = 0;
      tiles.on("tileerror", () => { if (++errs > 6) setTileError(true); });
      map.current = m;
      setReady(true);
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      mks.clear();
    };
  }, []);

  useEffect(() => {
    const m = map.current, mod = L.current;
    if (!ready || !m || !mod) return;
    markers.current.forEach((mk) => mk.remove());
    markers.current.clear();
    listings.forEach((l) => {
      const icon = mod.divIcon({ className: "", html: `<div class="mh-pin" data-pin="${l.id}">${usdShort(l.price)}</div>`, iconSize: [0, 0] });
      const mk = mod.marker([l.lat, l.lng], { icon, keyboard: true, title: `${l.address}, ${usdShort(l.price)}`, riseOnHover: true }).addTo(m);
      mk.on("click", () => onSelect?.(l.id));
      markers.current.set(l.id, mk);
    });
    if (listings.length) {
      if (single) m.setView([listings[0].lat, listings[0].lng], 13);
      else m.fitBounds(mod.latLngBounds(listings.map((l) => [l.lat, l.lng] as [number, number])), { padding: [40, 40], maxZoom: 13 });
    }
    setTimeout(() => m.invalidateSize(), 50);
  }, [listings, ready, single, onSelect]);

  useEffect(() => {
    markers.current.forEach((mk, id) => {
      const pin = mk.getElement()?.querySelector(".mh-pin");
      pin?.classList.toggle("active", id === activeId);
      if (id === activeId) mk.setZIndexOffset(1000); else mk.setZIndexOffset(0);
    });
  }, [activeId, listings, ready]);

  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-[#e8e3d8] hairline", className)}>
      <div ref={el} className="absolute inset-0" role="region" aria-label="Map of sample listings" />
      {!ready && <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">Loading map…</div>}
      {tileError && <div className="absolute left-3 top-3 z-[500] rounded bg-card px-2.5 py-1.5 text-[12px] shadow-soft">Map tiles couldn&apos;t load. Pins still work.</div>}
      <span className="pointer-events-none absolute bottom-7 left-3 z-[500] rounded bg-card/90 px-2 py-1 text-[11px] font-semibold text-muted-foreground">Approximate locations · demo data</span>
    </div>
  );
}

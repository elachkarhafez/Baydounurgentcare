import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchPage } from "@/components/listings/search-page";
import { PropertyCardSkeleton } from "@/components/listings/property-card";

export const metadata: Metadata = { title: "Search Homes" };

export default function HomesPage() {
  return (
    <Suspense fallback={<div className="mx-auto grid max-w-7xl gap-5 px-4 py-24 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <PropertyCardSkeleton key={i} />)}</div>}>
      <SearchPage />
    </Suspense>
  );
}

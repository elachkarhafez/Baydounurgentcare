import { Suspense } from "react";
import { SearchPage } from "@/components/listings/search-page";
import { PropertyCardSkeleton } from "@/components/listings/property-card";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="mx-auto grid max-w-3xl gap-4 px-4 py-24 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <PropertyCardSkeleton key={i} />)}</div>}>
      <SearchPage />
    </Suspense>
  );
}

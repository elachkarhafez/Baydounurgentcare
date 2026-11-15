import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LISTINGS, getListing } from "@/data/listings";
import { ListingDetail } from "@/components/listings/listing-detail";
import { usd } from "@/lib/format";

export const dynamicParams = false;

export function generateStaticParams() {
  return LISTINGS.map((l) => ({ id: l.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const l = getListing((await params).id);
  if (!l) return { title: "Listing not found" };
  return { title: `${l.address}, ${l.city}`, description: `${usd(l.price)} · ${l.beds} bd · ${l.baths} ba · ${l.sqft.toLocaleString()} sq ft. Sample listing on the Mike Hakim Real Estate demo.`, openGraph: { images: [{ url: l.photos[0] }] } };
}

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const l = getListing((await params).id);
  if (!l) notFound();
  return <Suspense><ListingDetail l={l} /></Suspense>;
}

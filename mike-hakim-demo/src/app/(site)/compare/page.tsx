import type { Metadata } from "next";
import { CompareView } from "@/components/listings/compare-view";
export const metadata: Metadata = { title: "Compare Homes" };
export default function ComparePage() { return <CompareView />; }

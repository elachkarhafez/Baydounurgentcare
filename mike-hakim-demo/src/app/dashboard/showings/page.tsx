import { Suspense } from "react";
import { ShowingsPage } from "@/components/dashboard/showings";
import { DashSkeleton } from "@/components/dashboard/bits";
export const metadata = { title: "Showings" };
export default function Page() { return <Suspense fallback={<DashSkeleton />}><ShowingsPage /></Suspense>; }

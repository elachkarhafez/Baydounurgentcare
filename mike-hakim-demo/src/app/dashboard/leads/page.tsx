import { Suspense } from "react";
import { LeadsPage } from "@/components/dashboard/leads";
import { DashSkeleton } from "@/components/dashboard/bits";
export const metadata = { title: "Leads" };
export default function Page() { return <Suspense fallback={<DashSkeleton />}><LeadsPage /></Suspense>; }

import { Suspense } from "react";
import { AutomationsPage } from "@/components/dashboard/automations";
import { DashSkeleton } from "@/components/dashboard/bits";
export const metadata = { title: "Automations" };
export default function Page() { return <Suspense fallback={<DashSkeleton />}><AutomationsPage /></Suspense>; }

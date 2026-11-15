import { Suspense } from "react";
import { CalendarPage } from "@/components/dashboard/calendar";
import { DashSkeleton } from "@/components/dashboard/bits";
export const metadata = { title: "Calendar" };
export default function Page() { return <Suspense fallback={<DashSkeleton />}><CalendarPage /></Suspense>; }

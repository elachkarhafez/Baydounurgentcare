import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/shell";
export const metadata: Metadata = { title: { default: "Realtor Dashboard", template: "%s | Realtor Dashboard" } };
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}

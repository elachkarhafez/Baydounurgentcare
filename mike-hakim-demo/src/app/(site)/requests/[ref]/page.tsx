import type { Metadata } from "next";
import { RequestView } from "@/components/automation/request-view";
export const metadata: Metadata = { title: "Showing Request" };
export default async function RequestPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  return <RequestView refCode={decodeURIComponent(ref)} />;
}

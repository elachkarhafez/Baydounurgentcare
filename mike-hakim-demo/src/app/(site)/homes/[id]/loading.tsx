import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 md:px-6 lg:grid-cols-[1fr_360px]">
      <div className="grid gap-4"><Skeleton className="aspect-[16/9] w-full" /><div className="flex gap-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-28" />)}</div><Skeleton className="h-10 w-2/3" /><Skeleton className="h-24" /></div>
      <Skeleton className="hidden h-80 lg:block" />
    </div>
  );
}

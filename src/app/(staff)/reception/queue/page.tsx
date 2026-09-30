import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/shared/loading-skeleton";
import { ReceptionQueueScreen } from "@/features/queue/reception-queue-screen";

export const metadata: Metadata = { title: "Queue" };

// useSearchParams (?doctor=) needs a Suspense boundary so the rest of the page can prerender
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ReceptionQueueScreen />
    </Suspense>
  );
}

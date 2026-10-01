import type { Metadata } from "next";
import { DailyCollectionScreen } from "@/features/billing/daily-collection";

export const metadata: Metadata = { title: "Daily collection" };

export default function Page() {
  return <DailyCollectionScreen />;
}

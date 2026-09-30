import type { Metadata } from "next";
import { LiveOverviewScreen } from "@/features/live-overview/live-overview-screen";

export const metadata: Metadata = { title: "Live overview" };

export default function Page() {
  return <LiveOverviewScreen />;
}

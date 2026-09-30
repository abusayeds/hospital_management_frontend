import type { Metadata } from "next";
import { EventLogScreen } from "@/features/events/event-log-screen";

export const metadata: Metadata = { title: "Event Log" };

export default function Page() {
  return <EventLogScreen />;
}

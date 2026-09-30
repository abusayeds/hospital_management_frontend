import type { Metadata } from "next";
import { QueueDisplay } from "@/features/queue-display/queue-display";

export const metadata: Metadata = { title: "Queue display" };

export default function Page() {
  return <QueueDisplay />;
}

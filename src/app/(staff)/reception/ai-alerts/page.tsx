import type { Metadata } from "next";
import { AiAlertsScreen } from "@/features/ai-alerts/ai-alerts-screen";

export const metadata: Metadata = { title: "Assistant Alerts" };

export default function Page() {
  return <AiAlertsScreen />;
}

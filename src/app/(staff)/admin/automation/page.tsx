import type { Metadata } from "next";
import { AutomationScreen } from "@/features/automation/automation-screen";

export const metadata: Metadata = { title: "Automation" };

export default function Page() {
  return <AutomationScreen />;
}

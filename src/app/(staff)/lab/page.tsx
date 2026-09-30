import type { Metadata } from "next";
import { LabDashboard } from "@/components/dashboards/lab-dashboard";

export const metadata: Metadata = { title: "Laboratory dashboard" };

export default function Page() {
  return <LabDashboard />;
}

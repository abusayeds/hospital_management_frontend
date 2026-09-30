import type { Metadata } from "next";
import { NurseDashboard } from "@/components/dashboards/nurse-dashboard";

export const metadata: Metadata = { title: "Nurse dashboard" };

export default function Page() {
  return <NurseDashboard />;
}

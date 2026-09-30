import type { Metadata } from "next";
import { ManagementDashboard } from "@/components/dashboards/management-dashboard";

export const metadata: Metadata = { title: "Management dashboard" };

export default function Page() {
  return <ManagementDashboard />;
}

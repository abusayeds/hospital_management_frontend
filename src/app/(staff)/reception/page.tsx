import type { Metadata } from "next";
import { ReceptionDashboard } from "@/components/dashboards/reception-dashboard";

export const metadata: Metadata = { title: "Reception dashboard" };

export default function Page() {
  return <ReceptionDashboard />;
}

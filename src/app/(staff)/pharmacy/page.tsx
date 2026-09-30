import type { Metadata } from "next";
import { PharmacyDashboard } from "@/components/dashboards/pharmacy-dashboard";

export const metadata: Metadata = { title: "Pharmacy dashboard" };

export default function Page() {
  return <PharmacyDashboard />;
}

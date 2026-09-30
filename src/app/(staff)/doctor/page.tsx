import type { Metadata } from "next";
import { DoctorDashboard } from "@/components/dashboards/doctor-dashboard";

export const metadata: Metadata = { title: "Doctor dashboard" };

export default function Page() {
  return <DoctorDashboard />;
}

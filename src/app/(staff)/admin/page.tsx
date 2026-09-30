import type { Metadata } from "next";
import { AdminDashboard } from "@/components/dashboards/admin-dashboard";

export const metadata: Metadata = { title: "Admin dashboard" };

export default function Page() {
  return <AdminDashboard />;
}

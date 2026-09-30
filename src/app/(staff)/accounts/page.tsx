import type { Metadata } from "next";
import { AccountsDashboard } from "@/components/dashboards/accounts-dashboard";

export const metadata: Metadata = { title: "Accounts dashboard" };

export default function Page() {
  return <AccountsDashboard />;
}

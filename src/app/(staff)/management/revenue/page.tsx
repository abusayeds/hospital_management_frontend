import type { Metadata } from "next";
import { ManagementAnalytics } from "@/features/analytics/management-analytics";

export const metadata: Metadata = { title: "Revenue" };

export default function Page() {
  return <ManagementAnalytics focus="revenue" />;
}

import type { Metadata } from "next";
import { PortalReports } from "@/features/portal/portal-records";

export const metadata: Metadata = { title: "Lab reports" };

export default function Page() {
  return <PortalReports />;
}

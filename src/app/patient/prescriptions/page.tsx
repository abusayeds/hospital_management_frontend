import type { Metadata } from "next";
import { PortalPrescriptions } from "@/features/portal/portal-records";

export const metadata: Metadata = { title: "Prescriptions" };

export default function Page() {
  return <PortalPrescriptions />;
}

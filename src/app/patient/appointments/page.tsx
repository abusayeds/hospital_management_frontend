import type { Metadata } from "next";
import { PortalAppointments } from "@/features/portal/portal-appointments";

export const metadata: Metadata = { title: "Appointments" };

export default function Page() {
  return <PortalAppointments />;
}

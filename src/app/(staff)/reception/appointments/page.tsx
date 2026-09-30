import type { Metadata } from "next";
import { AppointmentsScreen } from "@/features/appointments/appointments-screen";

export const metadata: Metadata = { title: "Appointments" };

export default function Page() {
  return <AppointmentsScreen />;
}

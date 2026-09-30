import type { Metadata } from "next";
import { PatientsScreen } from "@/features/patients/patients-screen";

export const metadata: Metadata = { title: "Patients" };

export default function Page() {
  return <PatientsScreen />;
}

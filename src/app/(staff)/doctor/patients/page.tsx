import type { Metadata } from "next";
import { DoctorPatientsScreen } from "@/features/visits/doctor-patients";

export const metadata: Metadata = { title: "Patients & EMR" };

export default function Page() {
  return <DoctorPatientsScreen />;
}

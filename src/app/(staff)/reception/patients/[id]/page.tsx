import type { Metadata } from "next";
import { PatientProfile } from "@/features/patients/patient-profile";

export const metadata: Metadata = { title: "Patient profile" };

export default async function Page({ params }: PageProps<"/reception/patients/[id]">) {
  const { id } = await params;
  return <PatientProfile id={id} />;
}

import type { Metadata } from "next";
import { PatientEmrScreen } from "@/features/visits/doctor-patients";

export const metadata: Metadata = { title: "Medical record" };

export default async function Page({ params }: PageProps<"/doctor/patients/[id]">) {
  const { id } = await params;
  return <PatientEmrScreen patientId={id} />;
}

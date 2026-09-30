import type { Metadata } from "next";
import { PatientCardPrint } from "@/features/print/patient-card";

export const metadata: Metadata = { title: "Patient card" };

export default async function Page({ params }: PageProps<"/print/patient-card/[id]">) {
  const { id } = await params;
  return <PatientCardPrint id={id} />;
}

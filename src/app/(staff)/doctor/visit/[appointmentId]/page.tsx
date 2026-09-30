import type { Metadata } from "next";
import { VisitWorkspace } from "@/features/visits/visit-workspace";

export const metadata: Metadata = { title: "Consultation" };

export default async function Page({ params }: PageProps<"/doctor/visit/[appointmentId]">) {
  const { appointmentId } = await params;
  return <VisitWorkspace appointmentId={appointmentId} />;
}

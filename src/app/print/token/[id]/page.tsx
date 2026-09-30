import type { Metadata } from "next";
import { AppointmentTokenPrint } from "@/features/print/appointment-token";

export const metadata: Metadata = { title: "Appointment token" };

export default async function Page({ params }: PageProps<"/print/token/[id]">) {
  const { id } = await params;
  return <AppointmentTokenPrint id={id} />;
}

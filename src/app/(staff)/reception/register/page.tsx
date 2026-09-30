import type { Metadata } from "next";
import { RegisterPatientScreen } from "@/features/patients/patients-screen";

export const metadata: Metadata = { title: "Register patient" };

export default function Page() {
  return <RegisterPatientScreen />;
}

import type { Metadata } from "next";
import { PatientLogin } from "@/features/portal/patient-login";

export const metadata: Metadata = { title: "Patient sign in" };

export default function Page() {
  return <PatientLogin />;
}

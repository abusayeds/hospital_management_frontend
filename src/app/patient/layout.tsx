import type { Metadata } from "next";
import { PatientShell } from "@/components/layout/patient-shell";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = { title: { default: "Patient portal", template: "%s · Testolife" } };

// Patients get their own simple layout, separate from the staff AppShell.
export default function PatientLayout({ children }: LayoutProps<"/patient">) {
  return (
    <AuthProvider>
      <PatientShell>{children}</PatientShell>
    </AuthProvider>
  );
}

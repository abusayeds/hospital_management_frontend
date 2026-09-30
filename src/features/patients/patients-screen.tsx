"use client";

import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RequirePermission } from "@/components/shared/forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { ROLES } from "@/lib/navigation";
import { NewPatientDialog, NewPatientForm } from "./new-patient-form";
import { PatientSearch } from "./patient-search";

/** Where a patient's profile lives for the signed-in role (reception and doctor have their own areas) */
export const usePatientHref = () => {
  const { user } = useAuth();
  const base = user ? ROLES[user.role].basePath : "/reception";
  return (id: string) => `${base}/patients/${id}`;
};

export function PatientsScreen() {
  return (
    <RequirePermission permission="patient:read_basic">
      <PatientsContent />
    </RequirePermission>
  );
}

function PatientsContent() {
  const router = useRouter();
  const { can } = useAuth();
  const hrefFor = usePatientHref();
  const [newOpen, setNewOpen] = useState(false);
  const [prefill, setPrefill] = useState("");

  const openNew = (query = "") => {
    setPrefill(query);
    setNewOpen(true);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Patients · রোগী"
        description="Ask for the mobile number first — everyone registered on that number appears. You can also type the patient code or name."
        actions={
          can("patient:create") && (
            <Button size="xl" onClick={() => openNew()}>
              <UserPlus /> New patient
            </Button>
          )
        }
      />
      <PatientSearch
        onSelect={(p) => router.push(hrefFor(p.id))}
        emptyAction={(q) =>
          can("patient:create") && (
            <Button size="lg" onClick={() => openNew(q)}>
              <UserPlus /> Register {q ? `"${q}"` : "a new patient"}
            </Button>
          )
        }
      />
      <NewPatientDialog open={newOpen} onOpenChange={setNewOpen} initialQuery={prefill} onDone={(p) => router.push(hrefFor(p.id))} />
    </div>
  );
}

/** Full-page registration (menu item "Register Patient") */
export function RegisterPatientScreen() {
  const router = useRouter();
  const hrefFor = usePatientHref();
  return (
    <RequirePermission permission="patient:create">
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader title="Register patient · রোগী নিবন্ধন" description="Only name, mobile, gender and age are required. A patient code (TL-…) is created automatically." />
        <div className="rounded-xl border bg-card p-5 shadow-card sm:p-6">
          <NewPatientForm onDone={(p) => router.push(hrefFor(p.id))} />
        </div>
      </div>
    </RequirePermission>
  );
}

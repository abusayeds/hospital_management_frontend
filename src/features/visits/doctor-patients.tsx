"use client";

import { AlertTriangle, ArrowLeft, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { GENDER_LABEL } from "@/lib/patients";
import { PatientSearch } from "@/features/patients/patient-search";
import { PatientHistory, useEmr } from "./patient-history";

/** Find a patient, then open their medical record (only own patients — the API enforces it) */
export function DoctorPatientsScreen() {
  const router = useRouter();
  return (
    <div className="space-y-6">
      <PageHeader title="Patients & EMR · রোগী ও EMR" description="Search by phone, patient code or name. You can open the record of patients who have an appointment with you." />
      <SectionCard title="Search">
        <PatientSearch onSelect={(p) => router.push(`/doctor/patients/${p.id}`)} />
      </SectionCard>
    </div>
  );
}

export function PatientEmrScreen({ patientId }: { patientId: string }) {
  const emr = useEmr(patientId);
  const back = (
    <Button variant="ghost" size="sm" render={<Link href="/doctor/patients" />} nativeButton={false}>
      <ArrowLeft /> Patients
    </Button>
  );
  if (emr.isError) {
    const denied = emr.error instanceof ApiError && emr.error.status === 403;
    return (
      <div className="space-y-4">
        {back}
        <EmptyState
          icon={denied ? ShieldAlert : AlertTriangle}
          title={denied ? "Not your patient" : "Record unavailable"}
          description={denied ? "You can only open the records of patients who have an appointment with you. This attempt was logged." : "Could not load the record."}
        />
      </div>
    );
  }
  if (!emr.data) return <Skeleton className="h-96" />;
  const p = emr.data.patient;
  return (
    <div className="space-y-4">
      {back}
      <PageHeader title={p.name} description={`${p.age} y · ${GENDER_LABEL[p.gender].label} · ${p.patientCode}${p.bloodGroup ? ` · ${p.bloodGroup}` : ""}`} />
      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <SectionCard title="Clinical background">
          <div className="space-y-3 text-sm">
            {p.allergies.length > 0 ? (
              <p className="rounded-lg border border-status-danger-border bg-status-danger-bg px-3 py-2 text-status-danger-fg">
                <b>Allergies:</b> {p.allergies.join(", ")}
              </p>
            ) : (
              <p className="text-muted-foreground">No known allergies</p>
            )}
            <p>
              <b className="text-heading">Chronic:</b> {p.chronicConditions.join(", ") || "None recorded"}
            </p>
          </div>
        </SectionCard>
        <SectionCard title="Visits and vitals">
          <PatientHistory patientId={patientId} />
        </SectionCard>
      </div>
    </div>
  );
}

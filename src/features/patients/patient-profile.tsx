"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Check, Copy, Droplet, FlaskConical, HeartPulse, Pencil, Phone, Printer, Stethoscope } from "lucide-react";
import Link from "next/link";
import { ReactNode, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { RequirePermission } from "@/components/shared/forbidden";
import { PageSkeleton } from "@/components/shared/loading-skeleton";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { initials } from "@/lib/master-data";
import { ageGender, formatDate, formatPhone, Patient } from "@/lib/patients";
import { ROLES } from "@/lib/navigation";
import { PatientBills } from "../billing/patient-bills";
import { NewPatientForm } from "./new-patient-form";
import { PatientAppointments } from "./patient-appointments";
import { PatientMessages } from "./patient-messages";
import { PatientPreferences } from "./patient-preferences";

export function PatientProfile({ id }: { id: string }) {
  return (
    <RequirePermission permission="patient:read_basic">
      <ProfileContent id={id} />
    </RequirePermission>
  );
}

function ProfileContent({ id }: { id: string }) {
  const { user, can } = useAuth();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const patient = useQuery({
    queryKey: ["patient", id],
    queryFn: () => apiFetch<Patient>(`/patients/${id}`),
    staleTime: 60_000, // every fetch is an audited VIEW; do not refetch needlessly
  });
  const back = `${user ? ROLES[user.role].basePath : ""}/patients`;

  if (patient.isError) {
    const notFound = patient.error instanceof ApiError && (patient.error.status === 404 || patient.error.status === 400);
    return <EmptyState title={notFound ? "Patient not found" : "Could not load the patient"} action={<Button render={<Link href={back} />} nativeButton={false}>Back to patients</Button>} />;
  }
  if (!patient.data) return <PageSkeleton />;
  const p = patient.data;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(p.patientCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="space-y-6">
      <Link href={back} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All patients
      </Link>

      {/* Header card */}
      <section className="rounded-xl border bg-card p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-start gap-5">
          <span aria-hidden className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-accent text-2xl font-semibold text-primary">
            {initials(p.name)}
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <h1 className="text-2xl font-semibold text-heading">{p.name}</h1>
              {p.nameBn && <p className="font-bangla text-muted-foreground">{p.nameBn}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <button
                type="button"
                onClick={copyCode}
                className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 font-mono font-semibold text-heading hover:bg-accent"
                aria-label={`Copy patient code ${p.patientCode}`}
              >
                {p.patientCode} {copied ? <Check className="size-3.5 text-status-success-fg" /> : <Copy className="size-3.5 text-muted-foreground" />}
              </button>
              <span>{ageGender(p)}</span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Phone className="size-3.5 text-muted-foreground" aria-hidden /> {formatPhone(p.phone)}
              </span>
              {p.bloodGroup && (
                <span className="inline-flex items-center gap-1 font-semibold text-status-danger-fg">
                  <Droplet className="size-3.5" aria-hidden /> {p.bloodGroup}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {p.allergies.map((a) => (
                <StatusBadge key={a} tone="danger">
                  <AlertTriangle className="size-3" /> Allergy: {a}
                </StatusBadge>
              ))}
              {p.chronicConditions?.map((c) => (
                <StatusBadge key={c} tone="waiting">
                  {c}
                </StatusBadge>
              ))}
              {p.hasChronicConditions && !p.chronicConditions && <StatusBadge tone="waiting">Has chronic conditions (details for doctors)</StatusBadge>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="lg" render={<a href={`/print/patient-card/${p.id}`} target="_blank" rel="noopener" />} nativeButton={false}>
              <Printer /> Print card
            </Button>
            {can("patient:update") && (
              <Button variant="outline" size="lg" onClick={() => setEditOpen(true)}>
                <Pencil /> Edit
              </Button>
            )}
          </div>
        </div>
      </section>

      <Tabs defaultValue="overview">
        <TabsList className="h-10 w-full flex-wrap sm:w-fit">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="visits">Visits</TabsTrigger>
          <TabsTrigger value="lab">Lab</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="bills">Bills</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-4 pt-3 lg:grid-cols-2">
          <SectionCard title="Contact & identity">
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <Row label="Mobile">{formatPhone(p.phone)}</Row>
              <Row label="Alt. mobile">{formatPhone(p.altPhone)}</Row>
              <Row label="Date of birth">{p.dateOfBirth ? formatDate(p.dateOfBirth) : `Not known (age ~${p.age})`}</Row>
              <Row label="Address">{[p.address?.area, p.address?.upazila, p.address?.district].filter(Boolean).join(", ") || "—"}</Row>
              <Row label="NID">{p.nidMasked ?? "—"}</Row>
              <Row label="Registered">
                {formatDate(p.createdAt.slice(0, 10))} · via <span className="capitalize">{p.registrationSource}</span>
              </Row>
              <Row label="Last visit">{formatDate(p.lastVisitDate)}</Row>
            </dl>
          </SectionCard>
          <SectionCard title="Emergency contact">
            {p.emergencyContact?.name || p.emergencyContact?.phone ? (
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                <Row label="Name">{p.emergencyContact.name || "—"}</Row>
                <Row label="Relation">{p.emergencyContact.relation || "—"}</Row>
                <Row label="Mobile">{formatPhone(p.emergencyContact.phone)}</Row>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">Not recorded. Add one with Edit.</p>
            )}
            {p.notes && <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-sm">{p.notes}</p>}
          </SectionCard>
        </TabsContent>

        <TabsContent value="appointments" className="pt-3">
          <PatientAppointments patientId={p.id} />
        </TabsContent>
        <TabsContent value="visits" className="pt-3">
          <NextPhase icon={Stethoscope} title="Consultation notes and prescriptions" phase={4} />
        </TabsContent>
        <TabsContent value="lab" className="pt-3">
          <NextPhase icon={FlaskConical} title="Lab orders and results" phase={4} />
        </TabsContent>
        <TabsContent value="messages" className="pt-3">
          <PatientMessages patientId={p.id} preferences={<PatientPreferences patient={p} />} />
        </TabsContent>
        <TabsContent value="bills" className="pt-3">
          <PatientBills patientId={p.id} />
        </TabsContent>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-heading">Edit {p.name}</DialogTitle>
            <DialogDescription>Changes are recorded in the audit log.</DialogDescription>
          </DialogHeader>
          {editOpen && (
            <NewPatientForm
              compact
              patient={p}
              onDone={(updated) => {
                queryClient.setQueryData(["patient", id], updated);
                queryClient.invalidateQueries({ queryKey: ["patients"] });
                setEditOpen(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-heading">{children}</dd>
    </>
  );
}

function NextPhase({ icon, title, phase }: { icon: typeof HeartPulse; title: string; phase: number }) {
  return (
    <div className="rounded-xl border border-dashed bg-card shadow-card">
      <EmptyState icon={icon} title={title} description={`Coming in Phase ${phase}. This tab is ready for it.`} />
    </div>
  );
}

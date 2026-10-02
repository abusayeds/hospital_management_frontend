"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, Download, FileText, FlaskConical, Pill } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/patients";
import { PortalPrescription, PortalReport } from "@/lib/portal";
import { cn } from "@/lib/utils";
import { usePortalMe } from "./portal-home";

/** Family filter: "All" plus one chip per patient on the phone (hidden for a single patient) */
function FamilyFilter({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const me = usePortalMe();
  const patients = me.data?.patients ?? [];
  if (patients.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {[{ id: "", name: "Everyone" }, ...patients].map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onChange(p.id)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm",
            value === p.id ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
          )}
        >
          {p.name.split(" ")[0]}
        </button>
      ))}
    </div>
  );
}

const durationText = (m: PortalPrescription["medicines"][number]) => (m.durationDays ? `${m.durationDays} days` : m.continued ? "continue" : "");

/** Patient → Prescriptions: every signed prescription with medicines, advice and the PDF */
export function PortalPrescriptions() {
  const [who, setWho] = useState("");
  const list = useQuery({ queryKey: ["portal", "prescriptions"], queryFn: () => apiFetch<PortalPrescription[]>("/portal/prescriptions") });
  const items = (list.data ?? []).filter((p) => !who || p.patient.id === who);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-heading">Prescriptions</h1>
        <p className="font-bangla text-sm text-muted-foreground">আপনার প্রেসক্রিপশন</p>
      </div>
      <FamilyFilter value={who} onChange={setWho} />
      {list.isPending ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : !items.length ? (
        <div className="rounded-2xl border border-dashed bg-card">
          <EmptyState icon={FileText} title="No prescriptions yet" description="Prescriptions appear here as soon as your doctor signs them." />
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((p) => (
            <li key={p.id} className="overflow-hidden rounded-2xl border bg-card shadow-card">
              <div className="flex items-start gap-3 border-b px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-heading">{p.doctor}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(p.date)} · {p.department} · <span className="font-mono">{p.prescriptionNo}</span>
                  </p>
                  {p.diagnosis && <p className="mt-1 text-sm">{p.diagnosis}</p>}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  render={<a href={`/api/v1/portal/prescriptions/${p.id}/pdf`} target="_blank" rel="noopener" />}
                  nativeButton={false}
                >
                  <Download /> PDF
                </Button>
              </div>
              <ul className="divide-y">
                {p.medicines.map((m, i) => (
                  <li key={i} className="flex gap-3 px-4 py-3">
                    <Pill className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-heading">{[m.brandName, m.strength, m.form].filter(Boolean).join(" ")}</p>
                      <p className="text-sm">
                        <span className="font-mono">{m.dosePattern}</span>
                        {durationText(m) && <span className="text-muted-foreground"> · {durationText(m)}</span>}
                      </p>
                      {m.instructionsBn && <p className="font-bangla text-sm text-muted-foreground">{m.instructionsBn}</p>}
                    </div>
                  </li>
                ))}
              </ul>
              {(p.adviceBn || p.adviceEn || p.followUpDate) && (
                <div className="space-y-1 border-t bg-muted/30 px-4 py-3 text-sm">
                  {p.adviceBn && <p className="font-bangla">{p.adviceBn}</p>}
                  {p.adviceEn && <p>{p.adviceEn}</p>}
                  {p.followUpDate && (
                    <p className="flex items-center gap-1.5 font-medium text-heading">
                      <CalendarCheck className="size-4 text-primary" /> Follow-up on {formatDate(p.followUpDate)}
                    </p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Patient → Reports: lab tests with their stage; verified reports download as PDF */
export function PortalReports() {
  const [who, setWho] = useState("");
  const me = usePortalMe();
  const list = useQuery({ queryKey: ["portal", "reports"], queryFn: () => apiFetch<PortalReport[]>("/portal/reports") });
  const items = (list.data ?? []).filter((r) => !who || r.patient.id === who);
  const family = (me.data?.patients.length ?? 0) > 1;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-heading">Lab reports</h1>
        <p className="font-bangla text-sm text-muted-foreground">আপনার ল্যাব রিপোর্ট</p>
      </div>
      <FamilyFilter value={who} onChange={setWho} />
      {list.isPending ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : !items.length ? (
        <div className="rounded-2xl border border-dashed bg-card">
          <EmptyState
            icon={FlaskConical}
            title="No lab tests yet"
            description="When a doctor orders tests, you can follow them here and download the report."
          />
        </div>
      ) : (
        <ul className="divide-y rounded-2xl border bg-card shadow-card">
          {items.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-3.5">
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  r.ready ? "bg-status-success-bg text-status-success-fg" : "bg-muted text-muted-foreground",
                )}
              >
                <FlaskConical className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-heading">{r.tests.join(", ")}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(r.date)} · <span className="font-mono">{r.orderNo}</span>
                  {family && ` · ${r.patient.name}`}
                </p>
              </div>
              {r.ready ? (
                <Button size="sm" render={<a href={`/api/v1/portal/reports/${r.id}/pdf`} target="_blank" rel="noopener" />} nativeButton={false}>
                  <Download /> PDF
                </Button>
              ) : (
                <StatusBadge tone="waiting">{r.stage}</StatusBadge>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-center text-xs text-muted-foreground">You also get a WhatsApp message when a report is ready. Your doctor will explain the results.</p>
    </div>
  );
}

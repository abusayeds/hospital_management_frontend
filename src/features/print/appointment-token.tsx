"use client";

import { useQuery } from "@tanstack/react-query";
import { QrCode } from "@/components/shared/qr-code";
import { apiFetch } from "@/lib/api";
import { AppointmentView, PRIORITY_LABEL, shortDate, time12 } from "@/lib/appointments";
import { formatPoisha } from "@/lib/money";
import { useHospitalInfo } from "./patient-card";
import { PrintShell } from "./print-shell";

/** 80 mm thermal-printer token: the serial number is what the patient needs, so it is the biggest thing */
export function AppointmentTokenPrint({ id }: { id: string }) {
  const hospital = useHospitalInfo();
  const appt = useQuery({ queryKey: ["appointment", id], queryFn: () => apiFetch<AppointmentView>(`/appointments/${id}`) });
  const a = appt.data;
  const h = hospital.data;

  return (
    <PrintShell ready={Boolean(a && h)} pageSize="80mm 150mm">
      {appt.isError ? (
        <p className="text-destructive">Could not load this appointment.</p>
      ) : (
        <article className="w-[80mm] bg-white px-[4mm] py-[4mm] text-center text-slate-900 shadow-raised print:shadow-none" aria-busy={!a}>
          <p className="text-[4.2mm] leading-tight font-bold">{h?.name}</p>
          <p className="font-bangla text-[3.4mm] leading-tight">{h?.nameBn}</p>
          <p className="mt-[1mm] text-[2.6mm] leading-tight text-slate-600">{h?.address}</p>
          <hr className="my-[3mm] border-dashed border-slate-400" />

          <p className="text-[3mm] font-semibold tracking-[0.3em] uppercase">Serial · সিরিয়াল</p>
          <p className="text-[24mm] leading-none font-black tabular-nums">{a?.serialNo}</p>
          {a && a.priority !== "normal" && <p className="mt-[1mm] text-[3.4mm] font-bold uppercase">{PRIORITY_LABEL[a.priority].label}</p>}

          <hr className="my-[3mm] border-dashed border-slate-400" />
          <dl className="space-y-[1.2mm] text-left text-[3.2mm]">
            <Row label="Patient">{a?.patient.name}</Row>
            <Row label="Code">
              <span className="font-mono font-bold">{a?.patient.patientCode}</span>
            </Row>
            <Row label="Doctor">{a?.doctor.displayName}</Row>
            <Row label="Department">{a?.department.name}</Row>
            <Row label="Room">
              <span className="text-[4.4mm] font-bold">{a?.doctor.roomNo ?? "—"}</span>
            </Row>
            <Row label="Date">{a && shortDate(a.date)}</Row>
            <Row label="Est. time">
              {a && time12(a.slotTime)} <span className="text-slate-500">({a?.sessionLabel})</span>
            </Row>
            <Row label="Fee">
              {a && formatPoisha(a.fee)} {a?.type === "follow_up" && "· follow-up"}
            </Row>
          </dl>

          <div className="mt-[3mm] flex items-center justify-between gap-[3mm]">
            <p className="text-left text-[2.6mm] leading-snug text-slate-600">
              Please wait for your serial on the screen.
              <br />
              <span className="font-bangla">স্ক্রিনে আপনার সিরিয়াল দেখে প্রবেশ করুন।</span>
              <br />
              Emergency: {h?.emergencyPhone}
            </p>
            {a && <QrCode value={`APT:${a.id}`} size={72} />}
          </div>
        </article>
      )}
    </PrintShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-[3mm]">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-semibold">{children}</dd>
    </div>
  );
}

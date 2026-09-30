"use client";

import { useQuery } from "@tanstack/react-query";
import { QrCode } from "@/components/shared/qr-code";
import { apiFetch } from "@/lib/api";
import { ageGender, formatPhone, Patient } from "@/lib/patients";
import { PrintShell } from "./print-shell";

export type PublicHospitalInfo = { name: string; nameBn: string; address: string; phones: string[]; emergencyPhone: string };

export const useHospitalInfo = () =>
  useQuery({ queryKey: ["hospital-info"], queryFn: () => apiFetch<PublicHospitalInfo>("/public/hospital-info"), staleTime: 10 * 60_000 });

/** Wallet-size patient card (ID-1, 85.6 × 54 mm) with a QR of the patient code for fast lookup */
export function PatientCardPrint({ id }: { id: string }) {
  const hospital = useHospitalInfo();
  const patient = useQuery({ queryKey: ["patient", id], queryFn: () => apiFetch<Patient>(`/patients/${id}`) });
  const p = patient.data;
  const h = hospital.data;

  return (
    <PrintShell ready={Boolean(p && h)} pageSize="85.6mm 54mm">
      {patient.isError ? (
        <p className="text-destructive">Could not load this patient.</p>
      ) : (
        <article
          className="flex h-[54mm] w-[85.6mm] flex-col overflow-hidden rounded-[3mm] border border-slate-300 bg-white text-slate-900 shadow-raised print:rounded-none print:border-0 print:shadow-none"
          aria-busy={!p}
        >
          <header className="flex items-center justify-between bg-[#0f766e] px-[3mm] py-[1.6mm] text-white">
            <span className="text-[3.2mm] leading-tight font-bold">{h?.name ?? " "}</span>
            <span className="font-bangla text-[2.6mm] leading-tight">{h?.nameBn}</span>
          </header>
          <div className="flex flex-1 items-center gap-[3mm] px-[3mm] py-[2mm]">
            <div className="min-w-0 flex-1 space-y-[1mm]">
              <p className="text-[2.3mm] font-semibold tracking-wider text-slate-500 uppercase">Patient card</p>
              <p className="truncate text-[4.2mm] leading-tight font-bold">{p?.name}</p>
              {p?.nameBn && <p className="font-bangla truncate text-[3mm] leading-tight">{p.nameBn}</p>}
              <p className="font-mono text-[4.4mm] font-bold tracking-wide text-[#0f766e]">{p?.patientCode}</p>
              <p className="text-[2.6mm] text-slate-600">
                {p && ageGender(p)} {p?.bloodGroup && `· ${p.bloodGroup}`}
              </p>
              <p className="text-[2.6mm] text-slate-600 tabular-nums">{p && formatPhone(p.phone)}</p>
            </div>
            {p && <QrCode value={p.patientCode} size={80} />}
          </div>
          <footer className="border-t border-slate-200 px-[3mm] py-[1mm] text-[2.2mm] text-slate-500">
            Bring this card to every visit · Emergency {h?.emergencyPhone}
          </footer>
        </article>
      )}
    </PrintShell>
  );
}

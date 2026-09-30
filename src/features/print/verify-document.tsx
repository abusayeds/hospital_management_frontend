"use client";

import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Loader2, ShieldX } from "lucide-react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/patients";

type Result =
  | { valid: false }
  | {
      valid: true;
      type: "prescription" | "lab_report";
      number: string;
      date: string;
      issuedBy: string;
      patient: string;
      patientAge: number | null;
      signedAt: string | null;
      corrections: number;
    };

const TYPE_LABEL = { prescription: "Prescription · প্রেসক্রিপশন", lab_report: "Lab report · ল্যাব রিপোর্ট" };

/**
 * Public page opened by the QR code on a printed prescription or lab report.
 * Shows only whether the paper is genuine — never diagnosis, medicines or contact details.
 */
export function VerifyDocument({ code }: { code: string }) {
  const result = useQuery({
    queryKey: ["verify", code],
    queryFn: () => apiFetch<Result>(`/public/verify/${encodeURIComponent(code)}`),
    meta: { silent: true },
  });
  const r = result.data;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md space-y-6 rounded-2xl border bg-card p-6 shadow-card">
        <BrandLogo />
        {!r && !result.isError ? (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Checking…
          </p>
        ) : r?.valid ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-status-success-bg px-4 py-3 text-status-success-fg">
              <BadgeCheck className="size-8 shrink-0" />
              <div>
                <p className="text-lg font-semibold">Genuine document</p>
                <p className="font-bangla text-sm">এই কাগজটি হাসপাতাল থেকে ইস্যু করা হয়েছে</p>
              </div>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Type</dt>
              <dd className="font-medium text-heading">{TYPE_LABEL[r.type]}</dd>
              <dt className="text-muted-foreground">Number</dt>
              <dd className="font-mono">{r.number}</dd>
              <dt className="text-muted-foreground">Date</dt>
              <dd>{formatDate(r.date)}</dd>
              <dt className="text-muted-foreground">Issued by</dt>
              <dd>{r.issuedBy}</dd>
              <dt className="text-muted-foreground">Patient</dt>
              <dd>
                {r.patient}
                {r.patientAge != null && `, ${r.patientAge} y`}
              </dd>
            </dl>
            {r.corrections > 0 && (
              <p className="rounded-lg bg-status-waiting-bg px-3 py-2 text-sm text-status-waiting-fg">
                The record was corrected {r.corrections} time(s) after printing. Ask the hospital for the latest copy.
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl bg-status-danger-bg px-4 py-3 text-status-danger-fg">
            <ShieldX className="size-8 shrink-0" />
            <div>
              <p className="text-lg font-semibold">Not verified</p>
              <p className="text-sm">This code does not match any document issued by the hospital. Please contact the hospital.</p>
              <p className="font-bangla text-sm">কোডটি মেলেনি। অনুগ্রহ করে হাসপাতালে যোগাযোগ করুন।</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

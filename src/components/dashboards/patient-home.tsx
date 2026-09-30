"use client";

import Link from "next/link";
import { Bot, CalendarPlus, ChevronRight, Clock, FileText, FlaskConical, MapPin, Phone } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { SampleDataNote } from "./sample-data-note";

const ACTIONS = [
  { href: "/patient/appointments", label: "Book appointment", labelBn: "সিরিয়াল নিন", icon: CalendarPlus },
  { href: "/patient/prescriptions", label: "Prescriptions", labelBn: "প্রেসক্রিপশন", icon: FileText },
  { href: "/patient/reports", label: "Lab reports", labelBn: "রিপোর্ট", icon: FlaskConical },
  { href: "/chat", label: "Ask Testo Life", labelBn: "Testo Life-কে জিজ্ঞেস করুন", icon: Bot },
];

const REPORTS = [
  { id: "r1", test: "Lipid profile", date: "27 Sep 2026", status: "ready" as const },
  { id: "r2", test: "HbA1c", date: "27 Sep 2026", status: "processing" as const },
  { id: "r3", test: "CBC", date: "12 Sep 2026", status: "ready" as const },
];

export function PatientHome() {
  const name = useAuth().user?.name.split(" ")[0] ?? "";
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="font-bangla text-sm text-muted-foreground">আসসালামু আলাইকুম,</p>
        <h1 className="text-2xl font-semibold text-heading">{name}</h1>
        <p className="text-sm text-muted-foreground">Patient ID · TL-000123</p>
      </div>
      <SampleDataNote phase={5} />

      {/* Next appointment — the one thing most patients open the app for */}
      <section className="overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-raised">
        <div className="flex items-center justify-between px-5 pt-5">
          <p className="text-sm font-medium text-teal-100">Next appointment · পরবর্তী সিরিয়াল</p>
          <StatusBadge status="booked" className="border-white/20 bg-white/15 text-white" />
        </div>
        <div className="flex items-center gap-4 px-5 py-4">
          <div className="flex size-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-white text-primary">
            <span className="text-[11px] font-semibold uppercase">Serial</span>
            <span className="text-3xl leading-none font-bold tabular-nums">7</span>
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-lg font-semibold">Dr. Farhana Rahman</p>
            <p className="flex items-center gap-1.5 text-sm text-teal-50">
              <Clock className="size-4" aria-hidden /> Thu, 1 Oct · 10:30 AM
            </p>
            <p className="flex items-center gap-1.5 text-sm text-teal-50">
              <MapPin className="size-4" aria-hidden /> Room 101 · Medicine
            </p>
          </div>
        </div>
        <div className="flex gap-2 border-t border-white/15 bg-black/10 px-5 py-3">
          <Button variant="secondary" size="lg" className="flex-1" render={<Link href="/patient/appointments" />} nativeButton={false}>
            View details
          </Button>
          <Button variant="ghost" size="lg" className="text-white hover:bg-white/10 hover:text-white" render={<a href="tel:999" />} nativeButton={false}>
            <Phone /> Emergency
          </Button>
        </div>
      </section>

      <section aria-labelledby="quick-actions" className="space-y-3">
        <h2 id="quick-actions" className="text-base font-semibold text-heading">
          What do you need? · কী করতে চান?
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {ACTIONS.map(({ href, label, labelBn, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-28 flex-col justify-between rounded-2xl border bg-card p-4 shadow-card transition-colors hover:border-primary"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-semibold text-heading">{label}</span>
                <span className="font-bangla block text-xs text-muted-foreground">{labelBn}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="recent-reports" className="space-y-3">
        <h2 id="recent-reports" className="text-base font-semibold text-heading">
          Recent reports
        </h2>
        <ul className="divide-y rounded-2xl border bg-card shadow-card">
          {REPORTS.map((r) => (
            <li key={r.id}>
              <Link href="/patient/reports" className="flex min-h-16 items-center gap-3 px-4 py-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <FlaskConical className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-heading">{r.test}</span>
                  <span className="block text-xs text-muted-foreground">{r.date}</span>
                </span>
                <StatusBadge status={r.status} />
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

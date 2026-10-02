"use client";

import { useQuery } from "@tanstack/react-query";
import { Bot, CalendarPlus, ChevronRight, Clock, FileText, FlaskConical, MapPin, Phone, Receipt, Users } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { formatPoisha } from "@/lib/money";
import { formatDate } from "@/lib/patients";
import { dayLabel, PortalAppointment, PortalBill, PortalMe, PortalReport, time12 } from "@/lib/portal";

const ACTIONS = [
  { href: "/patient/appointments?book=1", label: "Book appointment", labelBn: "সিরিয়াল নিন", icon: CalendarPlus },
  { href: "/patient/prescriptions", label: "Prescriptions", labelBn: "প্রেসক্রিপশন", icon: FileText },
  { href: "/patient/reports", label: "Lab reports", labelBn: "রিপোর্ট", icon: FlaskConical },
  { href: "/chat", label: "Ask Testo Life", labelBn: "Testo Life-কে জিজ্ঞেস করুন", icon: Bot },
];

export const usePortalMe = () => useQuery({ queryKey: ["portal", "me"], queryFn: () => apiFetch<PortalMe>("/portal/me"), staleTime: 5 * 60_000 });

/** Patient home: the next appointment first, then quick actions, reports and dues */
export function PortalHome() {
  const me = usePortalMe();
  const appts = useQuery({
    queryKey: ["portal", "appointments"],
    queryFn: () => apiFetch<{ upcoming: PortalAppointment[]; past: PortalAppointment[] }>("/portal/appointments"),
  });
  const reports = useQuery({ queryKey: ["portal", "reports"], queryFn: () => apiFetch<PortalReport[]>("/portal/reports") });
  const bills = useQuery({ queryKey: ["portal", "bills"], queryFn: () => apiFetch<PortalBill[]>("/portal/bills") });

  if (me.isError)
    return (
      <div className="rounded-2xl border bg-card p-6 text-center shadow-card">
        <p className="font-semibold text-heading">No patient record is linked to this account.</p>
        <p className="mt-1 text-sm text-muted-foreground">Please contact the reception desk.</p>
      </div>
    );
  if (!me.data) return <Skeleton className="h-96 rounded-2xl" />;

  const first = me.data.patients[0];
  const next = appts.data?.upcoming[0];
  const due = (bills.data ?? []).filter((b) => b.amountDue > 0);
  const dueTotal = due.reduce((s, b) => s + b.amountDue, 0);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="font-bangla text-sm text-muted-foreground">আসসালামু আলাইকুম,</p>
        <h1 className="text-2xl font-semibold text-heading">{first.name.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground">Patient ID · {first.patientCode}</p>
      </div>

      {me.data.patients.length > 1 && (
        <section className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-card">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
            <Users className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-heading">Family on this number · এই নম্বরে পরিবার</p>
            <p className="truncate text-sm text-muted-foreground">{me.data.patients.map((p) => `${p.name} (${p.age})`).join(" · ")}</p>
          </div>
        </section>
      )}

      {/* Next appointment */}
      {appts.isPending ? (
        <Skeleton className="h-44 rounded-2xl" />
      ) : next ? (
        <section className="overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-raised">
          <div className="flex items-center justify-between px-5 pt-5">
            <p className="text-sm font-medium text-teal-100">Next appointment · পরবর্তী সিরিয়াল</p>
            <StatusBadge status={next.status} className="border-white/20 bg-white/15 text-white" />
          </div>
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="flex size-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-white text-primary">
              <span className="text-[11px] font-semibold uppercase">Serial</span>
              <span className="text-3xl leading-none font-bold tabular-nums">{next.serialNo}</span>
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-lg font-semibold">{next.doctor}</p>
              <p className="flex items-center gap-1.5 text-sm text-teal-50">
                <Clock className="size-4" aria-hidden /> {dayLabel(next.date)} · {time12(next.slotTime)}
              </p>
              <p className="flex items-center gap-1.5 text-sm text-teal-50">
                <MapPin className="size-4" aria-hidden /> {next.roomNo ? `Room ${next.roomNo} · ` : ""}
                {next.department}
                {me.data.patients.length > 1 && ` · for ${next.patient.name.split(" ")[0]}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2 border-t border-white/15 bg-black/10 px-5 py-3">
            <Button variant="secondary" size="lg" className="flex-1" render={<Link href="/patient/appointments" />} nativeButton={false}>
              View details
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="text-white hover:bg-white/10 hover:text-white"
              render={<a href={`tel:${me.data.hospital.emergencyPhone}`} />}
              nativeButton={false}
            >
              <Phone /> Emergency
            </Button>
          </div>
        </section>
      ) : (
        <section className="flex items-center gap-4 rounded-2xl border border-dashed bg-card p-5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-primary">
            <CalendarPlus className="size-6" />
          </span>
          <div className="flex-1">
            <p className="font-semibold text-heading">No upcoming appointment</p>
            <p className="font-bangla text-sm text-muted-foreground">কোনো সিরিয়াল নেই</p>
          </div>
          <Button render={<Link href="/patient/appointments?book=1" />} nativeButton={false}>
            Book
          </Button>
        </section>
      )}

      {dueTotal > 0 && (
        <section className="flex items-center gap-3 rounded-2xl border border-status-waiting-border bg-status-waiting-bg p-4">
          <Receipt className="size-5 shrink-0 text-status-waiting-fg" />
          <p className="flex-1 text-sm text-status-waiting-fg">
            <span className="font-semibold">{formatPoisha(dueTotal)} due</span> on {due.length} bill{due.length === 1 ? "" : "s"} — please pay at the hospital
            counter.
            <span className="font-bangla block text-xs">বকেয়া আছে — হাসপাতালের কাউন্টারে পরিশোধ করুন।</span>
          </p>
        </section>
      )}

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
        {!reports.data?.length ? (
          <p className="rounded-2xl border bg-card px-4 py-5 text-sm text-muted-foreground shadow-card">No lab tests yet.</p>
        ) : (
          <ul className="divide-y rounded-2xl border bg-card shadow-card">
            {reports.data.slice(0, 3).map((r) => (
              <li key={r.id}>
                <Link href="/patient/reports" className="flex min-h-16 items-center gap-3 px-4 py-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <FlaskConical className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-heading">{r.tests.join(", ")}</span>
                    <span className="block text-xs text-muted-foreground">{formatDate(r.date)}</span>
                  </span>
                  <StatusBadge tone={r.ready ? "success" : "waiting"}>{r.ready ? "Ready" : r.stage}</StatusBadge>
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="pb-2 text-center text-xs text-muted-foreground">
        {me.data.hospital.name} · {me.data.hospital.openingHours} · Emergency {me.data.hospital.emergencyPhone}
      </p>
    </div>
  );
}

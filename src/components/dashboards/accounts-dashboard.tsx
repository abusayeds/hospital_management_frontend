"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Banknote, FileClock, Receipt } from "lucide-react";
import Link from "next/link";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { DailyCollectionCard } from "@/features/billing/daily-collection";
import { InvoiceStatusBadge } from "@/features/billing/invoice-status";
import { apiFetchPage } from "@/lib/api";
import { todayDhaka } from "@/lib/appointments";
import { Invoice } from "@/lib/billing";
import { formatPoisha } from "@/lib/money";
import { DashboardIntro } from "./dashboard-intro";

/** Accounts home: real money numbers — today's collection, unpaid and overdue bills */
export function AccountsDashboard() {
  const today = todayDhaka();
  const page = (status: string, extra = "") => () => apiFetchPage<Invoice>(`/invoices?status=${status}&limit=5${extra}`);
  const issued = useQuery({ queryKey: ["invoices", "dash", "issued"], queryFn: page("issued") });
  const partial = useQuery({ queryKey: ["invoices", "dash", "partial"], queryFn: page("partial") });
  const overdue = useQuery({ queryKey: ["invoices", "dash", "overdue"], queryFn: page("overdue") });
  const todays = useQuery({ queryKey: ["invoices", "dash", "today"], queryFn: page("", `&from=${today}&to=${today}`) });

  const unpaidCount = (issued.data?.pagination.total ?? 0) + (partial.data?.pagination.total ?? 0);
  const recent = [...(partial.data?.items ?? []), ...(issued.data?.items ?? [])].slice(0, 6);

  return (
    <div className="space-y-6">
      <DashboardIntro
        description="Today's collection and every bill that still needs money."
        actions={
          <Button size="xl" render={<Link href="/accounts/invoices" />} nativeButton={false}>
            <Receipt /> Open invoices
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Bills today" value={todays.data?.pagination.total ?? "…"} icon={Receipt} />
        <StatCard label="Unpaid / partial" value={unpaidCount} icon={Banknote} hint="Issued bills with money due" />
        <StatCard label="Overdue" value={overdue.data?.pagination.total ?? "…"} icon={AlertCircle} tone={overdue.data?.pagination.total ? "danger" : "default"} />
        <StatCard label="Due date passed" value={overdue.data?.items[0] ? overdue.data.items[0].dueDate : "—"} icon={FileClock} hint="Oldest overdue bill" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <SectionCard
          title="Waiting for payment"
          bodyClassName="p-0"
          action={
            <Button variant="outline" size="sm" render={<Link href="/accounts/payments" />} nativeButton={false}>
              Collect
            </Button>
          }
        >
          {recent.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted-foreground">No unpaid bills. 🎉</p>
          ) : (
            <ul className="divide-y">
              {recent.map((i) => (
                <li key={i.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-heading">{i.patient.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {i.invoiceNo} · {i.items[0]?.description}
                    </p>
                  </div>
                  <InvoiceStatusBadge invoice={i} />
                  <span className="font-semibold tabular-nums">{formatPoisha(i.amountDue)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
        <DailyCollectionCard date={today} />
      </div>
    </div>
  );
}

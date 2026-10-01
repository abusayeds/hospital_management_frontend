"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, CheckCircle2, Circle, CreditCard, Smartphone, Wallet } from "lucide-react";
import { useCallback, useState } from "react";
import { RequirePermission } from "@/components/shared/forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { todayDhaka } from "@/lib/appointments";
import { DailyCollection, METHOD_LABEL, PaymentMethod } from "@/lib/billing";
import { formatPoisha } from "@/lib/money";
import { useLiveEvents } from "@/lib/socket";
import { cn } from "@/lib/utils";

const LIVE_EVENTS = ["billing:updated"];
const ICON: Record<PaymentMethod, typeof Banknote> = { cash: Banknote, card: CreditCard, bkash: Smartphone, nagad: Smartphone };

const useCollection = (date: string) => {
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ["daily-collection", date], queryFn: () => apiFetch<DailyCollection>(`/reports/daily-collection?date=${date}`) });
  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: ["daily-collection"] }), [queryClient]);
  useLiveEvents(LIVE_EVENTS, refresh);
  return q;
};

/** Today's money at a glance (beside the invoice table) */
export function DailyCollectionCard({ date, compact = false }: { date: string; compact?: boolean }) {
  const c = useCollection(date).data;
  return (
    <SectionCard title="Collected today · আজকের সংগ্রহ" description={date === todayDhaka() ? "Live" : date} bodyClassName={compact ? "space-y-3 p-4" : "space-y-3"}>
      <p className="text-3xl font-semibold text-heading tabular-nums">{c ? formatPoisha(c.net) : "…"}</p>
      <p className="text-xs text-muted-foreground">
        {c ? `${c.transactions} payments${c.refunds ? ` · refunds ${formatPoisha(c.refunds)}` : ""}` : ""}
      </p>
      <ul className="space-y-1.5">
        {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((m) => {
          const Icon = ICON[m];
          return (
            <li key={m} className="flex items-center gap-2 text-sm">
              <Icon className="size-4 text-muted-foreground" />
              <span className="flex-1">
                {METHOD_LABEL[m].label} <span className="font-bangla text-xs text-muted-foreground">· {METHOD_LABEL[m].labelBn}</span>
              </span>
              <span className="font-medium tabular-nums">{c ? formatPoisha(c.byMethod[m].amount) : "—"}</span>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

const CHECKS = [
  { key: "cash", label: "Cash in the drawer matches the cash total", labelBn: "ড্রয়ারের নগদ টাকা মিলেছে" },
  { key: "card", label: "Card machine settlement matches the card total", labelBn: "কার্ড মেশিনের হিসাব মিলেছে" },
  { key: "bkash", label: "bKash merchant statement matches", labelBn: "বিকাশ স্টেটমেন্ট মিলেছে" },
  { key: "nagad", label: "Nagad merchant statement matches", labelBn: "নগদ স্টেটমেন্ট মিলেছে" },
  { key: "refunds", label: "Every refund has a signed slip", labelBn: "প্রতিটি ফেরতের রসিদ আছে" },
];

const CHECK_KEY = (date: string) => `tl_recon_${date}`;
const readChecks = (date: string): string[] => {
  try {
    return JSON.parse(localStorage.getItem(CHECK_KEY(date)) ?? "[]");
  } catch {
    return [];
  }
};

/** Daily collection page: totals, by method and department, and the end-of-day checklist */
export function DailyCollectionScreen() {
  return (
    <RequirePermission permission="bill:read">
      <CollectionContent />
    </RequirePermission>
  );
}

function CollectionContent() {
  const [date, setDate] = useState(todayDhaka());
  const c = useCollection(date).data;
  // The checklist is a personal aid for the cashier on this computer (not an audited record)
  const [done, setDone] = useState<string[]>(() => (typeof window === "undefined" ? [] : readChecks(todayDhaka())));
  const toggle = (key: string) => {
    const next = done.includes(key) ? done.filter((k) => k !== key) : [...done, key];
    setDone(next);
    try {
      localStorage.setItem(CHECK_KEY(date), JSON.stringify(next));
    } catch {}
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily collection · দৈনিক সংগ্রহ"
        description="Money received on a day, by payment method and department, with the end-of-day reconciliation checklist."
        actions={
          <Input
            type="date"
            value={date}
            max={todayDhaka()}
            onChange={(e) => {
              const d = e.target.value || todayDhaka();
              setDate(d);
              setDone(readChecks(d));
            }}
            aria-label="Date"
            className="w-auto"
          />
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Net collected" value={c ? formatPoisha(c.net) : "…"} icon={Wallet} hint={c ? `${c.transactions} payments` : undefined} />
        {(["cash", "card"] as PaymentMethod[]).map((m) => (
          <StatCard key={m} label={METHOD_LABEL[m].label} value={c ? formatPoisha(c.byMethod[m].amount) : "…"} icon={ICON[m]} hint={c ? `${c.byMethod[m].count} payments` : undefined} />
        ))}
        <StatCard
          label="Mobile banking"
          value={c ? formatPoisha(c.byMethod.bkash.amount + c.byMethod.nagad.amount) : "…"}
          icon={Smartphone}
          hint={c ? `bKash ${formatPoisha(c.byMethod.bkash.amount)} · Nagad ${formatPoisha(c.byMethod.nagad.amount)}` : undefined}
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="By department" bodyClassName="p-0">
          {c && c.byDepartment.length ? (
            <ul className="divide-y">
              {c.byDepartment.map((d) => (
                <li key={d.department} className="flex justify-between px-5 py-3 text-sm">
                  <span>{d.department}</span>
                  <span className="font-semibold tabular-nums">{formatPoisha(d.amount)}</span>
                </li>
              ))}
              {c.refunds > 0 && (
                <li className="flex justify-between px-5 py-3 text-sm text-status-danger-fg">
                  <span>Refunds given</span>
                  <span className="font-semibold tabular-nums">− {formatPoisha(c.refunds)}</span>
                </li>
              )}
            </ul>
          ) : (
            <p className="px-5 pb-5 text-sm text-muted-foreground">No payments on this day.</p>
          )}
        </SectionCard>
        <SectionCard title="Reconciliation checklist" description="Tick each line when the count matches — saved on this computer">
          <ul className="space-y-2">
            {CHECKS.map((ch) => {
              const on = done.includes(ch.key);
              return (
                <li key={ch.key}>
                  <button type="button" onClick={() => toggle(ch.key)} aria-pressed={on} className={cn("flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm", on ? "border-status-success-border bg-status-success-bg" : "hover:bg-muted")}>
                    {on ? <CheckCircle2 className="size-5 text-status-success-fg" /> : <Circle className="size-5 text-muted-foreground" />}
                    <span>
                      {ch.label}
                      <span className="font-bangla block text-xs text-muted-foreground">{ch.labelBn}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-sm font-medium text-heading">
            {done.length}/{CHECKS.length} checked {done.length === CHECKS.length && "· ready to close the day ✓"}
          </p>
        </SectionCard>
      </div>
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { Workflow } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { RequirePermission } from "@/components/shared/forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetchPage } from "@/lib/api";

type DomainEvent = {
  id: string;
  name: string;
  payload: Record<string, unknown>;
  occurredAt: string;
  consumers: { name: string; status: "pending" | "done" | "failed"; processedAt?: string; error?: string }[];
};

const EVENT_NAMES = [
  "appointment.booked",
  "appointment.cancelled",
  "appointment.rescheduled",
  "appointment.checked_in",
  "appointment.no_show",
  "appointment.completed",
  "visit.closed",
  "lab.order_created",
  "lab.sample_collected",
  "lab.report_ready",
  "doctor.leave_added",
  "chat.message_received",
  "chat.booking_created",
  "chat.handover_requested",
];

const TONE = { pending: "waiting", done: "success", failed: "danger" } as const;

/**
 * Read-only log of business events (ids only, no patient details). Automation rules
 * (consumers named automation:<rule>) react to these; failed consumers show here.
 */
export function EventLogScreen() {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page), limit: "30", ...(name && { name }), ...(status && { status }) });
  const events = useQuery({ queryKey: ["events", name, status, page], queryFn: () => apiFetchPage<DomainEvent>(`/events?${params}`) });

  return (
    <RequirePermission permission="audit:read">
      <div className="space-y-6">
        <PageHeader title="Event log · ইভেন্ট লগ" description="Every business event the system published, and which consumers processed it." />
        <SectionCard
          title="Events"
          action={
            <div className="flex gap-2">
              <NativeSelect value={name} onChange={(e) => {
                setName(e.target.value);
                setPage(1);
              }} aria-label="Event name" className="w-56">
                <option value="">All events</option>
                {EVENT_NAMES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </NativeSelect>
              <NativeSelect value={status} onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }} aria-label="Consumer status" className="w-40">
                <option value="">Any status</option>
                <option value="pending">Pending</option>
                <option value="done">Done</option>
                <option value="failed">Failed</option>
              </NativeSelect>
            </div>
          }
          bodyClassName="p-0"
        >
          {!events.data ? (
            <Skeleton className="m-5 h-60" />
          ) : events.data.items.length === 0 ? (
            <EmptyState icon={Workflow} title="No events" description="Events appear as appointments, visits and lab orders change." />
          ) : (
            <ul className="divide-y">
              {events.data.items.map((e) => (
                <li key={e.id} className="flex flex-wrap items-start gap-3 px-5 py-3">
                  <span className="w-36 shrink-0 text-xs text-muted-foreground tabular-nums">
                    {new Date(e.occurredAt).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-medium text-heading">{e.name}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">{JSON.stringify(e.payload)}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {e.consumers.length === 0 ? (
                      <span className="text-xs text-muted-foreground">no consumers</span>
                    ) : (
                      e.consumers.map((c) => (
                        <span key={c.name} title={c.error}>
                          <StatusBadge tone={TONE[c.status]}>{c.name}</StatusBadge>
                        </span>
                      ))
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {events.data && events.data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 border-t px-5 py-3 text-sm">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-muted-foreground">
                Page {page} of {events.data.pagination.totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= events.data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </SectionCard>
      </div>
    </RequirePermission>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable, DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, apiFetchPage } from "@/lib/api";
import { DecisionTimeline } from "./outbox-tab";
import { Job, Rule, Run, when } from "./types";

/** Failed sends of a rule around the time of a run */
function FailedJobs({ run }: { run: Run }) {
  const from = new Date(new Date(run.startedAt).getTime() - 60 * 60_000).toISOString();
  const jobs = useQuery({
    queryKey: ["automation", "failed-jobs", run.id],
    queryFn: () =>
      apiFetchPage<Job>(
        `/automation/jobs?status=failed&from=${from}&limit=20${run.ruleKey !== "dispatcher" ? `&ruleKey=${run.ruleKey}` : ""}`,
      ),
  });
  if (!jobs.data) return <Skeleton className="h-40" />;
  if (!jobs.data.items.length && !run.errors.length) return <p className="text-sm text-muted-foreground">No failures around this run.</p>;
  return (
    <div className="space-y-4">
      {run.errors.map((e, i) => (
        <p key={i} className="rounded-lg bg-destructive/10 p-2 font-mono text-xs text-destructive">
          {e}
        </p>
      ))}
      {jobs.data.items.map((j) => (
        <div key={j.id} className="space-y-2 rounded-lg border p-3">
          <p className="text-sm font-medium">
            {j.title} · <code className="text-xs">{j.dedupeKey}</code>
          </p>
          {j.lastError && <p className="text-xs text-destructive">{j.lastError}</p>}
          <DecisionTimeline job={j} />
        </div>
      ))}
    </div>
  );
}

export function RunsTab() {
  const [ruleKey, setRuleKey] = useState("");
  const [kind, setKind] = useState("");
  const [withErrors, setWithErrors] = useState(false);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Run | null>(null);
  const rules = useQuery({ queryKey: ["automation", "rules"], queryFn: () => apiFetch<Rule[]>("/automation/rules") });
  const params = new URLSearchParams({
    page: String(page),
    limit: "30",
    ...(ruleKey && { ruleKey }),
    ...(kind && { kind }),
    ...(withErrors && { withErrors: "true" }),
  });
  const runs = useQuery({
    queryKey: ["automation", "runs", params.toString()],
    queryFn: () => apiFetchPage<Run>(`/automation/runs?${params}`),
    refetchInterval: 30_000,
  });

  const columns: DataTableColumn<Run>[] = [
    { key: "time", header: "Started", cell: (r) => <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">{when(r.startedAt, true)}</span> },
    {
      key: "rule",
      header: "Rule",
      cell: (r) => (
        <div>
          <p className="text-sm font-medium text-heading">{r.title}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {r.kind}
            {r.trigger && r.trigger !== "cron" ? ` · ${r.trigger}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "counts",
      header: "Scanned / created / sent / deferred / skipped",
      className: "hidden md:table-cell",
      cell: (r) => (
        <span className="text-sm tabular-nums">
          {r.scanned} / {r.created} / {r.sent} / {r.deferred} / {r.skipped}
        </span>
      ),
    },
    {
      key: "result",
      header: "Result",
      cell: (r) =>
        r.errors.length || r.failed ? (
          <StatusBadge tone="danger">{r.failed ? `${r.failed} failed` : "error"}</StatusBadge>
        ) : (
          <StatusBadge tone="success">ok{r.durationMs != null ? ` · ${r.durationMs} ms` : ""}</StatusBadge>
        ),
    },
  ];

  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };

  return (
    <>
      <DataTable
        data={runs.data?.items ?? []}
        columns={columns}
        getRowId={(r) => r.id}
        isLoading={runs.isPending}
        onRowClick={setOpen}
        emptyTitle="No runs yet"
        emptyDescription="Planners record a run when they plan something (and once an hour as a heartbeat)."
        server={{
          page,
          pageSize: 30,
          total: runs.data?.pagination.total ?? 0,
          totalPages: runs.data?.pagination.totalPages ?? 1,
          onPageChange: setPage,
        }}
        filters={
          <>
            <NativeSelect className="w-auto" value={ruleKey} onChange={(e) => reset(() => setRuleKey(e.target.value))} aria-label="Rule">
              <option value="">All rules</option>
              <option value="dispatcher">Dispatcher</option>
              {rules.data?.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.title}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect className="w-auto" value={kind} onChange={(e) => reset(() => setKind(e.target.value))} aria-label="Kind">
              <option value="">All kinds</option>
              <option value="planner">Planner</option>
              <option value="event">Event</option>
              <option value="dispatch">Dispatch</option>
            </NativeSelect>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={withErrors} onChange={(e) => reset(() => setWithErrors(e.target.checked))} /> Only failures
            </label>
          </>
        }
      />
      <Sheet open={Boolean(open)} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto data-[side=right]:sm:max-w-lg">
          <SheetHeader className="border-b">
            <SheetTitle className="text-lg font-semibold text-heading">{open?.title}</SheetTitle>
            <SheetDescription>
              {open?.kind} · {when(open?.startedAt, true)}
            </SheetDescription>
          </SheetHeader>
          <div className="p-5">{open && <FailedJobs run={open} />}</div>
        </SheetContent>
      </Sheet>
    </>
  );
}

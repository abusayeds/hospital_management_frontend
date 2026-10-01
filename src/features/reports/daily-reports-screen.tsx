"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, ChevronDown, FileBarChart, ListChecks, Loader2, Send, Settings2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/shared/forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, apiFetchPage, getErrorMessage } from "@/lib/api";
import { addDaysTo, todayDhaka } from "@/lib/appointments";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/patients";
import { useLiveEvents } from "@/lib/socket";
import { cn } from "@/lib/utils";

type DailyReport = {
  id: string;
  date: string;
  source: "ai" | "fallback";
  narrative: string;
  highlights: string[];
  bullets: string[];
  stats: Record<string, unknown>;
  model: string | null;
  promptVersion: string | null;
  fallbackReason: string | null;
  generatedAt: string;
  generatedBy: string | null;
  deliveredAt: string | null;
  deliveryCount: number;
};

const LIVE_EVENTS = ["reports:updated"];

/**
 * Management → Reports: one end-of-day report per date. Written by the AI from aggregated numbers
 * (no patient data); when the AI is unavailable the plain bullet summary is used and marked as such.
 */
export function DailyReportsScreen() {
  return (
    <RequirePermission permission="report:operations">
      <Content />
    </RequirePermission>
  );
}

function Content() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(addDaysTo(todayDhaka(), -1));
  const [open, setOpen] = useState<string | null>(null);
  const reports = useQuery({ queryKey: ["daily-reports"], queryFn: () => apiFetchPage<DailyReport>("/reports/daily?limit=60") });
  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: ["daily-reports"] }), [queryClient]);
  useLiveEvents(LIVE_EVENTS, refresh);

  const generate = useMutation({
    mutationFn: () => apiFetch<DailyReport>("/reports/daily/generate", { method: "POST", body: { date } }),
    meta: { silent: true },
    onSuccess: (r) => {
      refresh();
      setOpen(r.date);
      if (r.source === "ai") toast.success(`AI report ready for ${formatDate(r.date)}`);
      else toast.warning(`Summary made without AI: ${r.fallbackReason ?? "AI unavailable"}`);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const items = reports.data?.items ?? [];
  const current = open ?? items[0]?.date ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily reports · দৈনিক রিপোর্ট"
        description="Every evening at 21:30 the day's numbers become a short Bangla report for management — in-app, and on WhatsApp for the phones set in Automation."
        actions={
          can("automation:read") && (
            <Button size="lg" variant="outline" render={<Link href="/management/automation" />} nativeButton={false}>
              <Settings2 /> Delivery settings
            </Button>
          )
        }
      />

      <SectionCard title="Make a report now" description="Defaults to yesterday, a complete day. Making it again replaces that day's report.">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            generate.mutate();
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor="report-date" className="text-sm font-medium">
              Date
            </label>
            <Input
              id="report-date"
              type="date"
              value={date}
              max={todayDhaka()}
              onChange={(e) => setDate(e.target.value || addDaysTo(todayDhaka(), -1))}
              className="w-auto"
            />
          </div>
          <Button type="submit" size="lg" disabled={generate.isPending}>
            {generate.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />} Generate report
          </Button>
          <p className="text-xs text-muted-foreground">Uses counts and totals only — no patient names, diagnoses or results are sent to the AI.</p>
        </form>
      </SectionCard>

      {reports.isPending ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      ) : items.length === 0 ? (
        <SectionCard title="No reports yet">
          <p className="text-sm text-muted-foreground">The first report arrives tonight at 21:30, or make one for yesterday above.</p>
        </SectionCard>
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <ReportItem key={r.id} report={r} expanded={current === r.date} onToggle={() => setOpen(current === r.date ? "" : r.date)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ReportItem({ report: r, expanded, onToggle }: { report: DailyReport; expanded: boolean; onToggle: () => void }) {
  const queryClient = useQueryClient();
  const resend = useMutation({
    mutationFn: () => apiFetch<DailyReport>(`/reports/daily/${r.date}/resend`, { method: "POST" }),
    meta: { silent: true },
    onSuccess: () => {
      toast.success("Report sent again");
      queryClient.invalidateQueries({ queryKey: ["daily-reports"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <li className="rounded-xl border bg-card shadow-card">
      <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex w-full items-center gap-3 px-5 py-4 text-left">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
          {r.source === "ai" ? <Bot className="size-[18px]" /> : <ListChecks className="size-[18px]" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-heading">{formatDate(r.date)}</span>
          <span className="font-bangla block truncate text-sm text-muted-foreground">{r.source === "ai" ? r.narrative : r.bullets[0]}</span>
        </span>
        <Badge variant={r.source === "ai" ? "default" : "secondary"}>{r.source === "ai" ? "AI" : "Summary"}</Badge>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded && (
        <div className="space-y-5 border-t px-5 py-5">
          {r.source === "ai" ? (
            <p className="font-bangla text-[15px] leading-7 text-heading whitespace-pre-line">{r.narrative}</p>
          ) : (
            <p className="rounded-lg border border-status-waiting-border bg-status-waiting-bg px-4 py-2.5 text-sm text-status-waiting-fg">
              Made without AI — {r.fallbackReason ?? "AI unavailable"}. The numbers below are complete.
            </p>
          )}
          {r.highlights.length > 0 && (
            <ul className="font-bangla list-disc space-y-1 pl-5 text-sm">
              {r.highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          )}
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-heading">
              <FileBarChart className="size-4" /> The numbers
            </h3>
            <ul className="font-bangla space-y-1 rounded-lg bg-muted/50 p-4 text-sm">
              {r.bullets.map((b) => (
                <li key={b}>• {b}</li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              Made {new Date(r.generatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}{" "}
              {r.generatedBy ? "by a staff member" : "automatically"}
              {r.model && ` · ${r.model} · ${r.promptVersion}`}
              {r.deliveryCount > 0 && ` · sent ${r.deliveryCount}×`}
            </span>
            <Button size="sm" variant="outline" onClick={() => resend.mutate()} disabled={resend.isPending}>
              {resend.isPending ? <Loader2 className="animate-spin" /> : <Send />} Send again
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

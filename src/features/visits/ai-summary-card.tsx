"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardPaste, Loader2, RefreshCw, Sparkles, ThumbsDown, ThumbsUp, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type SummaryContent = {
  summary: string;
  activeProblems: string[];
  currentMedications: string[];
  allergies: string[];
  abnormalFindings: string[];
  trends: string[];
  pointsToReview: string[];
};

type SummaryView = {
  patientId: string;
  content: SummaryContent;
  label: string;
  promptVersion: string;
  model: string;
  generatedAt: string;
  stale: boolean;
  staleReason: string | null;
  myFeedback: "up" | "down" | null;
};

const SECTIONS: { key: Exclude<keyof SummaryContent, "summary">; title: string }[] = [
  { key: "activeProblems", title: "Problems" },
  { key: "currentMedications", title: "Medicines" },
  { key: "abnormalFindings", title: "Abnormal findings" },
  { key: "trends", title: "Trends" },
  { key: "pointsToReview", title: "Points to review" },
];

export const summaryAsText = (c: SummaryContent) =>
  [c.summary, ...SECTIONS.filter((s) => c[s.key].length).map((s) => `${s.title}: ${c[s.key].join("; ")}`)].join("\n");

/**
 * Staff-only card: a draft brief of the patient's past records, made by the AI service from
 * de-identified data. Always labelled as AI-generated; never saved into the visit by itself —
 * "Insert into notes" is an explicit doctor action that marks the visit "AI summary used".
 */
export function AiSummaryCard({ patientId, onInsert }: { patientId: string; onInsert?: (text: string) => void }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const key = ["ai-summary", patientId];
  const allowed = can("ai_summary:use");
  const state = useQuery({
    queryKey: key,
    queryFn: () => apiFetch<{ configured: boolean; summary: SummaryView | null }>(`/patients/${patientId}/ai-summary`),
    enabled: allowed,
    meta: { silent: true },
  });
  const generate = useMutation({
    mutationFn: (force: boolean) => apiFetch<SummaryView>(`/patients/${patientId}/ai-summary`, { method: "POST", body: { force } }),
    onSuccess: (summary) => queryClient.setQueryData(key, { configured: true, summary }),
  });
  const feedback = useMutation({
    mutationFn: (rating: "up" | "down") => apiFetch<SummaryView>(`/patients/${patientId}/ai-summary/feedback`, { method: "POST", body: { rating } }),
    onSuccess: (summary) => {
      queryClient.setQueryData(key, { configured: true, summary });
      toast.success("Thanks — feedback recorded");
    },
  });

  if (!allowed || !state.data) return null;
  if (!state.data.configured)
    return <p className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">AI summary is not configured on this server.</p>;

  const s = state.data.summary;
  return (
    <SectionCard
      title={
        <span className="flex items-center gap-1.5">
          <Sparkles className="size-4 text-primary" /> Visit summary
        </span>
      }
      action={
        s && (
          <Button variant="ghost" size="icon-sm" disabled={generate.isPending} onClick={() => generate.mutate(true)} title="Regenerate" aria-label="Regenerate summary">
            <RefreshCw className={cn(generate.isPending && "animate-spin")} />
          </Button>
        )
      }
    >
      <p className="mb-3 flex items-center gap-1.5 rounded-md border border-status-waiting-border bg-status-waiting-bg px-2 py-1 text-xs font-semibold text-status-waiting-fg">
        <TriangleAlert className="size-3.5" /> AI-generated — verify before use
      </p>
      {!s ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">A short brief of earlier visits, vitals and verified lab results. Identity details are never sent.</p>
          <Button variant="outline" size="sm" disabled={generate.isPending} onClick={() => generate.mutate(false)}>
            {generate.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />} Generate summary
          </Button>
        </div>
      ) : (
        <div className={cn("space-y-3 text-sm", generate.isPending && "opacity-50")}>
          {s.stale && (
            <p className="rounded-md bg-muted px-2 py-1 text-xs">
              {s.staleReason ?? "New information arrived"} —{" "}
              <button type="button" className="font-medium text-primary underline" onClick={() => generate.mutate(true)}>
                update
              </button>
            </p>
          )}
          <p>{s.content.summary}</p>
          {SECTIONS.filter((sec) => s.content[sec.key].length > 0).map((sec) => (
            <div key={sec.key}>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{sec.title}</p>
              <ul className="list-inside list-disc">
                {s.content[sec.key].map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-1 border-t pt-2">
            {onInsert && (
              <Button variant="outline" size="sm" onClick={() => onInsert(summaryAsText(s.content))}>
                <ClipboardPaste /> Insert into notes
              </Button>
            )}
            <span className="ml-auto text-xs text-muted-foreground">Useful?</span>
            <Button variant={s.myFeedback === "up" ? "default" : "ghost"} size="icon-sm" aria-label="Helpful" onClick={() => feedback.mutate("up")}>
              <ThumbsUp />
            </Button>
            <Button variant={s.myFeedback === "down" ? "default" : "ghost"} size="icon-sm" aria-label="Not helpful" onClick={() => feedback.mutate("down")}>
              <ThumbsDown />
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {new Date(s.generatedAt).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {s.promptVersion}
          </p>
        </div>
      )}
    </SectionCard>
  );
}

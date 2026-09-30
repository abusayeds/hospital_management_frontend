"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BadgeCheck, Ban, FileDown, HandHelping, Loader2, Save, Send, TestTube2, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { flagLabValue, formatRange } from "@/lib/clinical-rules";
import { cn } from "@/lib/utils";
import { FLAG_STYLE, LabOrder } from "./types";

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

type Values = Record<string, Record<string, string>>; // labTestId → parameter → value

const initialValues = (o: LabOrder): Values =>
  Object.fromEntries(o.tests.map((t) => [t.labTestId, Object.fromEntries(t.results.map((r) => [r.name, r.value]))]));

/** Read-only results table (verified reports, doctors, verifier) */
export function ResultsTable({ order }: { order: LabOrder }) {
  return (
    <div className="space-y-4">
      {order.tests.map((t) => (
        <div key={t.labTestId}>
          <p className="mb-1 font-semibold text-heading">
            {t.name} <span className="font-mono text-xs font-normal text-muted-foreground">{t.code}</span>
          </p>
          {t.results.length === 0 ? (
            <p className="text-sm text-muted-foreground">Results appear here after the lab verifies them.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y">
                {t.results.map((r) => (
                  <tr key={r.name}>
                    <td className="py-1.5 pr-2">{r.name}</td>
                    <td className={cn("py-1.5 pr-2 tabular-nums", r.flag && FLAG_STYLE[r.flag].className)}>
                      {r.value || "—"} {r.unit}
                      {r.flag && r.flag !== "normal" && <span className="ml-1 text-xs uppercase">({FLAG_STYLE[r.flag].label})</span>}
                    </td>
                    <td className="py-1.5 text-xs text-muted-foreground">{r.normalText || formatRange(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {t.comment && <p className="mt-1 text-sm text-muted-foreground">Comment: {t.comment}</p>}
        </div>
      ))}
    </div>
  );
}

/**
 * Everything the lab does with one order, depending on its status:
 * collect → enter results → submit → (another person) verify or send back → print / hand over.
 */
export function LabOrderPanel({ order, onChange }: { order: LabOrder; onChange: (o: LabOrder) => void }) {
  const { can, user } = useAuth();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Values>(() => initialValues(order));
  const [comments, setComments] = useState<Record<string, string>>(() => Object.fromEntries(order.tests.map((t) => [t.labTestId, t.comment])));
  const [reason, setReason] = useState("");
  const [asking, setAsking] = useState<"reject" | "cancel" | null>(null);

  const run = useMutation({
    mutationFn: ({ path, method = "POST", body }: { path: string; method?: "POST" | "PATCH"; body?: unknown }) =>
      apiFetch<LabOrder>(`/lab-orders/${order.id}${path}`, { method, body }),
    onSuccess: (o, { path }) => {
      onChange(o);
      queryClient.invalidateQueries({ queryKey: ["lab"] });
      const msg: Record<string, string> = {
        "/collect": "Sample collected",
        "/results": "Results saved",
        "/submit": "Sent for verification",
        "/verify": "Verified — the doctor can see the report now",
        "/reject": "Sent back for correction",
        "/deliver": "Marked as handed over",
        "/cancel": "Order cancelled",
      };
      toast.success(msg[path] ?? "Saved");
      setAsking(null);
      setReason("");
    },
  });

  const editable = ["sample_collected", "processing"].includes(order.status) && can("lab_result:create");
  const resultsBody = () => ({
    tests: order.tests.map((t) => ({
      labTestId: t.labTestId,
      results: Object.entries(values[t.labTestId] ?? {}).map(([name, value]) => ({ name, value })),
      comment: comments[t.labTestId] ?? "",
    })),
  });
  const enteredByMe = order.resultsEnteredBy?.id === user?.id;
  const busy = run.isPending;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={order.status === "cancelled" ? "cancelled" : order.status} />
        {order.priority === "urgent" && <StatusBadge tone="danger">Urgent</StatusBadge>}
        <span className="font-mono text-xs text-muted-foreground">{order.orderNo}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <p>
          <span className="text-muted-foreground">Patient:</span> {order.patient.name} · {order.patient.age} y · <span className="font-mono">{order.patient.patientCode}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Doctor:</span> {order.doctor?.displayName ?? "—"}
        </p>
        {order.clinicalNote && (
          <p className="col-span-2">
            <span className="text-muted-foreground">Clinical note:</span> {order.clinicalNote}
          </p>
        )}
        <p className="text-xs text-muted-foreground">Ordered {when(order.createdAt)}</p>
        {order.sampleCollectedAt && <p className="text-xs text-muted-foreground">Collected {when(order.sampleCollectedAt)}</p>}
      </div>

      {order.status === "ordered" && (
        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          <p className="font-medium text-heading">Samples needed</p>
          <ul className="mt-1 list-inside list-disc">
            {order.tests.map((t) => (
              <li key={t.labTestId}>
                {t.name} — {t.sampleType}
              </li>
            ))}
          </ul>
        </div>
      )}

      {editable ? (
        <div className="space-y-5">
          {order.tests.map((t) => (
            <div key={t.labTestId} className="space-y-2">
              <p className="font-semibold text-heading">
                {t.name} <span className="font-mono text-xs font-normal text-muted-foreground">{t.code}</span>
              </p>
              {t.results.map((r) => {
                const value = values[t.labTestId]?.[r.name] ?? "";
                const flag = flagLabValue(value, r);
                return (
                  <div key={r.name} className="grid grid-cols-[1fr_8rem_7rem] items-center gap-2">
                    <Label htmlFor={`${t.labTestId}-${r.name}`} className="text-sm">
                      {r.name}
                      <span className="block text-xs font-normal text-muted-foreground">{r.normalText || formatRange(r)}</span>
                    </Label>
                    <Input
                      id={`${t.labTestId}-${r.name}`}
                      value={value}
                      inputMode={r.normalText ? "text" : "decimal"}
                      onChange={(e) => setValues((v) => ({ ...v, [t.labTestId]: { ...v[t.labTestId], [r.name]: e.target.value } }))}
                      className={cn("tabular-nums", flag === "critical" && "border-status-danger-border bg-status-danger-bg", flag && flag !== "normal" && flag !== "critical" && "border-status-waiting-border bg-status-waiting-bg")}
                    />
                    <span className={cn("text-xs", flag ? FLAG_STYLE[flag].className : "text-muted-foreground")}>
                      {r.unit} {flag && flag !== "normal" && `· ${FLAG_STYLE[flag].label}`}
                    </span>
                  </div>
                );
              })}
              <Input
                placeholder="Comment (optional)"
                value={comments[t.labTestId] ?? ""}
                onChange={(e) => setComments((c) => ({ ...c, [t.labTestId]: e.target.value }))}
                aria-label={`Comment for ${t.name}`}
              />
            </div>
          ))}
        </div>
      ) : (
        order.status !== "ordered" && <ResultsTable order={order} />
      )}

      {order.status === "awaiting_verification" && (
        <p className={cn("rounded-lg px-3 py-2 text-sm", enteredByMe ? "bg-status-waiting-bg text-status-waiting-fg" : "bg-muted")}>
          Entered by {order.resultsEnteredBy?.name ?? "—"} at {when(order.resultsEnteredAt)}.
          {enteredByMe && " You entered these results — a colleague must verify them (four-eyes rule)."}
        </p>
      )}
      {order.history.at(-1)?.note.startsWith("rejected") && order.status === "processing" && (
        <p className="flex items-center gap-1.5 rounded-lg bg-status-danger-bg px-3 py-2 text-sm text-status-danger-fg">
          <AlertTriangle className="size-4" /> Sent back: {order.history.at(-1)?.note.replace(/^rejected: /, "")}
        </p>
      )}
      {order.verifiedBy && (
        <p className="flex items-center gap-1.5 text-sm text-status-success-fg">
          <BadgeCheck className="size-4" /> Verified by {order.verifiedBy.name} · {when(order.verifiedAt)}
        </p>
      )}

      {asking && (
        <div className="space-y-2 rounded-lg border p-3">
          <Label htmlFor="lab-reason">{asking === "reject" ? "What must be corrected?" : "Why is the order cancelled?"}</Label>
          <Textarea id="lab-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" disabled={reason.trim().length < 3 || busy} onClick={() => run.mutate({ path: `/${asking}`, body: { reason } })}>
              Confirm
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAsking(null)}>
              Back
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t pt-4">
        {busy && <Loader2 className="size-5 animate-spin self-center text-muted-foreground" />}
        {order.status === "ordered" && can("lab_result:create") && (
          <Button size="lg" disabled={busy} onClick={() => run.mutate({ path: "/collect" })}>
            <TestTube2 /> Sample collected
          </Button>
        )}
        {editable && (
          <>
            <Button variant="outline" size="lg" disabled={busy} onClick={() => run.mutate({ path: "/results", method: "PATCH", body: resultsBody() })}>
              <Save /> Save
            </Button>
            <Button
              size="lg"
              disabled={busy}
              onClick={async () => {
                await run.mutateAsync({ path: "/results", method: "PATCH", body: resultsBody() });
                run.mutate({ path: "/submit" });
              }}
            >
              <Send /> Submit for verification
            </Button>
          </>
        )}
        {order.status === "awaiting_verification" && can("lab_report:verify") && (
          <>
            <Button size="lg" disabled={busy} onClick={() => run.mutate({ path: "/verify" })}>
              <BadgeCheck /> Verify &amp; release
            </Button>
            <Button variant="outline" size="lg" disabled={busy} onClick={() => setAsking("reject")}>
              <Undo2 /> Send back
            </Button>
          </>
        )}
        {["ready", "delivered"].includes(order.status) && (can("lab_report:read") || can("lab_report:deliver")) && (
          <Button variant="outline" size="lg" render={<a href={`/api/v1/lab-orders/${order.id}/report.pdf`} target="_blank" rel="noopener" />} nativeButton={false}>
            <FileDown /> Print report
          </Button>
        )}
        {order.status === "ready" && can("lab_report:deliver") && (
          <Button size="lg" disabled={busy} onClick={() => run.mutate({ path: "/deliver" })}>
            <HandHelping /> Handed to patient
          </Button>
        )}
        {["ordered", "sample_collected", "processing"].includes(order.status) && can("lab_result:create") && (
          <Button variant="ghost" size="lg" className="ml-auto text-status-danger-fg" disabled={busy} onClick={() => setAsking("cancel")}>
            <Ban /> Cancel order
          </Button>
        )}
      </div>
    </div>
  );
}

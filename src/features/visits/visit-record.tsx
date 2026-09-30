"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FilePlus2, Loader2, Lock, Printer } from "lucide-react";
import { ReactNode, useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/patients";
import { TIMING_LABEL, Visit } from "./types";

const Block = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="space-y-1">
    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
    <div className="text-sm whitespace-pre-wrap text-foreground">{children}</div>
  </div>
);

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/**
 * A visit as a signed, read-only record. Closed visits cannot be edited: corrections are
 * added below as addenda (who, when, what and why), and the original text stays.
 */
export function VisitRecord({ visit, onChanged }: { visit: Visit; onChanged?: (v: Visit) => void }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [reason, setReason] = useState("");

  const addendum = useMutation({
    mutationFn: () => apiFetch<Visit>(`/visits/${visit.id}/addenda`, { method: "POST", body: { text, reason } }),
    onSuccess: (v) => {
      toast.success("Addendum added to the record");
      setAdding(false);
      setText("");
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["emr"] });
      onChanged?.(v);
    },
  });

  const diagnosis = visit.finalDiagnosis || visit.provisionalDiagnosis;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={visit.status === "closed" ? "success" : "active"}>{visit.status === "closed" ? "Closed · signed" : "Open"}</StatusBadge>
        {visit.prescriptionNo && <span className="font-mono text-xs text-muted-foreground">{visit.prescriptionNo}</span>}
        <span className="text-xs text-muted-foreground">
          {formatDate(visit.date)} · {visit.doctor.displayName}
        </span>
        {visit.status === "closed" && (
          <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="size-3" /> Read-only
            <Button size="sm" variant="outline" render={<a href={`/api/v1/visits/${visit.id}/prescription.pdf`} target="_blank" rel="noopener" />} nativeButton={false}>
              <Printer /> Print prescription
            </Button>
          </span>
        )}
      </div>

      {visit.chiefComplaints.length > 0 && <Block title="Chief complaints">{visit.chiefComplaints.join(" · ")}</Block>}
      {visit.historyOfPresentIllness && <Block title="History of present illness">{visit.historyOfPresentIllness}</Block>}
      {visit.examination && <Block title="Examination">{visit.examination}</Block>}
      {diagnosis && (
        <Block title={visit.finalDiagnosis ? "Diagnosis" : "Provisional diagnosis"}>
          <span className="font-medium text-heading">{diagnosis}</span>
        </Block>
      )}
      {visit.investigations.length > 0 && <Block title="Investigations">{visit.investigations.map((i) => i.name).join(", ")}</Block>}

      {visit.prescription.length > 0 && (
        <Block title="Rx">
          <ol className="space-y-2">
            {visit.prescription.map((item, i) => (
              <li key={i} className="rounded-lg border px-3 py-2">
                <p className="font-medium text-heading">
                  {i + 1}. {item.form && <span className="capitalize">{item.form}. </span>}
                  {item.brandName} {item.strength}
                  {item.genericName && <span className="font-normal text-muted-foreground"> ({item.genericName})</span>}
                </p>
                <p className="font-bangla">{item.instructionsBn}</p>
                <p className="text-xs text-muted-foreground">
                  {item.instructionsEn}
                  {item.timing && ` · ${TIMING_LABEL[item.timing].split(" · ")[0]}`}
                </p>
              </li>
            ))}
          </ol>
        </Block>
      )}
      {(visit.adviceBn || visit.adviceEn) && (
        <Block title="Advice">
          {visit.adviceBn && <p className="font-bangla">{visit.adviceBn}</p>}
          {visit.adviceEn && <p>{visit.adviceEn}</p>}
        </Block>
      )}
      {visit.followUp?.date && (
        <Block title="Follow-up">
          {formatDate(visit.followUp.date)} {visit.followUp.note && `— ${visit.followUp.note}`}
        </Block>
      )}
      {visit.referral?.to && <Block title="Referral">{`${visit.referral.to}${visit.referral.reason ? ` — ${visit.referral.reason}` : ""}`}</Block>}
      {visit.allergyOverrides.length > 0 && (
        <Block title="Allergy overrides">
          {visit.allergyOverrides.map((o, i) => (
            <p key={i} className="text-status-danger-fg">
              {o.medicine} despite {o.allergy} allergy — “{o.reason}”
            </p>
          ))}
        </Block>
      )}

      {visit.addenda.length > 0 && (
        <div className="space-y-2 border-t pt-4">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Addenda (corrections after signing)</p>
          {visit.addenda.map((a) => (
            <div key={a.id} className="rounded-lg border-l-4 border-status-waiting-border bg-status-waiting-bg/40 px-3 py-2 text-sm">
              <p className="whitespace-pre-wrap">{a.text}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Why: {a.reason} · {a.byName} · {when(a.at)}
              </p>
            </div>
          ))}
        </div>
      )}

      {visit.status === "closed" && can("visit:create") && (
        <div className="border-t pt-4">
          {adding ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="addendum-text">Correction or addition</Label>
                <Textarea id="addendum-text" value={text} onChange={(e) => setText(e.target.value)} rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="addendum-reason">Why is the record being corrected?</Label>
                <Textarea id="addendum-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="e.g. Lab result arrived after the visit" />
              </div>
              <div className="flex gap-2">
                <Button disabled={addendum.isPending || text.trim().length < 3 || reason.trim().length < 3} onClick={() => addendum.mutate()}>
                  {addendum.isPending && <Loader2 className="animate-spin" />} Add addendum
                </Button>
                <Button variant="ghost" onClick={() => setAdding(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
              <FilePlus2 /> Add addendum
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

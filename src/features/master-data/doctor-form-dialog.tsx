"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarOff, Link2, Loader2, Plus, Trash2, Unlink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, apiFetchPage, getErrorMessage } from "@/lib/api";
import { Department, DoctorSummary, Leave, ScheduleSession } from "@/lib/master-data";
import { poishaToTaka, takaToPoisha } from "@/lib/money";
import { FormError } from "./form-bits";
import { ScheduleEditor, scheduleProblems } from "./schedule-editor";

type FormState = {
  title: string;
  name: string;
  nameBn: string;
  degrees: string;
  specialization: string;
  department: string;
  roomNo: string;
  photoUrl: string;
  bio: string;
  languages: string;
  consultationFee: string; // taka, as typed
  followUpFee: string;
  followUpValidDays: string;
  maxPatientsPerSession: string;
  averageMinutesPerPatient: string;
  sessions: ScheduleSession[];
  leaves: Leave[];
};

const fromDoctor = (d: DoctorSummary | null): FormState => ({
  title: d?.title ?? "Dr.",
  name: d?.name ?? "",
  nameBn: d?.nameBn ?? "",
  degrees: d?.degrees ?? "",
  specialization: d?.specialization ?? "",
  department: d?.department.id ?? "",
  roomNo: d?.roomNo ?? "",
  photoUrl: d?.photoUrl ?? "",
  bio: d?.bio ?? "",
  languages: (d?.languages ?? ["Bangla", "English"]).join(", "),
  consultationFee: d ? String(poishaToTaka(d.consultationFee)) : "",
  followUpFee: d ? String(poishaToTaka(d.followUpFee)) : "",
  followUpValidDays: String(d?.followUpValidDays ?? 30),
  maxPatientsPerSession: String(d?.maxPatientsPerSession ?? 20),
  averageMinutesPerPatient: String(d?.averageMinutesPerPatient ?? 10),
  sessions: d?.sessions ?? [],
  leaves: d?.leaves ?? [],
});

type Tab = "profile" | "fees" | "schedule" | "leaves" | "account";

/** Checks done before sending; returns [tab to show, message] for the first problem */
function validate(f: FormState): [Tab, string] | null {
  if (f.name.trim().length < 2) return ["profile", "Enter the doctor's name."];
  if (!f.department) return ["profile", "Choose a department."];
  if (!(Number(f.consultationFee) >= 0) || f.consultationFee === "") return ["fees", "Enter the consultation fee in taka."];
  if (!(Number(f.followUpFee) >= 0) || f.followUpFee === "") return ["fees", "Enter the follow-up fee in taka."];
  const problems = scheduleProblems(f.sessions);
  if (problems.length) return ["schedule", problems[0]];
  const badLeave = f.leaves.find((l) => !l.from || !l.to || l.from > l.to);
  if (badLeave) return ["leaves", "Each leave needs a start date and an end date on or after it."];
  return null;
}

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  doctor: DoctorSummary | null;
  departments: Department[];
  defaultSlotMinutes: number;
};

export function DoctorFormDialog(props: Props) {
  // Remount the body per doctor/open so the form always starts from fresh values
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-5xl">
        {props.open && <DoctorForm key={props.doctor?.id ?? "new"} {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function DoctorForm({ onOpenChange, doctor, departments, defaultSlotMinutes }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(() => fromDoctor(doctor));
  const [tab, setTab] = useState<Tab>("profile");
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = useMutation({
    mutationFn: () => {
      const body = {
        title: form.title.trim() || "Dr.",
        name: form.name.trim(),
        nameBn: form.nameBn.trim() || undefined,
        degrees: form.degrees.trim() || undefined,
        specialization: form.specialization.trim() || undefined,
        department: form.department,
        roomNo: form.roomNo.trim() || undefined,
        photoUrl: form.photoUrl.trim(),
        bio: form.bio.trim() || undefined,
        languages: form.languages.split(",").map((l) => l.trim()).filter(Boolean),
        consultationFee: takaToPoisha(Number(form.consultationFee)),
        followUpFee: takaToPoisha(Number(form.followUpFee)),
        followUpValidDays: Number(form.followUpValidDays),
        maxPatientsPerSession: Number(form.maxPatientsPerSession),
        averageMinutesPerPatient: Number(form.averageMinutesPerPatient),
        sessions: form.sessions,
        leaves: form.leaves.map((l) => ({ ...l, reason: l.reason?.trim() || undefined })),
      };
      return doctor
        ? apiFetch<DoctorSummary>(`/doctors/${doctor.id}`, { method: "PATCH", body })
        : apiFetch<DoctorSummary>("/doctors", { method: "POST", body });
    },
    meta: { silent: true },
    onSuccess: (d) => {
      toast.success(doctor ? `${d.displayName} updated` : `${d.displayName} added`);
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      onOpenChange(false);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const submit = () => {
    const problem = validate(form);
    if (problem) {
      setTab(problem[0]);
      setError(problem[1]);
      return;
    }
    setError(null);
    save.mutate();
  };

  const field = (key: keyof FormState, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={`doc-${key}`}>{label}</Label>
      <Input id={`doc-${key}`} value={form[key] as string} onChange={(e) => set(key, e.target.value as never)} {...props} />
    </div>
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold text-heading">{doctor ? `Edit ${doctor.displayName}` : "Add doctor"}</DialogTitle>
        <DialogDescription>Fees are in taka. The weekly schedule decides which slots patients can book.</DialogDescription>
      </DialogHeader>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="h-10 w-full flex-wrap sm:w-fit">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="schedule">Weekly schedule</TabsTrigger>
          <TabsTrigger value="leaves">Leaves</TabsTrigger>
          <TabsTrigger value="account" disabled={!doctor}>
            Linked account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="grid gap-4 pt-3 sm:grid-cols-3">
          {field("title", "Title", { placeholder: "Dr., Prof. Dr." })}
          <div className="sm:col-span-2">{field("name", "Full name (English)", { placeholder: "Farhana Rahman" })}</div>
          {field("nameBn", "নাম (বাংলা)", { className: "font-bangla" })}
          <div className="space-y-1.5">
            <Label htmlFor="doc-department">Department</Label>
            <NativeSelect id="doc-department" value={form.department} onChange={(e) => set("department", e.target.value)}>
              <option value="">Choose…</option>
              {departments
                .filter((d) => d.isActive || d.id === form.department)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </NativeSelect>
          </div>
          {field("roomNo", "Room number")}
          <div className="sm:col-span-2">{field("degrees", "Degrees", { placeholder: "MBBS, FCPS (Medicine)" })}</div>
          {field("specialization", "Specialization")}
          <div className="sm:col-span-2">{field("photoUrl", "Photo URL (optional)", { placeholder: "https://…" })}</div>
          {field("languages", "Languages", { placeholder: "Bangla, English" })}
          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor="doc-bio">Short bio (optional)</Label>
            <Textarea id="doc-bio" rows={3} value={form.bio} onChange={(e) => set("bio", e.target.value)} />
          </div>
        </TabsContent>

        <TabsContent value="fees" className="grid gap-4 pt-3 sm:grid-cols-3">
          {field("consultationFee", "Consultation fee (৳)", { type: "number", min: 0, inputMode: "numeric" })}
          {field("followUpFee", "Follow-up fee (৳)", { type: "number", min: 0, inputMode: "numeric" })}
          {field("followUpValidDays", "Follow-up valid for (days)", { type: "number", min: 0, max: 365 })}
          {field("maxPatientsPerSession", "Default max patients per session", { type: "number", min: 1, max: 200 })}
          {field("averageMinutesPerPatient", "Average minutes per patient", { type: "number", min: 1, max: 120 })}
          <p className="text-sm text-muted-foreground sm:col-span-3">
            A returning patient who saw this doctor within the follow-up window is booked as a follow-up and charged the follow-up fee. The
            average minutes per patient powers the estimated waiting time shown to patients.
          </p>
        </TabsContent>

        <TabsContent value="schedule" className="pt-3">
          <ScheduleEditor
            sessions={form.sessions}
            onChange={(s) => set("sessions", s)}
            defaultSlotMinutes={defaultSlotMinutes}
            defaultMaxPatients={Number(form.maxPatientsPerSession) || 20}
          />
        </TabsContent>

        <TabsContent value="leaves" className="space-y-3 pt-3">
          {form.leaves.length === 0 && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarOff className="size-4" /> No upcoming leave. Days on leave cannot be booked.
            </p>
          )}
          {form.leaves.map((l, i) => (
            <div key={i} className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_2fr_auto]">
              <div className="space-y-1">
                <Label htmlFor={`leave-from-${i}`}>From</Label>
                <Input id={`leave-from-${i}`} type="date" value={l.from} onChange={(e) => set("leaves", form.leaves.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`leave-to-${i}`}>To</Label>
                <Input id={`leave-to-${i}`} type="date" value={l.to} min={l.from} onChange={(e) => set("leaves", form.leaves.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`leave-reason-${i}`}>Reason</Label>
                <Input id={`leave-reason-${i}`} value={l.reason ?? ""} placeholder="Conference, personal…" onChange={(e) => set("leaves", form.leaves.map((x, j) => (j === i ? { ...x, reason: e.target.value } : x)))} />
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label="Remove leave" onClick={() => set("leaves", form.leaves.filter((_, j) => j !== i))}>
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => set("leaves", [...form.leaves, { from: "", to: "", reason: "" }])}>
            <Plus /> Add leave
          </Button>
        </TabsContent>

        <TabsContent value="account" className="pt-3">{doctor && <AccountLink doctor={doctor} />}</TabsContent>
      </Tabs>

      <FormError message={error ?? undefined} />

      <DialogFooter>
        <Button variant="outline" size="lg" onClick={() => onOpenChange(false)} disabled={save.isPending}>
          Cancel
        </Button>
        <Button size="lg" onClick={submit} disabled={save.isPending}>
          {save.isPending && <Loader2 className="animate-spin" />}
          {doctor ? "Save changes" : "Add doctor"}
        </Button>
      </DialogFooter>
    </>
  );
}

type DoctorUser = { id: string; name: string; email: string; isActive: boolean };

/** Link the profile to a login account with role "doctor" (one-to-one, enforced by the API) */
function AccountLink({ doctor }: { doctor: DoctorSummary }) {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState("");
  const [current, setCurrent] = useState(doctor.account ?? null);
  const users = useQuery({
    queryKey: ["users", "doctor-accounts"],
    queryFn: () => apiFetchPage<DoctorUser>("/users?role=doctor&status=active&limit=100"),
  });

  const link = useMutation({
    mutationFn: (id: string | null) => apiFetch<DoctorSummary>(`/doctors/${doctor.id}/account`, { method: "PUT", body: { userId: id } }),
    onSuccess: (d) => {
      toast.success(d.account ? `Linked to ${d.account.email}` : "Account unlinked");
      setCurrent(d.account ?? null);
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      setUserId("");
    },
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        The linked login account sees this doctor&apos;s own queue after signing in. One account can belong to only one doctor profile.
      </p>
      {current ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3">
          <div>
            <p className="font-medium text-heading">{current.name}</p>
            <p className="text-sm text-muted-foreground">{current.email}</p>
          </div>
          <Button variant="outline" onClick={() => link.mutate(null)} disabled={link.isPending}>
            <Unlink /> Unlink
          </Button>
        </div>
      ) : (
        <p className="text-sm font-medium text-status-waiting-fg">Not linked yet — this doctor cannot see a queue until an account is linked.</p>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-64 flex-1 space-y-1.5">
          <Label htmlFor="link-user">Doctor login account</Label>
          <NativeSelect id="link-user" value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">{users.isPending ? "Loading…" : "Choose an account with the Doctor role…"}</option>
            {users.data?.items.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} · {u.email}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button onClick={() => userId && link.mutate(userId)} disabled={!userId || link.isPending}>
          {link.isPending ? <Loader2 className="animate-spin" /> : <Link2 />} Link account
        </Button>
      </div>
    </div>
  );
}

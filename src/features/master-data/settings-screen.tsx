"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { ReactNode, useState } from "react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/shared/forbidden";
import { PageSkeleton } from "@/components/shared/loading-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, getErrorMessage } from "@/lib/api";
import { HospitalSettings } from "@/lib/master-data";
import { FormError } from "./form-bits";

export function SettingsScreen() {
  return (
    <RequirePermission permission="settings:manage">
      <SettingsContent />
    </RequirePermission>
  );
}

function SettingsContent() {
  const settings = useQuery({ queryKey: ["settings"], queryFn: () => apiFetch<HospitalSettings>("/settings") });
  if (!settings.data) return <PageSkeleton />;
  return <SettingsForm initial={settings.data} />;
}

type Form = Omit<HospitalSettings, "phones" | "bookingWindowDays" | "cancellationCutoffMinutes" | "defaultSlotMinutes"> & {
  phones: string;
  bookingWindowDays: string;
  cancellationCutoffMinutes: string;
  defaultSlotMinutes: string;
};

function SettingsForm({ initial }: { initial: HospitalSettings }) {
  const queryClient = useQueryClient();
  const [f, setF] = useState<Form>({
    ...initial,
    phones: initial.phones.join(", "),
    bookingWindowDays: String(initial.bookingWindowDays),
    cancellationCutoffMinutes: String(initial.cancellationCutoffMinutes),
    defaultSlotMinutes: String(initial.defaultSlotMinutes),
  });
  const [error, setError] = useState<string>();

  const save = useMutation({
    mutationFn: () =>
      apiFetch<HospitalSettings>("/settings", {
        method: "PATCH",
        body: {
          name: f.name.trim(),
          nameBn: f.nameBn.trim(),
          address: f.address.trim(),
          addressBn: f.addressBn?.trim() ?? "",
          phones: f.phones.split(",").map((p) => p.trim()).filter(Boolean),
          emergencyPhone: f.emergencyPhone.trim(),
          email: f.email?.trim() ?? "",
          openingHours: f.openingHours.trim(),
          openingHoursBn: f.openingHoursBn?.trim() ?? "",
          logoUrl: f.logoUrl?.trim() ?? "",
          bookingWindowDays: Number(f.bookingWindowDays),
          cancellationCutoffMinutes: Number(f.cancellationCutoffMinutes),
          defaultSlotMinutes: Number(f.defaultSlotMinutes),
          displayNotice: f.displayNotice?.trim() ?? "",
        },
      }),
    meta: { silent: true },
    onSuccess: (s) => {
      toast.success("Settings saved");
      queryClient.setQueryData(["settings"], s);
      setError(undefined);
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const text = (key: keyof Form, label: string, props: React.ComponentProps<typeof Input> = {}): ReactNode => (
    <div className="space-y-1.5">
      <Label htmlFor={`set-${key}`}>{label}</Label>
      <Input id={`set-${key}`} value={(f[key] as string) ?? ""} onChange={(e) => setF({ ...f, [key]: e.target.value })} {...props} />
    </div>
  );

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <PageHeader
        title="Hospital Settings"
        description="Shown on tokens, the waiting-room TV and the public hospital info used by the patient assistant."
        actions={
          <Button type="submit" size="xl" disabled={save.isPending}>
            {save.isPending ? <Loader2 className="animate-spin" /> : <Save />} Save settings
          </Button>
        }
      />
      <FormError message={error} />

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Hospital profile" bodyClassName="grid gap-4 sm:grid-cols-2">
          {text("name", "Name (English)")}
          {text("nameBn", "নাম (বাংলা)", { className: "font-bangla" })}
          <div className="sm:col-span-2">{text("address", "Address (English)")}</div>
          <div className="sm:col-span-2">{text("addressBn", "ঠিকানা (বাংলা)", { className: "font-bangla" })}</div>
          {text("email", "Email", { type: "email" })}
          {text("logoUrl", "Logo URL", { placeholder: "https://…" })}
        </SectionCard>

        <SectionCard title="Contact & hours" bodyClassName="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">{text("phones", "Phone numbers (comma separated)", { placeholder: "01XXXXXXXXX, 02-XXXXXXX" })}</div>
          {text("emergencyPhone", "Emergency phone")}
          <div />
          {text("openingHours", "OPD hours (English)")}
          {text("openingHoursBn", "OPD সময় (বাংলা)", { className: "font-bangla" })}
        </SectionCard>

        <SectionCard title="Booking rules" bodyClassName="grid gap-4 sm:grid-cols-3">
          {text("bookingWindowDays", "Book up to (days ahead)", { type: "number", min: 1, max: 90 })}
          {text("cancellationCutoffMinutes", "Cancel until (minutes before)", { type: "number", min: 0 })}
          {text("defaultSlotMinutes", "Default slot length (min)", { type: "number", min: 5, max: 120 })}
          <p className="text-sm text-muted-foreground sm:col-span-3">
            The booking window limits how far ahead reception and patients can book. The default slot length is pre-filled when an admin adds a
            new doctor session.
          </p>
        </SectionCard>

        <SectionCard title="Waiting-room TV" bodyClassName="space-y-1.5">
          <Label htmlFor="set-displayNotice">Scrolling notice (bottom of the TV screen)</Label>
          <Textarea id="set-displayNotice" rows={3} value={f.displayNotice ?? ""} onChange={(e) => setF({ ...f, displayNotice: e.target.value })} />
        </SectionCard>
      </div>
    </form>
  );
}

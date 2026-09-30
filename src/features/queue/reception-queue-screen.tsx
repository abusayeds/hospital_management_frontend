"use client";

import { MonitorPlay } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { RequirePermission } from "@/components/shared/forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { DoctorQueuePanel } from "./doctor-queue";
import { DoctorMiniBoard, useTodayGlance } from "./today-glance";

/** Front desk: every doctor at a glance, then one doctor's live queue (page wraps it in <Suspense> for useSearchParams) */
export function ReceptionQueueScreen() {
  return (
    <RequirePermission permission="queue:read">
      <Content />
    </RequirePermission>
  );
}

function Content() {
  const router = useRouter();
  const doctorId = useSearchParams().get("doctor") ?? "";
  const today = useTodayGlance();
  const doctors = today.data?.doctors;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Queue · সিরিয়াল"
        description="Who is with each doctor and who is waiting. The doctor calls the next patient; the waiting-room TV follows automatically."
        actions={
          <Button size="lg" variant="outline" render={<a href="/queue-display" target="_blank" rel="noopener" />} nativeButton={false}>
            <MonitorPlay /> Open TV display
          </Button>
        }
      />
      <DoctorMiniBoard doctors={doctors} linkBase="/reception/queue" />
      {doctors && doctors.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-t pt-6">
          <label htmlFor="queue-doctor" className="text-sm font-medium text-heading">
            Show queue of
          </label>
          <NativeSelect id="queue-doctor" value={doctorId} onChange={(e) => router.replace(`/reception/queue${e.target.value ? `?doctor=${e.target.value}` : ""}`)} className="w-72">
            <option value="">Choose a doctor…</option>
            {doctors.map((d) => (
              <option key={d.doctorId} value={d.doctorId}>
                {d.displayName}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}
      {doctorId && <DoctorQueuePanel key={doctorId} doctorId={doctorId} mode="desk" />}
    </div>
  );
}

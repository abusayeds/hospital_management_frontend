"use client";

import { DoctorQueuePanel } from "@/features/queue/doctor-queue";
import { DashboardIntro } from "./dashboard-intro";

/** Doctor home: today's session and the doctor's own live queue (the clinical panel arrives in Phase 4) */
export function DoctorDashboard() {
  return (
    <div className="space-y-6">
      <DashboardIntro description="Your OPD today. Press “Call next” and the waiting-room TV announces the serial." />
      <DoctorQueuePanel mode="doctor" />
    </div>
  );
}

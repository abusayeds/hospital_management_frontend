"use client";

import { LabBoard } from "@/features/lab/lab-board";
import { DashboardIntro } from "./dashboard-intro";

/** Lab home: the live work board */
export function LabDashboard() {
  return (
    <div className="space-y-6">
      <DashboardIntro description="Orders from doctors arrive here live. A second person verifies every report before release." />
      <LabBoard />
    </div>
  );
}

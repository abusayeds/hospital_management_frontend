"use client";

import { ManagementAnalytics } from "@/features/analytics/management-analytics";

/** Management home: real analytics (today's KPIs, trends, doctors, departments, live queue) */
export function ManagementDashboard() {
  return <ManagementAnalytics focus="overview" />;
}

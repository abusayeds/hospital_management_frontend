import type { Metadata } from "next";
import { DailyReportsScreen } from "@/features/reports/daily-reports-screen";

export const metadata: Metadata = { title: "Daily reports" };

export default function Page() {
  return <DailyReportsScreen />;
}

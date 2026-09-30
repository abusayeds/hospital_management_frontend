import type { Metadata } from "next";
import { AuditLogsScreen } from "@/features/audit/audit-logs-screen";

export const metadata: Metadata = { title: "Audit Logs" };

export default function Page() {
  return <AuditLogsScreen />;
}

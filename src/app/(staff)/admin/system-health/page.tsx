import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { SystemStatus } from "@/components/shared/system-status";
import { API_BASE } from "@/lib/api";

export const metadata: Metadata = { title: "System health" };

export default function SystemHealthPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="System health" description="Checked every 30 seconds from the backend health endpoint." />
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Services">
          <SystemStatus variant="detailed" />
        </SectionCard>
        <SectionCard title="How this works">
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              The frontend calls <code className="rounded bg-muted px-1 py-0.5 text-xs">{API_BASE}/health</code>.
            </li>
            <li>The API pings MongoDB and reports the round-trip time, not just a stored flag.</li>
            <li>It answers 200 when healthy and 503 when the database is down, so uptime monitors and load balancers can react.</li>
            <li>Health requests are excluded from request logs and the rate limiter.</li>
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}

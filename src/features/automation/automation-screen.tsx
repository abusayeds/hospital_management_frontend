"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, FlaskConical, History, Inbox, ListChecks, MessageSquareText, PauseCircle, Settings2, Workflow } from "lucide-react";
import { RequirePermission } from "@/components/shared/forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api";
import { OutboxTab } from "./outbox-tab";
import { QueueTab } from "./queue-tab";
import { RulesTab } from "./rules-tab";
import { RunsTab } from "./runs-tab";
import { SettingsTab } from "./settings-tab";
import { TemplatesTab } from "./templates-tab";
import { Health, when } from "./types";

function HealthStrip() {
  const health = useQuery({ queryKey: ["automation", "health"], queryFn: () => apiFetch<Health>("/automation/health"), refetchInterval: 30_000 });
  const h = health.data;
  if (!h) return null;
  const schedulerOk = h.scheduler.running && h.overdue === 0;
  return (
    <div className="space-y-3">
      {(h.paused || h.simulation.whatsapp) && (
        <div className={`flex flex-wrap items-center gap-2 rounded-xl border px-4 py-3 text-sm ${h.paused ? "border-destructive/40 bg-destructive/5 text-destructive" : "border-status-waiting-border bg-status-waiting-bg text-status-waiting-fg"}`}>
          {h.paused ? <PauseCircle className="size-4" /> : <FlaskConical className="size-4" />}
          {h.paused
            ? "Automation is paused — nothing is planned or sent."
            : "Simulation mode: WhatsApp messages go to the simulator (Admin → WhatsApp Simulator), not to real phones."}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Scheduler"
          value={schedulerOk ? "Running" : h.scheduler.running ? "Behind" : "Stopped"}
          icon={Workflow}
          tone={schedulerOk ? "default" : "danger"}
          hint={h.scheduler.lastTickAt ? `last tick ${when(h.scheduler.lastTickAt, true)}` : h.overdue ? `${h.overdue} overdue job(s)` : "no tick yet in this process"}
        />
        <StatCard label="Due in the next hour" value={h.nextHour} icon={CalendarClock} hint={`${h.queueDepth} queued in total`} />
        <StatCard
          label="Failed in the last hour"
          value={h.failedLastHour}
          icon={AlertTriangle}
          tone={h.failedLastHour >= h.failureAlertThreshold ? "danger" : "default"}
          hint={`admins are alerted at ${h.failureAlertThreshold}`}
        />
        <StatCard
          label="WhatsApp"
          value={h.simulation.whatsapp ? "Simulated" : h.whatsappConfigured ? "Live" : "Not configured"}
          icon={MessageSquareText}
          tone={!h.simulation.whatsapp && !h.whatsappConfigured ? "danger" : "default"}
          hint={h.simulation.sms ? "SMS simulated" : "SMS via provider"}
        />
      </div>
    </div>
  );
}

/**
 * AUTOMATION — reminders, follow-ups, report-ready messages and staff alerts. Read-only for management
 * (automation:read); super admin (automation:manage) edits rules, templates and settings.
 */
export function AutomationScreen() {
  return (
    <RequirePermission permission="automation:read">
      <div className="space-y-6">
        <PageHeader
          title="Automation · অটোমেশন"
          description="Rules that message patients and staff at the right time — every message is in the Outbox with the reason it was sent or skipped."
        />
        <HealthStrip />
        <Tabs defaultValue="rules">
          <div className="overflow-x-auto">
            <TabsList>
              <TabsTrigger value="rules">
                <ListChecks className="size-4" /> Rules
              </TabsTrigger>
              <TabsTrigger value="templates">
                <MessageSquareText className="size-4" /> Templates
              </TabsTrigger>
              <TabsTrigger value="outbox">
                <Inbox className="size-4" /> Outbox
              </TabsTrigger>
              <TabsTrigger value="queue">
                <CalendarClock className="size-4" /> Scheduled
              </TabsTrigger>
              <TabsTrigger value="runs">
                <History className="size-4" /> Run log
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings2 className="size-4" /> Settings
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="rules" className="pt-4">
            <RulesTab />
          </TabsContent>
          <TabsContent value="templates" className="pt-4">
            <TemplatesTab />
          </TabsContent>
          <TabsContent value="outbox" className="pt-4">
            <OutboxTab />
          </TabsContent>
          <TabsContent value="queue" className="pt-4">
            <QueueTab />
          </TabsContent>
          <TabsContent value="runs" className="pt-4">
            <RunsTab />
          </TabsContent>
          <TabsContent value="settings" className="pt-4">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </RequirePermission>
  );
}

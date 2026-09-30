"use client";

import Link from "next/link";
import { Activity, Bot, Clock, TrendingUp, Users } from "lucide-react";
import { RankedBarChart, TrendAreaChart } from "@/components/shared/charts";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { formatTaka, revenueByDepartment, revenueTrend } from "@/lib/sample-data";
import { TodayAtAGlance } from "@/features/queue/today-glance";
import { DashboardIntro } from "./dashboard-intro";
import { SampleDataNote } from "./sample-data-note";

export function ManagementDashboard() {
  return (
    <div className="space-y-6">
      <DashboardIntro
        description="How the hospital is doing today, and the trend behind it."
        actions={
          <Button size="lg" variant="outline" render={<Link href="/management/live-overview" />} nativeButton={false}>
            <Activity /> Live overview
          </Button>
        }
      />
      <TodayAtAGlance />
      <SampleDataNote phase={7} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue today" value={formatTaka(241500)} icon={TrendingUp} trend={{ value: "7.4%", direction: "up", label: "vs last Tuesday" }} />
        <StatCard label="Patients today" value={186} icon={Users} trend={{ value: "5%", direction: "up", label: "vs last Tuesday" }} />
        <StatCard label="Avg. waiting time" value="18 min" icon={Clock} trend={{ value: "3 min", direction: "down", good: true, label: "better than last week" }} />
        <StatCard label="Booked by assistant" value="23%" icon={Bot} hint="41 of 178 appointments" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <SectionCard title="Revenue · last 14 days" description="All departments, in taka" className="lg:col-span-3">
          <TrendAreaChart data={revenueTrend} caption="Revenue in the last 14 days" format={formatTaka} />
        </SectionCard>
        <SectionCard title="Revenue by department" description="Today" className="lg:col-span-2">
          <RankedBarChart data={revenueByDepartment} caption="Revenue by department today" format={formatTaka} />
        </SectionCard>
      </div>
    </div>
  );
}

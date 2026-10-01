"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Banknote, CalendarCheck, Clock, Download, FlaskConical, Stethoscope, Target, UserX, Users } from "lucide-react";
import { ReactNode, useCallback, useEffect, useState } from "react";
import { ColumnChart, MultiLineChart, RankedBarChart, StackedColumnChart } from "@/components/shared/charts";
import { DataTable, DataTableColumn } from "@/components/shared/data-table";
import { RequirePermission } from "@/components/shared/forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  AnalyticsFilters,
  analyticsQuery,
  DayRow,
  DepartmentStat,
  DoctorStat,
  Heatmap,
  Kpis,
  LabFrequency,
  LeadTime,
  PaymentMix,
  presetRange,
  QueueRow,
  RANGE_PRESETS,
  shortDate,
  SOURCE_LABEL,
} from "@/lib/analytics";
import { apiFetch, apiFetchPage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { METHOD_LABEL } from "@/lib/billing";
import { Department, DoctorSummary } from "@/lib/master-data";
import { formatPoisha } from "@/lib/money";
import { useLiveEvents } from "@/lib/socket";
import { cn } from "@/lib/utils";

/**
 * MANAGEMENT ANALYTICS — one screen, three focuses:
 *   overview (management home) · revenue (/management/revenue) · doctors (/management/doctors)
 * Every number comes from /analytics (aggregations; no patient names, diagnoses or results).
 * Today's KPIs and the live queue refresh on socket events and on a short timer.
 */

type Focus = "overview" | "revenue" | "doctors";

const LIVE_EVENTS = ["appointment:created", "appointment:updated", "queue:updated", "billing:updated", "lab:updated"];
const count = (v: number) => v.toLocaleString("en-IN");
const minutes = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${v} min`);

const APPOINTMENT_SERIES = [
  { key: "completed", label: "Completed", color: "var(--chart-1)" },
  { key: "no_show", label: "No-show", color: "var(--chart-5)" },
  { key: "cancelled", label: "Cancelled", color: "var(--chart-3)" },
  { key: "booked", label: "Still booked", color: "var(--chart-2)" },
];
const REVENUE_SERIES = [
  { key: "consultation", label: "Consultation" },
  { key: "lab_test", label: "Lab" },
  { key: "medicine", label: "Medicine" },
  { key: "procedure", label: "Procedure" },
  { key: "other", label: "Other" },
];
const CHAT_SERIES = [
  { key: "web", label: "Web chat" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "staffReplies", label: "Staff replies" },
];
const EXPORTS = [
  { report: "doctor-stats", label: "Doctor performance" },
  { report: "department-stats", label: "Departments" },
  { report: "appointments", label: "Appointments per day" },
  { report: "revenue", label: "Revenue per day" },
  { report: "payment-methods", label: "Payment methods" },
  { report: "lab-frequency", label: "Top lab tests" },
  { report: "chat-volume", label: "Chat volume" },
];

const TITLES: Record<Focus, { title: string; description: string }> = {
  overview: {
    title: "Management dashboard · ব্যবস্থাপনা",
    description: "How the hospital is doing today, and the trend behind it.",
  },
  revenue: {
    title: "Revenue · আয়",
    description: "Billed revenue by service line, collections by payment method, and department share.",
  },
  doctors: {
    title: "Doctor performance · ডাক্তার পারফরম্যান্স",
    description: "Patients seen, consultation and waiting time, no-shows and revenue per doctor.",
  },
};

export function ManagementAnalytics({ focus = "overview" }: { focus?: Focus }) {
  return (
    <RequirePermission permission="report:operations">
      <Content focus={focus} />
    </RequirePermission>
  );
}

function Content({ focus }: { focus: Focus }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [preset, setPreset] = useState<string>("30d");
  const [filters, setFilters] = useState<AnalyticsFilters>({
    ...presetRange(29),
    doctorId: "",
    departmentId: "",
    source: "",
  });
  const [pulse, setPulse] = useState(false);
  const qs = analyticsQuery(filters);
  const get =
    <T,>(path: string, extra?: Record<string, string>) =>
    () =>
      apiFetch<T>(`/analytics/${path}?${extra ? analyticsQuery(filters, extra) : qs}`);
  const opts = { placeholderData: keepPreviousData, staleTime: 60_000 };

  const kpis = useQuery({
    queryKey: ["analytics", "kpis"],
    queryFn: () => apiFetch<Kpis>("/analytics/kpis"),
    refetchInterval: 60_000,
  });
  const appts = useQuery({
    queryKey: ["analytics", "appts", qs],
    queryFn: get<DayRow[]>("trend/appointments"),
    ...opts,
  });
  const revenue = useQuery({
    queryKey: ["analytics", "revenue", qs],
    queryFn: get<DayRow[]>("trend/revenue"),
    ...opts,
  });
  const doctors = useQuery({
    queryKey: ["analytics", "doctors", qs],
    queryFn: get<DoctorStat[]>("doctor-stats"),
    ...opts,
  });
  const depts = useQuery({
    queryKey: ["analytics", "depts", qs],
    queryFn: get<DepartmentStat[]>("department-stats"),
    ...opts,
  });
  const payments = useQuery({
    queryKey: ["analytics", "payments", qs],
    queryFn: get<PaymentMix>("payment-methods"),
    ...opts,
  });
  const heatmap = useQuery({
    queryKey: ["analytics", "heatmap", qs],
    queryFn: get<Heatmap>("doctor-heatmap"),
    ...opts,
    enabled: focus !== "revenue",
  });
  const lab = useQuery({
    queryKey: ["analytics", "lab", qs],
    queryFn: get<LabFrequency>("lab-frequency"),
    ...opts,
    enabled: focus === "overview",
  });
  const lead = useQuery({
    queryKey: ["analytics", "lead", qs],
    queryFn: get<LeadTime>("lead-time"),
    ...opts,
    enabled: focus === "overview",
  });
  const chat = useQuery({
    queryKey: ["analytics", "chat", qs],
    queryFn: get<DayRow[]>("chat-volume"),
    ...opts,
    enabled: focus === "overview",
  });

  const doctorList = useQuery({
    queryKey: ["doctors", "analytics-filter"],
    queryFn: () => apiFetchPage<DoctorSummary>("/doctors?limit=100"),
    meta: { silent: true },
  });
  const deptList = useQuery({
    queryKey: ["departments", "analytics-filter"],
    queryFn: () => apiFetch<Department[]>("/departments"),
    meta: { silent: true },
  });

  // A live event refreshes today's numbers immediately and shows a short "just now" pulse
  const onLive = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["analytics", "kpis"] });
    queryClient.invalidateQueries({ queryKey: ["analytics", "queue"] });
    setPulse(true);
  }, [queryClient]);
  useLiveEvents(LIVE_EVENTS, onLive);
  useEffect(() => {
    if (!pulse) return;
    const t = setTimeout(() => setPulse(false), 4000);
    return () => clearTimeout(t);
  }, [pulse]);

  const choosePreset = (key: string) => {
    setPreset(key);
    const p = RANGE_PRESETS.find((r) => r.key === key);
    if (p) setFilters((f) => ({ ...f, ...presetRange(p.days) }));
  };
  const k = kpis.data;
  const dayLabel = (rows?: DayRow[]) => (rows ?? []).map((r) => ({ ...r, label: shortDate(r.date) }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={TITLES[focus].title}
        description={TITLES[focus].description}
        actions={
          <div className="flex items-center gap-3">
            <SyncIndicator updatedAt={kpis.dataUpdatedAt} pulse={pulse} />
            {can("dashboard:analytics_export") && (
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button size="lg" variant="outline" />}>
                  <Download /> Export CSV
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {EXPORTS.map((e) => (
                    <DropdownMenuItem
                      key={e.report}
                      className="h-9"
                      render={<a href={`/api/v1/analytics/export.csv?${analyticsQuery(filters, { report: e.report })}`} download />}
                    >
                      {e.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        }
      />

      {/* ---- today (always "today", independent of the range filter) */}
      <section aria-label="Today" className="space-y-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Collected today"
            value={k ? formatPoisha(k.collections.today) : "…"}
            icon={k?.collections.target ? Target : Banknote}
            hint={
              k?.collections.percentOfTarget !== null && k?.collections.percentOfTarget !== undefined
                ? `${k.collections.percentOfTarget}% of the ${formatPoisha(k.collections.target)} target`
                : "No daily target set"
            }
          />
          <StatCard
            label="Appointments today"
            value={k ? count(k.appointments.total) : "…"}
            icon={CalendarCheck}
            hint={
              k
                ? `${k.appointments.completed} seen · ${k.appointments.checkedIn - k.appointments.completed} in line · ${k.appointments.booked} not arrived`
                : undefined
            }
          />
          <StatCard
            label="No-shows"
            value={k ? `${k.appointments.noShow}` : "…"}
            icon={UserX}
            hint={k ? `${k.appointments.noShowRate}% of today's bookings` : undefined}
            tone={k && k.appointments.noShowRate >= 20 ? "danger" : "default"}
          />
          <StatCard
            label="Avg. wait · consultation"
            value={k ? `${minutes(k.appointments.avgWaitMinutes)}` : "…"}
            icon={Clock}
            hint={k ? `Consultation ${minutes(k.appointments.avgConsultationMinutes)}` : undefined}
          />
        </div>
        {focus === "overview" && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Lab tests today"
              value={k ? count(k.lab.ordered) : "…"}
              icon={FlaskConical}
              hint={k ? `${k.lab.completed} ready · ${k.lab.pending} pending · ${k.lab.urgent} urgent` : undefined}
            />
            <StatCard
              label="Abnormal findings"
              value={k ? count(k.lab.abnormalFindings) : "…"}
              icon={Activity}
              hint="Verified results outside the normal range (count only)"
            />
            <StatCard
              label="Doctors active now"
              value={k ? `${k.staff.doctorsActiveNow} / ${k.staff.doctorsSittingToday}` : "…"}
              icon={Stethoscope}
              hint={k?.staff.busiestDoctor ? `Busiest: ${k.staff.busiestDoctor.name} (${k.staff.busiestDoctor.patients})` : "Sitting today"}
            />
            <StatCard
              label="Nurses recording vitals"
              value={k ? count(k.staff.nursesRecordingVitals) : "…"}
              icon={Users}
              hint={k ? `${k.staff.vitalsRecorded} vitals recorded today` : undefined}
            />
          </div>
        )}
      </section>

      {/* ---- range filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 shadow-card">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Date range">
          {RANGE_PRESETS.map((r) => (
            <Button key={r.key} size="sm" variant={preset === r.key ? "default" : "ghost"} onClick={() => choosePreset(r.key)} aria-pressed={preset === r.key}>
              {r.label}
            </Button>
          ))}
        </div>
        <Input
          type="date"
          value={filters.from}
          max={filters.to}
          onChange={(e) => (setPreset("custom"), setFilters((f) => ({ ...f, from: e.target.value || f.from })))}
          aria-label="From date"
          className="w-auto"
        />
        <Input
          type="date"
          value={filters.to}
          min={filters.from}
          onChange={(e) => (setPreset("custom"), setFilters((f) => ({ ...f, to: e.target.value || f.to })))}
          aria-label="To date"
          className="w-auto"
        />
        <NativeSelect
          value={filters.departmentId}
          onChange={(e) => setFilters((f) => ({ ...f, departmentId: e.target.value }))}
          aria-label="Department"
          className="w-auto max-w-44"
        >
          <option value="">All departments</option>
          {deptList.data?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          value={filters.doctorId}
          onChange={(e) => setFilters((f) => ({ ...f, doctorId: e.target.value }))}
          aria-label="Doctor"
          className="w-auto max-w-48"
        >
          <option value="">All doctors</option>
          {doctorList.data?.items.map((d) => (
            <option key={d.id} value={d.id}>
              {d.displayName}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          value={filters.source}
          onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value }))}
          aria-label="Booking channel"
          className="w-auto"
        >
          <option value="">All channels</option>
          {Object.entries(SOURCE_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </NativeSelect>
      </div>

      {focus !== "doctors" && (
        <div className="grid gap-6 xl:grid-cols-5">
          <Chart
            title="Revenue per day"
            description="Billed (issued invoices) by service line"
            className="xl:col-span-3"
            loading={revenue.isPending}
            empty={!revenue.data?.some((r) => Number(r.total) > 0)}
          >
            <StackedColumnChart data={dayLabel(revenue.data)} series={REVENUE_SERIES} caption="Revenue per day by service line" format={formatPoisha} />
          </Chart>
          <Chart
            title="Payment methods"
            description={payments.data ? `${formatPoisha(payments.data.total)} received in the range` : undefined}
            className="xl:col-span-2"
            loading={payments.isPending}
            empty={!payments.data?.total}
          >
            <RankedBarChart
              data={(payments.data?.byMethod ?? []).map((m) => ({
                label: METHOD_LABEL[m.method].label,
                value: m.amount,
              }))}
              caption="Collections by payment method"
              format={formatPoisha}
            />
          </Chart>
        </div>
      )}

      {focus !== "revenue" && (
        <Chart title="Appointments per day" description="Completed, no-show and cancelled" loading={appts.isPending} empty={!appts.data?.length}>
          <MultiLineChart data={dayLabel(appts.data)} series={APPOINTMENT_SERIES} caption="Appointments per day by outcome" />
        </Chart>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Chart title="Departments" description="Completed visits in the range" loading={depts.isPending} empty={!depts.data?.length}>
          <RankedBarChart
            data={(depts.data ?? []).slice(0, 8).map((d) => ({ label: d.name, value: d.visitsCount }))}
            caption="Completed visits by department"
            format={count}
          />
        </Chart>
        {focus === "revenue" ? (
          <Chart
            title="Revenue by doctor"
            description="Billed consultations and tests linked to the doctor"
            loading={doctors.isPending}
            empty={!doctors.data?.some((d) => d.revenue > 0)}
          >
            <RankedBarChart
              data={[...(doctors.data ?? [])]
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 8)
                .map((d) => ({ label: d.name, value: d.revenue }))}
              caption="Revenue by doctor"
              format={formatPoisha}
            />
          </Chart>
        ) : (
          <HeatmapCard data={heatmap.data} loading={heatmap.isPending} />
        )}
      </div>

      {focus !== "revenue" && <DoctorTable rows={doctors.data} loading={doctors.isPending} />}

      {focus === "overview" && (
        <>
          <div className="grid gap-6 xl:grid-cols-2">
            <Chart title="Top 10 lab tests" description="Ordered in the range" loading={lab.isPending} empty={!lab.data?.length}>
              <RankedBarChart
                data={(lab.data ?? []).map((t) => ({
                  label: t.code,
                  value: t.count,
                }))}
                caption="Most ordered lab tests"
                format={count}
              />
            </Chart>
            <Chart
              title="How far ahead patients book"
              description="Days between booking and appointment"
              loading={lead.isPending}
              empty={!lead.data?.some((b) => b.count)}
            >
              <ColumnChart
                data={(lead.data ?? []).map((b) => ({
                  label: b.bucket,
                  value: b.count,
                }))}
                caption="Booking lead time"
              />
            </Chart>
          </div>
          <div className="grid gap-6 xl:grid-cols-5">
            <Chart
              title="Patient messages"
              description="Web chat and WhatsApp, and how many needed staff"
              className="xl:col-span-3"
              loading={chat.isPending}
              empty={!chat.data?.some((d) => Number(d.web) + Number(d.whatsapp) > 0)}
            >
              <MultiLineChart data={dayLabel(chat.data)} series={CHAT_SERIES} caption="Patient messages per day" />
            </Chart>
            <LiveQueue className="xl:col-span-2" />
          </div>
        </>
      )}
      {focus === "doctors" && <LiveQueue />}
    </div>
  );
}

// ---------------------------------------------------------------- pieces

function Chart({
  title,
  description,
  className,
  loading,
  empty,
  children,
}: {
  title: string;
  description?: string;
  className?: string;
  loading: boolean;
  empty: boolean;
  children: ReactNode;
}) {
  return (
    <SectionCard title={title} description={description} className={className}>
      {loading ? (
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      ) : empty ? (
        <p className="py-16 text-center text-sm text-muted-foreground">No data for this range yet.</p>
      ) : (
        children
      )}
    </SectionCard>
  );
}

/** "Updated 12 s ago" with a green pulse right after a live event */
function SyncIndicator({ updatedAt, pulse }: { updatedAt: number; pulse: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);
  if (!updatedAt) return null;
  const secs = Math.max(0, Math.round((now - updatedAt) / 1000));
  return (
    <span className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
      <span className={cn("size-2 rounded-full", pulse ? "animate-pulse bg-status-success-fg" : "bg-muted-foreground/40")} />
      {pulse ? "Just now" : secs < 10 ? "Updated just now" : `Updated ${secs < 60 ? `${secs} s` : `${Math.round(secs / 60)} min`} ago`}
    </span>
  );
}

function HeatmapCard({ data, loading }: { data?: Heatmap; loading: boolean }) {
  const max = Math.max(1, ...(data?.rows.flatMap((r) => r.values) ?? [0]));
  return (
    <SectionCard title="Doctor workload · last 7 days" description="Patients seen per day (darker = more)" bodyClassName="overflow-x-auto">
      {loading ? (
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      ) : !data?.rows.length ? (
        <p className="py-16 text-center text-sm text-muted-foreground">No completed visits in these days.</p>
      ) : (
        <table className="w-full border-separate border-spacing-1 text-xs">
          <thead>
            <tr>
              <th scope="col" className="text-left font-medium text-muted-foreground">
                Doctor
              </th>
              {data.days.map((d) => (
                <th key={d} scope="col" className="font-medium text-muted-foreground">
                  {shortDate(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.slice(0, 10).map((r) => (
              <tr key={r.doctorId}>
                <th scope="row" className="max-w-36 truncate pr-2 text-left font-medium text-heading">
                  {r.name}
                </th>
                {r.values.map((v, i) => (
                  <td
                    key={i}
                    className="h-8 min-w-10 rounded text-center tabular-nums"
                    style={{
                      background: v ? `color-mix(in oklab, var(--chart-1) ${Math.round(15 + (v / max) * 75)}%, transparent)` : "var(--muted)",
                    }}
                    title={`${r.name}, ${data.days[i]}: ${v}`}
                  >
                    {v || ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SectionCard>
  );
}

function DoctorTable({ rows, loading }: { rows?: DoctorStat[]; loading: boolean }) {
  const columns: DataTableColumn<DoctorStat>[] = [
    {
      key: "name",
      header: "Doctor",
      cell: (d) => (
        <div>
          <p className="font-medium text-heading">{d.name}</p>
          <p className="text-xs text-muted-foreground">{d.department}</p>
        </div>
      ),
    },
    {
      key: "seen",
      header: "Seen",
      className: "text-right tabular-nums font-semibold",
      cell: (d) => count(d.patientCount),
    },
    {
      key: "booked",
      header: "Booked",
      className: "hidden md:table-cell text-right tabular-nums",
      cell: (d) => count(d.booked),
    },
    {
      key: "noshow",
      header: "No-show",
      className: "text-right tabular-nums",
      cell: (d) => (d.booked ? `${d.noShows} (${Math.round((d.noShows / d.booked) * 100)}%)` : "—"),
    },
    {
      key: "time",
      header: "Avg. consult",
      className: "hidden lg:table-cell text-right tabular-nums",
      cell: (d) => minutes(d.avgTime),
    },
    {
      key: "wait",
      header: "Avg. wait",
      className: "hidden lg:table-cell text-right tabular-nums",
      cell: (d) => minutes(d.avgWait),
    },
    {
      key: "revenue",
      header: "Revenue",
      className: "text-right tabular-nums",
      cell: (d) => formatPoisha(d.revenue),
    },
  ];
  return (
    <SectionCard title="Doctor performance" description="Sorted by patients seen in the range" bodyClassName="p-0">
      <DataTable
        data={rows ?? []}
        columns={columns}
        getRowId={(d) => d.doctorId}
        isLoading={loading}
        searchText={(d) => `${d.name} ${d.department}`}
        searchPlaceholder="Find a doctor"
        emptyTitle="No appointments in this range"
        pageSize={10}
      />
    </SectionCard>
  );
}

/** Live queue by doctor — socket events plus a 10-second refresh */
function LiveQueue({ className }: { className?: string }) {
  const q = useQuery({
    queryKey: ["analytics", "queue"],
    queryFn: () => apiFetch<QueueRow[]>("/analytics/queue/now"),
    refetchInterval: 10_000,
  });
  const rows = (q.data ?? []).filter((d) => d.inSession || d.waiting || d.currentSerial !== null || d.notArrived);
  return (
    <SectionCard title="Live queue" description="Right now · refreshes every 10 seconds" className={className} bodyClassName="p-0">
      {rows.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-muted-foreground">{q.isPending ? "Loading…" : "No doctor has patients waiting right now."}</p>
      ) : (
        <ul className="divide-y">
          {rows.map((d) => (
            <li key={d.doctorId} className="flex items-center gap-3 px-5 py-3">
              <span
                className={cn("size-2 shrink-0 rounded-full", d.inSession ? "bg-status-success-fg" : "bg-muted-foreground/40")}
                aria-label={d.inSession ? "In session" : "Not in session"}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-heading">{d.doctor}</p>
                <p className="text-xs text-muted-foreground">
                  {d.department}
                  {d.roomNo ? ` · Room ${d.roomNo}` : ""}
                </p>
              </div>
              <div className="text-right text-xs">
                <p className="text-sm font-semibold text-heading tabular-nums">{d.currentSerial !== null ? `#${d.currentSerial}` : "—"}</p>
                <p className="text-muted-foreground tabular-nums">
                  {d.waiting} waiting · {d.completed} done
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

import { addDaysTo, todayDhaka } from "@/lib/appointments";
import { PaymentMethod } from "@/lib/billing";

/** Management analytics — shapes returned by /analytics/* (counts and money only, never patient data) */

export type Kpis = {
  date: string;
  appointments: {
    total: number;
    booked: number;
    checkedIn: number;
    completed: number;
    noShow: number;
    cancelled: number;
    inConsultation: number;
    noShowRate: number;
    avgConsultationMinutes: number | null;
    avgWaitMinutes: number | null;
  };
  collections: {
    today: number;
    target: number;
    percentOfTarget: number | null;
    byMethod: { method: PaymentMethod; amount: number; count: number }[];
  };
  lab: {
    ordered: number;
    completed: number;
    pending: number;
    urgent: number;
    abnormalFindings: number;
  };
  staff: {
    doctorsSittingToday: number;
    doctorsActiveNow: number;
    busiestDoctor: { name: string; patients: number } | null;
    nursesRecordingVitals: number;
    vitalsRecorded: number;
  };
  generatedAt: string;
};

export type DayRow = { date: string } & Record<string, number | string>;
export type DoctorStat = {
  doctorId: string;
  name: string;
  department: string;
  booked: number;
  patientCount: number;
  noShows: number;
  avgTime: number | null;
  avgWait: number | null;
  revenue: number;
  collected: number;
};
export type DepartmentStat = {
  deptId: string;
  name: string;
  nameBn: string;
  visitsCount: number;
  appointments: number;
  avgWaitTime: number | null;
};
export type Heatmap = {
  days: string[];
  rows: { doctorId: string; name: string; values: number[] }[];
};
export type PaymentMix = {
  total: number;
  byMethod: { method: PaymentMethod; amount: number; count: number }[];
};
export type LabFrequency = {
  code: string;
  name: string;
  count: number;
  abnormal: number;
}[];
export type LeadTime = { bucket: string; count: number }[];
export type QueueRow = {
  doctorId: string;
  doctor: string;
  department?: string;
  roomNo?: string;
  inSession: boolean;
  currentSerial: number | null;
  waiting: number;
  notArrived: number;
  completed: number;
};

export type AnalyticsFilters = {
  from: string;
  to: string;
  doctorId: string;
  departmentId: string;
  source: string;
};

export const RANGE_PRESETS = [
  { key: "today", label: "Today", days: 0 },
  { key: "7d", label: "Last 7 days", days: 6 },
  { key: "30d", label: "Last 30 days", days: 29 },
  { key: "90d", label: "Last 90 days", days: 89 },
] as const;

export const presetRange = (days: number) => {
  const to = todayDhaka();
  return { from: addDaysTo(to, -days), to };
};

export const SOURCE_LABEL: Record<string, string> = {
  reception: "Reception",
  phone: "Phone",
  walk_in: "Walk-in",
  portal: "Patient portal",
  chatbot: "Web assistant",
  whatsapp: "WhatsApp",
};

/** Query string for every /analytics endpoint (empty filters left out) */
export const analyticsQuery = (f: AnalyticsFilters, extra: Record<string, string> = {}) => {
  const p = new URLSearchParams({ from: f.from, to: f.to, ...extra });
  if (f.doctorId) p.set("doctorIds", f.doctorId);
  if (f.departmentId) p.set("departmentIds", f.departmentId);
  if (f.source) p.set("sources", f.source);
  return p.toString();
};

/** "2026-10-01" → "1 Oct" */
export const shortDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

import type { FlagLevel, VitalFlag } from "@/lib/clinical-rules";
import type { Priority } from "@/lib/appointments";

export type Vitals = {
  id: string;
  appointmentId: string;
  patientId: string;
  date: string;
  bpSystolic: number | null;
  bpDiastolic: number | null;
  pulse: number | null;
  temperatureF: number | null;
  respiratoryRate: number | null;
  spo2: number | null;
  weightKg: number | null;
  heightCm: number | null;
  bmi: number | null;
  bloodSugar: { value: number; type: "fasting" | "random" | null } | null;
  notes: string;
  flags: VitalFlag[];
  flagLevel: FlagLevel;
  recordedAt: string;
  recordedBy: { id: string; name: string } | string;
};

export type WorklistEntry = {
  appointmentId: string;
  serialNo: number;
  status: "checked_in" | "in_consultation";
  priority: Priority;
  type: "new" | "follow_up";
  checkedInAt: string | null;
  waitingMinutes: number | null;
  doctor: { id: string; displayName: string; roomNo?: string };
  patient: { id: string; name: string; nameBn?: string; patientCode: string; gender: "male" | "female" | "other"; age: number; allergies: string[] };
  vitals: { recorded: false } | { recorded: true; flagLevel: FlagLevel; flags: VitalFlag[]; recordedAt: string };
};

// Colour per flag level — the same semantic status colours used everywhere
export const LEVEL_STYLE: Record<FlagLevel, { ring: string; text: string; bg: string; label: string; labelBn: string }> = {
  normal: { ring: "border-status-success-border", text: "text-status-success-fg", bg: "bg-status-success-bg", label: "Normal", labelBn: "স্বাভাবিক" },
  abnormal: { ring: "border-status-waiting-border", text: "text-status-waiting-fg", bg: "bg-status-waiting-bg", label: "Abnormal", labelBn: "অস্বাভাবিক" },
  critical: { ring: "border-status-danger-border", text: "text-status-danger-fg", bg: "bg-status-danger-bg", label: "Critical", labelBn: "বিপজ্জনক" },
};

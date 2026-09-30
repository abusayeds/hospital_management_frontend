import type { LabFlag } from "@/lib/clinical-rules";
import type { Gender } from "@/lib/patients";

export type LabStatus = "ordered" | "sample_collected" | "processing" | "awaiting_verification" | "ready" | "delivered" | "cancelled";

export type LabResultRow = {
  name: string;
  unit: string;
  normalMin: number | null;
  normalMax: number | null;
  normalText: string;
  value: string;
  flag: LabFlag | null;
};

export type LabOrder = {
  id: string;
  orderNo: string;
  date: string;
  status: LabStatus;
  priority: "routine" | "urgent";
  clinicalNote: string;
  worstFlag: LabFlag | null;
  tests: { labTestId: string; name: string; code: string; sampleType: string; comment: string; results: LabResultRow[] }[];
  patient: { id: string; name: string; nameBn?: string; patientCode: string; gender: Gender; age: number };
  doctor: { id: string; displayName: string } | null;
  visitId: string | null;
  sampleCollectedAt: string | null;
  resultsEnteredBy: { id: string; name?: string } | null;
  resultsEnteredAt: string | null;
  verifiedBy: { id: string; name?: string } | null;
  verifiedAt: string | null;
  deliveredAt: string | null;
  cancelReason: string | null;
  history: { status: LabStatus; at: string; note: string }[];
  createdAt: string;
};

// The lab board columns, left to right
export const BOARD_COLUMNS: { status: LabStatus; title: string; titleBn: string }[] = [
  { status: "ordered", title: "Ordered", titleBn: "অর্ডার" },
  { status: "sample_collected", title: "Sample collected", titleBn: "স্যাম্পল নেওয়া" },
  { status: "processing", title: "Processing", titleBn: "প্রক্রিয়াধীন" },
  { status: "awaiting_verification", title: "To verify", titleBn: "যাচাই বাকি" },
  { status: "ready", title: "Ready", titleBn: "প্রস্তুত" },
];

export const FLAG_STYLE: Record<LabFlag, { label: string; className: string }> = {
  normal: { label: "Normal", className: "text-status-success-fg" },
  low: { label: "Low", className: "text-status-waiting-fg font-semibold" },
  high: { label: "High", className: "text-status-waiting-fg font-semibold" },
  abnormal: { label: "Abnormal", className: "text-status-waiting-fg font-semibold" },
  critical: { label: "Critical", className: "text-status-danger-fg font-bold" },
};

export const LAB_LIVE_EVENTS = ["lab:updated", "lab:report_ready"];

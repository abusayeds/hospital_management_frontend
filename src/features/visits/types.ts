import type { MealTiming } from "@/lib/clinical-rules";
import type { Gender } from "@/lib/patients";
import type { Vitals } from "@/features/vitals/types";

export type RxItem = {
  medicineId: string | null;
  brandName: string;
  genericName: string;
  strength: string;
  form: string;
  dosePattern: string;
  timing: MealTiming | null;
  durationDays: number | "continue" | null;
  route: string;
  instructionsEn: string;
  instructionsBn: string;
  note: string;
};

export type Investigation = { labTestId: string | null; name: string; note: string };

/** The fields the doctor edits (sent as one PATCH by the autosave) */
export type VisitContent = {
  chiefComplaints: string[];
  historyOfPresentIllness: string;
  pastHistory: string;
  examination: string;
  provisionalDiagnosis: string;
  finalDiagnosis: string;
  investigations: Investigation[];
  prescription: RxItem[];
  adviceEn: string;
  adviceBn: string;
  followUp: { date: string | null; note: string } | null;
  referral: { to: string; reason: string } | null;
  aiSummaryUsed: boolean;
};

export type Visit = VisitContent & {
  id: string;
  appointmentId: string;
  date: string;
  status: "open" | "closed";
  prescriptionNo: string | null;
  allergyOverrides: { medicine: string; allergy: string; reason: string; at: string }[];
  vitals: Vitals | null;
  openedAt: string;
  closedAt: string | null;
  addenda: { id: string; text: string; reason: string; byName: string; at: string }[];
  patient: {
    id: string;
    name: string;
    nameBn?: string;
    patientCode: string;
    gender: Gender;
    age: number;
    bloodGroup: string | null;
    allergies: string[];
    chronicConditions: string[];
  };
  doctor: { id: string; displayName: string; nameBn?: string; degrees: string; specialization: string };
  appointment: { id: string; serialNo: number; type: "new" | "follow_up" };
};

export const CONTENT_KEYS: (keyof VisitContent)[] = [
  "chiefComplaints",
  "historyOfPresentIllness",
  "pastHistory",
  "examination",
  "provisionalDiagnosis",
  "finalDiagnosis",
  "investigations",
  "prescription",
  "adviceEn",
  "adviceBn",
  "followUp",
  "referral",
  "aiSummaryUsed",
];

export const contentOf = (v: VisitContent): VisitContent =>
  Object.fromEntries(CONTENT_KEYS.map((k) => [k, v[k]])) as VisitContent;

export type SaveResult = { visit: Visit; warnings: { duplicateGenerics: string[] } };

export type EmrHistory = {
  patient: Visit["patient"] & { lastVisitDate: string | null };
  visits: {
    id: string;
    appointmentId: string;
    date: string;
    status: "open" | "closed";
    prescriptionNo: string | null;
    doctor: { id: string; displayName: string };
    chiefComplaints: string[];
    diagnosis: string;
    medicines: string[];
    followUpDate: string | null;
    addendaCount: number;
  }[];
  vitals: Vitals[];
};

export type RxTemplate = {
  id: string;
  name: string;
  diagnosis: string;
  items: RxItem[];
  adviceEn: string;
  adviceBn: string;
  investigations: Investigation[];
};

export type DoctorToday = {
  doctorId: string;
  date: string;
  waiting: number;
  open: number;
  closed: number;
  followUpsDue: number;
  visits: {
    id: string;
    appointmentId: string;
    status: "open" | "closed";
    openedAt: string;
    closedAt: string | null;
    diagnosis: string;
    patient: { id: string; name: string; patientCode: string; gender: Gender; age: number };
  }[];
};

// One-tap dose patterns doctors use most (morning + noon + night)
export const DOSE_PRESETS = ["1+0+1", "1+1+1", "0+0+1", "1+0+0", "1+1+1+1", "½+0+½"];
export const DURATION_PRESETS = [3, 5, 7, 14, 30];
export const ROUTES = ["oral", "topical", "inhalation", "injection", "eye", "ear", "nasal", "rectal", "other"];

export const TIMING_LABEL: Record<MealTiming, string> = {
  before_meal: "Before meal · খাবারের আগে",
  after_meal: "After meal · খাবারের পরে",
  with_meal: "With meal · খাবারের সাথে",
  bedtime: "Bedtime · ঘুমানোর আগে",
};

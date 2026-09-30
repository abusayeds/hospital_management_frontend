import {
  Accessibility,
  Activity,
  Baby,
  Bone,
  Brain,
  Droplet,
  Ear,
  Eye,
  Hand,
  HeartPulse,
  type LucideIcon,
  Microscope,
  Pill,
  ScanLine,
  Smile,
  Stethoscope,
  Syringe,
} from "lucide-react";

// Shapes returned by the Phase 3 master-data API. Money fields are POISHA.

export type Department = {
  id: string;
  name: string;
  nameBn: string;
  description?: string;
  icon: string;
  isActive: boolean;
  displayOrder: number;
  doctorCount: number;
};

export type ScheduleSession = { dayOfWeek: number; startTime: string; endTime: string; slotMinutes: number; maxPatients: number };
export type Leave = { from: string; to: string; reason?: string };

export type DoctorSummary = {
  id: string;
  title: string;
  name: string;
  nameBn?: string;
  displayName: string;
  department: { id: string; name: string; nameBn: string };
  degrees?: string;
  specialization?: string;
  consultationFee: number;
  followUpFee: number;
  followUpValidDays: number;
  maxPatientsPerSession: number;
  averageMinutesPerPatient: number;
  roomNo?: string;
  photoUrl?: string;
  bio?: string;
  languages: string[];
  isActive: boolean;
  sessions: ScheduleSession[];
  leaves: Leave[];
  scheduleText: string;
  today: { date: string; onLeave: boolean; leaveReason?: string; sits: boolean; sessions: { sessionKey: string; startTime: string; endTime: string }[] };
  account?: { id: string; name: string; email: string } | null;
};

export type ServiceItem = { id: string; name: string; nameBn?: string; category: "consultation" | "procedure" | "other"; price: number; isActive: boolean };

export type LabParameter = { name: string; unit?: string; normalMin?: number | null; normalMax?: number | null; normalText?: string };
export type LabTest = {
  id: string;
  name: string;
  code: string;
  category: string;
  price: number;
  sampleType: string;
  preparationNote?: string;
  preparationNoteBn?: string;
  turnaroundHours: number;
  parameters: LabParameter[];
  isActive: boolean;
};

export const MEDICINE_FORMS = ["tablet", "capsule", "syrup", "suspension", "injection", "drops", "cream", "ointment", "inhaler", "suppository", "powder", "gel", "other"] as const;
export type Medicine = {
  id: string;
  genericName: string;
  brandName: string;
  strength?: string;
  form: (typeof MEDICINE_FORMS)[number];
  manufacturer?: string;
  isActive: boolean;
};

export type HospitalSettings = {
  name: string;
  nameBn: string;
  address: string;
  addressBn?: string;
  phones: string[];
  emergencyPhone: string;
  email?: string;
  openingHours: string;
  openingHoursBn?: string;
  logoUrl?: string;
  bookingWindowDays: number;
  cancellationCutoffMinutes: number;
  defaultSlotMinutes: number;
  displayNotice?: string;
};

// Bangladesh week starts on Saturday; Friday is the usual weekly holiday
export const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5];
export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DAY_NAMES_BN = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];

/** Department icon keys the admin can choose from (stored as a string in the database) */
export const DEPARTMENT_ICONS: Record<string, LucideIcon> = {
  stethoscope: Stethoscope,
  "heart-pulse": HeartPulse,
  baby: Baby,
  smile: Smile,
  bone: Bone,
  ear: Ear,
  hand: Hand,
  brain: Brain,
  eye: Eye,
  activity: Activity,
  pill: Pill,
  syringe: Syringe,
  microscope: Microscope,
  "scan-line": ScanLine,
  droplet: Droplet,
  accessibility: Accessibility,
};
export const departmentIcon = (key?: string): LucideIcon => DEPARTMENT_ICONS[key ?? ""] ?? Stethoscope;

/** "Farhana Rahman" → "FR" (avatar when a doctor or patient has no photo) */
export const initials = (name: string) =>
  name
    .replace(/^((prof|assoc|dr)\.?\s+)+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

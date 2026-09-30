// Appointment shapes from the Phase 3 API (fee in POISHA).

export type AppointmentStatus = "booked" | "checked_in" | "in_consultation" | "completed" | "cancelled" | "no_show";
export type Priority = "normal" | "elderly" | "emergency";
export type AppointmentSource = "reception" | "chatbot" | "whatsapp" | "phone" | "walk_in";

export type AppointmentView = {
  id: string;
  date: string;
  slotTime: string;
  sessionKey: string;
  sessionLabel: string;
  serialNo: number;
  type: "new" | "follow_up";
  fee: number;
  source: AppointmentSource;
  status: AppointmentStatus;
  priority: Priority;
  notes?: string;
  checkedInAt?: string | null;
  calledAt?: string | null;
  consultationStartedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  rescheduledFrom?: string | null;
  rescheduledTo?: string | null;
  statusHistory: { status: AppointmentStatus; at: string; note?: string }[];
  patient: { id: string; name: string; nameBn?: string; patientCode: string; phone: string; gender: string; age: number; hasAllergies: boolean };
  doctor: { id: string; displayName: string; nameBn?: string; roomNo?: string };
  department: { id: string; name: string; nameBn?: string };
  createdAt: string;
};

export const SOURCE_LABEL: Record<AppointmentSource, string> = {
  reception: "Reception",
  chatbot: "Assistant chat",
  whatsapp: "WhatsApp",
  phone: "Phone call",
  walk_in: "Walk-in",
};

export const PRIORITY_LABEL: Record<Priority, { label: string; labelBn: string }> = {
  normal: { label: "Normal", labelBn: "সাধারণ" },
  elderly: { label: "Elderly", labelBn: "বয়স্ক" },
  emergency: { label: "Emergency", labelBn: "জরুরি" },
};

export const todayDhaka = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());

export const addDaysTo = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** "Sat 4 Oct" */
export const shortDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** "09:30" → "9:30 AM" */
export const time12 = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

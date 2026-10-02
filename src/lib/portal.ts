/** Patient portal — shapes returned by /portal/* (the signed-in family's own records only) */

export type PortalPatient = { id: string; name: string; nameBn: string | null; patientCode: string; age: number; gender: string };

export type PortalMe = {
  patients: PortalPatient[];
  hospital: { name: string; nameBn: string; emergencyPhone: string; phones: string[]; openingHours: string; openingHoursBn?: string; address: string };
  cancellationCutoffMinutes: number;
  bookingWindowDays: number;
};

export type PortalAppointment = {
  id: string;
  patient: { id: string; name: string; nameBn: string | null };
  doctor: string;
  department: string;
  departmentBn: string;
  roomNo: string | null;
  date: string;
  slotTime: string;
  serialNo: number;
  status: "booked" | "checked_in" | "in_consultation" | "completed" | "cancelled" | "no_show";
  fee: number | null;
  source: string;
  canCancel: boolean;
};

export type PortalDoctor = {
  id: string;
  name: string;
  nameBn: string | null;
  degrees: string;
  specialization: string;
  department: string;
  departmentBn: string;
  consultationFee: number;
  followUpFee: number;
  photoUrl: string | null;
  days: number[];
};

export type AvailabilityDay = { date: string; onLeave: boolean; leaveReason?: string; sits: boolean; availableCount: number; nextAvailable: string | null };
export type PortalSlots = { date: string; onLeave: boolean; leaveReason: string | null; slots: { time: string; sessionLabel: string }[] };

export type PortalPrescription = {
  id: string;
  prescriptionNo: string;
  date: string;
  patient: { id: string; name: string };
  doctor: string;
  department: string;
  diagnosis: string;
  medicines: {
    brandName: string;
    strength: string;
    form: string;
    dosePattern: string;
    durationDays: number | null;
    continued: boolean;
    instructionsBn: string;
    instructionsEn: string;
  }[];
  adviceBn: string;
  adviceEn: string;
  followUpDate: string | null;
};

export type PortalReport = {
  id: string;
  orderNo: string;
  date: string;
  patient: { id: string; name: string };
  tests: string[];
  ready: boolean;
  stage: string;
  verifiedAt: string | null;
};

export type PortalBill = {
  id: string;
  invoiceNo: string;
  date: string;
  dueDate: string;
  patient: { id: string; name: string };
  items: string[];
  total: number;
  amountPaid: number;
  amountDue: number;
  status: string;
  overdue: boolean;
};

/** "14:30" → "2:30 PM" */
export const time12 = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

/** "2026-10-03" → "Sat, 3 Oct" */
export const dayLabel = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

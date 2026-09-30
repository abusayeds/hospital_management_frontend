// Patient shapes from the API. Reception receives the BASIC view; doctors also get
// chronicConditions and notes (FULL view). The NID never arrives, only its last 4 digits.

export type Gender = "male" | "female" | "other";
export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export type Patient = {
  id: string;
  patientCode: string;
  name: string;
  nameBn?: string;
  gender: Gender;
  age: number;
  dateOfBirth: string | null; // null when only an age was given
  dobEstimated: boolean;
  phone: string; // +8801XXXXXXXXX
  altPhone?: string;
  address?: { area?: string; upazila?: string; district?: string };
  bloodGroup?: (typeof BLOOD_GROUPS)[number];
  allergies: string[];
  hasChronicConditions: boolean;
  chronicConditions?: string[]; // FULL view only
  notes?: string; // FULL view only
  emergencyContact?: { name?: string; phone?: string; relation?: string };
  nidMasked: string | null;
  registrationSource: "reception" | "chatbot" | "whatsapp" | "phone";
  lastVisitDate: string | null;
  createdAt: string;
};

/** "+8801711222333" → "01711-222333" */
export const formatPhone = (e164?: string | null) => {
  if (!e164) return "—";
  const local = e164.replace(/^\+88/, "");
  return local.length === 11 ? `${local.slice(0, 5)}-${local.slice(5)}` : local;
};

export const GENDER_LABEL: Record<Gender, { label: string; labelBn: string; short: string }> = {
  male: { label: "Male", labelBn: "পুরুষ", short: "M" },
  female: { label: "Female", labelBn: "মহিলা", short: "F" },
  other: { label: "Other", labelBn: "অন্যান্য", short: "O" },
};

/** "52 y · Male" */
export const ageGender = (p: Pick<Patient, "age" | "gender" | "dobEstimated">) => `${p.dobEstimated ? "~" : ""}${p.age} y · ${GENDER_LABEL[p.gender].label}`;

/** "12 Sep 2026" from YYYY-MM-DD, in Dhaka time */
export const formatDate = (date?: string | null) =>
  date ? new Date(`${date}T00:00:00+06:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dhaka" }) : "—";

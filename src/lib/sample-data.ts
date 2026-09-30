/**
 * SAMPLE DATA ONLY — fictional people and numbers so Phase 1 screens look real.
 * No real patient data. Each later phase replaces one block with live API data.
 */
import type { StatusKey } from "@/components/shared/status-badge";

export type SampleVisit = {
  id: string;
  serial: number;
  time: string;
  patientCode: string;
  patientName: string;
  age: number;
  phone: string;
  doctor: string;
  department: string;
  status: StatusKey;
  payment: "paid" | "unpaid" | "partial";
};

const people: [string, number][] = [
  ["Abdur Rahim", 54], ["Fatema Begum", 38], ["Mohammad Karim", 61], ["Ayesha Siddiqua", 27],
  ["Rafiq Hossain", 45], ["Nusrat Jahan", 33], ["Jamal Uddin", 70], ["Taslima Akter", 29],
  ["Shahidul Islam", 52], ["Rokeya Khatun", 66], ["Arif Chowdhury", 41], ["Sumaiya Rahman", 8],
  ["Habibur Rahman", 58], ["Moriom Nesa", 47], ["Sabbir Ahmed", 35], ["Parvin Sultana", 50],
];
const doctors: [string, string][] = [
  ["Dr. Farhana Rahman", "Medicine"],
  ["Dr. Mahbub Hasan", "Cardiology"],
  ["Dr. Nusrat Jahan", "Gynecology"],
  ["Dr. Arif Hossain", "Pediatrics"],
];
const visitStatuses: StatusKey[] = [
  "completed", "completed", "completed", "in_consultation", "checked_in", "checked_in", "checked_in",
  "booked", "booked", "booked", "no_show", "cancelled", "checked_in", "booked", "emergency", "booked",
];

export const todaysVisits: SampleVisit[] = people.map(([patientName, age], i) => {
  const [doctor, department] = doctors[i % doctors.length];
  const minutes = 9 * 60 + 30 + i * 12;
  return {
    id: `v${i + 1}`,
    serial: i + 1,
    time: `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`,
    patientCode: `TL-${String(120 + i).padStart(6, "0")}`,
    patientName,
    age,
    phone: `01700-000${String(101 + i)}`,
    doctor,
    department,
    status: visitStatuses[i],
    payment: i % 5 === 3 ? "unpaid" : i % 7 === 5 ? "partial" : "paid",
  };
});

export type SampleLabOrder = {
  id: string;
  orderNo: string;
  patientName: string;
  test: string;
  doctor: string;
  priority: "routine" | "urgent";
  status: StatusKey;
  orderedAt: string;
};

export const labOrders: SampleLabOrder[] = [
  ["CBC", "pending", "routine"], ["Lipid profile", "sample_collected", "routine"], ["HbA1c", "processing", "routine"],
  ["Troponin I", "processing", "urgent"], ["Serum creatinine", "ready", "routine"], ["Urine R/E", "pending", "routine"],
  ["TSH", "ready", "routine"], ["Blood culture", "sample_collected", "urgent"], ["X-ray chest PA", "pending", "routine"],
  ["Dengue NS1", "ready", "urgent"],
].map(([test, status, priority], i) => ({
  id: `l${i + 1}`,
  orderNo: `LAB-${String(2310 + i).padStart(6, "0")}`,
  patientName: people[i][0],
  test,
  doctor: doctors[i % doctors.length][0],
  priority: priority as "routine" | "urgent",
  status: status as StatusKey,
  orderedAt: `${9 + Math.floor(i / 2)}:${i % 2 ? "40" : "10"}`,
}));

export type SampleStockItem = {
  id: string;
  name: string;
  generic: string;
  batch: string;
  stock: number;
  reorderLevel: number;
  expiry: string;
  status: StatusKey;
};

export const stockItems: SampleStockItem[] = [
  ["Napa 500 mg", "Paracetamol", 1840, 500, "2027-08", "in_stock"],
  ["Seclo 20 mg", "Omeprazole", 320, 400, "2027-01", "low_stock"],
  ["Amdocal 5 mg", "Amlodipine", 950, 300, "2026-11", "expiring"],
  ["Monas 10 mg", "Montelukast", 0, 200, "2027-04", "out_of_stock"],
  ["Ceftron 1 g inj.", "Ceftriaxone", 140, 100, "2026-10", "expiring"],
  ["Insulin Mixtard 30", "Human insulin", 45, 60, "2026-12", "low_stock"],
  ["ORSaline-N", "Oral rehydration salt", 2600, 800, "2028-02", "in_stock"],
  ["Losectil 40 mg", "Esomeprazole", 610, 250, "2026-09", "expired"],
  ["Fexo 120 mg", "Fexofenadine", 780, 300, "2027-06", "in_stock"],
].map(([name, generic, stock, reorderLevel, expiry, status], i) => ({
  id: `s${i + 1}`,
  name: name as string,
  generic: generic as string,
  batch: `B${24090 + i * 7}`,
  stock: stock as number,
  reorderLevel: reorderLevel as number,
  expiry: expiry as string,
  status: status as StatusKey,
}));

export type SampleInvoice = {
  id: string;
  invoiceNo: string;
  patientName: string;
  items: string;
  amount: number;
  paid: number;
  method: "Cash" | "bKash" | "Card" | "Nagad";
  status: StatusKey;
  time: string;
};

export const invoices: SampleInvoice[] = [
  ["Consultation", 700, 700, "Cash"], ["CBC + Lipid profile", 1850, 1850, "bKash"], ["Consultation", 1000, 0, "Cash"],
  ["X-ray chest PA", 600, 600, "Card"], ["Pharmacy", 1240, 1000, "Cash"], ["Consultation", 800, 800, "Nagad"],
  ["Echo cardiogram", 2500, 2500, "Card"], ["Pharmacy", 460, 0, "Cash"], ["HbA1c", 1100, 1100, "bKash"],
  ["Consultation", 600, 600, "Cash"],
].map(([items, amount, paid, method], i) => ({
  id: `i${i + 1}`,
  invoiceNo: `INV-${String(58210 + i).padStart(6, "0")}`,
  patientName: people[i + 2][0],
  items: items as string,
  amount: amount as number,
  paid: paid as number,
  method: method as SampleInvoice["method"],
  status: (paid === 0 ? "unpaid" : (paid as number) < (amount as number) ? "partial" : "paid") as StatusKey,
  time: `${10 + Math.floor(i / 2)}:${i % 2 ? "35" : "05"}`,
}));

export type SampleUser = { id: string; name: string; role: string; email: string; status: StatusKey; lastActive: string };

export const staffUsers: SampleUser[] = [
  ["Nasrin Akter", "Reception", "10 min ago"], ["Dr. Farhana Rahman", "Doctor", "2 min ago"],
  ["Shirin Sultana", "Nurse", "25 min ago"], ["Rafiqul Islam", "Lab Technician", "1 h ago"],
  ["Mahmudul Karim", "Pharmacist", "5 min ago"], ["Sharmin Jahan", "Accounts", "3 h ago"],
  ["Dr. Mahbub Hasan", "Doctor", "Yesterday"], ["Kamrun Nahar", "Reception", "2 days ago"],
].map(([name, role, lastActive], i) => ({
  id: `u${i + 1}`,
  name,
  role,
  email: `${name.toLowerCase().replace(/^dr\.\s*/, "").split(" ")[0]}@testolife.example`,
  status: (i === 7 ? "inactive" : "active_user") as StatusKey,
  lastActive,
}));

export const auditEvents = [
  { id: "a1", time: "11:42", user: "Nasrin Akter", action: "Registered patient", target: "TL-000135" },
  { id: "a2", time: "11:38", user: "Dr. Farhana Rahman", action: "Signed prescription", target: "RX-004211" },
  { id: "a3", time: "11:20", user: "Sharmin Jahan", action: "Refunded invoice", target: "INV-058204" },
  { id: "a4", time: "10:57", user: "Tanvir Hasan", action: "Changed role", target: "Kamrun Nahar → Reception" },
  { id: "a5", time: "10:31", user: "Mahmudul Karim", action: "Adjusted stock", target: "Seclo 20 mg (−20)" },
];

// Last 14 days of revenue in BDT (management chart)
export const revenueTrend = [
  182000, 175500, 198200, 210400, 164300, 95800, 201900, 215600, 228300, 219900, 236100, 188700, 112400, 241500,
].map((value, i) => {
  const d = new Date(Date.UTC(2026, 8, 16 + i));
  return { date: d.toISOString().slice(0, 10), label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }), value };
});

export const revenueByDepartment = [
  { label: "Medicine", value: 68400 },
  { label: "Laboratory", value: 54200 },
  { label: "Cardiology", value: 41800 },
  { label: "Pharmacy", value: 36900 },
  { label: "Gynecology", value: 24700 },
  { label: "Pediatrics", value: 15500 },
];

export const collectionByMethod = [
  { label: "Cash", value: 96400 },
  { label: "bKash", value: 58300 },
  { label: "Card", value: 41200 },
  { label: "Nagad", value: 22900 },
];

export const formatTaka = (n: number) => `৳${n.toLocaleString("en-IN")}`;

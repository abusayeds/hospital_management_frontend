// Billing shapes from the Phase 7 API. Every amount is integer POISHA (see lib/money.ts).

export type InvoiceStatus = "draft" | "issued" | "partial" | "paid" | "refunded" | "void";
export type PaymentMethod = "cash" | "card" | "bkash" | "nagad";
export type LineSource = "consultation" | "lab_test" | "medicine" | "procedure" | "other";

export type InvoiceLine = { lineId: string; source: LineSource; sourceId?: string | null; description: string; quantity: number; unitPrice: number; lineTotal: number };

export type Invoice = {
  id: string;
  invoiceNo: string;
  date: string;
  dueDate: string;
  status: InvoiceStatus;
  overdue: boolean;
  origin: { type: "visit" | "lab_order" | "dispense" | "manual"; id?: string | null };
  patient: { id: string; name: string; nameBn?: string; patientCode: string; phone: string };
  doctor: { id: string; displayName: string } | null;
  department: { id: string; name: string; nameBn?: string } | null;
  items: InvoiceLine[];
  subtotal: number;
  discounts: { amount: number; reason: string; at: string }[];
  discountTotal: number;
  taxTotal: number;
  total: number;
  payments: { paymentId: string; at: string; method: PaymentMethod; amount: number; reference?: string; notes?: string }[];
  refunds: { amount: number; method: PaymentMethod; reason: string; at: string }[];
  amountPaid: number;
  amountDue: number;
  notes?: string;
  issuedAt?: string | null;
  autoIssued: boolean;
  voidReason?: string | null;
  createdAt: string;
};

export type DailyCollection = {
  date: string;
  gross: number;
  refunds: number;
  net: number;
  transactions: number;
  byMethod: Record<PaymentMethod, { amount: number; count: number }>;
  byDepartment: { department: string; amount: number }[];
};

export const METHOD_LABEL: Record<PaymentMethod, { label: string; labelBn: string }> = {
  cash: { label: "Cash", labelBn: "নগদ" },
  card: { label: "Card", labelBn: "কার্ড" },
  bkash: { label: "bKash", labelBn: "বিকাশ" },
  nagad: { label: "Nagad", labelBn: "নগদ (মোবাইল)" },
};

export const SOURCE_LABEL: Record<LineSource, string> = {
  consultation: "Consultation",
  lab_test: "Lab test",
  medicine: "Medicine",
  procedure: "Procedure",
  other: "Other",
};

export const ORIGIN_LABEL: Record<Invoice["origin"]["type"], string> = {
  visit: "Visit (automatic)",
  lab_order: "Lab report (automatic)",
  dispense: "Pharmacy (automatic)",
  manual: "Counter",
};

/** "৳500.50" typed by staff → 50050 poisha (null if not a valid amount) */
export const parseTaka = (text: string): number | null => {
  const n = Number(String(text).replace(/[৳,\s]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
};

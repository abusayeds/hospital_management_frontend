/** Pharmacy — shapes returned by /pharmacy/* (money in poisha, quantities in whole units) */

export type PharmacyPatient = { id: string; name: string; nameBn: string | null; patientCode: string; gender: string; age: number | null; allergies: string[] };

export type QueueStatus = "pending" | "partial" | "dispensed";

export type QueueItem = {
  visitId: string;
  prescriptionNo: string;
  date: string;
  closedAt: string;
  patient: PharmacyPatient;
  doctor: string | null;
  medicines: number;
  preview: string;
  status: QueueStatus;
};

export type PrescriptionLine = {
  index: number;
  brandName: string;
  genericName: string;
  strength: string;
  form: string;
  dosePattern: string;
  durationDays: number | null;
  continued: boolean;
  instructionsBn: string;
  medicineId: string | null;
  inCatalogue: boolean;
  suggestedQuantity: number;
  alreadyDispensed: number;
  available: number;
  nearestExpiry: string | null;
  unitPrice: number | null;
};

export type PrescriptionForDispense = {
  visitId: string;
  prescriptionNo: string;
  date: string;
  doctor: string | null;
  patient: PharmacyPatient;
  lines: PrescriptionLine[];
  status: QueueStatus;
};

export type Dispense = {
  id: string;
  dispenseNo: string;
  date: string;
  dispensedAt: string;
  prescriptionNo: string | null;
  visitId: string | null;
  patient: PharmacyPatient;
  items: {
    medicineId: string;
    description: string;
    prescribedIndex: number | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    batches: { batchNo: string; expiryDate: string; quantity: number }[];
  }[];
  total: number;
  notes: string;
  dispensedBy: string | null;
};

export type StockStatus = "out" | "low" | "ok" | "none";

export type StockRow = {
  id: string;
  label: string;
  brandName: string;
  genericName: string;
  strength: string;
  form: string;
  reorderLevel: number;
  inStock: number;
  expiredQty: number;
  batchCount: number;
  nearestExpiry: string | null;
  unitPrice: number | null;
  stockValue: number;
  status: StockStatus;
};

export type MovementType = "purchase" | "dispense" | "adjust" | "write_off" | "return";

export type MedicineStock = {
  id: string;
  label: string;
  genericName: string;
  reorderLevel: number;
  batches: {
    id: string;
    batchNo: string;
    expiryDate: string;
    quantity: number;
    initialQuantity: number;
    unitCost: number;
    unitPrice: number;
    supplier: string;
    receivedAt: string;
    writtenOff: boolean;
    expired: boolean;
  }[];
  movements: { type: MovementType; quantity: number; balanceAfter: number; batchNo: string; reason: string; by: string | null; at: string }[];
};

export type ExpiryItem = {
  batchId: string;
  medicineId: string;
  label: string;
  genericName: string;
  batchNo: string;
  expiryDate: string;
  quantity: number;
  value: number;
  supplier: string;
  bucket: "expired" | "30" | "90";
};

export type ExpiryReport = {
  days: number;
  summary: Record<"expired" | "within30" | "within90", { batches: number; value: number }>;
  items: ExpiryItem[];
};

export type Purchase = {
  id: string;
  purchaseNo: string;
  supplier: string;
  supplierInvoiceNo: string;
  date: string;
  items: {
    medicineId: string;
    description: string;
    batchNo: string;
    expiryDate: string;
    quantity: number;
    unitCost: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  total: number;
  notes: string;
  receivedBy: string | null;
  createdAt: string;
};

export type PharmacySummary = {
  pendingPrescriptions: number;
  dispensedToday: number;
  dispensedValueToday: number;
  lowStock: number;
  outOfStock: number;
  expiring30: number;
  expired: number;
  stockValue: number;
  queue: QueueItem[];
  attention: StockRow[];
};

export const STOCK_STATUS: Record<StockStatus, { tone: "danger" | "waiting" | "success" | "neutral"; label: string; labelBn: string }> = {
  out: { tone: "danger", label: "Out of stock", labelBn: "স্টক নেই" },
  low: { tone: "waiting", label: "Low", labelBn: "কম" },
  ok: { tone: "success", label: "In stock", labelBn: "আছে" },
  none: { tone: "neutral", label: "Not stocked", labelBn: "রাখা হয় না" },
};

export const QUEUE_STATUS: Record<QueueStatus, { tone: "waiting" | "active" | "success"; label: string }> = {
  pending: { tone: "waiting", label: "To dispense" },
  partial: { tone: "active", label: "Partly given" },
  dispensed: { tone: "success", label: "Dispensed" },
};

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  purchase: "Received",
  dispense: "Dispensed",
  adjust: "Adjusted",
  write_off: "Written off",
  return: "Returned",
};

/** Days from today to a YYYY-MM-DD date (negative = past) */
export const daysUntil = (date: string) => {
  const today = new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date()) + "T00:00:00Z");
  return Math.round((new Date(`${date}T00:00:00Z`).getTime() - today.getTime()) / 86_400_000);
};

export const expiryText = (date: string) => {
  const d = daysUntil(date);
  return d < 0 ? `Expired ${-d} day${d === -1 ? "" : "s"} ago` : d === 0 ? "Expires today" : `in ${d} day${d === 1 ? "" : "s"}`;
};

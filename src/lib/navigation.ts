import {
  Activity,
  BadgeDollarSign,
  BarChart3,
  BookOpen,
  Bot,
  Building2,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileBarChart,
  FileClock,
  FileText,
  FlaskConical,
  HeartPulse,
  LayoutDashboard,
  ListOrdered,
  type LucideIcon,
  MessageSquareWarning,
  Package,
  PackageX,
  Pill,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Stethoscope,
  TestTube2,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
  Workflow,
} from "lucide-react";

/**
 * ONE place that defines every role, its URL area and its menu.
 * The sidebar, page titles and placeholder pages are generated from this file.
 * Each menu item names the PERMISSION it needs (from lib/permissions.ts, the
 * generated copy of the backend map), so the sidebar only shows what the user
 * may use. The API still checks every request — hiding a menu is only UX.
 */

import type { Permission, Role } from "./permissions";

export type { Role };

export type RoleConfig = {
  label: string;
  labelBn: string;
  basePath: string;
  icon: LucideIcon;
  summary: string;
  // Distinct colour for the role badge in the header and user lists
  badgeClass: string;
};

export const ROLES: Record<Role, RoleConfig> = {
  super_admin: {
    label: "Super Admin",
    labelBn: "সুপার অ্যাডমিন",
    basePath: "/admin",
    icon: ShieldCheck,
    summary: "Users, roles, settings, audit logs, automation",
    badgeClass: "bg-violet-50 text-violet-700 ring-violet-200",
  },
  management: {
    label: "Management",
    labelBn: "ম্যানেজমেন্ট",
    basePath: "/management",
    icon: BarChart3,
    summary: "Analytics, revenue and reports",
    badgeClass: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  },
  reception: {
    label: "Reception",
    labelBn: "রিসেপশন",
    basePath: "/reception",
    icon: CalendarCheck,
    summary: "Registration, appointments, queue, payments",
    badgeClass: "bg-teal-50 text-teal-700 ring-teal-200",
  },
  doctor: {
    label: "Doctor",
    labelBn: "ডাক্তার",
    basePath: "/doctor",
    icon: Stethoscope,
    summary: "Queue, patient history, prescriptions, lab orders",
    badgeClass: "bg-sky-50 text-sky-700 ring-sky-200",
  },
  nurse: {
    label: "Nurse",
    labelBn: "নার্স",
    basePath: "/nurse",
    icon: HeartPulse,
    summary: "Vitals for waiting patients",
    badgeClass: "bg-pink-50 text-pink-700 ring-pink-200",
  },
  lab_technician: {
    label: "Lab Technician",
    labelBn: "ল্যাব টেকনিশিয়ান",
    basePath: "/lab",
    icon: FlaskConical,
    summary: "Orders, samples, results, reports",
    badgeClass: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  pharmacist: {
    label: "Pharmacist",
    labelBn: "ফার্মাসিস্ট",
    basePath: "/pharmacy",
    icon: Pill,
    summary: "Dispensing, stock, expiry alerts",
    badgeClass: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  accounts: {
    label: "Accounts",
    labelBn: "হিসাব বিভাগ",
    basePath: "/accounts",
    icon: Wallet,
    summary: "Invoices, payments, dues, daily collection",
    badgeClass: "bg-orange-50 text-orange-700 ring-orange-200",
  },
  patient: {
    label: "Patient",
    labelBn: "রোগী",
    basePath: "/patient",
    icon: Users,
    summary: "Own appointments, prescriptions, reports, Testo Life assistant",
    badgeClass: "bg-slate-100 text-slate-700 ring-slate-200",
  },
};

export const ROLE_ORDER = Object.keys(ROLES) as Role[];

export type NavItem = {
  label: string;
  labelBn: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  // Permission needed to see this item (undefined = every signed-in user of the area)
  permission?: Permission;
  // Phase in which this page is built; undefined = already available
  phase?: number;
};

export type NavSection = { title?: string; titleBn?: string; items: NavItem[] };

const home = (role: Role): NavItem => ({
  label: "Dashboard",
  labelBn: "ড্যাশবোর্ড",
  href: ROLES[role].basePath,
  icon: LayoutDashboard,
  permission: "dashboard:read",
});

export const NAVIGATION: Record<Role, NavSection[]> = {
  super_admin: [
    { items: [home("super_admin")] },
    {
      title: "Administration",
      titleBn: "প্রশাসন",
      items: [
        { label: "Users & Staff", labelBn: "ইউজার ও স্টাফ", href: "/admin/users", icon: Users, permission: "user:manage", description: "Create staff accounts and assign roles." },
        { label: "Roles & Permissions", labelBn: "রোল ও পারমিশন", href: "/admin/roles", icon: ShieldCheck, permission: "user:manage", description: "Least-privilege access for every role." },
        { label: "Audit Logs", labelBn: "অডিট লগ", href: "/admin/audit-logs", icon: ScrollText, permission: "audit:read", description: "Who did what and when, for every sensitive action." },
        { label: "Event Log", labelBn: "ইভেন্ট লগ", href: "/admin/events", icon: Workflow, permission: "audit:read", description: "Business events and which automations processed them." },
        { label: "Knowledge Base", labelBn: "নলেজ বেস", href: "/admin/knowledge", icon: BookOpen, permission: "knowledge:manage", description: "What the patient assistant may say about the hospital." },
      ],
    },
    {
      title: "Master Data",
      titleBn: "মাস্টার ডেটা",
      items: [
        { label: "Departments", labelBn: "বিভাগ", href: "/admin/departments", icon: Building2, permission: "master_data:manage", description: "Hospital departments shown in booking." },
        { label: "Doctors", labelBn: "ডাক্তার", href: "/admin/doctors", icon: Stethoscope, permission: "master_data:manage", description: "Profiles, fees, weekly schedules, leaves and login accounts." },
        { label: "Services", labelBn: "সেবা ও চার্জ", href: "/admin/services", icon: Receipt, permission: "master_data:manage", description: "Consultation and procedure charges." },
        { label: "Lab Tests", labelBn: "ল্যাব টেস্ট", href: "/admin/lab-tests", icon: TestTube2, permission: "master_data:manage", description: "Test catalog with prices, preparation and normal ranges." },
        { label: "Medicines", labelBn: "ওষুধ", href: "/admin/medicines", icon: Pill, permission: "master_data:manage", description: "Generic and brand catalog for prescriptions." },
      ],
    },
    {
      title: "System",
      titleBn: "সিস্টেম",
      items: [
        { label: "Automation Settings", labelBn: "অটোমেশন সেটিংস", href: "/admin/automation", icon: Workflow, permission: "automation:manage", phase: 6, description: "Reminder and follow-up rules, message templates." },
        { label: "Hospital Settings", labelBn: "হাসপাতাল সেটিংস", href: "/admin/settings", icon: Settings, permission: "settings:manage", description: "Hospital profile, OPD hours, booking rules and TV notice." },
        { label: "System Health", labelBn: "সিস্টেম স্ট্যাটাস", href: "/admin/system-health", icon: Activity, permission: "settings:manage" },
      ],
    },
  ],
  management: [
    { items: [home("management")] },
    {
      title: "Insights",
      titleBn: "বিশ্লেষণ",
      items: [
        { label: "Live Overview", labelBn: "লাইভ ওভারভিউ", href: "/management/live-overview", icon: Activity, permission: "report:operations" },
        { label: "Revenue", labelBn: "আয়", href: "/management/revenue", icon: TrendingUp, permission: "report:finance", phase: 7, description: "Revenue by department, doctor and payment method." },
        { label: "Reports", labelBn: "রিপোর্ট", href: "/management/reports", icon: FileBarChart, permission: "report:operations", phase: 7, description: "Daily, monthly and custom reports with export." },
        { label: "Doctor Performance", labelBn: "ডাক্তার পারফরম্যান্স", href: "/management/doctors", icon: Stethoscope, permission: "report:operations", phase: 7, description: "Patients seen, waiting time and follow-up rate." },
        { label: "Smart Insights", labelBn: "স্মার্ট ইনসাইট", href: "/management/ai-insights", icon: Sparkles, permission: "report:operations", phase: 7, description: "Automatic trend summaries — suggestions only, humans decide." },
      ],
    },
  ],
  reception: [
    { items: [home("reception")] },
    {
      title: "Front Desk",
      titleBn: "ফ্রন্ট ডেস্ক",
      items: [
        { label: "Register Patient", labelBn: "রোগী নিবন্ধন", href: "/reception/register", icon: UserPlus, permission: "patient:create", description: "Register a new patient in under a minute." },
        { label: "Patients", labelBn: "রোগী তালিকা", href: "/reception/patients", icon: Users, permission: "patient:read_basic", description: "Instant search by name, phone or patient code." },
        { label: "Appointments", labelBn: "অ্যাপয়েন্টমেন্ট", href: "/reception/appointments", icon: CalendarDays, permission: "appointment:read" },
        { label: "Queue", labelBn: "সিরিয়াল", href: "/reception/queue", icon: ListOrdered, permission: "queue:read", description: "Every doctor's live queue; recall or send back." },
        { label: "Lab Reports", labelBn: "ল্যাব রিপোর্ট", href: "/reception/lab-reports", icon: FlaskConical, permission: "lab_report:deliver", description: "Print verified reports and hand them over." },
        { label: "Assistant Alerts", labelBn: "অ্যাসিস্ট্যান্ট অ্যালার্ট", href: "/reception/ai-alerts", icon: MessageSquareWarning, permission: "inbox:manage" },
        { label: "Collect Payment", labelBn: "পেমেন্ট গ্রহণ", href: "/reception/payments", icon: CreditCard, permission: "bill:collect", phase: 7, description: "Consultation and test payments with printed receipts." },
      ],
    },
  ],
  doctor: [
    { items: [home("doctor")] },
    {
      title: "Clinical",
      titleBn: "ক্লিনিক্যাল",
      items: [
        { label: "My Queue", labelBn: "আমার সিরিয়াল", href: "/doctor/queue", icon: ListOrdered, permission: "queue:call_next", description: "Call the next patient; the TV announces the serial." },
        { label: "Patients & EMR", labelBn: "রোগী ও EMR", href: "/doctor/patients", icon: ClipboardList, permission: "visit:read", description: "Full visit history, allergies, previous prescriptions." },
        { label: "Lab Orders", labelBn: "ল্যাব অর্ডার", href: "/doctor/lab-orders", icon: TestTube2, permission: "lab_order:create", description: "Order tests and see results as soon as they are ready." },
      ],
    },
  ],
  nurse: [{ items: [home("nurse")] }],
  lab_technician: [
    { items: [home("lab_technician")] },
    {
      title: "Laboratory",
      titleBn: "ল্যাবরেটরি",
      items: [
        { label: "Work Board", labelBn: "কাজের বোর্ড", href: "/lab/orders", icon: ClipboardList, permission: "lab_order:read", description: "Collect samples, enter results, verify and release reports." },
      ],
    },
  ],
  pharmacist: [
    { items: [home("pharmacist")] },
    {
      title: "Pharmacy",
      titleBn: "ফার্মেসি",
      items: [
        { label: "Dispense", labelBn: "ওষুধ প্রদান", href: "/pharmacy/dispense", icon: Pill, permission: "dispense:create", phase: 7, description: "Dispense against a doctor's prescription." },
        { label: "Stock", labelBn: "স্টক", href: "/pharmacy/stock", icon: Package, permission: "stock:read", phase: 7, description: "Batch-wise stock with low-stock alerts." },
        { label: "Expiry Alerts", labelBn: "মেয়াদ সতর্কতা", href: "/pharmacy/expiry", icon: PackageX, permission: "stock:manage", phase: 7, description: "Medicines expiring in the next 90 days." },
        { label: "Purchases", labelBn: "ক্রয়", href: "/pharmacy/purchases", icon: ShoppingCart, permission: "stock:manage", phase: 7, description: "Supplier purchases and stock receiving." },
      ],
    },
  ],
  accounts: [
    { items: [home("accounts")] },
    {
      title: "Finance",
      titleBn: "ফাইন্যান্স",
      items: [
        { label: "Invoices", labelBn: "ইনভয়েস", href: "/accounts/invoices", icon: Receipt, permission: "bill:read", phase: 7, description: "All invoices with status and payment history." },
        { label: "Payments", labelBn: "পেমেন্ট", href: "/accounts/payments", icon: CreditCard, permission: "bill:collect", phase: 7, description: "Cash, card and mobile banking (bKash/Nagad) payments." },
        { label: "Dues", labelBn: "বকেয়া", href: "/accounts/dues", icon: FileClock, permission: "bill:read", phase: 7, description: "Outstanding balances with automated reminders." },
        { label: "Daily Collection", labelBn: "দৈনিক সংগ্রহ", href: "/accounts/daily-collection", icon: BadgeDollarSign, permission: "report:finance", phase: 7, description: "Cash closing per counter and per user." },
      ],
    },
  ],
  patient: [
    {
      items: [
        { label: "Home", labelBn: "হোম", href: "/patient", icon: LayoutDashboard, permission: "portal:own_records" },
        { label: "Appointments", labelBn: "অ্যাপয়েন্টমেন্ট", href: "/patient/appointments", icon: CalendarDays, permission: "portal:own_records", phase: 5, description: "Book, view and cancel your appointments." },
        { label: "Prescriptions", labelBn: "প্রেসক্রিপশন", href: "/patient/prescriptions", icon: FileText, permission: "portal:own_records", phase: 5, description: "All your prescriptions in one place." },
        { label: "Reports", labelBn: "রিপোর্ট", href: "/patient/reports", icon: FlaskConical, permission: "portal:own_records", phase: 5, description: "Download your lab reports." },
        { label: "Testo Life Assistant", labelBn: "Testo Life সহকারী", href: "/chat", icon: Bot },
      ],
    },
  ],
};

// Links every staff member may open (they live outside the role areas)
export const SHARED_LINKS: NavItem[] = [
  { label: "Queue Display (TV)", labelBn: "সিরিয়াল ডিসপ্লে", href: "/queue-display", icon: ListOrdered },
  { label: "Patient Assistant", labelBn: "রোগীর সহকারী", href: "/chat", icon: Bot },
  { label: "Design System", labelBn: "ডিজাইন সিস্টেম", href: "/design-system", icon: Sparkles },
];

/** Which role area a URL belongs to, e.g. "/reception/queue" → "reception" */
export function roleFromPath(pathname: string): Role | null {
  const first = "/" + (pathname.split("/")[1] ?? "");
  return ROLE_ORDER.find((r) => ROLES[r].basePath === first) ?? null;
}

/** The menu item for the current URL (longest matching href wins) */
export function findNavItem(role: Role, pathname: string): NavItem | undefined {
  const items = NAVIGATION[role].flatMap((s) => s.items);
  return items
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

export function isActive(item: NavItem, pathname: string, role: Role): boolean {
  if (item.href === ROLES[role].basePath) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

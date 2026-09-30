// Shapes returned by the backend (mirror the service "summary" functions)

import type { AppointmentStatus } from "./appointments";

export type { AppointmentStatus };

/** What the assistant returns after booking through the Phase 3 booking service */
export type ChatBooking = {
  id: string;
  patientCode: string;
  patientName: string;
  doctor: string;
  department: string;
  room?: string;
  date: string;
  slotTime: string;
  serialNo: number;
  fee: string; // already formatted, e.g. "৳700"
  visitType: "new" | "follow-up";
};

export type ChatMessage = { role: "user" | "assistant"; text: string; at: string };

export type ChatReply = {
  sessionId: string;
  reply: string;
  emergency: boolean;
  needsHuman: boolean;
  bookedAppointments: ChatBooking[];
};

export type ChatSessionSummary = {
  sessionId: string;
  emergency: boolean;
  needsHuman: boolean;
  handoffReason?: string;
  messageCount: number;
  lastMessage?: string;
  appointments: number;
  updatedAt: string;
};

export type DashboardStats = {
  date: string;
  appointments: {
    total: number;
    byStatus: Partial<Record<AppointmentStatus, number>>;
    bySource: Partial<Record<"reception" | "chatbot" | "whatsapp" | "phone" | "walk_in", number>>;
    noShowRate: number;
  };
  byDepartment: { department: string; count: number }[];
  revenue: { expected: number; collected: number };
  ai: { chatSessions: number; bookingsByAi: number; emergencies: number; pendingHandoffs: number };
  last7Days: { date: string; count: number }[];
};

export type QueueBoard = {
  date: string;
  doctors: { doctor: string; room?: string; nowServing: number | null; waiting: number[]; booked: number }[];
};

// Shapes returned by the backend (mirror the service "summary" functions)

import type { AppointmentStatus } from "./appointments";

export type { AppointmentStatus };

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

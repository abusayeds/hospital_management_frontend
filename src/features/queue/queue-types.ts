import type { AppointmentView } from "@/lib/appointments";

export type WaitingEntry = AppointmentView & { position: number; estimatedWaitMinutes: number };

export type DoctorQueue = {
  date: string;
  doctor: {
    id: string;
    displayName: string;
    department?: string;
    roomNo?: string;
    averageMinutesPerPatient: number;
    sessionsToday: { startTime: string; endTime: string; label: string }[];
    onLeave: boolean;
  };
  current: AppointmentView | null;
  waiting: WaitingEntry[];
  notArrived: AppointmentView[];
  stats: { total: number; waiting: number; notArrived: number; completed: number; noShow: number; cancelled: number };
};

export type BoardDoctor = {
  doctorId: string;
  displayName: string;
  department?: string;
  roomNo?: string;
  onLeave: boolean;
  sitsToday: boolean;
  inSessionNow: boolean;
  sessionsToday: string[];
  currentSerial: number | null;
  waiting: number;
  notArrived: number;
  completed: number;
  total: number;
};

export type TodayGlance = {
  date: string;
  total: number;
  booked: number;
  waiting: number;
  inConsultation: number;
  completed: number;
  cancelled: number;
  noShow: number;
  checkedInTotal: number;
  bySource: Record<string, number>;
  byDepartment: { department: string; count: number }[];
  averageWaitMinutes: number | null;
  doctorsSittingToday: number;
  doctorsInSessionNow: number;
  doctors: BoardDoctor[];
};

/** "12 min" / "1 h 5 min" */
export const formatMinutes = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`);

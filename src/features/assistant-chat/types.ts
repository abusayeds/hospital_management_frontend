/** Mirrors backend/src/modules/assistant/assistant.types.ts (the channel-independent message format) */

export type ReplyOption = { id: string; label: string; description?: string; meta?: Record<string, unknown> };

export type CardKind =
  | "booking_summary"
  | "booking_success"
  | "cancel_summary"
  | "reschedule_summary"
  | "cancel_success"
  | "queue_status"
  | "appointment"
  | "lab_status"
  | "hospital_info";

export type RichMessage =
  | { type: "text"; text: string }
  | { type: "quick_replies"; text: string; options: ReplyOption[] }
  | { type: "list"; kind: "doctors" | "slots" | "patients" | "appointments" | "departments" | "options"; text: string; button: string; items: ReplyOption[] }
  | { type: "card"; kind: CardKind; title: string; fields: { label: string; value: string }[]; data?: Record<string, unknown>; actions?: ReplyOption[] }
  | { type: "otp_request"; text: string; phoneMasked: string; resendAfterSeconds: number }
  | { type: "handover"; text: string; emergency?: boolean };

export type ChatMessage = {
  id: string;
  sender: "patient" | "bot" | "staff" | "system";
  text: string;
  rich: RichMessage | null;
  createdAt: string | null;
  failed?: boolean; // local only: sending failed, show Retry
  pending?: boolean; // local only: optimistic patient message
};

export type ConversationState = {
  status: "bot_active" | "needs_human" | "human_active" | "resolved";
  verified: boolean;
  phoneMasked: string | null;
  language: "bn" | "en" | "mixed";
};

export type SendInput = { text?: string; replyId?: string; label?: string };

export type Lang = "bn" | "en";

export const UI_TEXT = {
  bn: {
    title: "Testo Life Assistant",
    online: "অনলাইন",
    staff: "হাসপাতাল স্টাফ যুক্ত আছেন",
    placeholder: "আপনার বার্তা লিখুন…",
    send: "পাঠান",
    typing: "লিখছে…",
    retry: "আবার চেষ্টা করুন",
    failed: "পাঠানো যায়নি",
    disclaimer: (phone: string) => `এই অ্যাসিস্ট্যান্ট চিকিৎসা পরামর্শ দেয় না। জরুরি অবস্থায় ${phone} বা ৯৯৯-এ ফোন করুন।`,
    choose: "বাছুন",
    serial: "সিরিয়াল",
    arriveEarly: "১৫ মিনিট আগে এসে রিসেপশনে জানান।",
    addToCalendar: "ক্যালেন্ডারে যোগ করুন",
    enterCode: "৬ সংখ্যার কোড",
    verify: "যাচাই করুন",
    resendIn: (s: number) => `${s} সেকেন্ড পর আবার পাঠানো যাবে`,
    resend: "কোড আবার পাঠান",
    staffLabel: "হাসপাতাল স্টাফ",
    ahead: "আপনার আগে",
  },
  en: {
    title: "Testo Life Assistant",
    online: "Online",
    staff: "A hospital staff member has joined",
    placeholder: "Type your message…",
    send: "Send",
    typing: "Typing…",
    retry: "Retry",
    failed: "Not sent",
    disclaimer: (phone: string) => `This assistant does not give medical advice. In an emergency call ${phone} or 999.`,
    choose: "Choose",
    serial: "Serial",
    arriveEarly: "Please arrive 15 minutes early and check in at reception.",
    addToCalendar: "Add to calendar",
    enterCode: "6-digit code",
    verify: "Verify",
    resendIn: (s: number) => `You can resend in ${s}s`,
    resend: "Resend code",
    staffLabel: "Hospital staff",
    ahead: "Ahead of you",
  },
} as const;

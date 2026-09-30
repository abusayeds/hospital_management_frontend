// The 7-phase build plan. Placeholder pages use it to say when a feature arrives.
export const PHASES: Record<number, { title: string; titleBn: string }> = {
  1: { title: "Foundation & design system", titleBn: "ভিত্তি ও ডিজাইন সিস্টেম" },
  2: { title: "Authentication, roles & audit log", titleBn: "লগইন, রোল ও অডিট লগ" },
  3: { title: "Hospital core: master data, patients, appointments & queue", titleBn: "হাসপাতাল কোর: রোগী, অ্যাপয়েন্টমেন্ট ও সিরিয়াল" },
  4: { title: "Clinical: vitals, doctor panel, EMR, prescriptions & lab", titleBn: "ক্লিনিক্যাল: ভাইটালস, EMR, প্রেসক্রিপশন ও ল্যাব" },
  5: { title: "Patient support: assistant chatbot, knowledge base & WhatsApp", titleBn: "রোগী সহায়তা: চ্যাটবট ও WhatsApp" },
  6: { title: "Automation: reminders, follow-ups & workflows", titleBn: "অটোমেশন: রিমাইন্ডার ও ফলো-আপ" },
  7: { title: "Business & launch: billing, analytics, security & deployment", titleBn: "বিলিং, অ্যানালিটিক্স ও লঞ্চ" },
};

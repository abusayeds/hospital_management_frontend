import type { Metadata } from "next";
import { WhatsAppSimulator } from "@/features/channels/whatsapp-simulator";

export const metadata: Metadata = { title: "WhatsApp simulator" };

export default function Page() {
  return <WhatsAppSimulator />;
}

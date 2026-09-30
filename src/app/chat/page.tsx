import type { Metadata } from "next";
import { ChatWindow } from "@/features/assistant-chat/chat-window";

export const metadata: Metadata = {
  title: "Testo Life Assistant",
  description: "Find a doctor, book a serial and get hospital information — in Bangla or English.",
};

/** Public patient chat. `?embed=1` = compact layout for the website widget (iframe). */
export default async function Page({ searchParams }: PageProps<"/chat">) {
  const { embed } = await searchParams;
  return <ChatWindow embed={embed === "1"} />;
}

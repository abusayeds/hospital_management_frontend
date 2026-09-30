import type { Metadata } from "next";
import { InboxScreen } from "@/features/inbox/inbox-screen";

export const metadata: Metadata = { title: "Inbox" };

export default function Page() {
  return <InboxScreen />;
}

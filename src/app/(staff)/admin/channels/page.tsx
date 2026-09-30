import type { Metadata } from "next";
import { ChannelsScreen } from "@/features/channels/channels-screen";

export const metadata: Metadata = { title: "Channels" };

export default function Page() {
  return <ChannelsScreen />;
}

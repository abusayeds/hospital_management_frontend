import type { Metadata } from "next";
import { SettingsScreen } from "@/features/master-data/settings-screen";

export const metadata: Metadata = { title: "Hospital Settings" };

export default function Page() {
  return <SettingsScreen />;
}

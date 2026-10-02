import type { Metadata } from "next";
import { DispenseScreen } from "@/features/pharmacy/dispense-screen";

export const metadata: Metadata = { title: "Dispense" };

export default function Page() {
  return <DispenseScreen />;
}

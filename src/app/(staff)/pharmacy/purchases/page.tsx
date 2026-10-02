import type { Metadata } from "next";
import { PurchasesScreen } from "@/features/pharmacy/purchases-screen";

export const metadata: Metadata = { title: "Purchases" };

export default function Page() {
  return <PurchasesScreen />;
}

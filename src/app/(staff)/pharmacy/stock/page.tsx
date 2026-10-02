import type { Metadata } from "next";
import { StockScreen } from "@/features/pharmacy/stock-screen";

export const metadata: Metadata = { title: "Stock" };

export default function Page() {
  return <StockScreen />;
}

import type { Metadata } from "next";
import { ExpiryScreen } from "@/features/pharmacy/expiry-screen";

export const metadata: Metadata = { title: "Expiry alerts" };

export default function Page() {
  return <ExpiryScreen />;
}

import type { Metadata } from "next";
import { InvoicesScreen } from "@/features/billing/invoices-screen";

export const metadata: Metadata = { title: "Collect payment" };

export default function Page() {
  return <InvoicesScreen title="Collect payment · পেমেন্ট গ্রহণ" description="Bills with money due, oldest first. Take cash, card, bKash or Nagad and print the receipt." preset={{ status: "issued" }} />;
}

import type { Metadata } from "next";
import { InvoicesScreen } from "@/features/billing/invoices-screen";

export const metadata: Metadata = { title: "Collect payment" };

export default function Page() {
  return <InvoicesScreen title="Collect payment · পেমেন্ট গ্রহণ" description="Unpaid bills — consultations and lab tests are billed automatically. Take payment and print the receipt." preset={{ status: "issued" }} />;
}

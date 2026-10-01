import type { Metadata } from "next";
import { InvoicesScreen } from "@/features/billing/invoices-screen";

export const metadata: Metadata = { title: "Invoices" };

export default function Page() {
  return <InvoicesScreen title="Invoices · ইনভয়েস" description="Every bill — automatic (visits, lab reports) and from the counter. Click a row to view, take payment, discount or refund." />;
}

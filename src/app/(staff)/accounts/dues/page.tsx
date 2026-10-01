import type { Metadata } from "next";
import { InvoicesScreen } from "@/features/billing/invoices-screen";

export const metadata: Metadata = { title: "Dues" };

export default function Page() {
  return <InvoicesScreen title="Dues · বকেয়া" description="Bills past their due date that are not fully paid." preset={{ status: "overdue" }} />;
}

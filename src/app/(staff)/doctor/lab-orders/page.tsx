import type { Metadata } from "next";
import { DoctorLabOrders } from "@/features/lab/lab-lists";

export const metadata: Metadata = { title: "Lab orders" };

export default function Page() {
  return <DoctorLabOrders />;
}

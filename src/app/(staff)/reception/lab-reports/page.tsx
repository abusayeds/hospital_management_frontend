import type { Metadata } from "next";
import { ReceptionLabReports } from "@/features/lab/lab-lists";

export const metadata: Metadata = { title: "Lab reports" };

export default function Page() {
  return <ReceptionLabReports />;
}

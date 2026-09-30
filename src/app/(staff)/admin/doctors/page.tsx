import type { Metadata } from "next";
import { DoctorsScreen } from "@/features/master-data/doctors-screen";

export const metadata: Metadata = { title: "Doctors" };

export default function Page() {
  return <DoctorsScreen />;
}

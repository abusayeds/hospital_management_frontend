import type { Metadata } from "next";
import { LabTestsScreen } from "@/features/master-data/catalog-pages";

export const metadata: Metadata = { title: "Lab Tests" };

export default function Page() {
  return <LabTestsScreen />;
}

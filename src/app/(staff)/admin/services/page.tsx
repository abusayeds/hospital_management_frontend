import type { Metadata } from "next";
import { ServicesScreen } from "@/features/master-data/catalog-pages";

export const metadata: Metadata = { title: "Services & Charges" };

export default function Page() {
  return <ServicesScreen />;
}

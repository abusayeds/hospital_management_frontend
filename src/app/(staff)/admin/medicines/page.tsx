import type { Metadata } from "next";
import { MedicinesScreen } from "@/features/master-data/catalog-pages";

export const metadata: Metadata = { title: "Medicines" };

export default function Page() {
  return <MedicinesScreen />;
}

import type { Metadata } from "next";
import { DepartmentsScreen } from "@/features/master-data/departments-screen";

export const metadata: Metadata = { title: "Departments" };

export default function Page() {
  return <DepartmentsScreen />;
}

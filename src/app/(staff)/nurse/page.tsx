import type { Metadata } from "next";
import { NurseWorklist } from "@/features/vitals/nurse-worklist";

export const metadata: Metadata = { title: "Vitals worklist" };

export default function Page() {
  return <NurseWorklist />;
}

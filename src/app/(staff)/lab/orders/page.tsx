import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { LabBoard } from "@/features/lab/lab-board";

export const metadata: Metadata = { title: "Lab work board" };

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="Work board · কাজের বোর্ড" description="Collect samples, enter results, verify and release reports." />
      <LabBoard />
    </div>
  );
}

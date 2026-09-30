import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { DoctorQueuePanel } from "@/features/queue/doctor-queue";

export const metadata: Metadata = { title: "My queue" };

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="My queue · আমার সিরিয়াল" description="Call the next patient; the waiting-room TV announces the serial." />
      <DoctorQueuePanel mode="doctor" />
    </div>
  );
}

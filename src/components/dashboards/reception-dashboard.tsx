"use client";

import { CalendarPlus, Footprints, ListOrdered, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { WalkInDialog } from "@/features/appointments/appointment-dialogs";
import { BookingStepper } from "@/features/appointments/booking-stepper";
import { DoctorMiniBoard, TodayStats, useTodayGlance } from "@/features/queue/today-glance";
import { useAuth } from "@/lib/auth";
import { DashboardIntro } from "./dashboard-intro";

/** Front desk home: today's real numbers, every doctor's queue at a glance, and the three most-used actions */
export function ReceptionDashboard() {
  const { can } = useAuth();
  const today = useTodayGlance();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [walkInOpen, setWalkInOpen] = useState(false);

  return (
    <div className="space-y-6">
      <DashboardIntro
        description="Today's front desk. Everything here updates live."
        actions={
          can("appointment:create") && (
            <>
              <Button size="xl" variant="outline" render={<Link href="/reception/register" />} nativeButton={false}>
                <UserPlus /> Register patient
              </Button>
              <Button size="xl" variant="outline" onClick={() => setWalkInOpen(true)}>
                <Footprints /> Walk-in
              </Button>
              <Button size="xl" onClick={() => setBookingOpen(true)}>
                <CalendarPlus /> New appointment
              </Button>
            </>
          )
        }
      />

      <TodayStats data={today.data} />

      <SectionCard
        title="Doctors today"
        description="Current serial and waiting patients for each doctor"
        action={
          <Button variant="outline" render={<Link href="/reception/queue" />} nativeButton={false}>
            <ListOrdered /> Open queue
          </Button>
        }
      >
        <DoctorMiniBoard doctors={today.data?.doctors} linkBase="/reception/queue" />
      </SectionCard>

      <BookingStepper open={bookingOpen} onOpenChange={setBookingOpen} />
      <WalkInDialog open={walkInOpen} onOpenChange={setWalkInOpen} />
    </div>
  );
}

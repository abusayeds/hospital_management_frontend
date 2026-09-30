"use client";

import { ReactNode, useSyncExternalStore } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/lib/auth";

const noop = () => () => {};

// Greeting uses Dhaka time; rendered on the client to avoid server/client clock mismatch.
function useGreeting() {
  return useSyncExternalStore(
    noop,
    () => {
      const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Dhaka" }).format(new Date()));
      return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    },
    () => "Welcome",
  );
}

function useToday() {
  return useSyncExternalStore(
    noop,
    () => new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Dhaka" }).format(new Date()),
    () => "",
  );
}

export function DashboardIntro({ description, actions }: { description: ReactNode; actions?: ReactNode }) {
  const greeting = useGreeting();
  const today = useToday();
  // "Dr. Kamal Uddin" → "Dr. Kamal", "Nasrin Akter" → "Nasrin"
  const fullName = useAuth().user?.name ?? "";
  const isDoctor = fullName.startsWith("Dr.");
  const firstName = `${isDoctor ? "Dr. " : ""}${fullName.replace(/^Dr\.\s*/, "").split(" ")[0]}`;
  return (
    <PageHeader
      eyebrow={today || " "}
      title={`${greeting}, ${firstName}`}
      description={description}
      actions={actions}
    />
  );
}

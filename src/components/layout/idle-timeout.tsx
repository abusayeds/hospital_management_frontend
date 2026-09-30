"use client";

import { LogOut, ShieldCheck, TimerReset } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { refreshSession } from "@/lib/api";
import { useAuth } from "@/lib/auth";

/**
 * Reception computers are shared. If nobody touches the app for 13 minutes we
 * warn; at 15 minutes we sign out so the next person cannot see patient data.
 * Activity is shared across tabs (localStorage), so working in one tab keeps
 * the others alive too.
 */
export const IDLE_WARNING_MS = 13 * 60_000;
export const IDLE_LOGOUT_MS = 15 * 60_000;
const KEY = "tl_last_activity";
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart", "mousemove"] as const;

const readLast = () => {
  try {
    return Number(localStorage.getItem(KEY)) || Date.now();
  } catch {
    return Date.now();
  }
};
const markActive = () => {
  try {
    localStorage.setItem(KEY, String(Date.now()));
  } catch {}
};

export function IdleTimeout() {
  const { logout } = useAuth();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null); // null = no warning shown
  const warningRef = useRef(false);
  const lastWrite = useRef(0);

  useEffect(() => {
    markActive();
    const onActivity = () => {
      // Once the warning is up, only the "Stay signed in" button counts
      if (warningRef.current) return;
      const now = Date.now();
      if (now - lastWrite.current > 5_000) {
        lastWrite.current = now;
        markActive();
      }
    };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    const tick = setInterval(() => {
      const idle = Date.now() - readLast();
      if (idle >= IDLE_LOGOUT_MS) {
        clearInterval(tick);
        logout({ reason: "idle" });
      } else if (idle >= IDLE_WARNING_MS) {
        warningRef.current = true;
        setSecondsLeft(Math.ceil((IDLE_LOGOUT_MS - idle) / 1000));
      } else if (warningRef.current) {
        // Activity in another tab dismissed the warning
        warningRef.current = false;
        setSecondsLeft(null);
      }
    }, 1_000);

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      clearInterval(tick);
    };
  }, [logout]);

  const staySignedIn = useCallback(async () => {
    markActive();
    warningRef.current = false;
    setSecondsLeft(null);
    await refreshSession(); // also renew the access token right away
  }, []);

  const minutes = Math.floor((secondsLeft ?? 0) / 60);
  const seconds = String((secondsLeft ?? 0) % 60).padStart(2, "0");

  return (
    <AlertDialog open={secondsLeft !== null}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-status-waiting-bg text-status-waiting-fg">
            <ShieldCheck />
          </AlertDialogMedia>
          <AlertDialogTitle className="text-lg font-semibold text-heading">Are you still there?</AlertDialogTitle>
          <AlertDialogDescription>
            For security you will be signed out in{" "}
            <strong className="text-heading tabular-nums" aria-live="polite">
              {minutes}:{seconds}
            </strong>
            . This protects patient information on shared reception computers.
            <span className="font-bangla mt-2 block">
              নিরাপত্তার জন্য কিছুক্ষণ পর আপনাকে লগআউট করা হবে, যাতে অন্য কেউ রোগীর তথ্য দেখতে না পারে।
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" size="lg" onClick={() => logout()}>
            <LogOut /> Log out
          </Button>
          <Button size="lg" onClick={staySignedIn} autoFocus>
            <TimerReset /> Stay signed in
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Loader2, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { BrandLogo } from "@/components/shared/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, getErrorMessage } from "@/lib/api";
import type { CurrentUser } from "@/lib/auth";

type Sent = { phoneMasked: string; deliveredVia: "whatsapp" | "log"; resendAfterSeconds: number; devCode?: string };

/**
 * Patient sign-in: the mobile number registered at the hospital + a 6-digit code sent to it.
 * No password to remember. The first sign-in creates the account.
 */
export function PatientLogin() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState<Sent | null>(null);
  const [wait, setWait] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  // Already signed in as a patient? Straight to the portal
  useEffect(() => {
    apiFetch<{ user: CurrentUser }>("/auth/me")
      .then(({ user }) => user.role === "patient" && router.replace("/patient"))
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const request = useMutation({
    mutationFn: () => apiFetch<Sent>("/portal/auth/request-code", { method: "POST", body: { phone } }),
    meta: { silent: true },
    onSuccess: (s) => {
      setSent(s);
      setWait(s.resendAfterSeconds);
      setCode("");
      setTimeout(() => codeRef.current?.focus(), 50);
    },
  });
  const verify = useMutation({
    mutationFn: () => apiFetch<{ user: CurrentUser }>("/portal/auth/verify", { method: "POST", body: { phone, code } }),
    meta: { silent: true },
    onSuccess: () => router.replace("/patient"),
  });
  const error = (sent ? verify.error : request.error) as Error | null;

  return (
    <main className="flex min-h-dvh flex-col bg-gradient-to-b from-accent/60 to-background px-4 py-6">
      <div className="mx-auto flex w-full max-w-md items-center justify-between">
        <BrandLogo subtitle="Patient portal" />
        <LanguageToggle />
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-5 py-10">
        <div className="rounded-3xl border bg-card p-6 shadow-raised sm:p-8">
          <div className="mb-6 space-y-1">
            <h1 className="text-2xl font-semibold text-heading">My Testolife</h1>
            <p className="font-bangla text-muted-foreground">আপনার সিরিয়াল, প্রেসক্রিপশন ও রিপোর্ট — এক জায়গায়</p>
          </div>

          {!sent ? (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                request.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="phone">
                  Mobile number <span className="font-bangla font-normal text-muted-foreground">· মোবাইল নম্বর</span>
                </Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="01XXXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-12 pl-9 text-lg tracking-wide"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground">The number you gave at the hospital. Family members registered with it are included.</p>
              </div>
              {error && (
                <p className="rounded-lg border border-status-danger-border bg-status-danger-bg px-3 py-2 text-sm text-status-danger-fg">
                  {getErrorMessage(error)}
                </p>
              )}
              <Button type="submit" size="xl" className="w-full" disabled={phone.replace(/\D/g, "").length < 10 || request.isPending}>
                {request.isPending ? <Loader2 className="animate-spin" /> : <MessageCircle />} Send code · কোড পাঠান
              </Button>
            </form>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                verify.mutate();
              }}
            >
              <p className="rounded-lg bg-muted/60 px-3 py-2.5 text-sm">
                We sent a 6-digit code to <span className="font-semibold">{sent.phoneMasked}</span>
                {sent.deliveredVia === "whatsapp" ? " on WhatsApp." : "."}
                <span className="font-bangla block text-xs text-muted-foreground">কোডটি ৫ মিনিট পর্যন্ত কাজ করবে।</span>
              </p>
              {sent.devCode && (
                <p className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
                  Development: no WhatsApp delivery — the code is <span className="font-mono font-semibold text-heading">{sent.devCode}</span>
                </p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="code">Code · কোড</Label>
                <Input
                  id="code"
                  ref={codeRef}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="h-14 text-center font-mono text-2xl tracking-[0.5em]"
                  placeholder="••••••"
                />
              </div>
              {error && (
                <p className="rounded-lg border border-status-danger-border bg-status-danger-bg px-3 py-2 text-sm text-status-danger-fg">
                  {getErrorMessage(error)}
                </p>
              )}
              <Button type="submit" size="xl" className="w-full" disabled={code.length !== 6 || verify.isPending}>
                {verify.isPending ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Sign in · প্রবেশ করুন
              </Button>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  className="flex items-center gap-1 text-muted-foreground hover:text-heading"
                  onClick={() => (setSent(null), verify.reset())}
                >
                  <ArrowLeft className="size-4" /> Change number
                </button>
                <button
                  type="button"
                  className="font-medium text-primary disabled:text-muted-foreground"
                  disabled={wait > 0 || request.isPending}
                  onClick={() => request.mutate()}
                >
                  {wait > 0 ? `Resend in ${wait}s` : "Send again"}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Not registered yet? Book through the{" "}
          <Link href="/chat" className="font-medium text-primary underline">
            Testo Life assistant
          </Link>{" "}
          or at the reception desk.
        </p>
        <p className="text-center text-xs text-muted-foreground">
          Hospital staff?{" "}
          <Link href="/login" className="underline">
            Staff sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Eye, EyeOff, HeartHandshake, Info, Loader2, LockKeyhole, ShieldCheck, Sparkles, UserX } from "lucide-react";
import { ReactNode, useEffect, useState, useSyncExternalStore } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { BrandLogo, BrandMark } from "@/components/shared/brand-logo";
import { SystemStatus } from "@/components/shared/system-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiFetch, getErrorMessage } from "@/lib/api";
import type { CurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { DEMO_PASSWORD, EmailWithDemoAccounts } from "./demo-account-email";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Enter your email").email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});
type LoginValues = z.infer<typeof loginSchema>;

// Why the user was sent to the login page (set by lib/api.ts and the idle timer)
const REASONS: Record<string, { text: string; textBn: string; tone: "info" | "warning" }> = {
  expired: { text: "Your session has expired. Please sign in again.", textBn: "সেশনের মেয়াদ শেষ হয়েছে।", tone: "info" },
  idle: { text: "You were signed out after 15 minutes without activity, to protect patient data.", textBn: "নিষ্ক্রিয় থাকায় লগআউট করা হয়েছে।", tone: "info" },
  signed_out: { text: "You have signed out.", textBn: "আপনি লগআউট করেছেন।", tone: "info" },
  revoked: { text: "For your security you were signed out on all devices. Please sign in again.", textBn: "নিরাপত্তার জন্য সব ডিভাইস থেকে লগআউট করা হয়েছে।", tone: "warning" },
  disabled: { text: "This account has been deactivated. Please contact the administrator.", textBn: "অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে।", tone: "warning" },
};

const noop = () => () => {};
const useSearchParam = (name: string) =>
  useSyncExternalStore(noop, () => new URLSearchParams(window.location.search).get(name), () => null);

// Only same-site paths inside the user's own area: blocks "?next=https://evil.example" open redirects
const destinationFor = (user: CurrentUser, next: string | null) => {
  if (user.mustChangePassword) return "/change-password";
  const home = ROLES[user.role].basePath;
  if (next && next.startsWith(home) && !next.startsWith("//")) return next;
  return home;
};

export function LoginScreen() {
  const router = useRouter();
  const reason = useSearchParam("reason");
  const next = useSearchParam("next");
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, setValue, setFocus, formState } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  // Already signed in? Go straight to the dashboard
  useEffect(() => {
    apiFetch<{ user: CurrentUser }>("/auth/me")
      .then(({ user }) => router.replace(destinationFor(user, null)))
      .catch(() => {});
  }, [router]);

  const login = useMutation({
    mutationFn: (values: LoginValues) => apiFetch<{ user: CurrentUser }>("/auth/login", { method: "POST", body: values }),
    meta: { silent: true }, // errors are shown inside the card
    onSuccess: ({ user }) => router.replace(destinationFor(user, next)),
  });

  const error = login.error instanceof ApiError ? login.error : login.error ? new ApiError("", 0, "INTERNAL_ERROR") : null;
  const reasonInfo = reason && !login.isPending && !error ? REASONS[reason] : undefined;

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel (desktop) */}
      <section className="relative hidden overflow-hidden bg-[#0b3b37] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="pointer-events-none absolute -top-32 -right-32 size-112 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="flex items-center gap-3">
          <BrandMark className="size-11 rounded-2xl bg-white text-primary" />
          <div className="leading-tight">
            <p className="text-lg font-semibold">Testolife Hospital</p>
            <p className="text-sm text-teal-100/80">Keraniganj, Dhaka</p>
          </div>
        </div>
        <div className="relative max-w-md space-y-6">
          <h1 className="text-4xl leading-tight font-semibold text-white">
            Care that runs on time.
            <span className="font-bangla mt-2 block text-3xl text-teal-100">সময়মতো, যত্নের সাথে।</span>
          </h1>
          <ul className="space-y-4 text-teal-50/90">
            <BrandPoint icon={HeartHandshake}>One system for reception, doctors, lab, pharmacy and accounts.</BrandPoint>
            <BrandPoint icon={Sparkles}>The assistant handles booking, reminders and summaries — people make every medical decision.</BrandPoint>
            <BrandPoint icon={ShieldCheck}>Each role sees only what it needs, and every sensitive action is recorded.</BrandPoint>
          </ul>
        </div>
        <p className="text-sm text-teal-100/60">© 2026 Testolife Hospital · Hospital OS</p>
      </section>

      {/* Sign-in panel */}
      <section className="flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <BrandLogo className="lg:invisible" subtitle="Hospital OS" />
          <LanguageToggle />
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 py-10">
          <div className="rounded-2xl border bg-card p-6 shadow-raised sm:p-8">
            <div className="mb-6 space-y-1">
              <h2 className="text-2xl font-semibold text-heading">Staff sign in</h2>
              <p className="font-bangla text-muted-foreground">স্টাফ লগইন</p>
            </div>

            {reasonInfo && (
              <Notice tone={reasonInfo.tone} icon={Info}>
                {reasonInfo.text}
                <span className="font-bangla block text-xs opacity-80">{reasonInfo.textBn}</span>
              </Notice>
            )}

            <form onSubmit={handleSubmit((v) => login.mutate(v))} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="email">
                  Email <span className="font-bangla font-normal text-muted-foreground">· ইমেইল</span>
                </Label>
                <EmailWithDemoAccounts
                  id="email"
                  type="email"
                  autoComplete="username"
                  className="h-11"
                  aria-invalid={Boolean(formState.errors.email)}
                  aria-describedby={formState.errors.email ? "email-error" : undefined}
                  {...register("email")}
                  onPick={(a) => {
                    setValue("email", a.email, { shouldValidate: true });
                    // Dev password from .env (or empty, clearing anything the browser autofilled)
                    setValue("password", DEMO_PASSWORD, { shouldValidate: Boolean(DEMO_PASSWORD) });
                    setFocus(DEMO_PASSWORD ? "email" : "password");
                  }}
                />
                {formState.errors.email && (
                  <p id="email-error" className="text-xs text-destructive">
                    {formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">
                  Password <span className="font-bangla font-normal text-muted-foreground">· পাসওয়ার্ড</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className="h-11 pr-11"
                    aria-invalid={Boolean(formState.errors.password)}
                    aria-describedby={formState.errors.password ? "password-error" : undefined}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {formState.errors.password && (
                  <p id="password-error" className="text-xs text-destructive">
                    {formState.errors.password.message}
                  </p>
                )}
              </div>

              {error && <LoginError error={error} />}

              <Button type="submit" size="xl" className="w-full" disabled={login.isPending}>
                {login.isPending ? <Loader2 className="animate-spin" /> : <LockKeyhole />}
                {login.isPending ? "Signing in…" : "Sign in"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Forgot your password? Ask the hospital administrator to reset it.
              </p>
            </form>
            <Link
              href="/login/patient"
              className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm font-medium text-primary hover:bg-accent"
            >
              Patient? Sign in with your phone · রোগী? ফোন নম্বর দিয়ে প্রবেশ করুন
            </Link>
          </div>
        </div>

        <div className="flex justify-center">
          <SystemStatus />
        </div>
      </section>
    </main>
  );
}

function BrandPoint({ icon: Icon, children }: { icon: typeof ShieldCheck; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
        <Icon className="size-4" aria-hidden />
      </span>
      <span>{children}</span>
    </li>
  );
}

function Notice({ tone, icon: Icon, children }: { tone: "info" | "warning" | "danger"; icon: typeof Info; children: ReactNode }) {
  return (
    <div
      role={tone === "info" ? "status" : "alert"}
      className={cn(
        "mb-4 flex gap-2.5 rounded-lg border px-3 py-2.5 text-sm",
        tone === "info" && "border-status-active-border bg-status-active-bg text-status-active-fg",
        tone === "warning" && "border-status-waiting-border bg-status-waiting-bg text-status-waiting-fg",
        tone === "danger" && "border-status-danger-border bg-status-danger-bg text-status-danger-fg",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

function LoginError({ error }: { error: ApiError }) {
  if (error.code === "ACCOUNT_LOCKED") {
    const seconds = (error.details as { retryAfterSeconds?: number } | undefined)?.retryAfterSeconds ?? 900;
    return <LockedNotice seconds={seconds} />;
  }
  if (error.code === "ACCOUNT_DISABLED") {
    return (
      <Notice tone="warning" icon={UserX}>
        This account has been deactivated. Please contact the hospital administrator.
        <span className="font-bangla block text-xs opacity-80">অ্যাকাউন্টটি নিষ্ক্রিয়। অ্যাডমিনের সাথে যোগাযোগ করুন।</span>
      </Notice>
    );
  }
  if (error.code === "INVALID_CREDENTIALS") {
    return (
      <Notice tone="danger" icon={Info}>
        Email or password is incorrect. Please try again.
        <span className="font-bangla block text-xs opacity-80">ইমেইল বা পাসওয়ার্ড সঠিক নয়।</span>
      </Notice>
    );
  }
  return (
    <Notice tone="danger" icon={Info}>
      {getErrorMessage(error)}
    </Notice>
  );
}

// Live countdown so staff know exactly when they can try again
function LockedNotice({ seconds }: { seconds: number }) {
  const [until] = useState(() => Date.now() + seconds * 1000);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Math.ceil((until - now) / 1000));
  if (left === 0) {
    return (
      <Notice tone="info" icon={Clock}>
        You can try signing in again now.
      </Notice>
    );
  }
  return (
    <Notice tone="warning" icon={Clock}>
      Too many failed attempts. For your security this account is locked. Try again in{" "}
      <strong className="tabular-nums">
        {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
      </strong>
      .<span className="font-bangla block text-xs opacity-80">বারবার ভুল পাসওয়ার্ডের কারণে অ্যাকাউন্ট সাময়িকভাবে লক।</span>
    </Notice>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { BrandLogo } from "@/components/shared/brand-logo";
import { PageSkeleton } from "@/components/shared/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiFetch, getErrorMessage } from "@/lib/api";
import { CurrentUser, ME_QUERY_KEY, useAuth } from "@/lib/auth";
import { PasswordStrength } from "./password-strength";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z
      .string()
      .min(8, "Use at least 8 characters")
      .regex(/[A-Za-z]/, "Add at least one letter")
      .regex(/\d/, "Add at least one number"),
    confirmPassword: z.string().min(1, "Type the new password again"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ["confirmPassword"], message: "The passwords do not match" })
  .refine((v) => v.newPassword !== v.currentPassword, { path: ["newPassword"], message: "Choose a password different from the current one" });
type Values = z.infer<typeof schema>;

export function ChangePasswordScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading, homePath, logout } = useAuth();
  const [show, setShow] = useState(false);
  const { register, handleSubmit, control, setError, formState } = useForm<Values>({ resolver: zodResolver(schema) });
  const newPassword = useWatch({ control, name: "newPassword" }) ?? "";

  const change = useMutation({
    mutationFn: (v: Values) =>
      apiFetch<{ user: CurrentUser }>("/auth/change-password", {
        method: "POST",
        body: { currentPassword: v.currentPassword, newPassword: v.newPassword },
      }),
    meta: { silent: true },
    onSuccess: ({ user: updated }) => {
      queryClient.setQueryData(ME_QUERY_KEY, updated);
      toast.success("Password changed. Other devices have been signed out.");
      router.replace(homePath === "/login" ? "/" : homePath);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.fieldErrors.length) {
        err.fieldErrors.forEach((f) => setError(f.path.replace(/^body\./, "") as keyof Values, { message: f.message }));
      } else {
        setError("root", { message: getErrorMessage(err) });
      }
    },
  });

  if (isLoading || !user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <PageSkeleton />
      </div>
    );
  }
  const forced = user.mustChangePassword;
  const type = show ? "text" : "password";
  const fieldError = (name: keyof Values) =>
    formState.errors[name] && (
      <p id={`${name}-error`} className="text-xs text-destructive">
        {formState.errors[name]?.message}
      </p>
    );

  return (
    <main className="flex min-h-dvh flex-col items-center px-4 py-8">
      <div className="flex w-full max-w-lg items-center justify-between">
        <BrandLogo subtitle="Hospital OS" />
        {!forced && (
          <Button variant="ghost" render={<Link href={homePath} />} nativeButton={false}>
            <ArrowLeft /> Back
          </Button>
        )}
      </div>

      <div className="mt-10 w-full max-w-lg rounded-2xl border bg-card p-6 shadow-raised sm:p-8">
        <div className="mb-6 flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
            <KeyRound className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-heading">{forced ? "Set your own password" : "Change password"}</h1>
            <p className="font-bangla text-sm text-muted-foreground">পাসওয়ার্ড পরিবর্তন</p>
          </div>
        </div>

        {forced && (
          <div role="status" className="mb-5 flex gap-2.5 rounded-lg border border-status-waiting-border bg-status-waiting-bg px-3 py-2.5 text-sm text-status-waiting-fg">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              Welcome, {user.name}. Your account was created (or reset) by an administrator, so please replace the temporary
              password with one only you know before continuing.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit((v) => change.mutate(v))} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">{forced ? "Temporary password" : "Current password"}</Label>
            <Input id="currentPassword" type={type} autoComplete="current-password" aria-invalid={Boolean(formState.errors.currentPassword)} {...register("currentPassword")} />
            {fieldError("currentPassword")}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="newPassword">New password · নতুন পাসওয়ার্ড</Label>
              <button type="button" onClick={() => setShow((s) => !s)} className="flex items-center gap-1 text-xs font-medium text-primary" aria-pressed={show}>
                {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                {show ? "Hide" : "Show"}
              </button>
            </div>
            <Input id="newPassword" type={type} autoComplete="new-password" aria-invalid={Boolean(formState.errors.newPassword)} {...register("newPassword")} />
            <PasswordStrength password={newPassword} />
            {fieldError("newPassword")}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input id="confirmPassword" type={type} autoComplete="new-password" aria-invalid={Boolean(formState.errors.confirmPassword)} {...register("confirmPassword")} />
            {fieldError("confirmPassword")}
          </div>

          {formState.errors.root && (
            <p role="alert" className="rounded-lg border border-status-danger-border bg-status-danger-bg px-3 py-2 text-sm text-status-danger-fg">
              {formState.errors.root.message}
            </p>
          )}

          <Button type="submit" size="xl" className="w-full" disabled={change.isPending}>
            {change.isPending && <Loader2 className="animate-spin" />}
            Save new password
          </Button>
          {forced && (
            <Button type="button" variant="ghost" className="w-full" onClick={() => logout()}>
              Sign out instead
            </Button>
          )}
        </form>
      </div>
    </main>
  );
}

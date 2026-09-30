"use client";

import { Check, Copy, KeyRound, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Shows a temporary password ONCE. It is never stored in the browser or shown again. */
export function TempPasswordDialog({
  data,
  onClose,
}: {
  data: { name: string; email: string; password: string; reason: "created" | "reset" } | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.password);
      setCopied(true);
      toast.success("Temporary password copied");
    } catch {
      toast.error("Could not copy. Please select the password and copy it manually.");
    }
  };

  return (
    <Dialog
      open={Boolean(data)}
      onOpenChange={(open) => {
        if (!open) {
          setCopied(false);
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-heading">
            <KeyRound className="size-5 text-primary" />
            {data?.reason === "created" ? "Account created" : "Password reset"}
          </DialogTitle>
          <DialogDescription>
            Give this temporary password to <strong className="text-heading">{data?.name}</strong> ({data?.email}). They
            must choose their own password when they first sign in.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 rounded-xl border bg-muted/50 p-3">
          <code className="flex-1 font-mono text-lg font-semibold tracking-wide text-heading select-all" aria-label="Temporary password">
            {data?.password}
          </code>
          <Button variant="outline" size="lg" onClick={copy}>
            {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        <p className="flex gap-2 rounded-lg border border-status-waiting-border bg-status-waiting-bg px-3 py-2 text-xs text-status-waiting-fg">
          <TriangleAlert className="size-4 shrink-0" aria-hidden />
          This password will not be shown again. Hand it over in person — never by public chat or SMS groups.
        </p>

        <DialogFooter>
          <Button size="lg" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

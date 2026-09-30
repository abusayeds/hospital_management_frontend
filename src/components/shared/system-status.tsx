"use client";

import { useQuery } from "@tanstack/react-query";
import { Database, Server } from "lucide-react";
import { fetchHealth } from "@/lib/api";
import { cn } from "@/lib/utils";

type Level = "ok" | "down" | "checking";

const DOT: Record<Level, string> = {
  ok: "bg-status-success-dot",
  down: "bg-status-danger-dot",
  checking: "bg-status-neutral-dot animate-pulse",
};

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: ({ signal }) => fetchHealth(signal),
    refetchInterval: 30_000,
    retry: false,
    meta: { silent: true }, // this indicator IS the error message; no toast
  });
}

/** Live indicator: is the API reachable, and is the database connected? */
export function SystemStatus({ variant = "compact", className }: { variant?: "compact" | "detailed"; className?: string }) {
  const { data, isPending, isError } = useHealth();

  const api: Level = isPending ? "checking" : isError ? "down" : "ok";
  const db: Level = isPending ? "checking" : data?.database.state === "connected" && data.status === "ok" ? "ok" : "down";
  const allOk = api === "ok" && db === "ok";

  if (variant === "compact") {
    const label = isPending ? "Checking…" : allOk ? "All systems online" : api === "down" ? "API offline" : "Database offline";
    return (
      <span
        role="status"
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium",
          allOk || isPending ? "border-border bg-card text-muted-foreground" : "border-status-danger-border bg-status-danger-bg text-status-danger-fg",
          className,
        )}
        title={data ? `DB ${data.database.state}${data.database.latencyMs !== null ? ` · ${data.database.latencyMs} ms` : ""}` : undefined}
      >
        <span aria-hidden className={cn("size-2 rounded-full", DOT[allOk ? "ok" : isPending ? "checking" : "down"])} />
        {label}
      </span>
    );
  }

  const rows = [
    {
      icon: Server,
      name: "API server",
      level: api,
      detail: data ? `${data.environment} · up ${formatUptime(data.uptimeSeconds)}` : isError ? "Not reachable" : "…",
    },
    {
      icon: Database,
      name: "Database (MongoDB)",
      level: db,
      detail: data
        ? `${data.database.state}${data.database.latencyMs !== null ? ` · ${data.database.latencyMs} ms ping` : ""}`
        : isError
          ? "Unknown (API offline)"
          : "…",
    },
  ];

  return (
    <ul role="status" className={cn("divide-y rounded-xl border bg-card shadow-card", className)}>
      {rows.map(({ icon: Icon, name, level, detail }) => (
        <li key={name} className="flex items-center gap-3 px-4 py-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-heading">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{detail}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium">
            <span aria-hidden className={cn("size-2 rounded-full", DOT[level])} />
            {level === "ok" ? "Online" : level === "down" ? "Offline" : "Checking"}
          </span>
        </li>
      ))}
    </ul>
  );
}

const formatUptime = (s: number) => (s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m` : `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`);

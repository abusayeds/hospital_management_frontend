"use client";

import { Check, Minus } from "lucide-react";
import { RoleBadge } from "@/components/layout/role-badge";
import { RequirePermission } from "@/components/shared/forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { PERMISSIONS, Permission, ROLE_PERMISSIONS, ROLES } from "@/lib/permissions";

// Group permissions by their module prefix ("patient:create" → "patient")
const GROUPS = Object.keys(PERMISSIONS).reduce<Record<string, Permission[]>>((acc, p) => {
  const group = p.split(":")[0];
  (acc[group] ??= []).push(p as Permission);
  return acc;
}, {});

/**
 * Read-only view of the permission map. It is generated from the same file the
 * API uses (backend/src/config/permissions.ts), so what you see here is exactly
 * what the server enforces. Changing a role's rights is a code change + review.
 */
export function RolesScreen() {
  return (
    <RequirePermission permission="user:manage">
      <div className="space-y-6">
        <PageHeader
          title="Roles & Permissions"
          description="What each role may do. Every role gets only what its daily work needs (least privilege). The server enforces exactly this table on every request."
        />
        <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">Permission</th>
                {ROLES.map((r) => (
                  <th key={r} className="px-2 py-3 text-center">
                    <RoleBadge role={r} />
                  </th>
                ))}
              </tr>
            </thead>
            {Object.entries(GROUPS).map(([group, perms]) => (
              <tbody key={group} className="divide-y border-t">
                <tr className="bg-muted/30">
                  <th colSpan={ROLES.length + 1} className="px-4 py-2 text-left text-xs font-semibold tracking-wide text-heading uppercase">
                    {group.replace("_", " ")}
                  </th>
                </tr>
                {perms.map((p) => (
                  <tr key={p} className="hover:bg-muted/30">
                    <td className="px-4 py-2">
                      <p className="text-heading">{PERMISSIONS[p]}</p>
                      <code className="text-xs text-muted-foreground">{p}</code>
                    </td>
                    {ROLES.map((r) => {
                      const allowed = ROLE_PERMISSIONS[r].includes(p);
                      return (
                        <td key={r} className="px-2 py-2 text-center">
                          {allowed ? (
                            <Check className="mx-auto size-4 text-status-success-fg" aria-label="Allowed" />
                          ) : (
                            <Minus className="mx-auto size-4 text-muted-foreground/40" aria-label="Not allowed" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </div>
    </RequirePermission>
  );
}

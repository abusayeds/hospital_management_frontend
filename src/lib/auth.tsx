"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, ReactNode, useCallback, useContext, useMemo } from "react";
import { apiFetch } from "./api";
import { ROLES } from "./navigation";
import type { Permission, Role } from "./permissions";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt?: string | null;
  permissions: Permission[];
};

type AuthContextValue = {
  user: CurrentUser | null;
  isLoading: boolean;
  /** UI helper only — the API enforces permissions on every request */
  can: (permission: Permission) => boolean;
  homePath: string;
  logout: (options?: { everywhere?: boolean; reason?: "signed_out" | "idle" }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const ME_QUERY_KEY = ["auth", "me"] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const me = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: () => apiFetch<{ user: CurrentUser }>("/auth/me").then((r) => r.user),
    staleTime: 5 * 60_000,
    retry: false,
    meta: { silent: true }, // a failed /me redirects to login; no toast
  });

  const user = me.data ?? null;

  const can = useCallback((permission: Permission) => Boolean(user?.permissions.includes(permission)), [user]);

  const logout = useCallback(
    async ({ everywhere = false, reason = "signed_out" }: { everywhere?: boolean; reason?: "signed_out" | "idle" } = {}) => {
      await apiFetch(everywhere ? "/auth/logout-all" : "/auth/logout", { method: "POST" }).catch(() => {});
      queryClient.clear(); // no cached patient data survives the session
      // Full reload on purpose: clears every bit of in-memory patient data from the old session
      window.location.assign(user?.role === "patient" ? "/login/patient" : `/login?reason=${reason}`);
    },
    [queryClient, user?.role],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading: me.isPending,
      can,
      homePath: user ? ROLES[user.role].basePath : "/login",
      logout,
    }),
    [user, me.isPending, can, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

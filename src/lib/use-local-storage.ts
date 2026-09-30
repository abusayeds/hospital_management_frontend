"use client";

import { useCallback, useSyncExternalStore } from "react";

// Tiny per-browser preference store (sidebar collapsed, etc.). Never used for
// patient data or auth — only harmless UI preferences.
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export function useLocalStorage(key: string, fallback: string): [string, (v: string) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key) ?? fallback;
      } catch {
        return fallback;
      }
    },
    () => fallback,
  );
  const set = useCallback(
    (v: string) => {
      try {
        localStorage.setItem(key, v);
      } catch {}
      listeners.forEach((cb) => cb());
    },
    [key],
  );
  return [value, set];
}


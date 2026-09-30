"use client";

import { createContext, ReactNode, useCallback, useContext, useSyncExternalStore } from "react";

/**
 * Minimal EN/বাংলা switch for labels that already have both versions (menus,
 * statuses, role names). Full translation of every screen comes later; the
 * point now is that every label in the config is written bilingually from day one.
 */
export type Language = "en" | "bn";

const STORAGE_KEY = "testolife_lang";
const listeners = new Set<() => void>();

const read = (): Language => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "bn" ? "bn" : "en";
  } catch {
    return "en";
  }
};

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

const LanguageContext = createContext<{ lang: Language; setLang: (l: Language) => void }>({
  lang: "en",
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribe, read, () => "en" as Language);
  const setLang = useCallback((l: Language) => {
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
    listeners.forEach((cb) => cb());
  }, []);
  return <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);

/** Pick the right label: t({ label, labelBn }) */
export function useLabel() {
  const { lang } = useLanguage();
  return (item: { label: string; labelBn?: string }) => (lang === "bn" && item.labelBn ? item.labelBn : item.label);
}

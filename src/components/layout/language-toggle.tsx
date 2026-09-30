"use client";

import { Language, useLanguage } from "@/lib/language";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Language; label: string; aria: string }[] = [
  { value: "en", label: "EN", aria: "English" },
  { value: "bn", label: "বাং", aria: "বাংলা" },
];

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLanguage();
  return (
    <div role="radiogroup" aria-label="Language" className={cn("inline-flex rounded-lg border bg-muted p-0.5", className)}>
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={lang === o.value}
          aria-label={o.aria}
          onClick={() => setLang(o.value)}
          className={cn(
            "h-8 min-w-10 rounded-md px-2 text-xs font-semibold transition-colors",
            lang === o.value ? "bg-card text-primary shadow-card" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

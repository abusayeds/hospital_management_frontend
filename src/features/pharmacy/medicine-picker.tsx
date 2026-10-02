"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { apiFetchPage } from "@/lib/api";
import { Medicine } from "@/lib/master-data";
import { useDebouncedValue } from "@/lib/use-debounced-value";

export const medicineLabel = (m: Pick<Medicine, "brandName" | "strength" | "form">) => [m.brandName, m.strength, m.form].filter(Boolean).join(" ");

/** Type-ahead over the medicine catalogue (brand or generic). Enter picks the first match. */
export function MedicinePicker({
  onPick,
  placeholder = "Search medicine — brand or generic",
  autoFocus,
}: {
  onPick: (m: Medicine) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState("");
  const term = useDebouncedValue(q.trim(), 250);
  const results = useQuery({
    queryKey: ["medicine-search", term],
    queryFn: () => apiFetchPage<Medicine>(`/medicines?q=${encodeURIComponent(term)}&status=active&limit=8`),
    enabled: term.length >= 2,
  });
  const items = term.length >= 2 ? (results.data?.items ?? []) : [];
  const pick = (m: Medicine) => {
    onPick(m);
    setQ("");
  };
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && items[0]) {
            e.preventDefault();
            pick(items[0]);
          }
          if (e.key === "Escape") setQ("");
        }}
        placeholder={placeholder}
        className="h-10 pl-9"
        aria-label="Search medicines"
      />
      {items.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border bg-popover shadow-lg">
          {items.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => pick(m)} className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-muted">
                <span className="text-sm font-medium text-heading">{medicineLabel(m)}</span>
                <span className="text-xs text-muted-foreground">
                  {m.genericName}
                  {m.manufacturer ? ` · ${m.manufacturer}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {term.length >= 2 && results.data && items.length === 0 && (
        <p className="absolute inset-x-0 top-full z-30 mt-1 rounded-lg border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-lg">
          No medicine matches “{term}”. An admin can add it under Admin → Medicines.
        </p>
      )}
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Pill, Plus, Search, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { apiFetchPage } from "@/lib/api";
import { allergyMatches, buildInstructions, DOSE_PATTERN, duplicateGenerics, MEAL_TIMINGS, MealTiming } from "@/lib/clinical-rules";
import type { Medicine } from "@/lib/master-data";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { cn } from "@/lib/utils";
import { DOSE_PRESETS, DURATION_PRESETS, RxItem, TIMING_LABEL } from "./types";

/** Instructions are regenerated whenever dose, timing or duration change */
const withInstructions = (item: RxItem): RxItem => {
  const auto = buildInstructions(item);
  return { ...item, instructionsEn: auto.en, instructionsBn: auto.bn };
};

export const itemFromMedicine = (m: Medicine): RxItem =>
  withInstructions({
    medicineId: m.id,
    brandName: m.brandName,
    genericName: m.genericName,
    strength: m.strength ?? "",
    form: m.form,
    dosePattern: "1+0+1",
    timing: "after_meal",
    durationDays: 7,
    route: m.form === "cream" || m.form === "ointment" || m.form === "gel" ? "topical" : m.form === "inhaler" ? "inhalation" : "oral",
    instructionsEn: "",
    instructionsBn: "",
    note: "",
  });

function MedicineSearch({ onPick }: { onPick: (m: Medicine) => void }) {
  const [q, setQ] = useState("");
  const term = useDebouncedValue(q.trim(), 250);
  const results = useQuery({
    queryKey: ["medicine-search", term],
    queryFn: () => apiFetchPage<Medicine>(`/medicines?q=${encodeURIComponent(term)}&status=active&limit=8`),
    enabled: term.length >= 2,
  });
  const items = term.length >= 2 ? (results.data?.items ?? []) : [];
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && items[0]) {
            e.preventDefault();
            onPick(items[0]);
            setQ("");
          }
          if (e.key === "Escape") setQ("");
        }}
        placeholder="Add medicine — brand or generic (e.g. Napa)"
        className="h-11 pl-9"
        aria-label="Search medicines"
      />
      {items.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border bg-popover shadow-lg">
          {items.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  onPick(m);
                  setQ("");
                }}
              >
                <Pill className="size-4 shrink-0 text-muted-foreground" />
                <span className="font-medium text-heading">
                  {m.brandName} {m.strength}
                </span>
                <span className="truncate text-muted-foreground">
                  {m.genericName} · <span className="capitalize">{m.form}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {term.length >= 2 && results.data && items.length === 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          Not in the catalogue.{" "}
          <button
            type="button"
            className="font-medium text-primary underline"
            onClick={() => {
              onPick({ id: "", brandName: q.trim(), genericName: "", form: "tablet", isActive: true });
              setQ("");
            }}
          >
            Add “{q.trim()}” as free text
          </button>
        </p>
      )}
    </div>
  );
}

function ItemRow({
  item,
  index,
  allergyHits,
  onChange,
  onRemove,
}: {
  item: RxItem;
  index: number;
  allergyHits: string[];
  onChange: (item: RxItem) => void;
  onRemove: () => void;
}) {
  const set = (patch: Partial<RxItem>) => onChange(withInstructions({ ...item, ...patch }));
  const doseOk = DOSE_PATTERN.test(item.dosePattern);
  const continued = item.durationDays === "continue";
  return (
    <li className={cn("space-y-2 rounded-xl border bg-card p-3", allergyHits.length > 0 && "border-status-danger-border bg-status-danger-bg/30")}>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-sm font-semibold text-muted-foreground tabular-nums">{index + 1}.</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-heading">
            {item.brandName} {item.strength}
            <span className="ml-1 text-xs font-normal text-muted-foreground capitalize">{item.form}</span>
          </p>
          {item.genericName && <p className="text-xs text-muted-foreground">{item.genericName}</p>}
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label={`Remove ${item.brandName}`}>
          <X />
        </Button>
      </div>

      {allergyHits.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-status-danger-fg">
          <AlertTriangle className="size-3.5" /> Patient is allergic to {allergyHits.join(", ")}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {DOSE_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => set({ dosePattern: p })}
            className={cn(
              "rounded-md border px-2 py-1 font-mono text-xs tabular-nums",
              item.dosePattern === p ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {p}
          </button>
        ))}
        <Input
          value={item.dosePattern}
          onChange={(e) => set({ dosePattern: e.target.value })}
          aria-label="Dose pattern"
          aria-invalid={!doseOk}
          className="h-8 w-24 font-mono text-xs"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NativeSelect
          value={item.timing ?? ""}
          onChange={(e) => set({ timing: (e.target.value || null) as MealTiming | null })}
          aria-label="When to take"
          className="h-9 text-xs"
        >
          <option value="">Timing —</option>
          {MEAL_TIMINGS.map((t) => (
            <option key={t} value={t}>
              {TIMING_LABEL[t]}
            </option>
          ))}
        </NativeSelect>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={1}
            max={365}
            value={continued ? "" : (item.durationDays ?? "")}
            disabled={continued}
            onChange={(e) => set({ durationDays: e.target.value ? Number(e.target.value) : null })}
            aria-label="Duration in days"
            placeholder={continued ? "Continue" : "Days"}
            className="h-9 text-xs"
          />
          <Button
            variant={continued ? "default" : "outline"}
            size="sm"
            className="h-9 shrink-0 text-xs"
            onClick={() => set({ durationDays: continued ? 7 : "continue" })}
            title="Long-term medicine"
          >
            চলবে
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {DURATION_PRESETS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => set({ durationDays: d })}
            className={cn("rounded-md border px-2 py-0.5 text-xs tabular-nums", item.durationDays === d ? "border-primary text-primary" : "text-muted-foreground hover:bg-muted")}
          >
            {d}d
          </button>
        ))}
      </div>
      <p className="rounded-md bg-muted/70 px-2 py-1.5 font-bangla text-sm">{item.instructionsBn || "—"}</p>
    </li>
  );
}

/** The Rx list the doctor edits. Allergy and duplicate warnings appear instantly (shared rules). */
export function RxEditor({ items, allergies, onChange }: { items: RxItem[]; allergies: string[]; onChange: (items: RxItem[]) => void }) {
  const duplicates = duplicateGenerics(items);
  return (
    <div className="space-y-3">
      <MedicineSearch
        onPick={(m) => {
          const item = m.id ? itemFromMedicine(m) : { ...itemFromMedicine(m), medicineId: null, genericName: "", strength: "" };
          onChange([...items, item]);
        }}
      />
      {duplicates.length > 0 && (
        <p className="flex items-center gap-1.5 rounded-lg border border-status-waiting-border bg-status-waiting-bg px-3 py-2 text-xs text-status-waiting-fg">
          <AlertTriangle className="size-3.5" /> Same generic prescribed twice: <b className="capitalize">{duplicates.join(", ")}</b>
        </p>
      )}
      {items.length === 0 ? (
        <p className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-6 text-sm text-muted-foreground">
          <Plus className="size-4" /> Search above, or apply a template.
        </p>
      ) : (
        <ol className="space-y-2">
          {items.map((item, i) => (
            <ItemRow
              key={`${item.brandName}-${i}`}
              item={item}
              index={i}
              allergyHits={allergyMatches(allergies, item)}
              onChange={(next) => onChange(items.map((it, j) => (j === i ? next : it)))}
              onRemove={() => onChange(items.filter((_, j) => j !== i))}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronRight, Loader2, Search, UserRoundSearch } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { TableRowsSkeleton } from "@/components/shared/loading-skeleton";
import { Input } from "@/components/ui/input";
import { apiFetchPage } from "@/lib/api";
import { initials } from "@/lib/master-data";
import { ageGender, formatDate, formatPhone, Patient } from "@/lib/patients";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { cn } from "@/lib/utils";

/**
 * The reception search box: type a phone number, patient code or name and results
 * appear while typing. Everyone sharing a phone number is listed (families share
 * phones in Bangladesh). Used on the Patients page and in the booking stepper.
 */
export function PatientSearch({
  onSelect,
  autoFocus = true,
  emptyAction,
  pageSize = 10,
  showRecentWhenEmpty = true,
}: {
  onSelect: (p: Patient) => void;
  autoFocus?: boolean;
  emptyAction?: (query: string) => React.ReactNode;
  pageSize?: number;
  showRecentWhenEmpty?: boolean;
}) {
  const [q, setQ] = useState("");
  const debounced = useDebouncedValue(q.trim(), 250);
  const enabled = showRecentWhenEmpty || debounced.length > 0;

  const results = useQuery({
    queryKey: ["patients", "search", debounced, pageSize],
    queryFn: () => apiFetchPage<Patient>(`/patients?${new URLSearchParams({ ...(debounced && { q: debounced }), limit: String(pageSize) })}`),
    enabled,
    placeholderData: keepPreviousData,
  });

  const list = results.data?.items ?? [];

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus={autoFocus}
          placeholder="Phone, patient code or name · ফোন, কোড বা নাম"
          aria-label="Search patients by phone, patient code or name"
          className="h-14 rounded-xl pr-12 pl-12 text-lg shadow-card"
        />
        {results.isFetching && <Loader2 className="absolute top-1/2 right-4 size-5 -translate-y-1/2 animate-spin text-muted-foreground" aria-label="Searching" />}
      </div>

      {!enabled ? null : results.isPending ? (
        <div className="rounded-xl border bg-card">
          <TableRowsSkeleton rows={4} columns={3} />
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border bg-card shadow-card">
          <EmptyState
            icon={UserRoundSearch}
            title={debounced ? `No patient found for "${debounced}"` : "No patients yet"}
            description="Check the number, or register the patient."
            action={emptyAction?.(debounced)}
          />
        </div>
      ) : (
        <>
          {!debounced && <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Recently registered</p>}
          <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-card" aria-label="Search results">
            {list.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onSelect(p)}
                  className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-accent/60 focus-visible:bg-accent focus-visible:outline-none"
                >
                  <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-primary">
                    {initials(p.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2">
                      <span className="font-semibold text-heading">{p.name}</span>
                      {p.nameBn && <span className="font-bangla text-sm text-muted-foreground">{p.nameBn}</span>}
                      {p.allergies.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-status-danger-fg">
                          <AlertTriangle className="size-3.5" aria-hidden /> Allergy
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                      <span>{ageGender(p)}</span>
                      <span className="tabular-nums">{formatPhone(p.phone)}</span>
                      <span className="hidden sm:inline">Last visit: {formatDate(p.lastVisitDate)}</span>
                    </span>
                  </span>
                  <span className={cn("rounded-md bg-muted px-2 py-1 font-mono text-sm font-semibold text-heading")}>{p.patientCode}</span>
                  <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          {results.data && results.data.pagination.total > list.length && (
            <p className="text-xs text-muted-foreground">
              Showing {list.length} of {results.data.pagination.total}. Type more of the number or name to narrow down.
            </p>
          )}
        </>
      )}
    </div>
  );
}

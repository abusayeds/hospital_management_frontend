"use client";

import { ChevronLeft, ChevronRight, SearchX, Search } from "lucide-react";
import { ReactNode, useDeferredValue, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { TableRowsSkeleton } from "@/components/shared/loading-skeleton";
import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string; // e.g. "text-right" or "hidden md:table-cell"
};

type DataTableProps<T> = {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  // Text the search box matches against (name, phone, patient code, ...)
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  filters?: ReactNode; // slot for selects/date pickers next to the search box
  toolbarActions?: ReactNode;
  isLoading?: boolean;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  className?: string;
  // Server-side mode: the API does search + paging (large lists such as users, audit logs)
  server?: {
    // Omit both to hide the search box (filters only)
    query?: string;
    onQueryChange?: (query: string) => void;
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
};

/**
 * Search + filters slot + pagination + loading skeleton + empty state.
 * Client-side by default (filters and pages the rows it is given). Pass
 * `server` to let the API search and page instead — same columns, same look.
 */
export function DataTable<T>({
  data,
  columns,
  getRowId,
  searchText,
  searchPlaceholder = "Search…",
  filters,
  toolbarActions,
  isLoading,
  pageSize = 8,
  onRowClick,
  rowClassName,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  emptyAction,
  className,
  server,
}: DataTableProps<T>) {
  const [localQuery, setLocalQuery] = useState("");
  const [localPage, setLocalPage] = useState(1);
  const query = server ? (server.query ?? "") : localQuery;
  const setQuery = server ? (server.onQueryChange ?? (() => {})) : setLocalQuery;
  const showSearch = Boolean(searchText || server?.onQueryChange);
  // Keeps typing instant even on long lists: filtering runs at lower priority
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const filtered = useMemo(() => {
    if (server || !deferredQuery || !searchText) return data;
    return data.filter((row) => searchText(row).toLowerCase().includes(deferredQuery));
  }, [server, data, deferredQuery, searchText]);

  const size = server ? server.pageSize : pageSize;
  const total = server ? server.total : filtered.length;
  const pageCount = server ? Math.max(1, server.totalPages) : Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(server ? server.page : localPage, pageCount);
  const setPage = server ? server.onPageChange : setLocalPage;
  const rows = server ? data : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const from = total ? (currentPage - 1) * size + 1 : 0;
  const to = Math.min((currentPage - 1) * size + rows.length, total);
  const isSearching = Boolean(deferredQuery);

  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card shadow-card", className)}>
      {(showSearch || filters || toolbarActions) && (
        <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:p-4">
          {showSearch && (
            <div className="relative w-full sm:max-w-xs">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="pl-9"
              />
            </div>
          )}
          {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
          {toolbarActions && <div className="flex flex-wrap items-center gap-2 sm:ml-auto">{toolbarActions}</div>}
        </div>
      )}

      {isLoading ? (
        <TableRowsSkeleton columns={Math.min(columns.length, 5)} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={isSearching ? SearchX : undefined}
          title={isSearching ? `No results for "${query.trim()}"` : emptyTitle}
          description={isSearching ? "Check the spelling, or try a shorter search." : emptyDescription}
          action={
            isSearching ? (
              <Button variant="outline" onClick={() => setQuery("")}>
                Clear search
              </Button>
            ) : (
              emptyAction
            )
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={cn("h-11 px-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase", col.className)}
                  >
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={getRowId(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(onRowClick && "cursor-pointer", rowClassName?.(row))}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={cn("px-4 py-3", col.className)}>
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!isLoading && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground">
          <p>
            Showing <span className="font-medium text-foreground tabular-nums">{from}</span>–
            <span className="font-medium text-foreground tabular-nums">{to}</span> of{" "}
            <span className="font-medium text-foreground tabular-nums">{total}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft /> Prev
            </Button>
            <span className="tabular-nums">
              {currentPage} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage >= pageCount}
              aria-label="Next page"
            >
              Next <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

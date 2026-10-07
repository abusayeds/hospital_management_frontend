"use client";

import { ComponentProps, KeyboardEvent, useState } from "react";
import { RoleBadge } from "@/components/layout/role-badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DEMO_ACCOUNTS } from "./demo-accounts";

// Dev only — set NEXT_PUBLIC_DEMO_PASSWORD in frontend/.env.development.local (same value as backend DEMO_PASSWORD).
// Password autofill remains limited to development builds.
export const DEMO_PASSWORD = process.env.NODE_ENV === "development" ? (process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "") : "";

export type DemoAccount = (typeof DEMO_ACCOUNTS)[number];
type Props = ComponentProps<typeof Input> & { onPick: (account: DemoAccount) => void };

/** Email input that opens the test-account list on click in every environment. */
export function EmailWithDemoAccounts({ onPick, ...props }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);

  const q = query.trim().toLowerCase();
  const matches = DEMO_ACCOUNTS.filter((a) => !q || a.email.toLowerCase().includes(q) || String(a.role).toLowerCase().includes(q));
  const show = open && matches.length > 0;

  const openList = () => {
    setQuery("");
    setActive(-1);
    setOpen(true);
  };
  const pick = (a: DemoAccount) => {
    setOpen(false);
    onPick(a);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      if (open) setActive((i) => (i + 1) % matches.length);
      else openList();
    } else if (e.key === "ArrowUp" && open) setActive((i) => (i <= 0 ? matches.length - 1 : i - 1));
    else if (e.key === "Enter" && show && active >= 0) pick(matches[active]);
    else if (e.key === "Escape" && open) setOpen(false);
    else return;
    e.preventDefault();
  };

  return (
    <div className="relative">
      <Input
        {...props}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={show}
        aria-controls="demo-accounts"
        aria-activedescendant={show && active >= 0 ? `demo-account-${active}` : undefined}
        onChange={(e) => {
          props.onChange?.(e);
          setQuery(e.target.value);
          setActive(-1);
          setOpen(true);
        }}
        onBlur={(e) => {
          props.onBlur?.(e);
          setOpen(false);
        }}
        onFocus={openList}
        onClick={() => !open && openList()}
        onKeyDown={onKeyDown}
      />

      {show && (
        <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-raised">
          <p className="border-b px-3 py-2 text-[11px] text-muted-foreground">
            Demo accounts
            {!DEMO_PASSWORD && (
              <>
                {" "}
                — set <code className="rounded bg-muted px-1">NEXT_PUBLIC_DEMO_PASSWORD</code> to auto-fill the password
              </>
            )}
          </p>
          <ul id="demo-accounts" role="listbox" aria-label="Demo accounts" className="max-h-64 overflow-y-auto p-1">
            {matches.map((a, i) => (
              <li
                key={a.email}
                id={`demo-account-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()} // keep focus so blur doesn't close before the click
                onClick={() => pick(a)}
                onMouseEnter={() => setActive(i)}
                className={cn("flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-xs", i === active && "bg-accent")}
              >
                <span className="truncate text-muted-foreground">{a.email}</span>
                <RoleBadge role={a.role} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

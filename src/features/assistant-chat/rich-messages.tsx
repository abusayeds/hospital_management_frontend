"use client";

import { AlertTriangle, CalendarPlus, CheckCircle2, Clock, FlaskConical, Headset, KeyRound, Stethoscope } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Lang, ReplyOption, RichMessage, SendInput, UI_TEXT } from "./types";

type Tap = (input: SendInput) => void;
type Props<M> = { m: M; lang: Lang; onTap: Tap; disabled?: boolean };

const Chip = ({ option, onTap, disabled, className }: { option: ReplyOption; onTap: Tap; disabled?: boolean; className?: string }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => onTap({ replyId: option.id, label: option.label })}
    className={cn(
      "min-h-10 rounded-full border border-primary/40 bg-card px-3.5 py-1.5 text-left text-sm font-medium text-primary transition hover:bg-primary hover:text-primary-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
  >
    {option.label}
  </button>
);

export function QuickReplies({ m, onTap, disabled }: Props<Extract<RichMessage, { type: "quick_replies" }>>) {
  return (
    <div className="space-y-2">
      {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
      <div className="flex flex-wrap gap-2">
        {m.options.map((o) => (
          <Chip key={o.id} option={o} onTap={onTap} disabled={disabled} />
        ))}
      </div>
    </div>
  );
}

function DoctorCards({ m, lang, onTap, disabled }: Props<Extract<RichMessage, { type: "list" }>>) {
  return (
    <div className="grid gap-2">
      {m.items.map((d) => {
        const meta = (d.meta ?? {}) as { initials?: string; department?: string; fee?: string; nextAvailable?: string | null; specialization?: string };
        return (
          <div key={d.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
            <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-status-info-bg font-semibold text-status-info-fg">
              {meta.initials ?? <Stethoscope className="size-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-heading">{d.label}</p>
              <p className="truncate text-xs text-muted-foreground">
                {meta.department}
                {meta.specialization ? ` · ${meta.specialization}` : ""}
              </p>
              <p className="text-xs">
                <span className="font-medium text-heading">{meta.fee}</span>
                {meta.nextAvailable && <span className="text-status-success-fg"> · {meta.nextAvailable}</span>}
              </p>
            </div>
            <Button size="sm" disabled={disabled} onClick={() => onTap({ replyId: d.id, label: d.label })}>
              {UI_TEXT[lang].choose}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function SlotChips({ m, onTap, disabled }: Props<Extract<RichMessage, { type: "list" }>>) {
  const groups = new Map<string, ReplyOption[]>();
  for (const s of m.items) {
    const key = String(s.meta?.session ?? s.description ?? "");
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  return (
    <div className="space-y-2">
      {[...groups.entries()].map(([session, slots]) => (
        <div key={session}>
          {session && <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{session}</p>}
          <div className="flex flex-wrap gap-2">
            {slots.map((s) => (
              <Chip key={s.id} option={s} onTap={onTap} disabled={disabled} className="tabular-nums" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListMessage(props: Props<Extract<RichMessage, { type: "list" }>>) {
  const { m, onTap, disabled } = props;
  return (
    <div className="space-y-2">
      {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
      {m.kind === "doctors" ? (
        <DoctorCards {...props} />
      ) : m.kind === "slots" ? (
        <SlotChips {...props} />
      ) : (
        <div className="grid gap-1.5">
          {m.items.map((o) => (
            <button
              key={o.id}
              type="button"
              disabled={disabled}
              onClick={() => onTap({ replyId: o.id, label: o.label })}
              className="rounded-xl border bg-card px-3 py-2 text-left transition hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
            >
              <span className="block text-sm font-medium text-heading">{o.label}</span>
              {o.description && <span className="block text-xs text-muted-foreground">{o.description}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Google Calendar link for a booking (Dhaka time → UTC) */
const calendarUrl = (d: { date?: string; time?: string; doctor?: string; room?: string | null; serialNo?: number }) => {
  if (!d.date || !d.time) return null;
  const start = new Date(`${d.date}T${d.time}:00+06:00`);
  const end = new Date(start.getTime() + 20 * 60_000);
  const fmt = (x: Date) => x.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Doctor visit — ${d.doctor ?? "Testolife Hospital"} (Serial ${d.serialNo ?? ""})`,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: "Please arrive 15 minutes early and check in at reception.",
    location: `Testolife Hospital${d.room ? `, Room ${d.room}` : ""}`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
};

const Fields = ({ fields }: { fields: { label: string; value: string }[] }) => (
  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
    {fields.map((f) => (
      <div key={f.label} className="contents">
        <dt className="text-muted-foreground">{f.label}</dt>
        <dd className="font-medium text-heading">{f.value}</dd>
      </div>
    ))}
  </dl>
);

export function CardMessage({ m, lang, onTap, disabled }: Props<Extract<RichMessage, { type: "card" }>>) {
  const t = UI_TEXT[lang];
  if (m.kind === "booking_success") {
    const d = (m.data ?? {}) as { serialNo?: number; date?: string; time?: string; doctor?: string; room?: string | null };
    const cal = calendarUrl(d);
    return (
      <div className="overflow-hidden rounded-2xl border border-status-success-border bg-card">
        <div className="flex items-center gap-3 bg-status-success-bg px-4 py-3 text-status-success-fg">
          <CheckCircle2 className="size-6 shrink-0" />
          <p className="font-semibold">{m.title}</p>
        </div>
        <div className="space-y-3 p-4">
          <div className="text-center">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t.serial}</p>
            <p className="text-6xl leading-none font-black text-primary tabular-nums">{d.serialNo}</p>
          </div>
          <Fields fields={m.fields.filter((f) => !f.label.startsWith("সিরিয়াল"))} />
          <p className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-sm">
            <Clock className="size-4 shrink-0" /> {t.arriveEarly}
          </p>
          {cal && (
            <a href={cal} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline">
              <CalendarPlus className="size-4" /> {t.addToCalendar}
            </a>
          )}
        </div>
      </div>
    );
  }
  if (m.kind === "queue_status") {
    const d = (m.data ?? {}) as { currentSerial?: number | null; yourSerial?: number; peopleAhead?: number };
    const pct = d.yourSerial && d.currentSerial ? Math.min(100, Math.round((d.currentSerial / d.yourSerial) * 100)) : 5;
    return (
      <div className="space-y-3 rounded-2xl border bg-card p-4">
        <p className="font-semibold text-heading">{m.title}</p>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{t.ahead}</p>
            <p className="text-4xl font-black text-primary tabular-nums">{d.peopleAhead ?? "—"}</p>
          </div>
          <p className="text-right text-sm">
            {t.serial} <span className="font-bold tabular-nums">{d.yourSerial}</span>
          </p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <Fields fields={m.fields.filter((f) => !f.label.includes("Ahead"))} />
      </div>
    );
  }
  const isSummary = m.kind === "booking_summary" || m.kind === "cancel_summary" || m.kind === "reschedule_summary";
  return (
    <div className={cn("space-y-3 rounded-2xl border bg-card p-4", m.kind === "cancel_summary" && "border-status-waiting-border")}>
      <p className="flex items-center gap-2 font-semibold text-heading">
        {m.kind === "lab_status" && <FlaskConical className="size-4 text-primary" />}
        {m.title}
      </p>
      <Fields fields={m.fields} />
      {isSummary && m.actions && (
        <div className="flex flex-wrap gap-2 pt-1">
          {m.actions.map((a, i) => (
            <Button key={a.id} size="lg" variant={i === 0 ? "default" : "outline"} disabled={disabled} onClick={() => onTap({ replyId: a.id, label: a.label })}>
              {a.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

export function OtpRequest({ m, lang, onTap, disabled }: Props<Extract<RichMessage, { type: "otp_request" }>>) {
  const t = UI_TEXT[lang];
  const [code, setCode] = useState("");
  const [left, setLeft] = useState(m.resendAfterSeconds);
  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  return (
    <div className="space-y-2">
      <p className="whitespace-pre-wrap">{m.text}</p>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.length === 6) onTap({ replyId: `otp|${code}`, label: "••••••" });
        }}
      >
        <label htmlFor="otp-input" className="sr-only">
          {t.enterCode}
        </label>
        <div className="relative flex-1">
          <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="otp-input"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder={t.enterCode}
            disabled={disabled}
            className="h-11 w-full rounded-lg border border-input bg-card pr-3 pl-9 font-mono text-lg tracking-[0.4em] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <Button type="submit" size="lg" disabled={disabled || code.length !== 6}>
          {t.verify}
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">
        {left > 0 ? (
          t.resendIn(left)
        ) : (
          <button type="button" className="font-medium text-primary underline" disabled={disabled} onClick={() => onTap({ text: lang === "bn" ? "কোডটি আবার পাঠান" : "Please send the code again" })}>
            {t.resend}
          </button>
        )}
      </p>
    </div>
  );
}

export function HandoverNotice({ m }: { m: Extract<RichMessage, { type: "handover" }> }) {
  return (
    <div
      role={m.emergency ? "alert" : "status"}
      className={cn(
        "flex gap-2 rounded-2xl border px-4 py-3 text-sm whitespace-pre-wrap",
        m.emergency ? "border-status-danger-border bg-status-danger-bg text-status-danger-fg" : "border-status-info-border bg-status-info-bg text-status-info-fg",
      )}
    >
      {m.emergency ? <AlertTriangle className="mt-0.5 size-5 shrink-0" /> : <Headset className="mt-0.5 size-5 shrink-0" />}
      <p>{m.text}</p>
    </div>
  );
}

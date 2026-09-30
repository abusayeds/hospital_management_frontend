"use client";

import { CopyPlus, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DAY_NAMES, DAY_NAMES_BN, ScheduleSession, WEEK_ORDER } from "@/lib/master-data";
import { cn } from "@/lib/utils";

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/** Same rules as the backend slot engine: end after start, fits one slot, no overlap on a day */
export function scheduleProblems(sessions: ScheduleSession[]): string[] {
  const problems: string[] = [];
  for (const s of sessions) {
    if (toMin(s.endTime) <= toMin(s.startTime)) problems.push(`${DAY_NAMES[s.dayOfWeek]} ${s.startTime}–${s.endTime}: end must be after start`);
    else if (toMin(s.startTime) + s.slotMinutes > toMin(s.endTime)) problems.push(`${DAY_NAMES[s.dayOfWeek]} ${s.startTime}–${s.endTime}: shorter than one slot`);
  }
  for (let day = 0; day < 7; day++) {
    const list = sessions.filter((s) => s.dayOfWeek === day).sort((a, b) => toMin(a.startTime) - toMin(b.startTime));
    for (let i = 1; i < list.length; i++) {
      if (toMin(list[i].startTime) < toMin(list[i - 1].endTime)) problems.push(`${DAY_NAMES[day]}: sessions overlap`);
    }
  }
  return problems;
}

type Draft = { dayOfWeek: number; startTime: string; endTime: string; slotMinutes: number; maxPatients: number };

/**
 * Visual weekly schedule: one column per day (Saturday first). Each session shows
 * its time, slot length and patient limit. Add, remove, or copy a day's sessions
 * to every working day. Problems are shown live, before saving.
 */
export function ScheduleEditor({
  sessions,
  onChange,
  defaultSlotMinutes,
  defaultMaxPatients,
}: {
  sessions: ScheduleSession[];
  onChange: (s: ScheduleSession[]) => void;
  defaultSlotMinutes: number;
  defaultMaxPatients: number;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const problems = scheduleProblems(sessions);
  const draftProblems = draft ? scheduleProblems([...sessions, draft]).filter((p) => !problems.includes(p)) : [];

  const addDraft = () => {
    if (!draft || draftProblems.length) return;
    onChange([...sessions, draft]);
    setDraft(null);
  };

  const copyDayToWorkdays = (day: number) => {
    const source = sessions.filter((s) => s.dayOfWeek === day);
    const workdays = WEEK_ORDER.filter((d) => d !== 5 && d !== day);
    onChange([...sessions.filter((s) => !workdays.includes(s.dayOfWeek)), ...workdays.flatMap((d) => source.map((s) => ({ ...s, dayOfWeek: d })))]);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {WEEK_ORDER.map((day) => {
          const daySessions = sessions.filter((s) => s.dayOfWeek === day).sort((a, b) => toMin(a.startTime) - toMin(b.startTime));
          return (
            <div key={day} className={cn("flex min-h-36 flex-col rounded-lg border p-2", day === 5 ? "bg-muted/60" : "bg-card")}>
              <div className="mb-2 flex items-center justify-between gap-1">
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-heading">{DAY_NAMES[day].slice(0, 3)}</p>
                  <p className="font-bangla text-[11px] text-muted-foreground">{DAY_NAMES_BN[day]}</p>
                </div>
                {daySessions.length > 0 && day !== 5 && (
                  <Button type="button" variant="ghost" size="icon-xs" title="Copy to all working days (Sat–Thu)" aria-label={`Copy ${DAY_NAMES[day]} to all working days`} onClick={() => copyDayToWorkdays(day)}>
                    <CopyPlus />
                  </Button>
                )}
              </div>
              <ul className="space-y-1.5">
                {daySessions.map((s) => (
                  <li key={`${s.startTime}-${s.endTime}`} className="group rounded-md border border-status-info-border bg-status-info-bg px-2 py-1.5 text-xs">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-status-info-fg tabular-nums">
                        {s.startTime}–{s.endTime}
                      </span>
                      <button
                        type="button"
                        onClick={() => onChange(sessions.filter((x) => x !== s))}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Remove ${DAY_NAMES[day]} ${s.startTime}–${s.endTime}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <p className="text-muted-foreground">
                      {s.slotMinutes} min · max {s.maxPatients}
                    </p>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="mt-auto w-full justify-center text-muted-foreground"
                onClick={() =>
                  setDraft({
                    dayOfWeek: day,
                    startTime: daySessions.length ? "17:00" : "09:00",
                    endTime: daySessions.length ? "20:00" : "13:00",
                    slotMinutes: defaultSlotMinutes,
                    maxPatients: defaultMaxPatients,
                  })
                }
              >
                <Plus /> Session
              </Button>
            </div>
          );
        })}
      </div>

      {draft && (
        <div className="rounded-lg border border-primary/40 bg-accent/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-heading">New {DAY_NAMES[draft.dayOfWeek]} session</p>
            <Button type="button" variant="ghost" size="icon-xs" onClick={() => setDraft(null)} aria-label="Close">
              <X />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="space-y-1">
              <Label htmlFor="draft-start">Start</Label>
              <Input id="draft-start" type="time" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="draft-end">End</Label>
              <Input id="draft-end" type="time" value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="draft-slot">Slot (min)</Label>
              <Input id="draft-slot" type="number" min={5} max={120} value={draft.slotMinutes} onChange={(e) => setDraft({ ...draft, slotMinutes: Number(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="draft-max">Max patients</Label>
              <Input id="draft-max" type="number" min={1} max={200} value={draft.maxPatients} onChange={(e) => setDraft({ ...draft, maxPatients: Number(e.target.value) || 0 })} />
            </div>
            <div className="flex items-end">
              <Button type="button" className="w-full" onClick={addDraft} disabled={draftProblems.length > 0 || draft.slotMinutes < 5 || draft.maxPatients < 1}>
                <Plus /> Add
              </Button>
            </div>
          </div>
          {draftProblems.length > 0 && <p className="mt-2 text-xs text-destructive">{draftProblems[0]}</p>}
        </div>
      )}

      {problems.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-status-danger-border bg-status-danger-bg px-3 py-2 text-sm text-status-danger-fg" role="alert">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

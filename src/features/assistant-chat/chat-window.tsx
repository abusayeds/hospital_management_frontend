"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, RotateCcw, SendHorizontal, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrandMark } from "@/components/shared/brand-logo";
import { apiFetch, getErrorMessage } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { cn } from "@/lib/utils";
import type { PublicHospitalInfo } from "@/features/print/patient-card";
import { CardMessage, HandoverNotice, ListMessage, OtpRequest, QuickReplies } from "./rich-messages";
import { ChatMessage, ConversationState, Lang, SendInput, UI_TEXT } from "./types";

type Reply = { conversation: ConversationState; messages: ChatMessage[] };

const clock = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit" }) : "";

/** One message: patient on the right, assistant / staff on the left, notices in the middle */
function Bubble({ msg, lang, onTap, answered, onRetry }: { msg: ChatMessage; lang: Lang; onTap: (i: SendInput) => void; answered: boolean; onRetry: () => void }) {
  const t = UI_TEXT[lang];
  const rich = msg.rich;
  if (rich?.type === "handover") return <HandoverNotice m={rich} />;
  if (msg.sender === "patient")
    return (
      <div className="flex flex-col items-end gap-1">
        <div className={cn("max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 whitespace-pre-wrap text-primary-foreground", msg.pending && "opacity-70")}>
          {msg.text}
        </div>
        {msg.failed ? (
          <button type="button" onClick={onRetry} className="flex items-center gap-1 text-xs font-medium text-status-danger-fg">
            <RotateCcw className="size-3" /> {t.failed} · {t.retry}
          </button>
        ) : (
          <span className="text-[11px] text-muted-foreground">{clock(msg.createdAt)}</span>
        )}
      </div>
    );

  const tap = (i: SendInput) => !answered && onTap(i);
  const body =
    rich?.type === "quick_replies" ? (
      <QuickReplies m={rich} lang={lang} onTap={tap} disabled={answered} />
    ) : rich?.type === "list" ? (
      <ListMessage m={rich} lang={lang} onTap={tap} disabled={answered} />
    ) : rich?.type === "otp_request" ? (
      <OtpRequest m={rich} lang={lang} onTap={tap} disabled={answered} />
    ) : rich?.type === "card" ? null : (
      <p className="whitespace-pre-wrap">{msg.text}</p>
    );
  return (
    <div className="flex flex-col items-start gap-1">
      {msg.sender === "staff" && <span className="text-xs font-semibold text-status-info-fg">{t.staffLabel}</span>}
      {rich?.type === "card" ? (
        <div className="w-full max-w-[92%] min-w-0">
          <CardMessage m={rich} lang={lang} onTap={tap} disabled={answered} />
        </div>
      ) : (
        <div
          className={cn(
            "max-w-[92%] min-w-0 overflow-hidden rounded-2xl rounded-bl-md border bg-card px-3.5 py-2.5 shadow-card",
            rich?.type === "list" && "w-full",
            msg.sender === "staff" && "border-status-info-border",
          )}
        >
          {body}
        </div>
      )}
      {msg.createdAt && <span className="text-[11px] text-muted-foreground">{clock(msg.createdAt)}</span>}
    </div>
  );
}

/**
 * Public patient chat (/chat and the embeddable widget). No login: the browser gets an anonymous
 * cookie from the API; booking needs only the patient's mobile number, name, age and gender (no code).
 * Staff replies arrive live over the socket. Never says "AI" (patient-facing screen).
 */
export function ChatWindow({ embed = false }: { embed?: boolean }) {
  const [lang, setLang] = useState<Lang>("bn");
  const t = UI_TEXT[lang];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conv, setConv] = useState<ConversationState | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [answered, setAnswered] = useState<Set<string>>(new Set());
  const endRef = useRef<HTMLDivElement>(null);
  const hospital = useQuery({ queryKey: ["hospital-info"], queryFn: () => apiFetch<PublicHospitalInfo>("/public/hospital-info"), staleTime: 10 * 60_000, meta: { silent: true } });
  const history = useQuery({ queryKey: ["web-chat"], queryFn: () => apiFetch<Reply>("/assistant/web/conversation"), staleTime: Infinity, meta: { silent: true } });

  // First load: take the stored conversation (the query result is the initial state)
  const loaded = history.data;
  const shown = useMemo(() => (messages.length ? messages : (loaded?.messages ?? [])), [messages, loaded]);
  const state = conv ?? loaded?.conversation ?? null;

  // Staff replies arrive live on this visitor's socket room
  useEffect(() => {
    const s = getSocket();
    const onMessage = (m: ChatMessage) =>
      setMessages((list) => {
        const base = list.length ? list : (loaded?.messages ?? []);
        return base.some((x) => x.id === m.id) ? base : [...base, m];
      });
    s.on("chat:message", onMessage);
    return () => {
      s.off("chat:message", onMessage);
    };
  }, [loaded]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [shown.length, busy]);

  const send = useCallback(
    async (input: SendInput, retryId?: string) => {
      const label = input.label ?? input.text ?? "";
      const localId = retryId ?? `local-${Date.now()}`;
      const firstMessage = !shown.some((m) => m.sender === "patient");
      setMessages((list) => {
        const base = (list.length ? list : (loaded?.messages ?? [])).filter((m) => m.id !== localId);
        return [...base, { id: localId, sender: "patient", text: label, rich: null, createdAt: new Date().toISOString(), pending: true }];
      });
      setBusy(true);
      try {
        const res = await apiFetch<Reply>("/assistant/web/messages", { method: "POST", body: { text: input.text, replyId: input.replyId, label: input.label } });
        setConv(res.conversation);
        setMessages((list) => [
          ...list.map((m) => (m.id === localId ? { ...m, pending: false, id: `${localId}-sent` } : m)),
          ...res.messages.filter((m) => !list.some((x) => x.id === m.id)),
        ]);
        // The cookie now exists: reconnect so the socket joins this visitor's room (staff replies)
        if (firstMessage) getSocket().disconnect().connect();
      } catch (err) {
        setMessages((list) => list.map((m) => (m.id === localId ? { ...m, pending: false, failed: true, text: `${label}\n(${getErrorMessage(err)})` } : m)));
      } finally {
        setBusy(false);
      }
    },
    [loaded, shown],
  );

  const onTap = (msgId: string) => (input: SendInput) => {
    setAnswered((s) => new Set(s).add(msgId));
    void send(input);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || busy) return;
    setText("");
    void send({ text: value });
  };

  const emergencyPhone = hospital.data?.emergencyPhone ?? "999";
  const staffActive = state?.status === "human_active";

  return (
    <div className={cn("flex h-dvh w-full flex-col overflow-hidden bg-muted/40", !embed && "mx-auto max-w-2xl md:my-4 md:h-[calc(100dvh-2rem)] md:overflow-hidden md:rounded-2xl md:border md:shadow-card")}>
      <header className="flex items-center gap-3 bg-primary px-3 py-2.5 text-primary-foreground">
        {!embed && (
          <Link href="/" aria-label="Back to home" className="rounded-lg p-1.5 hover:bg-white/15">
            <ArrowLeft className="size-5" />
          </Link>
        )}
        <BrandMark className="bg-white text-primary" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{t.title}</p>
          <p className="flex items-center gap-1.5 text-xs opacity-90">
            <span className="size-2 rounded-full bg-emerald-300" aria-hidden /> {staffActive ? t.staff : `${hospital.data?.name ?? "Testolife Hospital"} · ${t.online}`}
          </p>
        </div>
        <div className="flex rounded-lg bg-white/15 p-0.5 text-xs font-semibold" role="group" aria-label="Language">
          {(["bn", "en"] as const).map((l) => (
            <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)} className={cn("rounded-md px-2 py-1", lang === l && "bg-white text-primary")}>
              {l === "bn" ? "বাংলা" : "English"}
            </button>
          ))}
        </div>
      </header>

      <p className="flex items-center gap-1.5 border-b bg-status-waiting-bg px-3 py-1.5 text-[11px] text-status-waiting-fg">
        <ShieldAlert className="size-3.5 shrink-0" /> {t.disclaimer(emergencyPhone)}
      </p>

      <div role="log" aria-live="polite" aria-label="Conversation" className="min-w-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto px-3 py-4">
        {history.isPending && (
          <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </p>
        )}
        {shown.map((m, i) => (
          <Bubble
            key={m.id}
            msg={m}
            lang={lang}
            onTap={onTap(m.id)}
            // Buttons of older messages stay usable only for the last assistant turn
            answered={answered.has(m.id) || shown.slice(i + 1).some((x) => x.sender === "patient")}
            onRetry={() => void send({ text: m.text.split("\n(")[0] }, m.id)}
          />
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-label={t.typing}>
            <span className="flex gap-1 rounded-2xl border bg-card px-3 py-2.5">
              {[0, 1, 2].map((d) => (
                <span key={d} className="size-2 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: `${d * 150}ms` }} />
              ))}
            </span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="flex items-end gap-2 border-t bg-card p-2.5">
        <label htmlFor="chat-input" className="sr-only">
          {t.placeholder}
        </label>
        <textarea
          id="chat-input"
          rows={1}
          value={text}
          maxLength={1000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) submit(e);
          }}
          placeholder={t.placeholder}
          className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-input bg-card px-3 py-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <button
          type="submit"
          disabled={!text.trim() || busy}
          aria-label={t.send}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          <SendHorizontal className="size-5" />
        </button>
      </form>
    </div>
  );
}

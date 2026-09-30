"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Mic, SendHorizontal, ShieldCheck, Siren } from "lucide-react";
import { FormEvent, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { api, getErrorMessage } from "@/lib/api";
import type { ChatBooking, ChatMessage, ChatReply } from "@/lib/types";

const SESSION_KEY = "testolife_chat_session";

type UiMessage = {
  role: "user" | "assistant";
  text: string;
  at: string;
  appointments?: ChatBooking[];
  emergency?: boolean;
  failed?: boolean;
};

const WELCOME: UiMessage = {
  role: "assistant",
  text: "আসসালামু আলাইকুম! আমি Testo Life Assistant। 🙂\nডাক্তার খোঁজা, সিরিয়াল নেওয়া বা hospital সম্পর্কে যেকোনো তথ্যের জন্য লিখুন।",
  at: new Date().toISOString(),
};

const QUICK_REPLIES = [
  "কোন কোন ডাক্তার আছেন?",
  "শিশু ডাক্তার দেখাতে চাই",
  "জ্বর আর কাশি, কোন ডাক্তার দেখাবো?",
  "আমার appointment দেখতে চাই",
];

// Renders **bold** and line breaks from the AI reply without using raw HTML
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => {
        const parts: ReactNode[] = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
          part.startsWith("**") && part.endsWith("**") ? <strong key={j}>{part.slice(2, -2)}</strong> : part,
        );
        const bullet = /^\s*[-*•]\s+/.test(line);
        return (
          <span key={i} className={`block ${bullet ? "pl-3" : ""} ${line.trim() === "" ? "h-2" : ""}`}>
            {bullet ? <>• {parts.map((p, k) => (k === 0 && typeof p === "string" ? p.replace(/^\s*[-*•]\s+/, "") : p))}</> : parts}
          </span>
        );
      })}
    </>
  );
}

function BookingCard({ a }: { a: ChatBooking }) {
  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-brand-100 bg-white">
      <div className="flex items-center justify-between bg-brand-600 px-3 py-2 text-white">
        <span className="flex items-center gap-1.5 text-sm font-semibold"><CheckCircle2 className="size-4" aria-hidden /> Appointment নিশ্চিত</span>
        <span className="text-xs opacity-90">Serial</span>
      </div>
      <div className="flex items-center gap-3 px-3 py-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-2xl font-bold text-brand-700">
          {a.serialNo}
        </div>
        <dl className="grid flex-1 grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[13px]">
          <dt className="text-ink-3">ডাক্তার</dt>
          <dd className="font-medium text-ink">{a.doctor}</dd>
          <dt className="text-ink-3">তারিখ</dt>
          <dd className="text-ink">
            {a.date} · {a.slotTime}
          </dd>
          <dt className="text-ink-3">রুম / Fee</dt>
          <dd className="text-ink">
            {a.room ?? "-"} · {a.fee}
          </dd>
        </dl>
      </div>
    </div>
  );
}

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

export default function ChatPage() {
  const [messages, setMessages] = useState<UiMessage[]>([WELCOME]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [emergency, setEmergency] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Restore the previous conversation of this browser
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    setVoiceSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));

    let saved: string | null = null;
    try {
      saved = localStorage.getItem(SESSION_KEY);
    } catch {}
    if (!saved) return;
    api<{ sessionId: string; messages: ChatMessage[] }>(`/chat/${saved}`)
      .then((s) => {
        setSessionId(s.sessionId);
        if (s.messages.length) setMessages([WELCOME, ...s.messages]);
      })
      .catch(() => {
        try {
          localStorage.removeItem(SESSION_KEY);
        } catch {}
      });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || sending) return;
      setInput("");
      setMessages((m) => [...m, { role: "user", text: message, at: new Date().toISOString() }]);
      setSending(true);
      try {
        const res = await api<ChatReply>("/chat/message", {
          method: "POST",
          body: sessionId ? { sessionId, message } : { message },
        });
        setSessionId(res.sessionId);
        try {
          localStorage.setItem(SESSION_KEY, res.sessionId);
        } catch {}
        if (res.emergency) setEmergency(true);
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            text: res.reply,
            at: new Date().toISOString(),
            appointments: res.bookedAppointments,
            emergency: res.emergency,
          },
        ]);
      } catch (e) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            text: getErrorMessage(e),
            at: new Date().toISOString(),
            failed: true,
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [sending, sessionId],
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const newChat = () => {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {}
    setSessionId(null);
    setEmergency(false);
    setMessages([{ ...WELCOME, at: new Date().toISOString() }]);
  };

  // Voice input: browser speech-to-text in Bangla (Chrome / Edge)
  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Recognition) return;
    const rec = new Recognition();
    rec.lang = "bn-BD";
    rec.interimResults = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => r[0].transcript)
        .join("");
      setInput(transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  const showQuickReplies = messages.length <= 1 && !sending;

  return (
    <main className="flex h-dvh flex-col bg-canvas sm:py-6">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-hidden bg-surface sm:rounded-2xl sm:border sm:border-line sm:shadow-lg">
        {/* Header */}
        <header className="flex items-center gap-3 bg-brand-700 px-4 py-3 text-white">
          <Link href="/" className="flex size-10 items-center justify-center rounded-full opacity-80 hover:bg-white/10 hover:opacity-100" aria-label="Back to home">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-bold text-brand-700">
            T
          </div>
          <div className="flex-1 leading-tight">
            <p className="font-semibold">Testolife Hospital</p>
            <p className="text-xs text-brand-100">{sending ? "লিখছে…" : "Testo Life Assistant · সাধারণত সাথে সাথে উত্তর দেয়"}</p>
          </div>
          <button
            onClick={newChat}
            className="h-9 rounded-full border border-white/30 px-3.5 text-xs font-medium hover:bg-white/10"
          >
            নতুন chat
          </button>
        </header>

        {emergency && (
          <div role="alert" className="flex items-start gap-2 bg-critical px-4 py-2.5 text-sm text-white">
            <Siren className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              <strong>জরুরি অবস্থা:</strong> এখনই Emergency বিভাগে আসুন বা <strong>999</strong>-এ ফোন করুন। Staff-কে জানানো
              হয়েছে।
            </p>
          </div>
        )}

        {/* Messages */}
        <div className="chat-wallpaper flex-1 space-y-2 overflow-y-auto px-3 py-4 sm:px-5" aria-live="polite">
          <p className="mx-auto w-fit rounded-lg bg-[#fff5c4] px-3 py-1.5 text-center text-xs text-ink-2 shadow-sm">
            <ShieldCheck className="mr-1 inline size-3.5 align-[-2px]" aria-hidden />এটি একটি স্বয়ংক্রিয় সহকারী, মানুষ নয়। এটি রোগ নির্ণয় বা ওষুধের পরামর্শ দেয় না।
          </p>

          {messages.map((m, i) => {
            const mine = m.role === "user";
            return (
              <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-[15px] leading-relaxed shadow-sm ${
                    mine
                      ? "rounded-tr-none bg-chat-out text-ink"
                      : m.emergency
                        ? "rounded-tl-none border-l-4 border-critical bg-white text-ink"
                        : m.failed
                          ? "rounded-tl-none bg-white text-status-danger-fg"
                          : "rounded-tl-none bg-white text-ink"
                  }`}
                >
                  <RichText text={m.text} />
                  {m.appointments?.map((a) => <BookingCard key={a.id} a={a} />)}
                  <span className="mt-1 block text-right text-[10px] text-ink-3">{timeOf(m.at)}</span>
                </div>
              </div>
            );
          })}

          {sending && (
            <div className="flex justify-start">
              <div className="flex gap-1 rounded-lg rounded-tl-none bg-white px-4 py-3 shadow-sm" aria-label="Assistant is typing">
                <span className="typing-dot h-2 w-2 rounded-full bg-ink-3" />
                <span className="typing-dot h-2 w-2 rounded-full bg-ink-3" />
                <span className="typing-dot h-2 w-2 rounded-full bg-ink-3" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {showQuickReplies && (
          <div className="flex gap-2 overflow-x-auto border-t border-line bg-surface px-3 py-2">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="shrink-0 rounded-full border border-brand-500 px-3 py-1.5 text-sm text-brand-700 hover:bg-brand-50"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Composer */}
        <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-line bg-[#f0f2f5] px-3 py-2.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={listening ? "বলুন, শুনছি…" : "এখানে লিখুন…"}
            maxLength={1000}
            className="min-w-0 flex-1 rounded-full border border-line bg-white px-4 py-2.5 text-[15px] outline-none focus:border-brand-500"
            aria-label="Message"
          />
          {voiceSupported && (
            <button
              type="button"
              onClick={toggleVoice}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg ${
                listening ? "animate-pulse bg-critical text-white" : "bg-white text-ink-2 hover:bg-brand-50"
              }`}
              aria-label={listening ? "Stop voice input" : "Speak in Bangla"}
              title="বাংলায় বলুন"
            >
              <Mic className="size-5" />
            </button>
          )}
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-40"
            aria-label="Send"
          >
            <SendHorizontal className="size-5" />
          </button>
        </form>
      </div>
    </main>
  );
}

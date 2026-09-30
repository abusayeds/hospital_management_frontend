"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, ImageIcon, List, Loader2, RotateCcw, SendHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { RequirePermission } from "@/components/shared/forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

type Payload = {
  type: string;
  text?: { body: string };
  interactive?: {
    type: "button" | "list";
    body: { text: string };
    action: {
      buttons?: { reply: { id: string; title: string } }[];
      button?: string;
      sections?: { rows: { id: string; title: string; description?: string }[] }[];
    };
  };
};
type SimMessage = {
  id: string;
  direction: "inbound" | "outbound";
  sender: string;
  text: string;
  payloads: Payload[];
  deliveryStatus: string | null;
  deliveryError: string | null;
  createdAt: string;
};
type SimView = { conversation: { id: string; status: string; verified: boolean } | null; messages: SimMessage[] };
type SendBody = { text?: string; replyId?: string; title?: string; kind?: "text" | "button" | "list" | "image" };

const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit" });

/** Renders one Cloud API payload the way WhatsApp would show it */
function WaPayload({ p, onTap, disabled }: { p: Payload; onTap: (b: SendBody) => void; disabled: boolean }) {
  const [listOpen, setListOpen] = useState(false);
  if (p.type === "text") return <p className="whitespace-pre-wrap">{p.text?.body}</p>;
  const i = p.interactive!;
  return (
    <div>
      <p className="whitespace-pre-wrap">{i.body.text}</p>
      {i.type === "button" && (
        <div className="mt-2 -mx-2.5 -mb-1.5 divide-y border-t border-black/10">
          {i.action.buttons?.map((b) => (
            <button key={b.reply.id} type="button" disabled={disabled} onClick={() => onTap({ replyId: b.reply.id, title: b.reply.title, kind: "button" })} className="block w-full py-2 text-center text-sm font-medium text-sky-600 disabled:opacity-50">
              {b.reply.title}
            </button>
          ))}
        </div>
      )}
      {i.type === "list" && (
        <div className="mt-2 -mx-2.5 -mb-1.5 border-t border-black/10">
          <button type="button" disabled={disabled} onClick={() => setListOpen((o) => !o)} className="flex w-full items-center justify-center gap-1.5 py-2 text-sm font-medium text-sky-600 disabled:opacity-50">
            <List className="size-4" /> {i.action.button}
          </button>
          {listOpen && (
            <ul className="divide-y border-t border-black/10 bg-white">
              {i.action.sections?.flatMap((s) => s.rows).map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setListOpen(false);
                      onTap({ replyId: r.id, title: r.title, kind: "list" });
                    }}
                    className="block w-full px-3 py-2 text-left"
                  >
                    <span className="block text-sm text-slate-900">{r.title}</span>
                    {r.description && <span className="block text-xs text-slate-500">{r.description}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * WhatsApp simulator (admin): messages go through the REAL WhatsApp adapter — a webhook payload is
 * built on the server, processed by the engine, and the outgoing Cloud API payloads are captured
 * and drawn here. A working demo even without a Meta account.
 */
export function WhatsAppSimulator() {
  const queryClient = useQueryClient();
  const [from, setFrom] = useState("01811000000");
  const [name, setName] = useState("Demo Patient");
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const key = ["wa-sim", from];
  const view = useQuery({
    queryKey: key,
    queryFn: () => apiFetch<SimView>(`/assistant/admin/simulator/whatsapp?from=${encodeURIComponent(from)}`),
    enabled: from.length >= 11,
    refetchInterval: 4000, // staff replies from the inbox appear here too
    meta: { silent: true },
  });
  const send = useMutation({
    mutationFn: (b: SendBody) => apiFetch<SimView>("/assistant/admin/simulator/whatsapp", { method: "POST", body: { from, name, ...b } }),
    onSuccess: (v) => queryClient.setQueryData(key, v),
  });
  const reset = useMutation({
    mutationFn: () => apiFetch(`/assistant/admin/simulator/whatsapp?from=${encodeURIComponent(from)}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  const messages = view.data?.messages ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, send.isPending]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    send.mutate({ text: text.trim(), kind: "text" });
    setText("");
  };
  const lastOutbound = messages.findLastIndex((m) => m.direction === "outbound");

  return (
    <RequirePermission permission="settings:manage">
      <div className="space-y-6">
        <PageHeader title="WhatsApp simulator" description="Test the WhatsApp channel end to end — same adapter, same engine, nothing is sent to Meta." />
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <SectionCard title="Simulated sender">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="sim-from">WhatsApp number</Label>
                  <Input id="sim-from" value={from} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sim-name">Profile name</Label>
                  <Input id="sim-name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                The number counts as verified (WhatsApp proves it). Use a number that belongs to a demo patient to book for them, or any other number to try registration.
                Conversation status: <b>{view.data?.conversation?.status ?? "new"}</b>.
              </p>
              <div className="flex flex-wrap gap-2">
                {["কার্ডিওলজির ডাক্তার কবে বসেন?", "kal medicine doctor er serial chai", "আমার অ্যাপয়েন্টমেন্ট দেখান", "Is my report ready?"].map((s) => (
                  <Button key={s} variant="outline" size="sm" disabled={send.isPending} onClick={() => send.mutate({ text: s, kind: "text" })}>
                    {s}
                  </Button>
                ))}
              </div>
              <Button variant="ghost" size="sm" onClick={() => reset.mutate()} disabled={reset.isPending}>
                <RotateCcw /> Reset this conversation
              </Button>
            </div>
          </SectionCard>

          {/* The phone */}
          <div className="mx-auto w-full max-w-[380px] overflow-hidden rounded-[2.2rem] border-8 border-slate-900 bg-slate-900 shadow-xl">
            <div className="flex items-center gap-2 bg-emerald-800 px-3 py-2.5 text-white">
              <span className="flex size-8 items-center justify-center rounded-full bg-white text-xs font-bold text-emerald-800">TL</span>
              <div>
                <p className="text-sm font-semibold">Testolife Hospital</p>
                <p className="text-[11px] opacity-80">Business account</p>
              </div>
            </div>
            <div className="h-[520px] space-y-2 overflow-y-auto bg-[#ece5dd] px-2.5 py-3 text-[13.5px] text-slate-900">
              {messages.map((m, idx) =>
                m.direction === "inbound" ? (
                  <div key={m.id} className="ml-auto max-w-[80%] rounded-lg rounded-tr-none bg-[#dcf8c6] px-2.5 py-1.5 shadow-sm">
                    <p className="whitespace-pre-wrap">{m.text}</p>
                    <p className="flex items-center justify-end gap-1 text-[10px] text-slate-500">
                      {clock(m.createdAt)} <CheckCheck className="size-3 text-sky-500" />
                    </p>
                  </div>
                ) : (
                  (m.payloads.length ? m.payloads : [{ type: "text", text: { body: m.text } } as Payload]).map((p, j) => (
                    <div key={`${m.id}-${j}`} className={cn("max-w-[85%] rounded-lg rounded-tl-none bg-white px-2.5 py-1.5 shadow-sm", m.sender === "staff" && "border-l-4 border-sky-500")}>
                      {m.sender === "staff" && <p className="text-[11px] font-semibold text-sky-700">Hospital staff</p>}
                      <WaPayload p={p} onTap={(b) => send.mutate(b)} disabled={send.isPending || idx < lastOutbound - 3} />
                      <p className="text-right text-[10px] text-slate-500">
                        {clock(m.createdAt)}
                        {m.deliveryStatus === "failed" && <span className="ml-1 text-red-600">failed: {m.deliveryError}</span>}
                      </p>
                    </div>
                  ))
                ),
              )}
              {send.isPending && (
                <p className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Loader2 className="size-3 animate-spin" /> typing…
                </p>
              )}
              <div ref={endRef} />
            </div>
            <form onSubmit={submit} className="flex items-center gap-2 bg-[#f0f0f0] p-2">
              <button type="button" aria-label="Send an image" onClick={() => send.mutate({ kind: "image" })} className="text-slate-500">
                <ImageIcon className="size-5" />
              </button>
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message" aria-label="Message" className="h-10 flex-1 rounded-full bg-white px-4 text-sm outline-none" />
              <button type="submit" aria-label="Send" disabled={!text.trim() || send.isPending} className="flex size-10 items-center justify-center rounded-full bg-emerald-700 text-white disabled:opacity-50">
                <SendHorizontal className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </RequirePermission>
  );
}

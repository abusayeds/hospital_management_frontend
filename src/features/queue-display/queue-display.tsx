"use client";

import { useQuery } from "@tanstack/react-query";
import { Phone, ShieldCheck, Volume2, VolumeX, Wifi, WifiOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { io, Socket } from "socket.io-client";
import { BrandMark } from "@/components/shared/brand-logo";
import { apiFetch, SOCKET_URL } from "@/lib/api";
import { time12 } from "@/lib/portal";
import { cn } from "@/lib/utils";
import { announce, playChime, toBanglaDigits, unlockAudio } from "./announcer";

type DoctorState = "in_session" | "later" | "done" | "on_leave" | "off";
type DisplayCard = {
  doctorId: string;
  doctorName: string;
  doctorNameBn: string | null;
  department: string;
  departmentBn: string;
  roomNo: string;
  session: { label: string; labelBn: string; startTime: string; endTime: string } | null;
  state: DoctorState;
  nextSession: { label: string; labelBn: string; startTime: string; endTime: string } | null;
  nowServing: { serialNo: number; maskedName: string } | null;
  next: { serialNo: number; maskedName: string; priority?: "elderly" | "emergency" }[];
  waitingCount: number;
};
type DisplayBoard = { date: string; generatedAt: string; hospital: { name: string; nameBn: string; emergencyPhone: string }; notice: string; doctors: DisplayCard[] };

const SOUND_STORAGE = "tl_display_sound";

// Shown with ?demo=1 so the screen can be presented before real patients exist
const SAMPLE: DisplayBoard = {
  date: "",
  generatedAt: "",
  hospital: { name: "Testolife Hospital", nameBn: "টেস্টোলাইফ হাসপাতাল", emergencyPhone: "999" },
  notice: "অনুগ্রহ করে আপনার সিরিয়াল নম্বরের জন্য অপেক্ষা করুন · Please wait for your serial number to be called",
  doctors: [
    { doctorId: "1", doctorName: "Dr. Farhana Rahman", doctorNameBn: "ডা. ফারহানা রহমান", department: "Medicine", departmentBn: "মেডিসিন", roomNo: "101", session: { label: "Morning", labelBn: "সকাল", startTime: "09:00", endTime: "13:00" }, state: "in_session", nextSession: null, nowServing: { serialNo: 12, maskedName: "R*** H***" }, next: [{ serialNo: 13, maskedName: "F*** B***" }, { serialNo: 15, maskedName: "K*** M***", priority: "elderly" }, { serialNo: 14, maskedName: "S*** A***" }], waitingCount: 6 },
    { doctorId: "2", doctorName: "Prof. Dr. Mahbub Hasan", doctorNameBn: "প্রফেসর ডা. মাহবুব হাসান", department: "Cardiology", departmentBn: "হৃদরোগ", roomNo: "201", session: { label: "Evening", labelBn: "সন্ধ্যা", startTime: "16:00", endTime: "20:00" }, state: "in_session", nextSession: null, nowServing: { serialNo: 4, maskedName: "A*** R***" }, next: [{ serialNo: 5, maskedName: "N*** J***" }, { serialNo: 6, maskedName: "M*** U***" }], waitingCount: 2 },
    { doctorId: "3", doctorName: "Dr. Arif Hossain", doctorNameBn: "ডা. আরিফ হোসেন", department: "Pediatrics", departmentBn: "শিশু", roomNo: "103", session: { label: "Morning", labelBn: "সকাল", startTime: "09:30", endTime: "12:30" }, state: "in_session", nextSession: null, nowServing: null, next: [{ serialNo: 1, maskedName: "T*** I***" }, { serialNo: 2, maskedName: "S*** K***" }], waitingCount: 2 },
  ],
};

const noop = () => () => {};
const useSearchParam = (name: string) => useSyncExternalStore(noop, () => new URLSearchParams(window.location.search).get(name), () => null);

function useClock() {
  return useSyncExternalStore(
    (cb) => {
      const t = setInterval(cb, 5_000);
      return () => clearInterval(t);
    },
    () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" }),
    () => "",
  );
}

const store = (k: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {}
};

/** Public queue board: the waiting-room TV and anyone's phone. No login, no key (names are masked). */
export function QueueDisplay() {
  const demo = useSearchParam("demo") !== null;
  if (demo) return <Board board={SAMPLE} connected demo />;
  return <LiveBoard />;
}

function LiveBoard() {
  const [connected, setConnected] = useState(false);
  const board = useQuery({
    queryKey: ["display-board"],
    queryFn: () => apiFetch<DisplayBoard>("/display/queue"),
    refetchInterval: 20_000, // safety net if the socket is down
    meta: { silent: true }, // nobody reads toasts on a TV
  });
  const refetch = board.refetch;

  // Recall events: the doctor wants the current serial announced again
  const recallRef = useRef<(r: { doctorId: string; serialNo: number; roomNo?: string }) => void>(() => {});

  useEffect(() => {
    // Own socket that joins only the "display" room (data-free "something changed" signals)
    const socket: Socket = io(SOCKET_URL, { transports: ["websocket", "polling"], auth: { display: true }, reconnectionDelayMax: 5000 });
    socket.on("connect", () => {
      setConnected(true);
      void refetch(); // catch up on anything missed while offline
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("queue:updated", () => void refetch());
    socket.on("queue:recall", (r) => recallRef.current(r));
    return () => {
      socket.disconnect();
    };
  }, [refetch]);

  return <Board board={board.data} connected={connected && !board.isError} recallRef={recallRef} />;
}

function Board({
  board,
  connected,
  demo = false,
  recallRef,
}: {
  board?: DisplayBoard;
  connected: boolean;
  demo?: boolean;
  recallRef?: React.RefObject<(r: { doctorId: string; serialNo: number; roomNo?: string }) => void>;
}) {
  const clock = useClock();
  const [soundOn, setSoundOn] = useState(false);
  const [highlight, setHighlight] = useState<Record<string, number>>({}); // doctorId → animation key
  const previous = useRef<Record<string, number | null> | null>(null);

  const call = useCallback(
    (doctorId: string, serialNo: number, roomNo?: string) => {
      setHighlight((h) => ({ ...h, [doctorId]: Date.now() }));
      if (soundOn) {
        playChime();
        setTimeout(() => announce(serialNo, roomNo), 900);
      }
    },
    [soundOn],
  );

  // Detect "now serving" changes between refreshes → highlight + chime + voice
  useEffect(() => {
    if (!board) return;
    const current = Object.fromEntries(board.doctors.map((d) => [d.doctorId, d.nowServing?.serialNo ?? null]));
    if (previous.current) {
      for (const d of board.doctors) {
        const before = previous.current[d.doctorId];
        if (d.nowServing && before !== d.nowServing.serialNo) call(d.doctorId, d.nowServing.serialNo, d.roomNo);
      }
    }
    previous.current = current;
  }, [board, call]);

  useEffect(() => {
    if (recallRef) recallRef.current = (r) => call(r.doctorId, r.serialNo, r.roomNo);
  }, [recallRef, call]);

  const toggleSound = async () => {
    if (soundOn) {
      setSoundOn(false);
      store(SOUND_STORAGE, "off");
      return;
    }
    // Browsers only allow audio after a click on the page, so this button is required once per start
    const ok = await unlockAudio();
    setSoundOn(ok);
    store(SOUND_STORAGE, ok ? "on" : "off");
    if (ok) playChime();
  };

  const doctors = board?.doctors ?? [];
  const cols = doctors.length <= 1 ? "grid-cols-1" : doctors.length === 2 ? "sm:grid-cols-2" : doctors.length <= 4 ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3";
  const notice = board?.notice || "";

  return (
    <main className="flex min-h-dvh flex-col overflow-hidden bg-[#0b3b37] text-white">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-[3vw] py-[2vh]">
        <div className="flex items-center gap-4">
          <BrandMark className="size-[clamp(2.5rem,4vw,4.5rem)] rounded-2xl bg-white text-primary" />
          <div className="leading-tight">
            <p className="text-[clamp(1.2rem,2vw,2.4rem)] font-bold">{board?.hospital.name ?? "Testolife Hospital"}</p>
            <p className="font-bangla text-[clamp(1rem,1.4vw,1.6rem)] text-teal-100/85">{board?.hospital.nameBn ?? "টেস্টোলাইফ হাসপাতাল"} · বহির্বিভাগ সিরিয়াল</p>
          </div>
        </div>
        <h1 className="order-last w-full text-center text-[clamp(1.8rem,3.4vw,4rem)] leading-none font-extrabold sm:order-none sm:w-auto">
          <span className="font-bangla">এখন চলছে</span>
          <span className="mx-3 text-teal-200/50">·</span>
          NOW SERVING
        </h1>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSound}
            className={cn("flex items-center gap-2 rounded-xl px-4 py-2 text-[clamp(0.9rem,1.1vw,1.2rem)] font-semibold", soundOn ? "bg-white/15" : "animate-pulse bg-amber-400 text-amber-950")}
            aria-pressed={soundOn}
          >
            {soundOn ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
            {soundOn ? "Sound on" : "Enable sound"}
          </button>
          <p className="font-mono text-[clamp(2.2rem,4.8vw,5.5rem)] leading-none font-bold tabular-nums" aria-label="Current time">
            {clock}
          </p>
        </div>
      </header>

      {!connected && !demo && (
        <div role="status" className="mx-[3vw] mt-3 flex items-center gap-3 rounded-xl bg-red-600/90 px-5 py-3 text-[clamp(1rem,1.3vw,1.4rem)]">
          <WifiOff className="size-6" aria-hidden /> Connection lost — reconnecting automatically…
        </div>
      )}

      <section className={cn("grid flex-1 content-start gap-[1.6vw] px-[3vw] py-[2.5vh]", cols)}>
        {board && doctors.length === 0 && (
          <p className="col-span-full mt-[14vh] text-center text-[clamp(1.6rem,2.6vw,3rem)] text-teal-100">
            <span className="font-bangla">কোনো ডাক্তারের তথ্য পাওয়া যায়নি</span>
            <br />
            No doctors to show
          </p>
        )}
        {doctors.map((d) => (
          <article
            key={d.doctorId}
            className={cn("flex flex-col rounded-3xl bg-white/[0.06] p-[clamp(1rem,1.6vw,2rem)] ring-1 ring-white/10", d.state !== "in_session" && "opacity-70")}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-[clamp(1.3rem,2vw,2.4rem)] leading-tight font-bold text-white">{d.doctorName}</h2>
                <p className="truncate text-[clamp(1rem,1.3vw,1.5rem)] text-teal-100/85">
                  {d.department}
                  {d.departmentBn && <span className="font-bangla"> · {d.departmentBn}</span>}
                </p>
              </div>
              <div className="shrink-0 rounded-2xl bg-white px-[clamp(0.7rem,1vw,1.2rem)] py-1 text-center text-[#0b3b37]">
                <p className="font-bangla text-[clamp(0.75rem,0.9vw,1rem)] leading-tight font-semibold">রুম · ROOM</p>
                <p className="text-[clamp(1.8rem,3vw,3.6rem)] leading-none font-extrabold tabular-nums">{d.roomNo || "–"}</p>
              </div>
            </div>

            {d.state !== "in_session" ? (
              <DoctorStatus card={d} />
            ) : (
              <>
              <div key={highlight[d.doctorId] ?? 0} className={cn("mt-[2vh] rounded-2xl bg-white/[0.06] px-[1.2vw] py-[1.2vh]", highlight[d.doctorId] && "tv-called")}>
                <p className="text-[clamp(0.85rem,1vw,1.2rem)] font-semibold tracking-[0.2em] text-yellow-200 uppercase">
                  Now · <span className="font-bangla tracking-normal">এখন</span>
                </p>
                <div className="flex items-end gap-4">
                  <p className={cn("text-[clamp(5rem,10vw,12rem)] leading-[0.95] font-black tabular-nums", d.nowServing ? "text-yellow-300" : "text-white/25")}>
                    {d.nowServing ? d.nowServing.serialNo : "–"}
                  </p>
                  {d.nowServing && (
                    <div className="pb-[1.5vh]">
                      <p className="font-bangla text-[clamp(1.6rem,2.6vw,3rem)] font-bold text-yellow-200/90">{toBanglaDigits(d.nowServing.serialNo)}</p>
                      <p className="text-[clamp(1rem,1.3vw,1.5rem)] text-white/70">{d.nowServing.maskedName}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-[1.8vh]">
                <p className="text-[clamp(0.85rem,1vw,1.2rem)] font-semibold tracking-[0.2em] text-teal-200 uppercase">
                  Next · <span className="font-bangla tracking-normal">পরবর্তী</span>
                </p>
                <ol className="mt-2 grid grid-cols-3 gap-2">
                  {d.next.length ? (
                    d.next.map((n) => (
                      <li key={n.serialNo} className="rounded-xl bg-white/12 px-2 py-2 text-center">
                        <span className="block text-[clamp(1.8rem,3vw,3.6rem)] leading-none font-extrabold tabular-nums">{n.serialNo}</span>
                        <span className="mt-1 block truncate text-[clamp(0.75rem,0.95vw,1.05rem)] text-white/65">{n.priority === "elderly" ? "Elderly · বয়স্ক" : n.priority === "emergency" ? "Urgent · জরুরি" : n.maskedName}</span>
                      </li>
                    ))
                  ) : (
                    <li className="col-span-3 py-2 text-[clamp(1.1rem,1.6vw,1.8rem)] text-white/40">–</li>
                  )}
                </ol>
                {d.waitingCount > 3 && <p className="mt-2 text-[clamp(0.85rem,1vw,1.15rem)] text-teal-100/70">+{d.waitingCount - 3} more waiting</p>}
              </div>
              </>
            )}
          </article>
        ))}
      </section>

      <footer className="border-t border-white/10 bg-black/20">
        {notice && (
          <div className="overflow-hidden border-b border-white/10 py-[1.2vh]" aria-label="Notice">
            <p className="tv-marquee font-bangla flex w-max gap-24 text-[clamp(1.1rem,1.6vw,1.9rem)] whitespace-nowrap text-teal-50">
              <span>{notice}</span>
              <span aria-hidden>{notice}</span>
            </p>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 px-[3vw] py-[1.4vh] text-[clamp(0.9rem,1.15vw,1.3rem)] text-teal-100/85">
          <p className="flex items-center gap-2">
            <ShieldCheck className="size-5" aria-hidden />
            <span className="font-bangla">গোপনীয়তার জন্য শুধু সিরিয়াল নম্বর দেখানো হয়</span> · Only serial numbers are shown
          </p>
          <p className="flex items-center gap-4 font-semibold text-white">
            {!demo && (connected ? <Wifi className="size-5 text-emerald-300" aria-label="Live" /> : <WifiOff className="size-5 text-red-300" aria-label="Offline" />)}
            <span className="flex items-center gap-2">
              <Phone className="size-5" aria-hidden /> Emergency 24/7: {board?.hospital.emergencyPhone ?? "999"}
            </span>
            {demo && <span className="rounded bg-amber-400 px-2 py-0.5 text-sm font-bold text-amber-950">SAMPLE DATA</span>}
          </p>
        </div>
      </footer>
    </main>
  );
}

/** A doctor who is not seeing patients right now: when they sit today, or why not */
function DoctorStatus({ card }: { card: DisplayCard }) {
  const n = card.nextSession;
  const [bn, en] =
    card.state === "later" && n
      ? [`আজ ${n.labelBn} ${toBanglaDigits(time12(n.startTime).replace(/ [AP]M$/, ""))} থেকে বসবেন`, `Today from ${time12(n.startTime)}`]
      : card.state === "done"
        ? ["আজকের চেম্বার শেষ", "Finished for today"]
        : card.state === "on_leave"
          ? ["আজ ছুটিতে আছেন", "On leave today"]
          : ["আজ বসবেন না", "Not in today"];
  return (
    <div className="mt-[2vh] rounded-2xl bg-white/[0.04] px-[1.2vw] py-[1.6vh]">
      <p className="font-bangla text-[clamp(1.2rem,1.8vw,2.1rem)] font-semibold text-teal-50">{bn}</p>
      <p className="text-[clamp(0.95rem,1.2vw,1.4rem)] text-teal-100/70">{en}</p>
    </div>
  );
}

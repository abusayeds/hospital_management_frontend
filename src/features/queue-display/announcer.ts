"use client";

/**
 * Sound for the waiting-room TV: a soft two-tone chime (Web Audio, no audio files)
 * followed by a spoken announcement with the browser's Speech Synthesis API.
 * Bangla voice if the TV browser has one ("সিরিয়াল নম্বর ১২, রুম ৩০১"), otherwise English.
 * Browsers only allow sound after a click, so the TV shows an "Enable sound" button once.
 */

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
export const toBanglaDigits = (value: string | number) => String(value).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);

let ctx: AudioContext | null = null;

export const unlockAudio = async () => {
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return false;
  ctx ??= new Ctor();
  if (ctx.state === "suspended") await ctx.resume();
  return ctx.state === "running";
};

export const playChime = () => {
  if (!ctx || ctx.state !== "running") return;
  const now = ctx.currentTime;
  [
    [880, 0],
    [660, 0.28],
  ].forEach(([freq, offset]) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.35, now + offset + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.9);
    osc.connect(gain).connect(ctx!.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 1);
  });
};

const pickVoice = (): SpeechSynthesisVoice | null => {
  if (typeof speechSynthesis === "undefined") return null;
  const voices = speechSynthesis.getVoices();
  return voices.find((v) => v.lang.toLowerCase().startsWith("bn")) ?? voices.find((v) => v.lang.toLowerCase().startsWith("en")) ?? voices[0] ?? null;
};

export const hasBanglaVoice = () => pickVoice()?.lang.toLowerCase().startsWith("bn") ?? false;

export const announce = (serialNo: number, roomNo?: string) => {
  if (typeof speechSynthesis === "undefined") return;
  const voice = pickVoice();
  const bangla = voice?.lang.toLowerCase().startsWith("bn");
  const text = bangla
    ? `সিরিয়াল নম্বর ${toBanglaDigits(serialNo)}${roomNo ? `, রুম ${toBanglaDigits(roomNo)}` : ""}`
    : `Serial number ${serialNo}${roomNo ? `, room ${roomNo.split("").join(" ")}` : ""}`;
  const utter = new SpeechSynthesisUtterance(text);
  if (voice) utter.voice = voice;
  utter.lang = voice?.lang ?? "en-US";
  utter.rate = 0.9;
  // Say it twice with a pause, like a human caller
  speechSynthesis.speak(utter);
  const again = new SpeechSynthesisUtterance(text);
  if (voice) again.voice = voice;
  again.lang = utter.lang;
  again.rate = 0.9;
  setTimeout(() => speechSynthesis.speak(again), 400);
};

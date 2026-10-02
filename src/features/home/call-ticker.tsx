"use client";

import { useQuery } from "@tanstack/react-query";
import { Phone } from "lucide-react";
import { apiFetch } from "@/lib/api";

type HospitalInfo = { name: string; phones: string[]; emergencyPhone: string; openingHours: string; openingHoursBn?: string };

/** "+8801711222333" / "01711222333" → "01711-222333"; landlines and short codes stay as they are */
const pretty = (p: string) => {
  const local = p.replace(/^\+?88/, "");
  return /^01\d{9}$/.test(local) ? `${local.slice(0, 5)}-${local.slice(5)}` : p;
};
const telOf = (p: string) => `tel:${p.replace(/[^\d+]/g, "")}`;

/**
 * Bottom bar on the home page: the hospital's booking numbers slide past (tap one to call).
 * Numbers come from Admin → Hospital Settings, so changing them there updates the site.
 * Only the booking numbers are shown (the emergency number is not a booking line).
 * The movement pauses on hover/focus and stops for people who prefer reduced motion.
 */
export function CallTicker() {
  const info = useQuery({
    queryKey: ["public", "hospital-info"],
    queryFn: () => apiFetch<HospitalInfo>("/public/hospital-info"),
    staleTime: 10 * 60_000,
    meta: { silent: true },
  });
  const phones = info.data?.phones.filter(Boolean) ?? [];
  if (!info.data || !phones.length) return null;

  const items = phones.map((p) => ({ key: `p-${p}`, label: pretty(p), href: telOf(p) }));
  // Repeat enough to fill wide screens, then twice for a seamless loop
  const lane = Array.from({ length: Math.max(2, Math.ceil(8 / items.length)) }, () => items).flat();

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-brand-900 text-white shadow-[0_-4px_20px_rgba(0,0,0,0.15)] pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-3 sm:px-4">
        <p className="flex shrink-0 items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold">
          <Phone className="size-4" aria-hidden />
          <span className="font-bangla hidden sm:inline">সিরিয়ালের জন্য কল করুন</span>
          <span className="font-bangla sm:hidden">কল করুন</span>
        </p>
        <div className="group relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
          <ul
            className="tl-marquee flex w-max gap-3 group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]"
            aria-label="Phone numbers for booking"
          >
            {[...lane, ...lane].map((i, n) => (
              <li key={`${i.key}-${n}`} aria-hidden={n >= lane.length ? true : undefined}>
                <a
                  href={i.href}
                  tabIndex={n >= lane.length ? -1 : 0}
                  className="flex items-center gap-1.5 rounded-full border border-white/25 px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap tabular-nums hover:bg-white/10"
                >
                  <Phone className="size-3.5" aria-hidden />
                  {i.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <p className="hidden shrink-0 text-xs text-brand-100 lg:block">{info.data.openingHours}</p>
      </div>
    </div>
  );
}

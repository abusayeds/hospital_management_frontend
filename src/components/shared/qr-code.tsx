"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** QR code rendered locally as an SVG (no external service sees the value) */
export function QrCode({ value, size = 96, className }: { value: string; size?: number; className?: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    QRCode.toString(value, { type: "svg", margin: 0, errorCorrectionLevel: "M" }).then((s) => alive && setSvg(s));
    return () => {
      alive = false;
    };
  }, [value]);
  return (
    <div
      role="img"
      aria-label={`QR code: ${value}`}
      className={cn("shrink-0 [&_svg]:size-full", className)}
      style={{ width: size, height: size }}
      // The SVG is generated locally by the qrcode library from our own value
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}

"use client";

import { Printer } from "lucide-react";
import { ReactNode, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

/**
 * Printable page without the app shell. Opens the browser print dialog once the
 * content is ready (`ready`), and shows a Print button for re-printing.
 * `pageSize` is a CSS @page size, e.g. "85.6mm 54mm" (ID card) or "80mm 120mm" (token).
 */
export function PrintShell({ ready, pageSize, children }: { ready: boolean; pageSize: string; children: ReactNode }) {
  const printed = useRef(false);
  useEffect(() => {
    if (ready && !printed.current) {
      printed.current = true;
      // Give fonts and the QR SVG a moment to paint before the print dialog snapshots the page
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [ready]);

  return (
    <main className="flex min-h-dvh flex-col items-center gap-6 bg-muted px-4 py-10 print:block print:min-h-0 print:bg-white print:p-0">
      <style>{`@page { size: ${pageSize}; margin: 0; } @media print { html, body { background: #fff !important; } }`}</style>
      <div className="print:hidden">
        <Button size="lg" onClick={() => window.print()} disabled={!ready}>
          <Printer /> Print
        </Button>
      </div>
      {children}
      <p className="text-sm text-muted-foreground print:hidden">Tip: choose your card or thermal printer and set margins to &quot;None&quot;.</p>
    </main>
  );
}

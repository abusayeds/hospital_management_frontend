import { FlaskRound } from "lucide-react";
import { PHASES } from "@/lib/roadmap";

// Honest label on demo screens: these numbers are fictional until the named phase.
export function SampleDataNote({ phase }: { phase: number }) {
  return (
    <p className="inline-flex items-center gap-1.5 rounded-full border border-dashed bg-card px-3 py-1 text-xs text-muted-foreground">
      <FlaskRound className="size-3.5" aria-hidden />
      Sample data · live in Phase {phase} ({PHASES[phase].title})
    </p>
  );
}

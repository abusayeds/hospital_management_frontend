import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Same rules as the backend policy (validators/password.ts): 8+ chars, a letter, a number
export const PASSWORD_RULES = [
  { label: "At least 8 characters", labelBn: "কমপক্ষে ৮ অক্ষর", test: (p: string) => p.length >= 8 },
  { label: "Contains a letter", labelBn: "অন্তত একটি অক্ষর", test: (p: string) => /[A-Za-z]/.test(p) },
  { label: "Contains a number", labelBn: "অন্তত একটি সংখ্যা", test: (p: string) => /\d/.test(p) },
];

const LEVELS = [
  { label: "Too weak", className: "bg-status-danger-dot", text: "text-status-danger-fg" },
  { label: "Weak", className: "bg-status-danger-dot", text: "text-status-danger-fg" },
  { label: "Fair", className: "bg-status-waiting-dot", text: "text-status-waiting-fg" },
  { label: "Good", className: "bg-status-success-dot", text: "text-status-success-fg" },
  { label: "Strong", className: "bg-status-success-dot", text: "text-status-success-fg" },
];

/** 0–4. Policy rules first, then bonus points for length, mixed case and symbols. */
export function passwordScore(p: string): number {
  if (!p) return 0;
  const meetsPolicy = PASSWORD_RULES.every((r) => r.test(p));
  if (!meetsPolicy) return p.length >= 4 ? 1 : 0;
  let score = 2;
  if (p.length >= 12) score++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p) && /[^A-Za-z0-9]/.test(p)) score++;
  else if ((/[a-z]/.test(p) && /[A-Z]/.test(p)) || /[^A-Za-z0-9]/.test(p)) score = Math.max(score, 3);
  return Math.min(score, 4);
}

export function PasswordStrength({ password }: { password: string }) {
  const score = passwordScore(password);
  const level = LEVELS[score];
  return (
    <div className="space-y-2" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden>
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className={cn("h-1.5 rounded-full transition-colors", i <= score ? level.className : "bg-muted")} />
          ))}
        </div>
        <span className={cn("w-16 text-right text-xs font-semibold", password ? level.text : "text-muted-foreground")}>
          {password ? level.label : ""}
        </span>
      </div>
      <ul className="grid gap-1 text-xs sm:grid-cols-3">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <li key={rule.label} className={cn("flex items-center gap-1.5", ok ? "text-status-success-fg" : "text-muted-foreground")}>
              {ok ? <Check className="size-3.5" aria-hidden /> : <X className="size-3.5" aria-hidden />}
              <span>
                {rule.label}
                <span className="sr-only">{ok ? " — done" : " — missing"}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

import { AppShell } from "@/components/layout/app-shell";
import { AuthProvider } from "@/lib/auth";

// Route group for all staff areas (/admin, /reception, /doctor, ...). The folder name
// in parentheses is not part of the URL; it only lets these areas share one layout.
// proxy.ts has already sent visitors without a session to /login.
export default function StaffLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}

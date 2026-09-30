import type { Metadata } from "next";
import { ChangePasswordScreen } from "@/features/auth/change-password-screen";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = { title: "Change password" };

export default function Page() {
  return (
    <AuthProvider>
      <ChangePasswordScreen />
    </AuthProvider>
  );
}

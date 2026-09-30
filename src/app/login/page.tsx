import type { Metadata } from "next";
import { LoginScreen } from "@/features/auth/login-screen";

export const metadata: Metadata = { title: "Sign in" };

export default function Page() {
  return <LoginScreen />;
}

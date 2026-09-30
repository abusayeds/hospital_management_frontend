import type { Metadata } from "next";
import { UsersScreen } from "@/features/users/users-screen";

export const metadata: Metadata = { title: "Users & Staff" };

export default function Page() {
  return <UsersScreen />;
}

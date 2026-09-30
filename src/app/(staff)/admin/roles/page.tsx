import type { Metadata } from "next";
import { RolesScreen } from "@/features/users/roles-screen";

export const metadata: Metadata = { title: "Roles & Permissions" };

export default function Page() {
  return <RolesScreen />;
}

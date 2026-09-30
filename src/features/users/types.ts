import type { Role } from "@/lib/permissions";

export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
  lockUntil?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
};

export type UserWithTempPassword = { user: ManagedUser; temporaryPassword: string };

// Same format as the server: "Tl-kq7m-9xa2" — letters + numbers, no look-alike characters
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export function generateTemporaryPassword(): string {
  const pick = () => {
    const bytes = crypto.getRandomValues(new Uint32Array(4));
    return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  };
  let pwd = "";
  while (!/\d/.test(pwd)) pwd = `Tl-${pick()}-${pick()}`;
  return pwd;
}

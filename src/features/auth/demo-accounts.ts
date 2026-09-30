import type { Role } from "@/lib/permissions";

// DEVELOPMENT ONLY — the fictional accounts created by `npm run seed` in backend/.
// The login page shows them only when NODE_ENV is "development", so a production
// build never contains this helper's UI. Password = DEMO_PASSWORD in backend/.env.
export const DEMO_ACCOUNTS: { role: Role; email: string }[] = [
  { role: "super_admin", email: "admin@testolife.test" },
  { role: "management", email: "management@testolife.test" },
  { role: "reception", email: "reception@testolife.test" },
  { role: "doctor", email: "doctor@testolife.test" },
  { role: "nurse", email: "nurse@testolife.test" },
  { role: "lab_technician", email: "lab@testolife.test" },
  { role: "lab_technician", email: "lab2@testolife.test" }, // second verifier (four-eyes)
  { role: "pharmacist", email: "pharmacy@testolife.test" },
  { role: "accounts", email: "accounts@testolife.test" },
  { role: "patient", email: "patient@testolife.test" },
];

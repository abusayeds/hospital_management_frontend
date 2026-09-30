# Testolife — Frontend

Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · TanStack Query.

```bash
cp .env.example .env.local
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
```

Where things live:

| Path | Purpose |
| --- | --- |
| `src/app/(staff)/<role>/` | Staff role areas sharing the AppShell; `[...slug]` = placeholder pages from the nav config |
| `src/app/patient/` | Mobile-first patient portal |
| `src/features/` | Screens with their logic (appointments, AI alerts, queue display, login, design system) |
| `src/components/shared/` | Reusable building blocks (DataTable, StatusBadge, StatCard, ConfirmDialog, …) |
| `src/components/ui/` | shadcn/ui primitives |
| `src/lib/navigation.ts` | The single role + menu config |
| `src/lib/api.ts` | The single backend client and error-message mapping |

Design rules and architecture: [../docs/PROJECT_CONTEXT.md](../docs/PROJECT_CONTEXT.md).

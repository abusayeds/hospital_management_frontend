import type { NextConfig } from "next";

// Where the Express API runs. Only the Next.js server uses this (not the browser).
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

const nextConfig: NextConfig = {
  // The browser calls /api/v1/* on THIS origin and Next.js forwards it to the API.
  // Same-origin requests mean the auth cookies are first-party: sameSite works fully,
  // no cross-site cookie tricks are needed, and the route guard (proxy.ts) can see them.
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${BACKEND_URL}/api/v1/:path*` }];
  },
  // Old URLs from before Phase 1 keep working (bookmarks, the TV browser, etc.)
  async redirects() {
    return [
      { source: "/dashboard", destination: "/management/live-overview", permanent: false },
      { source: "/dashboard/appointments", destination: "/reception/appointments", permanent: false },
      { source: "/dashboard/chats", destination: "/reception/inbox", permanent: false },
      { source: "/reception/ai-alerts", destination: "/reception/inbox", permanent: false },
      { source: "/queue", destination: "/queue-display", permanent: false },
    ];
  },
};

export default nextConfig;

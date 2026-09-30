import type { Metadata } from "next";
import { VerifyDocument } from "@/features/print/verify-document";

export const metadata: Metadata = { title: "Verify document", robots: { index: false } };

export default async function Page({ params }: PageProps<"/verify/[code]">) {
  const { code } = await params;
  return <VerifyDocument code={decodeURIComponent(code)} />;
}

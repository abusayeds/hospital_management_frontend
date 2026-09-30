import type { Metadata } from "next";
import { KnowledgeScreen } from "@/features/knowledge/knowledge-screen";

export const metadata: Metadata = { title: "Knowledge Base" };

export default function Page() {
  return <KnowledgeScreen />;
}

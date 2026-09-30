"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Eye, FlaskConical, History, Loader2, Pencil, Plus, RefreshCw, Save, Send, Trash2, Undo2 } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, DataTableColumn } from "@/components/shared/data-table";
import { RequirePermission } from "@/components/shared/forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, apiFetchPage } from "@/lib/api";
import { cn } from "@/lib/utils";

const CATEGORIES: Record<string, string> = {
  general: "General info",
  departments: "Departments",
  doctors_schedules: "Doctors & schedules",
  appointments: "Appointments & cancellation",
  tests_preparation: "Tests & preparation",
  payments: "Payments",
  facilities: "Facilities",
  emergency: "Emergency",
  directions: "Directions",
};

type Article = {
  id: string;
  titleEn: string;
  titleBn: string;
  category: string;
  contentEn: string;
  contentBn: string;
  languages: string[];
  status: "draft" | "published";
  version: number;
  publishedAt: string | null;
  indexedAt: string | null;
  indexMethod: "vector" | "text" | null;
  updatedAt: string;
  history?: { version: number; titleEn: string; titleBn: string; status: string; at: string }[];
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const Markdown = ({ text, bangla }: { text: string; bangla?: boolean }) => (
  <div className={cn("prose-sm space-y-2 text-sm leading-relaxed [&_h1]:font-semibold [&_h2]:font-semibold [&_li]:ml-4 [&_ol]:list-decimal [&_ul]:list-disc", bangla && "font-bangla")}>
    {text.trim() ? <ReactMarkdown>{text}</ReactMarkdown> : <p className="text-muted-foreground">Nothing written yet.</p>}
  </div>
);

// ------------------------------------------------------------------ editor

type Draft = Pick<Article, "titleEn" | "titleBn" | "category" | "contentEn" | "contentBn">;
const EMPTY: Draft = { titleEn: "", titleBn: "", category: "general", contentEn: "", contentBn: "" };

function ArticleEditor({ article, onSaved, onClose }: { article: Article | null; onSaved: (a: Article) => void; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(() => (article ? { ...article } : EMPTY));
  const [preview, setPreview] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const refresh = (a: Article | null) => {
    queryClient.invalidateQueries({ queryKey: ["knowledge"] });
    if (a) onSaved(a);
  };

  const save = useMutation({
    mutationFn: () =>
      article
        ? apiFetch<Article>(`/knowledge/articles/${article.id}`, { method: "PATCH", body: draft })
        : apiFetch<Article>("/knowledge/articles", { method: "POST", body: draft }),
    onSuccess: (a) => {
      toast.success(article ? `Saved · version ${a.version}` : "Draft created");
      refresh(a);
    },
  });
  const publish = useMutation({
    mutationFn: (on: boolean) => apiFetch<Article>(`/knowledge/articles/${article!.id}/${on ? "publish" : "unpublish"}`, { method: "POST" }),
    onSuccess: (a) => {
      toast.success(a.status === "published" ? "Published — the assistant can use it now" : "Unpublished — hidden from the assistant");
      refresh(a);
    },
  });

  return (
    <div className="space-y-5">
      {article && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <StatusBadge tone={article.status === "published" ? "success" : "neutral"}>{article.status === "published" ? "Published" : "Draft"}</StatusBadge>
          <span className="text-muted-foreground">Version {article.version}</span>
          {article.indexedAt && (
            <span className="text-muted-foreground">
              · indexed {when(article.indexedAt)} ({article.indexMethod === "vector" ? "vector search" : "text search"})
            </span>
          )}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="kb-cat">Category</Label>
          <NativeSelect id="kb-cat" value={draft.category} onChange={(e) => set({ category: e.target.value })}>
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="kb-title-bn">Title (Bangla)</Label>
          <Input id="kb-title-bn" className="font-bangla" value={draft.titleBn} onChange={(e) => set({ titleBn: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="kb-title-en">Title (English)</Label>
          <Input id="kb-title-en" value={draft.titleEn} onChange={(e) => set({ titleEn: e.target.value })} />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-heading">Content (Markdown)</p>
        <Button variant="outline" size="sm" onClick={() => setPreview((p) => !p)}>
          {preview ? <Pencil /> : <Eye />} {preview ? "Edit" : "Preview"}
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {(["contentBn", "contentEn"] as const).map((key) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={`kb-${key}`}>{key === "contentBn" ? "বাংলা" : "English"}</Label>
            {preview ? (
              <div className="min-h-64 rounded-lg border bg-muted/30 p-3">
                <Markdown text={draft[key]} bangla={key === "contentBn"} />
              </div>
            ) : (
              <Textarea id={`kb-${key}`} rows={14} value={draft[key]} onChange={(e) => set({ [key]: e.target.value })} className={cn(key === "contentBn" && "font-bangla")} />
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Write facts the assistant may repeat (timings, rules, preparation, directions). Do not write doctors&apos; fees or schedules here — the assistant reads those live.
      </p>

      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? <Loader2 className="animate-spin" /> : <Save />} {article ? "Save changes" : "Save draft"}
        </Button>
        {article && article.status === "draft" && (
          <Button variant="outline" disabled={publish.isPending} onClick={() => publish.mutate(true)}>
            <Send /> Publish
          </Button>
        )}
        {article && article.status === "published" && (
          <Button variant="outline" disabled={publish.isPending} onClick={() => publish.mutate(false)}>
            <Undo2 /> Unpublish
          </Button>
        )}
        {article && (
          <Button variant="ghost" className="ml-auto text-status-danger-fg" onClick={() => setDeleting(true)}>
            <Trash2 /> Delete
          </Button>
        )}
      </div>

      {article?.history && article.history.length > 0 && (
        <div className="space-y-2 border-t pt-4">
          <p className="flex items-center gap-1.5 text-sm font-medium text-heading">
            <History className="size-4" /> Version history
          </p>
          <ul className="space-y-1 text-sm">
            {article.history.map((h) => (
              <li key={`${h.version}-${h.at}`} className="flex gap-2 text-muted-foreground">
                <span className="w-10 font-mono">v{h.version}</span>
                <span className="flex-1 truncate">{h.titleEn || h.titleBn}</span>
                <span>{h.status}</span>
                <span>{when(h.at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        tone="danger"
        title="Delete this article?"
        description="The assistant will stop using it immediately."
        confirmLabel="Delete"
        onConfirm={async () => {
          await apiFetch(`/knowledge/articles/${article!.id}`, { method: "DELETE" });
          toast.success("Article deleted");
          refresh(null);
          onClose();
        }}
      />
    </div>
  );
}

// ------------------------------------------------------------------ test panel

type TestResult = {
  passages: { articleId: string; title: string; text: string; score: number; method: string }[];
  answer:
    | { messages: { type: string; text?: string; title?: string }[]; toolCalls: { name: string; resultSummary: string; success: boolean }[]; flags: string[] }
    | { error: string };
};

function TestPanel() {
  const [question, setQuestion] = useState("");
  const test = useMutation({ mutationFn: () => apiFetch<TestResult>("/knowledge/test", { method: "POST", body: { question } }) });
  const r = test.data;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard title="Ask like a patient" description="See what the assistant finds and answers. Nothing is sent to patients or stored.">
        <div className="space-y-3">
          <Textarea rows={3} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="লিপিড প্রোফাইলের আগে কি খালি পেটে থাকতে হবে?" />
          <Button disabled={question.trim().length < 2 || test.isPending} onClick={() => test.mutate()}>
            {test.isPending ? <Loader2 className="animate-spin" /> : <FlaskConical />} Test
          </Button>
          {r && (
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Assistant&apos;s answer</p>
              {"error" in r.answer ? (
                <p className="text-sm text-status-danger-fg">{r.answer.error}</p>
              ) : (
                <>
                  {r.answer.messages.map((m, i) => (
                    <p key={i} className="text-sm whitespace-pre-wrap">
                      {m.text ?? m.title}
                    </p>
                  ))}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {r.answer.toolCalls.map((t, i) => (
                      <span key={i} className={cn("rounded-md border px-1.5 py-0.5 font-mono text-[11px]", t.success ? "text-muted-foreground" : "text-status-danger-fg")}>
                        {t.name} · {t.resultSummary}
                      </span>
                    ))}
                    {r.answer.flags.map((f) => (
                      <StatusBadge key={f} tone="waiting">
                        {f}
                      </StatusBadge>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </SectionCard>
      <SectionCard title="Retrieved passages" description="Top matches from published articles, best first.">
        {!r ? (
          <p className="text-sm text-muted-foreground">Run a test to see the passages.</p>
        ) : r.passages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No passage matched — the assistant should say it does not know and offer a staff member.</p>
        ) : (
          <ol className="space-y-3">
            {r.passages.map((p, i) => (
              <li key={i} className="rounded-lg border p-3">
                <p className="flex items-center justify-between gap-2 text-sm font-medium text-heading">
                  <span>{p.title}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {p.method} · {p.score}
                  </span>
                </p>
                <p className="mt-1 line-clamp-4 text-sm text-muted-foreground">{p.text}</p>
              </li>
            ))}
          </ol>
        )}
      </SectionCard>
    </div>
  );
}

// ------------------------------------------------------------------ page

export function KnowledgeScreen() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Article | "new" | null>(null);
  const params = new URLSearchParams({ page: String(page), limit: "20", ...(q && { q }), ...(status && { status }), ...(category && { category }) });
  const list = useQuery({ queryKey: ["knowledge", q, status, category, page], queryFn: () => apiFetchPage<Article>(`/knowledge/articles?${params}`) });
  const reindex = useMutation({
    mutationFn: () => apiFetch<{ articles: number; chunks: number; methods: string[] }>("/knowledge/reindex", { method: "POST" }),
    onSuccess: (r) => {
      toast.success(`Re-indexed ${r.articles} articles (${r.chunks} passages, ${r.methods.join(", ") || "none"})`);
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
    },
  });
  const openArticle = async (id: string) => setEditing(await apiFetch<Article>(`/knowledge/articles/${id}`));

  const columns: DataTableColumn<Article>[] = [
    {
      key: "title",
      header: "Article",
      cell: (a) => (
        <div>
          <p className="font-medium text-heading">{a.titleEn || a.titleBn}</p>
          {a.titleBn && a.titleEn && <p className="font-bangla text-xs text-muted-foreground">{a.titleBn}</p>}
        </div>
      ),
    },
    { key: "category", header: "Category", className: "hidden md:table-cell", cell: (a) => CATEGORIES[a.category] ?? a.category },
    { key: "lang", header: "Language", className: "hidden sm:table-cell", cell: (a) => a.languages.join(" · ").toUpperCase() },
    { key: "status", header: "Status", cell: (a) => <StatusBadge tone={a.status === "published" ? "success" : "neutral"}>{a.status === "published" ? "Published" : "Draft"}</StatusBadge> },
    { key: "updated", header: "Updated", className: "hidden lg:table-cell", cell: (a) => <span className="text-sm text-muted-foreground">{when(a.updatedAt)} · v{a.version}</span> },
  ];

  return (
    <RequirePermission permission="knowledge:manage">
      <div className="space-y-6">
        <PageHeader
          title="Knowledge Base · নলেজ বেস"
          description="What the patient assistant may say about the hospital. Only published articles are used."
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="lg" disabled={reindex.isPending} onClick={() => reindex.mutate()} title="Rebuild search index">
                <RefreshCw className={cn(reindex.isPending && "animate-spin")} /> Re-index
              </Button>
              <Button size="lg" onClick={() => setEditing("new")}>
                <Plus /> New article
              </Button>
            </div>
          }
        />
        <Tabs defaultValue="articles">
          <TabsList>
            <TabsTrigger value="articles">
              <BookOpen className="size-4" /> Articles
            </TabsTrigger>
            <TabsTrigger value="test">
              <FlaskConical className="size-4" /> Test the assistant
            </TabsTrigger>
          </TabsList>
          <TabsContent value="articles" className="pt-4">
            <DataTable
              data={list.data?.items ?? []}
              columns={columns}
              getRowId={(a) => a.id}
              isLoading={list.isPending}
              onRowClick={(a) => void openArticle(a.id)}
              searchPlaceholder="Search articles…"
              emptyTitle="No articles"
              server={{
                query: q,
                onQueryChange: (v) => {
                  setQ(v);
                  setPage(1);
                },
                page,
                pageSize: 20,
                total: list.data?.pagination.total ?? 0,
                totalPages: list.data?.pagination.totalPages ?? 1,
                onPageChange: setPage,
              }}
              filters={
                <>
                  <NativeSelect value={status} onChange={(e) => {
                      setStatus(e.target.value);
                      setPage(1);
                    }} aria-label="Status" className="w-auto">
                    <option value="">All statuses</option>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </NativeSelect>
                  <NativeSelect value={category} onChange={(e) => {
                      setCategory(e.target.value);
                      setPage(1);
                    }} aria-label="Category" className="w-auto">
                    <option value="">All categories</option>
                    {Object.entries(CATEGORIES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </NativeSelect>
                </>
              }
            />
          </TabsContent>
          <TabsContent value="test" className="pt-4">
            <TestPanel />
          </TabsContent>
        </Tabs>

        <Sheet open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
          <SheetContent side="right" className="w-full overflow-y-auto data-[side=right]:sm:max-w-5xl">
            <SheetHeader className="border-b">
              <SheetTitle className="text-lg font-semibold text-heading">{editing === "new" ? "New article" : editing ? editing.titleEn || editing.titleBn : ""}</SheetTitle>
              <SheetDescription>Bangla and/or English. Markdown is supported (headings, lists, bold).</SheetDescription>
            </SheetHeader>
            <div className="p-5">
              {editing && (
                <ArticleEditor
                  key={editing === "new" ? "new" : `${editing.id}-${editing.version}-${editing.status}`}
                  article={editing === "new" ? null : editing}
                  onSaved={(a) => setEditing(a)}
                  onClose={() => setEditing(null)}
                />
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </RequirePermission>
  );
}

"use client";

import Link from "next/link";
import { ReactNode, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CalendarPlus, Download, Loader2, Plus, Search, Trash2, UserPlus, Users, Wallet } from "lucide-react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, DataTableColumn } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCardsSkeleton, TableRowsSkeleton } from "@/components/shared/loading-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { STATUS_CONFIG, StatusBadge, StatusKey, StatusTone } from "@/components/shared/status-badge";
import { SystemStatus } from "@/components/shared/system-status";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, notifyError } from "@/lib/api";
import { formatTaka, SampleVisit, todaysVisits } from "@/lib/sample-data";

const SECTIONS = [
  ["colors", "Colors"],
  ["typography", "Typography"],
  ["buttons", "Buttons"],
  ["status", "Status badges"],
  ["cards", "Cards"],
  ["forms", "Form inputs"],
  ["table", "Data table"],
  ["dialogs", "Dialogs"],
  ["toasts", "Toasts"],
  ["states", "Empty & loading"],
] as const;

const BRAND = [
  ["Primary", "--primary", "#0F766E", "Primary buttons, active navigation"],
  ["Primary hover", "--primary-hover", "#115E59", "Hover / pressed"],
  ["Accent", "--accent", "#F0FDFA", "Selected rows, icon tiles"],
  ["Heading", "--heading", "#0F172A", "Titles"],
  ["Text", "--foreground", "#334155", "Body text"],
  ["Muted text", "--muted-foreground", "#64748B", "Hints, labels"],
  ["Border", "--border", "#E2E8F0", "Card and table lines"],
  ["Page", "--background", "#F8FAFC", "App background"],
  ["Card", "--card", "#FFFFFF", "Surfaces"],
];

const TONES: { tone: StatusTone; name: string; use: string }[] = [
  { tone: "waiting", name: "Waiting · amber", use: "Checked in, pending, low stock" },
  { tone: "active", name: "Active · blue", use: "In consultation, processing" },
  { tone: "success", name: "Success · green", use: "Completed, paid, report ready" },
  { tone: "neutral", name: "Neutral · gray", use: "Cancelled, no-show, inactive" },
  { tone: "danger", name: "Danger · red", use: "Emergency, unpaid, expired, critical" },
  { tone: "info", name: "Info · teal", use: "Booked, scheduled" },
];

const tableColumns: DataTableColumn<SampleVisit>[] = [
  { key: "serial", header: "#", className: "w-14 tabular-nums font-semibold text-heading", cell: (v) => v.serial },
  { key: "name", header: "Patient", cell: (v) => <span className="font-medium text-heading">{v.patientName}</span> },
  { key: "doctor", header: "Doctor", className: "hidden sm:table-cell", cell: (v) => v.doctor },
  { key: "status", header: "Status", cell: (v) => <StatusBadge status={v.status} /> },
];

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-heading">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border bg-card p-5 shadow-card ${className}`}>{children}</div>;
}

export function DesignSystemScreen() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" render={<Link href="/" />} nativeButton={false} aria-label="Back to home">
              <ArrowLeft />
            </Button>
            <BrandLogo subtitle="Design system" />
          </div>
          <div className="flex items-center gap-2">
            <SystemStatus className="hidden sm:inline-flex" />
            <LanguageToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[200px_1fr]">
        <nav aria-label="Sections" className="hidden lg:block">
          <ul className="sticky top-24 space-y-1 text-sm">
            {SECTIONS.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="block rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-heading">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-14">
          <PageHeader
            eyebrow="Testolife UI · v1"
            title="Design system"
            description="Every screen is built from these tokens and components. Calm teal brand, clear status colors, big touch targets, and Bangla that renders properly."
          />

          <Section id="colors" title="Colors" description="Defined once as CSS variables in globals.css; components never use raw hex values.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {BRAND.map(([name, token, hex, use]) => (
                <div key={token} className="overflow-hidden rounded-xl border bg-card shadow-card">
                  <div className="h-16 border-b" style={{ background: `var(${token})` }} />
                  <div className="space-y-0.5 p-3">
                    <p className="text-sm font-semibold text-heading">{name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {hex} · {token}
                    </p>
                    <p className="text-xs text-muted-foreground">{use}</p>
                  </div>
                </div>
              ))}
            </div>
            <h3 className="pt-2 text-sm font-semibold text-heading">Status colors (semantic — same meaning on every screen)</h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {TONES.map(({ tone, name, use }) => (
                <div
                  key={tone}
                  className="flex items-center gap-3 rounded-xl border p-3"
                  style={{ background: `var(--status-${tone}-bg)`, borderColor: `var(--status-${tone}-border)` }}
                >
                  <span className="size-8 shrink-0 rounded-lg" style={{ background: `var(--status-${tone}-dot)` }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: `var(--status-${tone}-fg)` }}>
                      {name}
                    </p>
                    <p className="text-xs text-muted-foreground">{use}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section id="typography" title="Typography" description="Inter for English and numbers, Hind Siliguri for Bangla — mixed text picks the right font per character.">
            <Panel className="space-y-5">
              <div className="space-y-3">
                <p className="text-4xl font-semibold tracking-tight text-heading">Display 36 · Testolife Hospital</p>
                <p className="text-2xl font-semibold text-heading">Heading 24 · Today&apos;s appointments</p>
                <p className="text-lg font-semibold text-heading">Heading 18 · Next patient</p>
                <p className="text-base">Body 16 · Patient checked in at 10:30 and is waiting for vitals.</p>
                <p className="text-sm text-muted-foreground">Small 14 · Last updated 2 minutes ago</p>
                <p className="text-3xl font-semibold text-heading tabular-nums">Numbers 30 · ৳2,41,500 · 0123456789</p>
              </div>
              <div className="space-y-3 border-t pt-5">
                <p className="text-3xl font-semibold text-heading">বাংলা শিরোনাম · রোগী নিবন্ধন</p>
                <p className="text-lg">আসসালামু আলাইকুম! ডাক্তার খোঁজা, সিরিয়াল নেওয়া বা হাসপাতাল সম্পর্কে যেকোনো তথ্যের জন্য লিখুন।</p>
                <p className="text-base">যুক্তাক্ষর পরীক্ষা: ক্ষ, জ্ঞ, ন্ত্র, স্ত্র, ঙ্ক, ষ্ণ, হ্ম, দ্ধ, ক্র, প্র — রক্তচাপ ১৪০/৯০ mmHg</p>
                <p className="text-sm text-muted-foreground">মিশ্র লেখা: Dr. Farhana Rahman আজ সকাল ১০টা থেকে রুম 101-এ বসবেন।</p>
              </div>
            </Panel>
          </Section>

          <Section id="buttons" title="Buttons" description="Primary actions are at least 44px tall (lg / xl) so they are easy to hit on a busy front desk.">
            <Panel className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <Button>Primary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="link">Link</Button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small 36</Button>
                <Button>Default 40</Button>
                <Button size="lg">Large 44</Button>
                <Button size="xl">
                  <UserPlus /> Register patient · 48
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="icon" aria-label="Add">
                  <Plus />
                </Button>
                <Button size="icon" variant="outline" aria-label="Search">
                  <Search />
                </Button>
                <Button variant="outline">
                  <Download /> Export
                </Button>
                <Button disabled>Disabled</Button>
                <Button
                  disabled={loadingDemo}
                  onClick={() => {
                    setLoadingDemo(true);
                    setTimeout(() => setLoadingDemo(false), 1500);
                  }}
                >
                  {loadingDemo && <Loader2 className="animate-spin" />} {loadingDemo ? "Saving…" : "Click to see loading"}
                </Button>
              </div>
            </Panel>
          </Section>

          <Section id="status" title="Status badges" description="A dot and a text label — color is never the only signal. Labels switch with the EN / বাং toggle.">
            <Panel className="flex flex-wrap gap-2">
              {(Object.keys(STATUS_CONFIG) as StatusKey[]).map((s) => (
                <StatusBadge key={s} status={s} />
              ))}
            </Panel>
          </Section>

          <Section id="cards" title="Cards" description="White card, 1px border, very soft shadow, rounded-xl.">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Patients today" value={186} icon={Users} trend={{ value: "5%", direction: "up", label: "vs last week" }} />
              <StatCard label="Collected today" value={formatTaka(218800)} icon={Wallet} hint="64 invoices" />
              <StatCard label="Avg. waiting" value="18 min" trend={{ value: "3 min", direction: "down", good: true, label: "better" }} />
              <StatCard label="Unpaid dues" value={formatTaka(12400)} tone="danger" hint="9 invoices" />
            </div>
          </Section>

          <Section id="forms" title="Form inputs" description="Labels are bilingual; errors appear under the field in words, not only in red.">
            <Panel>
              <form className="grid gap-5 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
                <div className="space-y-1.5">
                  <Label htmlFor="ds-name">
                    Patient name <span className="font-normal text-muted-foreground">· রোগীর নাম</span>
                  </Label>
                  <Input id="ds-name" placeholder="e.g. Abdur Rahim" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ds-phone">
                    Mobile <span className="font-normal text-muted-foreground">· মোবাইল</span>
                  </Label>
                  <Input id="ds-phone" defaultValue="0170000" aria-invalid />
                  <p className="text-xs text-destructive">Enter a valid mobile number (01XXXXXXXXX)</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ds-dept">
                    Department <span className="font-normal text-muted-foreground">· বিভাগ</span>
                  </Label>
                  <NativeSelect id="ds-dept" defaultValue="">
                    <option value="">Choose…</option>
                    <option>Medicine · মেডিসিন</option>
                    <option>Cardiology · হৃদরোগ</option>
                    <option>Pediatrics · শিশু</option>
                  </NativeSelect>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ds-date">Date · তারিখ</Label>
                  <Input id="ds-date" type="date" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="ds-note">Reason for visit · সমস্যা</Label>
                  <Textarea id="ds-note" placeholder="জ্বর ও কাশি, ৩ দিন ধরে" />
                </div>
                <label className="flex items-center gap-3 text-sm">
                  <Switch defaultChecked /> Send SMS reminder · এসএমএস রিমাইন্ডার
                </label>
                <div className="flex justify-end sm:col-span-1">
                  <Button size="lg" type="submit">
                    <CalendarPlus /> Book appointment
                  </Button>
                </div>
              </form>
            </Panel>
          </Section>

          <Section id="table" title="Data table" description="Search, filters slot, pagination, loading skeleton and empty state built in. Try searching “Rahim” or “xyz”.">
            <DataTable
              data={todaysVisits}
              columns={tableColumns}
              getRowId={(v) => v.id}
              searchText={(v) => `${v.patientName} ${v.phone} ${v.patientCode}`}
              searchPlaceholder="Search name, phone or TL code"
              pageSize={5}
            />
          </Section>

          <Section id="dialogs" title="Dialogs" description="Confirmation for actions that are hard to undo; regular dialogs for short tasks.">
            <Panel className="flex flex-wrap gap-3">
              <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
                <Trash2 /> Cancel appointment…
              </Button>
              <Dialog>
                <DialogTrigger render={<Button variant="outline" />}>Open dialog</DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Quick note</DialogTitle>
                    <DialogDescription>Dialogs keep the user in context for short tasks.</DialogDescription>
                  </DialogHeader>
                  <Textarea placeholder="Type a note…" />
                  <DialogFooter showCloseButton>
                    <Button onClick={() => toast.success("Note saved")}>Save note</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                tone="danger"
                title="Cancel serial 7?"
                description="Abdur Rahim · Dr. Farhana Rahman at 10:30. The slot becomes free for other patients."
                confirmLabel="Cancel appointment"
                cancelLabel="Keep"
                onConfirm={async () => {
                  await new Promise((r) => setTimeout(r, 800));
                  toast.success("Appointment cancelled");
                }}
              />
            </Panel>
          </Section>

          <Section id="toasts" title="Toasts" description="API errors are turned into friendly messages in one place (lib/api.ts).">
            <Panel className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => toast.success("Patient registered · TL-000124")}>
                Success
              </Button>
              <Button variant="outline" onClick={() => toast.info("Dr. Farhana is running 10 minutes late")}>
                Info
              </Button>
              <Button variant="outline" onClick={() => toast.warning("Seclo 20 mg is below reorder level")}>
                Warning
              </Button>
              <Button variant="outline" onClick={() => notifyError(new ApiError("Slot 10:30 is not available.", 409, "CONFLICT"))}>
                API error (409)
              </Button>
              <Button variant="outline" onClick={() => notifyError(new ApiError("Cannot reach the server.", 0, "NETWORK_ERROR"))}>
                Network error
              </Button>
            </Panel>
          </Section>

          <Section id="states" title="Empty & loading states">
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel>
                <EmptyState
                  title="No patients waiting"
                  description="New check-ins will appear here automatically."
                  action={
                    <Button variant="outline">
                      <UserPlus /> Register patient
                    </Button>
                  }
                />
              </Panel>
              <div className="space-y-4">
                <StatCardsSkeleton count={2} />
                <div className="rounded-xl border bg-card shadow-card">
                  <TableRowsSkeleton rows={3} columns={4} />
                </div>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

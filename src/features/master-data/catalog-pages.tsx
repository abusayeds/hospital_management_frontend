"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/api";
import { LabParameter, LabTest, Medicine, MEDICINE_FORMS, ServiceItem } from "@/lib/master-data";
import { formatPoisha, poishaToTaka, takaToPoisha } from "@/lib/money";
import { CatalogScreen, useCatalogSave } from "./catalog-screen";
import { FormError, formatHours } from "./form-bits";

// ---------------------------------------------------------------- shared dialog shell

function CatalogDialog({
  open,
  onOpenChange,
  title,
  busy,
  error,
  onSubmit,
  children,
  wide,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  busy: boolean;
  error?: string;
  onSubmit: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className={wide ? "max-h-[92dvh] overflow-y-auto sm:max-w-3xl" : "sm:max-w-lg"}>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-heading">{title}</DialogTitle>
          <DialogDescription>Prices are in taka. Changes are recorded in the audit log.</DialogDescription>
        </DialogHeader>
        <form
          id="catalog-form"
          className="grid gap-4 sm:grid-cols-2"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          {children}
          <FormError message={error} className="sm:col-span-2" />
        </form>
        <DialogFooter>
          <Button variant="outline" size="lg" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="catalog-form" size="lg" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ id, label, children, wide }: { id: string; label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- services

const SERVICE_CATEGORIES = [
  { value: "consultation", label: "Consultation" },
  { value: "procedure", label: "Procedure" },
  { value: "other", label: "Other" },
];

export function ServicesScreen() {
  return (
    <CatalogScreen<ServiceItem>
      endpoint="/services"
      queryKey="services"
      title="Services & Charges"
      description="Consultation and procedure charges used by billing (Phase 7)."
      addLabel="Add service"
      searchPlaceholder="Search service"
      nameOf={(s) => s.name}
      extraFilter={{ param: "category", label: "Categories", options: SERVICE_CATEGORIES }}
      columns={[
        {
          key: "name",
          header: "Service",
          cell: (s) => (
            <div>
              <p className="font-medium text-heading">{s.name}</p>
              {s.nameBn && <p className="font-bangla text-xs text-muted-foreground">{s.nameBn}</p>}
            </div>
          ),
        },
        { key: "category", header: "Category", className: "hidden md:table-cell capitalize", cell: (s) => s.category },
        { key: "price", header: "Price", className: "text-right tabular-nums font-semibold text-heading", cell: (s) => formatPoisha(s.price) },
      ]}
      renderForm={(p) => p.open && <ServiceForm key={p.item?.id ?? "new"} {...p} />}
    />
  );
}

function ServiceForm({ open, onOpenChange, item }: { open: boolean; onOpenChange: (o: boolean) => void; item: ServiceItem | null }) {
  const [f, setF] = useState({ name: item?.name ?? "", nameBn: item?.nameBn ?? "", category: item?.category ?? "consultation", price: item ? String(poishaToTaka(item.price)) : "" });
  const [error, setError] = useState<string>();
  const save = useCatalogSave<ServiceItem>("/services", "services", item, () => onOpenChange(false));
  const submit = () => {
    if (f.name.trim().length < 2) return setError("Enter the service name.");
    if (f.price === "" || Number(f.price) < 0) return setError("Enter a price in taka.");
    save.mutate({ name: f.name.trim(), nameBn: f.nameBn.trim() || undefined, category: f.category, price: takaToPoisha(Number(f.price)) }, { onError: (e) => setError(getErrorMessage(e)) });
  };
  return (
    <CatalogDialog open={open} onOpenChange={onOpenChange} title={item ? "Edit service" : "Add service"} busy={save.isPending} error={error} onSubmit={submit}>
      <Field id="svc-name" label="Name (English)" wide>
        <Input id="svc-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      </Field>
      <Field id="svc-nameBn" label="নাম (বাংলা)" wide>
        <Input id="svc-nameBn" className="font-bangla" value={f.nameBn} onChange={(e) => setF({ ...f, nameBn: e.target.value })} />
      </Field>
      <Field id="svc-cat" label="Category">
        <NativeSelect id="svc-cat" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as ServiceItem["category"] })}>
          {SERVICE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field id="svc-price" label="Price (৳)">
        <Input id="svc-price" type="number" min={0} inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
      </Field>
    </CatalogDialog>
  );
}

// ---------------------------------------------------------------- lab tests

const LAB_CATEGORIES = ["Hematology", "Biochemistry", "Hormone", "Immunology", "Clinical Pathology", "Radiology", "Cardiac"];

export function LabTestsScreen() {
  return (
    <CatalogScreen<LabTest>
      endpoint="/lab-tests"
      queryKey="lab-tests"
      title="Lab Test Catalog"
      description="Tests, prices, sample type, preparation advice and normal ranges. Ordering and results arrive in Phase 4."
      addLabel="Add lab test"
      searchPlaceholder="Search name or code"
      nameOf={(t) => t.name}
      extraFilter={{ param: "category", label: "Categories", options: LAB_CATEGORIES.map((c) => ({ value: c, label: c })) }}
      columns={[
        { key: "code", header: "Code", className: "w-24 font-mono text-xs font-semibold", cell: (t) => t.code },
        {
          key: "name",
          header: "Test",
          cell: (t) => (
            <div>
              <p className="font-medium text-heading">{t.name}</p>
              <p className="text-xs text-muted-foreground">
                {t.sampleType} · {t.parameters.length} parameter{t.parameters.length === 1 ? "" : "s"}
                {t.preparationNote ? " · preparation needed" : ""}
              </p>
            </div>
          ),
        },
        { key: "category", header: "Category", className: "hidden lg:table-cell", cell: (t) => t.category },
        { key: "tat", header: "Report in", className: "hidden md:table-cell tabular-nums", cell: (t) => formatHours(t.turnaroundHours) },
        { key: "price", header: "Price", className: "text-right tabular-nums font-semibold text-heading", cell: (t) => formatPoisha(t.price) },
      ]}
      renderForm={(p) => p.open && <LabTestForm key={p.item?.id ?? "new"} {...p} />}
    />
  );
}

function LabTestForm({ open, onOpenChange, item }: { open: boolean; onOpenChange: (o: boolean) => void; item: LabTest | null }) {
  const [f, setF] = useState({
    name: item?.name ?? "",
    code: item?.code ?? "",
    category: item?.category ?? LAB_CATEGORIES[0],
    price: item ? String(poishaToTaka(item.price)) : "",
    sampleType: item?.sampleType ?? "",
    turnaroundHours: String(item?.turnaroundHours ?? 24),
    preparationNote: item?.preparationNote ?? "",
    preparationNoteBn: item?.preparationNoteBn ?? "",
  });
  // Numbers are typed as text so a half-typed "4." is not lost
  const [params, setParams] = useState<(Omit<LabParameter, "normalMin" | "normalMax"> & { normalMin: string; normalMax: string })[]>(
    (item?.parameters ?? []).map((p) => ({ ...p, normalMin: p.normalMin == null ? "" : String(p.normalMin), normalMax: p.normalMax == null ? "" : String(p.normalMax) })),
  );
  const [error, setError] = useState<string>();
  const save = useCatalogSave<LabTest>("/lab-tests", "lab-tests", item, () => onOpenChange(false));

  const submit = () => {
    if (f.name.trim().length < 2) return setError("Enter the test name.");
    if (!/^[A-Za-z0-9-]{2,20}$/.test(f.code.trim())) return setError("Code: 2–20 letters, numbers or dashes (e.g. CBC).");
    if (f.price === "" || Number(f.price) < 0) return setError("Enter a price in taka.");
    if (f.sampleType.trim().length < 2) return setError("Enter the sample type (e.g. Blood, Urine).");
    const parameters = params
      .filter((p) => p.name.trim())
      .map((p) => ({
        name: p.name.trim(),
        unit: p.unit?.trim() || undefined,
        normalMin: p.normalMin === "" ? null : Number(p.normalMin),
        normalMax: p.normalMax === "" ? null : Number(p.normalMax),
        normalText: p.normalText?.trim() || undefined,
      }));
    if (parameters.some((p) => p.normalMin != null && p.normalMax != null && p.normalMin > p.normalMax)) return setError("A parameter's normal minimum is above its maximum.");
    save.mutate(
      {
        name: f.name.trim(),
        code: f.code.trim().toUpperCase(),
        category: f.category.trim(),
        price: takaToPoisha(Number(f.price)),
        sampleType: f.sampleType.trim(),
        turnaroundHours: Number(f.turnaroundHours) || 0,
        preparationNote: f.preparationNote.trim() || undefined,
        preparationNoteBn: f.preparationNoteBn.trim() || undefined,
        parameters,
      },
      { onError: (e) => setError(getErrorMessage(e)) },
    );
  };

  return (
    <CatalogDialog open={open} onOpenChange={onOpenChange} title={item ? `Edit ${item.code}` : "Add lab test"} busy={save.isPending} error={error} onSubmit={submit} wide>
      <Field id="lt-name" label="Test name">
        <Input id="lt-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      </Field>
      <Field id="lt-code" label="Code">
        <Input id="lt-code" className="font-mono uppercase" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} />
      </Field>
      <Field id="lt-cat" label="Category">
        <Input id="lt-cat" list="lab-categories" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
        <datalist id="lab-categories">
          {LAB_CATEGORIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>
      <Field id="lt-sample" label="Sample type">
        <Input id="lt-sample" placeholder="Blood (EDTA), Urine…" value={f.sampleType} onChange={(e) => setF({ ...f, sampleType: e.target.value })} />
      </Field>
      <Field id="lt-price" label="Price (৳)">
        <Input id="lt-price" type="number" min={0} value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
      </Field>
      <Field id="lt-tat" label="Report ready in (hours)">
        <Input id="lt-tat" type="number" min={0} value={f.turnaroundHours} onChange={(e) => setF({ ...f, turnaroundHours: e.target.value })} />
      </Field>
      <Field id="lt-prep" label="Preparation (English)">
        <Textarea id="lt-prep" rows={2} placeholder="Fasting 8–10 hours" value={f.preparationNote} onChange={(e) => setF({ ...f, preparationNote: e.target.value })} />
      </Field>
      <Field id="lt-prepBn" label="প্রস্তুতি (বাংলা)">
        <Textarea id="lt-prepBn" rows={2} className="font-bangla" value={f.preparationNoteBn} onChange={(e) => setF({ ...f, preparationNoteBn: e.target.value })} />
      </Field>

      <fieldset className="space-y-2 sm:col-span-2">
        <legend className="text-sm font-medium">Parameters & normal ranges</legend>
        {params.length > 0 && (
          <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1.5fr_auto] gap-2 text-xs text-muted-foreground sm:grid">
            <span>Parameter</span>
            <span>Unit</span>
            <span>Min</span>
            <span>Max</span>
            <span>Or normal text</span>
            <span />
          </div>
        )}
        {params.map((p, i) => {
          const update = (patch: Partial<typeof p>) => setParams(params.map((x, j) => (j === i ? { ...x, ...patch } : x)));
          return (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_1.5fr_auto]">
              <Input aria-label="Parameter name" value={p.name} onChange={(e) => update({ name: e.target.value })} />
              <Input aria-label="Unit" value={p.unit ?? ""} onChange={(e) => update({ unit: e.target.value })} />
              <Input aria-label="Normal minimum" inputMode="decimal" value={p.normalMin} onChange={(e) => update({ normalMin: e.target.value })} />
              <Input aria-label="Normal maximum" inputMode="decimal" value={p.normalMax} onChange={(e) => update({ normalMax: e.target.value })} />
              <Input aria-label="Normal text" placeholder="Negative" value={p.normalText ?? ""} onChange={(e) => update({ normalText: e.target.value })} />
              <Button type="button" variant="ghost" size="icon" aria-label="Remove parameter" onClick={() => setParams(params.filter((_, j) => j !== i))}>
                <Trash2 />
              </Button>
            </div>
          );
        })}
        <Button type="button" variant="outline" size="sm" onClick={() => setParams([...params, { name: "", unit: "", normalMin: "", normalMax: "", normalText: "" }])}>
          <Plus /> Add parameter
        </Button>
      </fieldset>
    </CatalogDialog>
  );
}

// ---------------------------------------------------------------- medicines

export function MedicinesScreen() {
  return (
    <CatalogScreen<Medicine>
      endpoint="/medicines"
      queryKey="medicines"
      title="Medicine Catalog"
      description="Brand and generic names for fast prescription writing (Phase 4). Stock and dispensing come later."
      addLabel="Add medicine"
      searchPlaceholder="Search brand, generic or company"
      nameOf={(m) => `${m.brandName} ${m.strength ?? ""}`.trim()}
      extraFilter={{ param: "form", label: "Forms", options: MEDICINE_FORMS.map((f) => ({ value: f, label: f[0].toUpperCase() + f.slice(1) })) }}
      columns={[
        {
          key: "brand",
          header: "Brand",
          cell: (m) => (
            <div>
              <p className="font-medium text-heading">
                {m.brandName} <span className="font-normal text-muted-foreground">{m.strength}</span>
              </p>
              <p className="text-xs text-muted-foreground">{m.genericName}</p>
            </div>
          ),
        },
        { key: "form", header: "Form", className: "capitalize", cell: (m) => m.form },
        { key: "maker", header: "Manufacturer", className: "hidden md:table-cell", cell: (m) => m.manufacturer ?? "—" },
      ]}
      renderForm={(p) => p.open && <MedicineForm key={p.item?.id ?? "new"} {...p} />}
    />
  );
}

function MedicineForm({ open, onOpenChange, item }: { open: boolean; onOpenChange: (o: boolean) => void; item: Medicine | null }) {
  const [f, setF] = useState({
    brandName: item?.brandName ?? "",
    genericName: item?.genericName ?? "",
    strength: item?.strength ?? "",
    form: item?.form ?? "tablet",
    manufacturer: item?.manufacturer ?? "",
  });
  const [error, setError] = useState<string>();
  const save = useCatalogSave<Medicine>("/medicines", "medicines", item, () => onOpenChange(false));
  const submit = () => {
    if (!f.brandName.trim()) return setError("Enter the brand name.");
    if (f.genericName.trim().length < 2) return setError("Enter the generic name.");
    save.mutate(
      { brandName: f.brandName.trim(), genericName: f.genericName.trim(), strength: f.strength.trim() || undefined, form: f.form, manufacturer: f.manufacturer.trim() || undefined },
      { onError: (e) => setError(getErrorMessage(e)) },
    );
  };
  return (
    <CatalogDialog open={open} onOpenChange={onOpenChange} title={item ? "Edit medicine" : "Add medicine"} busy={save.isPending} error={error} onSubmit={submit}>
      <Field id="med-brand" label="Brand name">
        <Input id="med-brand" value={f.brandName} onChange={(e) => setF({ ...f, brandName: e.target.value })} />
      </Field>
      <Field id="med-strength" label="Strength">
        <Input id="med-strength" placeholder="500 mg" value={f.strength} onChange={(e) => setF({ ...f, strength: e.target.value })} />
      </Field>
      <Field id="med-generic" label="Generic name" wide>
        <Input id="med-generic" value={f.genericName} onChange={(e) => setF({ ...f, genericName: e.target.value })} />
      </Field>
      <Field id="med-form" label="Form">
        <NativeSelect id="med-form" value={f.form} onChange={(e) => setF({ ...f, form: e.target.value as Medicine["form"] })}>
          {MEDICINE_FORMS.map((x) => (
            <option key={x} value={x}>
              {x[0].toUpperCase() + x.slice(1)}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field id="med-maker" label="Manufacturer">
        <Input id="med-maker" value={f.manufacturer} onChange={(e) => setF({ ...f, manufacturer: e.target.value })} />
      </Field>
    </CatalogDialog>
  );
}

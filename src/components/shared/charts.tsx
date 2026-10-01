"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * Single-series charts in the brand chart color. One series → no legend box;
 * the card title names it. No entrance animation (calm, and instant on slow PCs).
 * Every chart has a hover tooltip and a hidden data
 * table for screen readers. Grid and axes stay quiet so the data stands out.
 */

type Point = { label: string; value: number };

const AXIS = { fontSize: 12, fill: "var(--muted-foreground)" };

function ChartTooltip({ active, payload, label, format }: { active?: boolean; payload?: { value: number }[]; label?: string; format: (v: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-raised">
      <p className="text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-heading tabular-nums">{format(payload[0].value)}</p>
    </div>
  );
}

function DataTableFallback({ caption, data, format }: { caption: string; data: Point[]; format: (v: number) => string }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <tbody>
        {data.map((d) => (
          <tr key={d.label}>
            <th scope="row">{d.label}</th>
            <td>{format(d.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const compact = (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v));

export function TrendAreaChart({
  data,
  caption,
  format = String,
  height = 260,
}: {
  data: Point[];
  caption: string;
  format?: (v: number) => string;
  height?: number;
}) {
  return (
    <figure>
      <div style={{ height }} aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={compact} width={48} />
            <Tooltip content={<ChartTooltip format={format} />} cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="url(#trendFill)"
              isAnimationActive={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <DataTableFallback caption={caption} data={data} format={format} />
    </figure>
  );
}

export function RankedBarChart({
  data,
  caption,
  format = String,
  height,
}: {
  data: Point[];
  caption: string;
  format?: (v: number) => string;
  height?: number;
}) {
  const h = height ?? Math.max(160, data.length * 40);
  return (
    <figure>
      <div style={{ height: h }} aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap={8}>
            <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={compact} />
            <YAxis type="category" dataKey="label" tick={AXIS} tickLine={false} axisLine={false} width={92} />
            <Tooltip content={<ChartTooltip format={format} />} cursor={{ fill: "var(--muted)" }} />
            <Bar dataKey="value" fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTableFallback caption={caption} data={data} format={format} />
    </figure>
  );
}

export function ColumnChart({
  data,
  caption,
  format = String,
  height = 220,
  highlightLast = false,
}: {
  data: Point[];
  caption: string;
  format?: (v: number) => string;
  height?: number;
  highlightLast?: boolean;
}) {
  return (
    <figure>
      <div style={{ height }} aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
            <Tooltip content={<ChartTooltip format={format} />} cursor={{ fill: "var(--muted)" }} />
            <Bar
              dataKey="value"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
              isAnimationActive={false}
              // Today's bar in full color, earlier days lighter
              shape={(props: unknown) => {
                const p = props as { x: number; y: number; width: number; height: number; index: number };
                const isLast = highlightLast && p.index === data.length - 1;
                return (
                  <rect
                    x={p.x}
                    y={p.y}
                    width={p.width}
                    height={p.height}
                    rx={4}
                    fill="var(--chart-1)"
                    fillOpacity={highlightLast && !isLast ? 0.45 : 1}
                  />
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTableFallback caption={caption} data={data} format={format} />
    </figure>
  );
}

// ---------------------------------------------------------------- multi-series (analytics)

export type Series = { key: string; label: string; color?: string };
type Row = Record<string, string | number>;
const SERIES_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const colorOf = (s: Series, i: number) => s.color ?? SERIES_COLORS[i % SERIES_COLORS.length];

function MultiTooltip({ active, payload, label, format }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; format: (v: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-raised">
      <p className="mb-1 text-muted-foreground">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span className="flex-1">{p.name}</span>
          <span className="font-semibold text-heading tabular-nums">{format(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

function MultiTableFallback({ caption, data, series, xKey, format }: { caption: string; data: Row[]; series: Series[]; xKey: string; format: (v: number) => string }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">{xKey}</th>
          {series.map((s) => (
            <th key={s.key} scope="col">
              {s.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((d) => (
          <tr key={String(d[xKey])}>
            <th scope="row">{d[xKey]}</th>
            {series.map((s) => (
              <td key={s.key}>{format(Number(d[s.key] ?? 0))}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const LEGEND = { wrapperStyle: { fontSize: 12, paddingTop: 8 }, iconType: "circle" as const, iconSize: 8 };

/** Several lines over time (e.g. completed / no-show / cancelled per day) */
export function MultiLineChart({ data, series, caption, xKey = "label", format = String, height = 280 }: { data: Row[]; series: Series[]; caption: string; xKey?: string; format?: (v: number) => string; height?: number }) {
  return (
    <figure>
      <div style={{ height }} aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey={xKey} tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={compact} width={48} allowDecimals={false} />
            <Tooltip content={<MultiTooltip format={format} />} cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }} />
            <Legend {...LEGEND} />
            {series.map((s, i) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={colorOf(s, i)} strokeWidth={2} dot={false} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <MultiTableFallback caption={caption} data={data} series={series} xKey={xKey} format={format} />
    </figure>
  );
}

/** Stacked columns (e.g. revenue per day split by consultation / lab / medicine) */
export function StackedColumnChart({ data, series, caption, xKey = "label", format = String, height = 280 }: { data: Row[]; series: Series[]; caption: string; xKey?: string; format?: (v: number) => string; height?: number }) {
  return (
    <figure>
      <div style={{ height }} aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }} barCategoryGap="18%">
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey={xKey} tick={AXIS} tickLine={false} axisLine={false} minTickGap={16} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={compact} width={48} />
            <Tooltip content={<MultiTooltip format={format} />} cursor={{ fill: "var(--muted)" }} />
            <Legend {...LEGEND} />
            {series.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={colorOf(s, i)} maxBarSize={36} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <MultiTableFallback caption={caption} data={data} series={series} xKey={xKey} format={format} />
    </figure>
  );
}

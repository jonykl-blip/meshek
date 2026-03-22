"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";

interface Props {
  data: { name: string; value: number }[];
  title: string;
  unit: string;
  color?: string;
  maxItems?: number;
  onBarClick?: (name: string) => void;
}

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + "…" : str;
}

export function HorizontalBarChart({
  data,
  title,
  unit,
  color = "hsl(var(--chart-1))",
  maxItems = 10,
  onBarClick,
}: Props) {
  const chartData = useMemo(
    () => data.slice(0, maxItems),
    [data, maxItems],
  );

  const height = Math.max(150, chartData.length * 36);

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
        {title}
      </h3>
      <div style={{ direction: "ltr" }}>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 40, bottom: 0, left: 5 }}
            onClick={(_state, event) => {
              const e = event as unknown as { activePayload?: { payload?: { name?: string } }[] };
              if (e?.activePayload?.[0]?.payload?.name && onBarClick) {
                onBarClick(e.activePayload[0].payload.name);
              }
            }}
          >
            <XAxis
              type="number"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={90}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: string) => truncate(v, 12)}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0]?.payload as {
                  name: string;
                  value: number;
                };
                return (
                  <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
                    <p>
                      {row.name}: {row.value.toFixed(1)} {unit}
                    </p>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="value"
              radius={[0, 4, 4, 0]}
              cursor="pointer"
              barSize={20}
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={color} />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                formatter={(v: unknown) => `${Number(v).toFixed(1)} ${unit}`}
                style={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

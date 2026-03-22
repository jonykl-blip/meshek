"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

interface Props {
  data: {
    date: string;
    hours: number;
    by_work_type: Record<string, number>;
  }[];
  onBarClick?: (date: string) => void;
}

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

export function DailyTimelineChart({ data, onBarClick }: Props) {
  const { chartData, workTypes } = useMemo(() => {
    const typeSet = new Set<string>();
    for (const row of data) {
      for (const wt of Object.keys(row.by_work_type)) {
        typeSet.add(wt);
      }
    }
    const types = Array.from(typeSet);

    const rows = data.map((row) => {
      const entry: Record<string, string | number> = {
        date: row.date,
        dateLabel: formatDateLabel(row.date),
        total: row.hours,
      };
      for (const wt of types) {
        entry[wt] = row.by_work_type[wt] ?? 0;
      }
      return entry;
    });

    return { chartData: rows, workTypes: types };
  }, [data]);

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
        פעילות יומית — שעות
      </h3>
      <div style={{ direction: "ltr" }}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={chartData}
            onClick={(_state, event) => {
              const e = event as unknown as { activePayload?: { payload?: { date?: string } }[] };
              if (e?.activePayload?.[0]?.payload?.date && onBarClick) {
                onBarClick(e.activePayload[0].payload.date);
              }
            }}
          >
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              label={{
                value: "שעות",
                position: "insideTop",
                offset: -5,
                style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0]?.payload as Record<string, unknown>;
                return (
                  <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
                    <p className="font-medium">{formatDateLabel(row.date as string)}</p>
                    <p className="text-muted-foreground">
                      סה״כ: {Number(row.total).toFixed(1)} שעות
                    </p>
                  </div>
                );
              }}
            />
            {workTypes.map((wt, i) => (
              <Bar
                key={wt}
                dataKey={wt}
                stackId="hours"
                fill={CHART_COLORS[i % CHART_COLORS.length]}
                radius={
                  i === workTypes.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]
                }
                cursor="pointer"
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

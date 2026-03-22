"use client";

import {
  PieChart,
  Pie,
  Cell,
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
  data: { work_type: string; hours: number; pct: number }[];
  totalHours: number;
  onSegmentClick?: (workType: string) => void;
}

export function WorkTypeDonut({ data, totalHours, onSegmentClick }: Props) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
        התפלגות סוגי עבודה — שעות
      </h3>
      <div style={{ direction: "ltr" }}>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data}
              dataKey="hours"
              nameKey="work_type"
              cx="50%"
              cy="45%"
              innerRadius="55%"
              outerRadius="80%"
              cursor="pointer"
              onClick={(_data, _index, event) => {
                const entry = event as unknown as { work_type?: string };
                if (onSegmentClick && entry?.work_type) {
                  onSegmentClick(entry.work_type);
                }
              }}
            >
              {data.map((entry, i) => (
                <Cell
                  key={entry.work_type}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0]?.payload as {
                  work_type: string;
                  hours: number;
                  pct: number;
                };
                return (
                  <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
                    <p>
                      {row.work_type}: {row.hours.toFixed(1)} שע׳ ({row.pct}%)
                    </p>
                  </div>
                );
              }}
            />
            {/* Center text */}
            <text
              x="50%"
              y="42%"
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-foreground text-2xl font-bold"
            >
              {totalHours.toFixed(1)}
            </text>
            <text
              x="50%"
              y="52%"
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-muted-foreground text-xs"
            >
              שעות
            </text>
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
        {data.map((entry, i) => (
          <div key={entry.work_type} className="flex items-center gap-1.5 text-xs">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{
                backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
              }}
            />
            <span className="text-muted-foreground">{entry.work_type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

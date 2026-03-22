"use client";

import { useMemo } from "react";

interface Props {
  data: { material_name: string; total_quantity: number; unit: string }[];
}

export function MaterialUsage({ data }: Props) {
  const items = useMemo(() => data.slice(0, 5), [data]);

  if (items.length === 0) return null;

  const maxQty = Math.max(...items.map((d) => d.total_quantity));

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
        שימוש בחומרים
      </h3>
      <div className="space-y-2.5">
        {items.map((item) => {
          const pct = maxQty > 0 ? (item.total_quantity / maxQty) * 100 : 0;
          return (
            <div key={item.material_name} className="flex items-center gap-3">
              <span className="w-28 shrink-0 truncate text-sm font-medium">
                {item.material_name}
              </span>
              <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-muted/60">
                <div
                  className="absolute inset-y-0 start-0 rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.max(pct, 2)}%`,
                    backgroundColor: "hsl(var(--chart-3))",
                  }}
                />
              </div>
              <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                {item.total_quantity} {item.unit}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

interface KpiItem {
  label: string;
  value: string;
  unit?: string;
}

interface KpiCardsProps {
  items: KpiItem[];
}

export function KpiCards({ items }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {item.value}
            {item.unit && (
              <span className="mr-1 text-sm font-normal text-muted-foreground">{item.unit}</span>
            )}
          </p>
        </div>
      ))}
    </div>
  );
}

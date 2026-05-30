import type { ReactNode } from "react";

function getTooltipText(value: unknown) {
  if (value == null) {
    return undefined;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  return undefined;
}

export function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-card/60 w-full min-w-0 overflow-hidden rounded-2xl border p-3">
      <div className="mb-2">
        <div className="text-foreground min-w-0 truncate text-sm font-semibold">{title}</div>
        {description ? (
          <div className="text-muted-foreground mt-1 min-w-0 truncate text-xs leading-5" title={description}>
            {description}
          </div>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  icon,
  className,
  valueClassName,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={`flex min-w-0 items-start gap-2.5 overflow-hidden ${className ?? ""}`}>
      <div className="text-muted-foreground mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-muted-foreground truncate text-[11px]" title={label}>
          {label}
        </div>
        <div
          className={`text-foreground w-full truncate text-sm font-medium whitespace-nowrap ${valueClassName ?? ""}`}
          title={getTooltipText(value)}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

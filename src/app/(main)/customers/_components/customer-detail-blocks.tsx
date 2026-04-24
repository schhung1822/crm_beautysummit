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
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm shadow-slate-100 dark:shadow-none min-w-0 w-full overflow-hidden">
      <div className="mb-4">
        <div className="text-foreground text-sm font-semibold truncate min-w-0">{title}</div>
        {description ? (
          <div className="text-muted-foreground mt-1 truncate text-xs leading-5 min-w-0" title={description}>
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
    <div className={`rounded-xl border border-slate-200 bg-slate-50/80 dark:bg-slate-800/80 px-3 py-3 min-w-0 overflow-hidden ${className ?? ""}`}>
      <div className="text-muted-foreground mb-1.5 flex items-center gap-2 text-[11px] font-medium tracking-[0.18em] uppercase">
        <span className="shrink-0">{icon}</span>
        <span className="truncate whitespace-nowrap" title={label}>
          {label}
        </span>
      </div>
      <div
        className={`text-foreground w-full truncate text-sm font-semibold whitespace-nowrap ${valueClassName ?? ""}`}
        title={getTooltipText(value)}
      >
        {value}
      </div>
    </div>
  );
}

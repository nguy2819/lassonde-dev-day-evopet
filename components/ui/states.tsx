import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-2xl bg-accent-soft", className)} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-line px-6 py-12 text-center", className)}>
      {icon && <div className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent [&_svg]:size-6">{icon}</div>}
      <p className="font-bold text-ink">{title}</p>
      {description && <p className="max-w-sm text-sm text-ink-muted">{description}</p>}
      {action}
    </div>
  );
}

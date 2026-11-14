import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, strong, ...props }: React.HTMLAttributes<HTMLDivElement> & { strong?: boolean }) {
  return <div className={cn(strong ? "glass-strong" : "glass", "rounded-3xl p-5 sm:p-6", className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex items-start justify-between gap-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-lg font-bold tracking-tight text-ink", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-ink-muted", className)} {...props} />;
}

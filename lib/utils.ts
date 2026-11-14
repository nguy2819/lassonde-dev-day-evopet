import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) {
  return new Date(iso).toLocaleDateString("en-US", opts);
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function relativeDays(iso: string, now = new Date()) {
  const diff = Math.round((now.getTime() - new Date(iso).getTime()) / 86_400_000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${diff} days ago`;
}

export function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

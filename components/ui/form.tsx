import * as React from "react";
import { cn } from "@/lib/utils";

const field =
  "focus-ring w-full rounded-2xl border border-line bg-glass-strong px-4 py-3 text-sm text-ink placeholder:text-ink-muted/80 transition";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(field, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(field, "min-h-28 resize-y", className)} {...props} />;
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-semibold text-ink", className)} {...props} />;
}

export function FieldError({ children, id }: { children?: React.ReactNode; id?: string }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm font-medium text-coral-ink">
      {children}
    </p>
  );
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(field, "h-11 appearance-none pr-8", className)} {...props} />;
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  className,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "focus-ring relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors",
        checked ? "bg-accent" : "bg-[#c9c5dc]",
        className,
      )}
    >
      <span
        className={cn(
          "inline-block size-5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}

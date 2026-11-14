import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold [&_svg]:size-3.5", {
  variants: {
    variant: {
      default: "bg-accent-soft text-ink",
      outline: "border border-line text-ink-muted",
      good: "bg-[#dcf3e4] text-[#14532d]",
      warn: "bg-[#fdecc8] text-[#7a4a05]",
      review: "bg-[#ffe1dc] text-[#8a2c1b]",
      muted: "bg-[#ebe9f3] text-[#4b4766]",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

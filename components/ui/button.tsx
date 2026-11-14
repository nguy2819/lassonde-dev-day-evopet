import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "focus-ring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-ink shadow-[0_8px_24px_-8px_var(--accent)] hover:brightness-110 active:scale-[0.98]",
        gradient:
          "bg-[linear-gradient(100deg,#6447c9,#3e7fd0_55%,#c8566c)] text-white shadow-[0_10px_30px_-10px_rgba(100,71,201,0.7)] hover:brightness-110 active:scale-[0.98]",
        glass: "glass text-ink hover:bg-glass-strong",
        outline: "border border-line bg-transparent text-ink hover:bg-accent-soft",
        ghost: "text-ink hover:bg-accent-soft",
        soft: "bg-accent-soft text-ink hover:brightness-95",
        danger: "bg-[#b42318] text-white hover:bg-[#9a1d14]",
        coral: "bg-coral text-[#3d140b] hover:brightness-105",
      },
      size: {
        sm: "h-9 px-4",
        default: "h-11 px-5",
        lg: "h-13 px-7 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { buttonVariants };

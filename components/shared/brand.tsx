import Image from "next/image";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export const DISCLAIMER_EN =
  "Not a substitute for professional medical advice. If you are in an emergency, contact your local emergency services.";

export function Logo({ className, href = "/", size = "md" }: { className?: string; href?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <Link href={href} className={cn("focus-ring inline-flex shrink-0 items-center rounded-xl", className)} aria-label="EvoPet home">
      <Image
        src="/logo.png"
        alt="EvoPet"
        width={667}
        height={192}
        priority
        className={cn("w-auto", size === "sm" ? "h-7" : size === "lg" ? "h-10 sm:h-12" : "h-8 sm:h-9")}
      />
    </Link>
  );
}

export function Disclaimer({ className }: { className?: string; compact?: boolean }) {
  return (
    <div role="note" className={cn("flex gap-3 rounded-2xl border border-line bg-glass p-4 text-sm text-ink-muted", className)}>
      <ShieldAlert className="mt-0.5 size-5 shrink-0 text-coral-ink" aria-hidden />
      <div>
        <p className="font-semibold text-ink">{DISCLAIMER_EN}</p>
      </div>
    </div>
  );
}

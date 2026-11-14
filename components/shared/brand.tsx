import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export const DISCLAIMER_VI =
  "Không thay thế tư vấn y tế chuyên nghiệp. Nếu bạn đang trong tình huống khẩn cấp, hãy liên hệ dịch vụ cấp cứu tại địa phương.";
export const DISCLAIMER_EN =
  "Not a substitute for professional medical advice. If you are in an emergency, contact your local emergency services.";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("focus-ring inline-flex items-center gap-2 rounded-full", className)} aria-label="EvoPet home">
      <span className="grid size-9 place-items-center rounded-2xl bg-[linear-gradient(135deg,#b9a8ff,#9fd8ff_60%,#ffc2d1)] shadow-[0_6px_18px_-6px_rgba(100,71,201,0.6)]">
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
          <path d="M12 4c4.4 0 8 3 8 7.2 0 4-3.6 7.3-8 7.3s-8-3.3-8-7.3C4 7 7.6 4 12 4Z" fill="#fff" />
          <path d="M9 11.5q1-1.2 2 0M13 11.5q1-1.2 2 0" stroke="#4b3aa8" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <path d="M10.5 14q1.5 1.3 3 0" stroke="#4b3aa8" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </svg>
      </span>
      <span className="text-lg font-extrabold tracking-tight text-ink">
        EvoPet<span className="ml-1 hidden font-medium text-ink-muted sm:inline">Recovery Journey</span>
      </span>
    </Link>
  );
}

export function Disclaimer({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div role="note" className={cn("flex gap-3 rounded-2xl border border-line bg-glass p-4 text-sm text-ink-muted", className)}>
      <ShieldAlert className="mt-0.5 size-5 shrink-0 text-coral-ink" aria-hidden />
      <div>
        <p className="font-semibold text-ink">{DISCLAIMER_VI}</p>
        {!compact && <p className="mt-1">{DISCLAIMER_EN}</p>}
      </div>
    </div>
  );
}

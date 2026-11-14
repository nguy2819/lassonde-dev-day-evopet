"use client";

import { useMemo, useRef, useState } from "react";
import type { DailyPoint } from "@/lib/types";
import { formatDate, pct } from "@/lib/utils";

// Validated categorical pair (CVD-safe, ≥3:1 on light surfaces).
const SERIES = [
  { key: "checkinRate" as const, label: "Check-in rate", color: "#6d5bd0" },
  { key: "completionRate" as const, label: "Plan completion", color: "#0e8fb8" },
];

const W = 720;
const H = 260;
const PAD = { l: 44, r: 116, t: 16, b: 32 };

export function TrendChart({ data, title }: { data: DailyPoint[]; title: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { x, y, paths } = useMemo(() => {
    const x = (i: number) => PAD.l + (i / Math.max(1, data.length - 1)) * (W - PAD.l - PAD.r);
    const y = (v: number) => PAD.t + (1 - v) * (H - PAD.t - PAD.b);
    const paths = SERIES.map((s) => data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(d[s.key]).toFixed(1)}`).join(" "));
    return { x, y, paths };
  }, [data]);

  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-ink-muted">No consented activity in this period yet.</p>;
  }

  function onMove(e: React.PointerEvent) {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  }

  const last = data[data.length - 1];
  const h = hover !== null ? data[hover] : null;

  return (
    <figure>
      <figcaption className="sr-only">{title}</figcaption>
      <div className="mb-3 flex flex-wrap gap-4 text-sm" aria-hidden>
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-2 text-ink-muted">
            <span className="h-0.5 w-5 rounded" style={{ background: s.color }} /> {s.label}
          </span>
        ))}
      </div>
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full touch-none"
          role="img"
          aria-label={`${title}. Latest: check-in ${pct(last.checkinRate)}, completion ${pct(last.completionRate)}.`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="currentColor" className="text-line" strokeWidth="1" />
              <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" className="fill-ink-muted text-[11px]">
                {t * 100}%
              </text>
            </g>
          ))}
          {data.map((d, i) =>
            i % 7 === 0 || i === data.length - 1 ? (
              <text key={d.date} x={x(i)} y={H - 8} textAnchor="middle" className="fill-ink-muted text-[11px]">
                {formatDate(d.date)}
              </text>
            ) : null,
          )}
          {SERIES.map((s, si) => (
            <path key={s.key} d={paths[si]} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {/* direct end labels */}
          {SERIES.map((s, si) => {
            const ly = y(last[s.key]) + (si === 0 && Math.abs(last.checkinRate - last.completionRate) < 0.08 ? -8 : si === 1 && Math.abs(last.checkinRate - last.completionRate) < 0.08 ? 10 : 4);
            return (
              <text key={s.key} x={W - PAD.r + 8} y={ly} className="fill-ink text-[11px] font-semibold">
                {s.label.split(" ")[0]} {pct(last[s.key])}
              </text>
            );
          })}
          {h && hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="currentColor" className="text-ink-muted" strokeDasharray="3 3" />
              {SERIES.map((s) => (
                <circle key={s.key} cx={x(hover)} cy={y(h[s.key])} r="5" fill={s.color} stroke="white" strokeWidth="2" />
              ))}
            </g>
          )}
        </svg>
        {h && hover !== null && (
          <div
            className="glass-strong pointer-events-none absolute top-2 rounded-xl px-3 py-2 text-xs"
            style={{ left: `${(x(hover) / W) * 100}%`, transform: hover > data.length / 2 ? "translateX(calc(-100% - 12px))" : "translateX(12px)" }}
            role="status"
          >
            <p className="font-bold text-ink">{formatDate(h.date, { weekday: "short", month: "short", day: "numeric" })}</p>
            {SERIES.map((s) => (
              <p key={s.key} className="flex items-center gap-2 text-ink-muted">
                <span className="size-2 rounded-full" style={{ background: s.color }} /> {s.label}: <span className="font-semibold text-ink">{pct(h[s.key])}</span>
              </p>
            ))}
          </div>
        )}
      </div>
      <details className="mt-3 text-sm">
        <summary className="focus-ring cursor-pointer rounded font-semibold text-ink-muted">View as table</summary>
        <div className="mt-2 max-h-64 overflow-auto rounded-xl border border-line">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-glass-strong">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Check-in rate</th>
                <th className="px-3 py-2">Plan completion</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.date} className="border-t border-line">
                  <td className="px-3 py-1.5">{formatDate(d.date)}</td>
                  <td className="px-3 py-1.5">{pct(d.checkinRate)}</td>
                  <td className="px-3 py-1.5">{pct(d.completionRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

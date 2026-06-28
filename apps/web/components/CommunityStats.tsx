"use client";

import { useEffect, useState } from "react";
import { fetchStats, type StatsRow } from "@/lib/supabase";

const BUCKETS = [1, 2, 3, 4, 5] as const;

export function CommunityStats({ puzzleDate }: { puzzleDate: string }) {
  const [stats, setStats] = useState<StatsRow | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetchStats(puzzleDate)
      .then((s) => {
        if (active) {
          setStats(s);
          setLoaded(true);
        }
      })
      .catch(() => active && setLoaded(true));
    return () => {
      active = false;
    };
  }, [puzzleDate]);

  if (!loaded || !stats || stats.plays === 0) return null;

  const pct = Math.round((stats.solves / stats.plays) * 100);
  const buckets = stats.guess_buckets ?? {};
  const counts = BUCKETS.map((n) => buckets[String(n)] ?? 0);
  const lost = buckets["6"] ?? 0;
  const max = Math.max(1, ...counts, lost);

  return (
    <div className="mt-5 border-t border-fundle-border pt-4 text-left">
      <p className="section-label mb-1">Community</p>
      <p className="mb-3 text-sm text-fundle-muted">
        Opgelost door{" "}
        <span className="font-semibold text-fundle-text">{stats.solves.toLocaleString("nl-NL")}</span>{" "}
        van {stats.plays.toLocaleString("nl-NL")} spelers ({pct}%)
      </p>
      <div className="space-y-1.5">
        {BUCKETS.map((n, i) => (
          <Bar key={n} label={`${n}`} count={counts[i]} max={max} />
        ))}
        {lost > 0 && <Bar label="X" count={lost} max={max} muted />}
      </div>
    </div>
  );
}

function Bar({
  label,
  count,
  max,
  muted = false,
}: {
  label: string;
  count: number;
  max: number;
  muted?: boolean;
}) {
  const width = Math.round((count / max) * 100);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-3 tabular-nums text-fundle-muted">{label}</span>
      <div className="flex-1">
        <div
          className={`flex h-5 min-w-[1.5rem] items-center justify-end rounded px-1.5 tabular-nums text-white ${
            muted ? "bg-fundle-muted" : "bg-emerald-500"
          }`}
          style={{ width: `${Math.max(width, count > 0 ? 12 : 6)}%` }}
        >
          {count > 0 ? count.toLocaleString("nl-NL") : ""}
        </div>
      </div>
    </div>
  );
}

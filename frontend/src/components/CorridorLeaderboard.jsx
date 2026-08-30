import { corridorGroups, riskColor } from "../utils/format";

/**
 * Ranked corridor leaderboard. Clicking a corridor selects its riskiest
 * hotspot and fly-to — the "rank → act" move made visible.
 */
export default function CorridorLeaderboard({ features = [], onSelectHotspot }) {
  const corridors = corridorGroups(features);
  if (!corridors.length) return null;

  return (
    <div className="surface grain rounded-panel p-4">
      <div className="mb-3.5 flex items-baseline justify-between">
        <h2 className="font-display text-display-sm text-bone">Corridor leaderboard</h2>
        <span className="font-mono text-[10px] text-bone-faint">ranked by max risk</span>
      </div>

      <ul className="space-y-2.5">
        {corridors.map((c, i) => {
          const color = riskColor(c.maxRisk);
          return (
            <li key={c.highway}>
              <button
                onClick={() => onSelectHotspot?.(c.highway)}
                className="group w-full text-left"
                aria-label={`Show ${c.highway} — ${c.maxRisk} max risk, ${c.hotspots} hotspots`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 shrink-0 font-mono text-[11px] text-bone-faint">{String(i + 1).padStart(2, "0")}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-xs font-medium text-bone transition-colors group-hover:text-amber">
                        {c.highway}
                      </span>
                      <span className="shrink-0 font-mono text-[11px]" style={{ color }}>
                        max {c.maxRisk}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-canopy-600">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${c.maxRisk}%`, backgroundColor: color }}
                      />
                    </div>
                    <div className="mt-1.5 flex gap-3 font-mono text-[9.5px] text-bone-faint">
                      <span>{c.hotspots} hotspot{c.hotspots === 1 ? "" : "s"}</span>
                      <span>avg {c.avgRisk}</span>
                      {c.endangered > 0 && <span className="text-ember">● {c.endangered} endangered</span>}
                    </div>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

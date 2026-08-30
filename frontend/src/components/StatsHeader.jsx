import { useMemo } from "react";
import { deriveStats } from "../utils/format";
import { Shield } from "./icons";

const INTERVENTION_COLORS = {
  wildlife_crossing: "bg-leaf",
  fencing: "bg-amber",
  signage: "bg-bone",
  speed_limit: "bg-ember",
  none: "bg-canopy-400",
};

const INTERVENTION_SHORT = {
  wildlife_crossing: "crossings",
  fencing: "fencing",
  signage: "signage",
  speed_limit: "speed limits",
  none: "none",
};

/**
 * Compact stat strip on the map page — live numbers derived from the
 * currently filtered features, so the UI never contradicts the data.
 * Now includes an intervention breakdown bar.
 */
export default function StatsHeader({ features = [], fallback = null }) {
  const stats = useMemo(() => deriveStats(features || []), [features]);

  const items = [
    { label: "Hotspots", value: stats.hotspot_count },
    { label: "High-risk ≥ 70", value: stats.highRisk, color: "text-ember" },
    { label: "Endangered", value: stats.endangered, color: "text-amber" },
    { label: "Obs", value: stats.totalObs },
    { label: "Avg conf", value: `${stats.avgConfidence}%` },
  ];

  const interventionEntries = Object.entries(stats.interventions || {}).sort(
    (a, b) => b[1] - a[1]
  );

  return (
    <div className="surface grain rounded-panel px-4 py-3">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 font-display text-[13px] font-semibold text-bone">
          <Shield size={13} className="text-amber" />
          Network read-out
        </h2>
        <span className="font-mono text-[9.5px] uppercase tracking-widest text-bone-faint">
          {features?.length ?? 0} clusters
        </span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {items.map((it) => (
          <div key={it.label} className="min-w-0">
            <div className={`data-value font-display text-data-lg leading-none ${it.color || "text-bone"}`}>
              {it.value}
            </div>
            <div className="mt-1.5 truncate text-[9.5px] uppercase tracking-wider text-bone-faint">{it.label}</div>
          </div>
        ))}
      </div>

      {/* Intervention breakdown bar */}
      {interventionEntries.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {interventionEntries.map(([type, count]) => (
            <span
              key={type}
              className="inline-flex items-center gap-1 rounded-full border border-rule bg-canopy-600 px-2 py-0.5 text-[10px] text-bone-dim"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${INTERVENTION_COLORS[type] || "bg-canopy-400"}`} />
              {count} {INTERVENTION_SHORT[type] || type}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

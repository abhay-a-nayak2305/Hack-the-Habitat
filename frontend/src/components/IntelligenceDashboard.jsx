import { useEffect, useState } from "react";
import { useInView } from "../hooks/useInView";
import { Alert, Info } from "./icons";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

/* ── Fallback data (mirrors demo_stats.json shape) ─────────────────── */
const FALLBACK_DASHBOARD = {
  model_metrics: { auc: 0.8429, calibration_error: 0.2006, top5_capture: 0.2, total_segments: 45, positive_segments: 18, model_version: "v0.3" },
  intervention_breakdown: { wildlife_crossing: 5, fencing: 3, signage: 2, speed_limit: 4, none: 1 },
  corridor_stats: [
    { highway: "NH-766", hotspots: 22, avg_risk: 68, max_risk: 100, endangered: 4, total_observations: 80 },
  ],
  risk_distribution: { high: 10, medium: 12, low: 6 },
  species_summary: { Mammalia: 45, Aves: 30, Reptilia: 10, Amphibia: 7 },
};

const FALLBACK_HONESTY = {
  threshold: 150,
  collected: 92,
  progress_pct: 61,
  status: "below_threshold",
  consequence: "Predictive hotspot model demoted to secondary, low-confidence layer.",
  what_above_threshold:
    "Once we reach 150 records, the predictive model will be promoted to a primary overlay with full confidence ratings.",
};

/* ── Helpers ───────────────────────────────────────────────────────── */
const INTERVENTION_META = {
  wildlife_crossing: { label: "Wildlife crossings", color: "bg-leaf" },
  fencing: { label: "Fencing", color: "bg-amber" },
  signage: { label: "Signage", color: "bg-bone" },
  speed_limit: { label: "Speed limits", color: "bg-ember" },
  none: { label: "None", color: "bg-canopy-400" },
};

const SPECIES_COLORS = ["bg-leaf", "bg-amber", "bg-ember", "bg-bone/60", "bg-canopy-400"];

function AnimatedNumber({ value, decimals = 0, suffix = "", inView }) {
  if (!inView) return <span className="opacity-0">{value}{suffix}</span>;
  return (
    <span className="inline-block animate-data-count tabular-nums">
      {typeof value === "number" ? (decimals ? value.toFixed(decimals) : value) : value}
      {suffix}
    </span>
  );
}

/* ── Sub-components ────────────────────────────────────────────────── */

function BarChart({ items, maxValue, inView }) {
  return (
    <div className="space-y-2.5">
      {items.map(([label, value], i) => {
        const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
        return (
          <div key={label}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-bone-dim">{label}</span>
              <span className="font-mono text-[11px] text-bone">
                <AnimatedNumber value={value} inView={inView} />
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-canopy-600">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${SPECIES_COLORS[i % SPECIES_COLORS.length]}`}
                style={{
                  width: inView ? `${pct}%` : "0%",
                  transitionDelay: `${i * 80}ms`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ModelPerformance({ metrics, inView }) {
  const aucPct = Math.round((metrics?.auc || 0) * 100);
  return (
    <div className="border-b border-rule pb-5">
      <h3 className="field-label">Model Performance</h3>
      {/* AUC visual — larger ring for hero metric */}
      <div className="mt-4 flex items-center gap-5">
        <div className="relative h-[88px] w-[88px] shrink-0">
          <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--rule)" strokeWidth="2.5" />
            <circle
              cx="18" cy="18" r="15.5" fill="none"
              stroke="var(--leaf)" strokeWidth="2.5" strokeLinecap="round"
              strokeDasharray={`${aucPct} ${100 - aucPct}`}
              style={{
                transition: inView ? "stroke-dasharray 0.9s cubic-bezier(0.2,0.7,0.2,1)" : "none",
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-[15px] font-bold leading-none text-bone">
              <AnimatedNumber value={aucPct} inView={inView} suffix="%" />
            </span>
          </div>
        </div>
        <div>
          <div className="text-[14px] font-semibold text-bone">AUC-ROC</div>
          <div className="mt-1 text-xs text-bone-dim">Binary classification accuracy</div>
        </div>
      </div>
      {/* Supporting metrics */}
      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-bone-dim">Calibration error</span>
          <span className="font-mono text-[11px] text-amber">
            <AnimatedNumber value={metrics?.calibration_error} decimals={4} inView={inView} />
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-bone-dim">Top-5% capture</span>
          <span className="font-mono text-[11px] text-leaf">
            <AnimatedNumber value={Math.round((metrics?.top5_capture || 0) * 100)} inView={inView} suffix="%" />
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-bone-dim">Segments trained</span>
          <span className="font-mono text-[11px] text-bone">
            <AnimatedNumber value={metrics?.positive_segments || 0} inView={inView} />
            <span className="text-bone-faint"> / {metrics?.total_segments || 0}</span>
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-rule pt-3">
          <span className="text-xs text-bone-dim">Model version</span>
          <span className="rounded-md border border-leaf/30 bg-leaf-muted px-2 py-0.5 font-mono text-[10px] text-leaf-bright">
            {metrics?.model_version || "v0.3"}
          </span>
        </div>
      </div>
    </div>
  );
}

function HonestyLadder({ data, inView }) {
  if (!data) return null;
  const isAbove = data.status === "above_threshold";
  return (
    <div className="border-b border-rule pb-5">
      <div className="flex items-center justify-between">
        <h3 className="field-label">Honesty Ladder</h3>
        {isAbove ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-leaf/30 bg-leaf-muted px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-leaf-bright">
            <span className="h-1 w-1 rounded-full bg-leaf-bright" /> Promoted
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber/30 bg-amber-muted px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-amber">
            <span className="h-1 w-1 rounded-full bg-amber" /> Collecting
          </span>
        )}
      </div>
      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex items-end justify-between font-mono text-[11px]">
          <span className="text-bone">
            <AnimatedNumber value={data.collected} inView={inView} />{" "}
            <span className="text-bone-faint">/ {data.threshold}</span>
          </span>
          <span className="text-bone-faint">
            <AnimatedNumber value={data.progress_pct} inView={inView} suffix="%" />
          </span>
        </div>
        <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-canopy-600">
          <div
            className="h-full rounded-full bg-amber transition-all duration-900 ease-out"
            style={{ width: inView ? `${data.progress_pct}%` : "0%" }}
          />
          {/* Threshold marker at 100% */}
          <div
            className="absolute top-0 h-full w-px bg-bone/30"
            style={{ left: "100%" }}
          />
        </div>
      </div>
      {/* Narrative */}
      <div className="mt-4 rounded-lg bg-canopy-700/50 px-3.5 py-3">
        <div className="flex items-start gap-2">
          <Info size={13} className="mt-0.5 shrink-0 text-amber" />
          <p className="text-[11.5px] leading-relaxed text-bone-dim">
            {isAbove ? data.what_above_threshold : data.consequence}
          </p>
        </div>
      </div>
    </div>
  );
}

function InterventionBreakdown({ data, inView }) {
  if (!data) return null;
  const entries = Object.entries(data);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  const maxVal = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <div className="border-b border-rule pb-5">
      <div className="flex items-center justify-between">
        <h3 className="field-label">Intervention Breakdown</h3>
        <span className="font-mono text-[10px] text-bone-faint">{total} total</span>
      </div>
      <div className="mt-4 space-y-3">
        {entries.map(([type, count], i) => {
          const meta = INTERVENTION_META[type] || { label: type, color: "bg-canopy-400" };
          const pct = (count / maxVal) * 100;
          return (
            <div key={type}>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${meta.color}`} />
                  <span className="text-bone-dim">{meta.label}</span>
                </div>
                <span className="font-mono text-[11px] text-bone">
                  <AnimatedNumber value={count} inView={inView} />
                  <span className="ml-1 text-bone-faint">({Math.round((count / total) * 100)}%)</span>
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-canopy-600">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${meta.color}`}
                  style={{
                    width: inView ? `${pct}%` : "0%",
                    transitionDelay: `${i * 80}ms`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RiskDistribution({ data, inView }) {
  if (!data) return null;
  const total = (data.high || 0) + (data.medium || 0) + (data.low || 0);
  const tiers = [
    { label: "High", value: data.high || 0, color: "text-ember", bg: "bg-ember" },
    { label: "Medium", value: data.medium || 0, color: "text-amber", bg: "bg-amber" },
    { label: "Low", value: data.low || 0, color: "text-leaf", bg: "bg-leaf" },
  ];

  return (
    <div className="border-b border-rule pb-5">
      <h3 className="field-label">Risk Distribution</h3>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {tiers.map((t, i) => (
          <div key={t.label} className="rounded-lg bg-canopy-700/50 p-3 text-center">
            <div className={`font-display text-data-lg leading-none ${t.color}`}>
              <AnimatedNumber value={t.value} inView={inView} />
            </div>
            <div className="mt-1.5 text-[10px] uppercase tracking-wider text-bone-faint">{t.label}</div>
            <div className="mt-2 mx-auto h-1 w-8 overflow-hidden rounded-full bg-canopy-600">
              <div
                className={`h-full rounded-full ${t.bg} transition-all duration-700 ease-out`}
                style={{
                  width: inView ? `${total > 0 ? (t.value / total) * 100 : 0}%` : "0%",
                  transitionDelay: `${i * 100}ms`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SpeciesSummary({ data, inView }) {
  if (!data) return null;
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const maxVal = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <div>
      <h3 className="field-label">Species Summary</h3>
      <div className="mt-4">
        <BarChart items={entries} maxValue={maxVal} inView={inView} />
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────────────── */

export default function IntelligenceDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [honesty, setHonesty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ref, inView] = useInView({ threshold: 0.1 });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetch(`${API_BASE}/stats/dashboard`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .catch(() => FALLBACK_DASHBOARD),
      fetch(`${API_BASE}/stats/honesty-ladder`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .catch(() => FALLBACK_HONESTY),
    ])
      .then(([d, h]) => {
        if (!cancelled) {
          setDashboard(d);
          setHonesty(h);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDashboard(FALLBACK_DASHBOARD);
          setHonesty(FALLBACK_HONESTY);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

  return (
    <section
      id="zone-dashboard"
      ref={ref}
      className="relative py-24 px-6"
      style={{
        backgroundColor: "var(--canopy)",
      }}
    >
      <div className="mx-auto max-w-5xl">
        {/* Section header */}
        <div className={`transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <div className="inline-flex items-center gap-2 rounded-full border border-leaf/20 bg-leaf/[0.06] px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-leaf animate-pulse-glow" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-leaf/80">
              Intelligence layer
            </span>
          </div>

          <h2 className="mt-6 font-display text-display-lg text-bone">
            The{" "}
            <span className="font-serif italic text-leaf">Intelligence</span>
          </h2>

          <p className="mt-4 max-w-2xl text-base leading-relaxed text-bone-dim">
            A transparency-first look at how SafePassage scores risk — model
            metrics, intervention allocation, and the honesty ladder that keeps
            us honest about data coverage.
          </p>
        </div>

        {loading ? (
          /* Loading skeleton */
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="surface grain rounded-panel p-5 animate-pulse">
                <div className="h-3 w-24 rounded bg-canopy-600" />
                <div className="mt-4 space-y-3">
                  <div className="h-2 w-full rounded bg-canopy-600" />
                  <div className="h-2 w-3/4 rounded bg-canopy-600" />
                  <div className="h-2 w-1/2 rounded bg-canopy-600" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Single container dashboard */
          <div className="mt-10">
            <div className="surface grain rounded-panel p-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Left column — Honesty Ladder pinned to the bottom left,
                    aligned with the bottom of the right column */}
                <div className="flex h-full flex-col">
                  <div className={`transition-all duration-500 delay-100 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                    <ModelPerformance metrics={dashboard?.model_metrics} inView={inView} />
                  </div>
                  <div className={`mt-auto pt-12 transition-all duration-500 delay-200 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                    <HonestyLadder data={honesty} inView={inView} />
                  </div>
                </div>

                {/* Right column */}
                <div className="space-y-6">
                  <div className={`transition-all duration-500 delay-150 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                    <InterventionBreakdown data={dashboard?.intervention_breakdown} inView={inView} />
                  </div>
                  <div className={`transition-all duration-500 delay-250 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                    <RiskDistribution data={dashboard?.risk_distribution} inView={inView} />
                  </div>
                  <div className={`transition-all duration-500 delay-300 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                    <SpeciesSummary data={dashboard?.species_summary} inView={inView} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transparency note */}
        <div className={`mt-8 flex items-start gap-2.5 rounded-lg bg-canopy-700/30 px-4 py-3 transition-all duration-500 delay-500 ${inView ? "opacity-100" : "opacity-0"}`}>
          <Alert size={13} className="mt-0.5 shrink-0 text-amber" />
          <p className="text-[11.5px] leading-relaxed text-bone-faint">
            All metrics are derived from {dashboard?.model_metrics?.total_segments || 45} road segments
            across India's national highways. Model is version {dashboard?.model_metrics?.model_version || "v0.3"} — accuracy
            improves as citizen-science observations accumulate.
          </p>
        </div>
      </div>
    </section>
  );
}

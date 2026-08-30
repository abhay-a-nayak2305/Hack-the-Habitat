import { useStats } from "../hooks/useSafePassageData";
import { Book } from "../components/icons";
import { PageLoadingSkeleton } from "../components/LoadingSkeleton";

const STEPS = [
  {
    name: "Ingest",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
        <path d="M7 10l5 5 5-5" />
        <path d="M12 15V3" />
      </svg>
    ),
    body: "iNaturalist structured field-query observations are joined to OpenStreetMap road geometry plus OSM forest and water layers pulled via Overpass. Every record keeps its provenance — source, species, coordinates, and the observation date that seeds the seasonal curve.",
  },
  {
    name: "Model",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 3v18" />
      </svg>
    ),
    body: "A gradient-boosted classifier, wrapped in isotonic calibration, scores every segment 0–100 on leakage-safe road-attribute features: road class, forest share of the 500 m corridor buffer, distance to water, and neighbouring observation pressure — the segment's own records are never used as features.",
  },
  {
    name: "Rank",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M12 20V10" />
        <path d="M18 20V4" />
        <path d="M6 20v-4" />
      </svg>
    ),
    body: "Segments and hotspots sort by risk score. Clicking one opens a dossier with the seasonal collision curve, the species mix, and a concrete intervention from the documented rule table.",
  },
  {
    name: "Act",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M12 3l8 3.2V12c0 4.8-3.4 8.2-8 9-4.6-.8-8-4.2-8-9V6.2L12 3z" />
      </svg>
    ),
    body: "Every recommendation cites the evidence corridor — Bandipur/NH-766, Pune–Bengaluru/NH-48, Assam's elephant corridors — so a forest department or NHAI officer has a specific, fundable, physical thing to build.",
  },
];

const HONESTY = { threshold: 150, fallback: 92 };

export default function MethodologyPage() {
  const stats = useStats();

  if (stats === undefined) {
    return <PageLoadingSkeleton />;
  }

  const collected = stats?.honesty_ladder?.structured_records_collected ?? HONESTY.fallback;
  const pctCollected = Math.min(100, Math.round((collected / HONESTY.threshold) * 100));
  const below = collected < HONESTY.threshold;

  return (
    <div
      className="py-24 px-6"
      style={{
        backgroundColor: "var(--canopy)",
      }}
    >
      <div className="mx-auto max-w-3xl px-6 py-14 sm:py-16">
        {/* Header */}
        <div className="animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-leaf/20 bg-leaf/[0.06] px-3 py-1">
            <Book size={11} className="text-leaf" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-leaf/80">The method behind the map</span>
          </div>
          <h1 className="mt-6 font-display text-display-lg text-bone">
            Methodology
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-bone-dim">
            How SafePassage turns scattered roadkill reports into a ranked, fundable
            intervention list — and where the data runs thin.
          </p>
        </div>

        {/* The honesty ladder */}
        <section className="surface grain mt-10 rounded-panel p-6 animate-fade-up" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-amber/15 text-amber">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 3l8 3.2V12c0 4.8-3.4 8.2-8 9-4.6-.8-8-4.2-8-9V6.2L12 3z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </span>
            <h2 className="font-display text-display-sm text-bone">The honesty ladder</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-bone-dim">
            Before letting a predictive model become the headline feature, we set a hard bar:
            <span className="mx-1 font-semibold text-bone">{HONESTY.threshold} structured records nationwide.</span>
            "Structured" means pulled via iNaturalist's structured observation-field query — not free-text
            search. On Day 1 we collected {collected}.
          </p>

          <div className="mt-5">
            <div className="flex items-baseline justify-between font-mono text-[11px] text-bone-dim">
              <span>Honesty meter</span>
              <span className={below ? "text-amber" : "text-leaf-bright"}>
                {collected} / {HONESTY.threshold} records
              </span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-canopy-600">
              <div
                className={`h-full rounded-full transition-all duration-700 ${below ? "bg-amber" : "bg-leaf"}`}
                style={{ width: `${pctCollected}%` }}
              />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-bone-dim">
              {below ? (
                <>
                  <span className="font-semibold text-amber">Below the line.</span> The predictive model is
                  demoted to a secondary, clearly-labelled, low-confidence overlay. The descriptive evidence
                  layer — citable collision corridors — stays the headline. This isn't a hedge; it's the
                  product decision the data forced.
                </>
              ) : (
                <>
                  <span className="font-semibold text-leaf-bright">At or above the line.</span> The predictive
                  layer may be promoted once validated on held-out spatial splits.
                </>
              )}
            </p>
          </div>
        </section>

        {/* Headline numbers */}
        <section className="mt-8 animate-fade-up" style={{ animationDelay: "160ms" }}>
          <h2 className="font-display text-display-sm text-bone">Headline numbers</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Hotspots mapped" value={stats?.hotspot_count ?? "—"} color="leaf" />
            <Stat label="Highway segments" value={stats?.segment_count ?? "—"} color="amber" />
            <Stat label="Endangered flagged" value={stats?.endangered_flagged_hotspots ?? "—"} color="ember" />
            <Stat label="High risk (≥ 70)" value={stats?.high_risk_hotspots_ge_70 ?? "—"} color="ember" />
            <Stat label="Avg model confidence" value={stats ? `${Math.round(stats.average_model_confidence * 100)}%` : "—"} color="amber" />
            <Stat label="Model version" mono value={stats?.model_version ?? "—"} />
          </div>
        </section>

        {/* The four moves */}
        <section className="mt-12 animate-fade-up" style={{ animationDelay: "220ms" }}>
          <h2 className="font-display text-display-sm text-bone">The four moves</h2>

          {/* Visual pipeline diagram */}
          <div className="mt-6 hidden sm:flex items-center justify-center gap-0">
            {STEPS.map((s, i) => (
              <div key={s.name} className="flex items-center">
                <div className="flex flex-col items-center">
                  <span className="grid h-12 w-12 place-items-center rounded-xl border border-amber/25 bg-amber/[0.08] text-amber transition-colors group-hover:border-amber/40 group-hover:bg-amber/[0.12]">
                    {s.icon}
                  </span>
                  <span className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-bone-faint">{s.name}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="mx-2 flex items-center">
                    <div className="h-px w-12 bg-gradient-to-r from-amber/40 to-amber/20" />
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" className="text-amber/40 shrink-0">
                      <path d="M0 4h10M8 1l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Detailed steps (card list) */}
          <div className="mt-6 space-y-3">
            {STEPS.map((s, i) => (
              <div key={s.name} className="surface grain group flex gap-4 rounded-panel p-5 transition-all duration-300 hover:border-amber/20 hover:shadow-glow-amber">
                <div className="flex flex-col items-center">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber/25 bg-amber/[0.08] text-amber transition-colors group-hover:border-amber/40 group-hover:bg-amber/[0.12]">
                    {s.icon}
                  </span>
                  {i < STEPS.length - 1 && <span className="mt-1 h-full w-px bg-amber/20" />}
                </div>
                <div>
                  <h3 className="font-display text-[15px] font-semibold text-bone">
                    <span className="mr-2 font-mono text-[11px] text-amber/60">{String(i + 1).padStart(2, "0")}</span>
                    {s.name}
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-bone-dim">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Evidence over prediction */}
        <section className="surface mt-10 rounded-panel border-ember/20 p-6 animate-fade-up" style={{ animationDelay: "280ms" }}>
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-ember/15 text-ember">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 3l8 3.2V12c0 4.8-3.4 8.2-8 9-4.6-.8-8-4.2-8-9V6.2L12 3z" />
              </svg>
            </span>
            <h2 className="font-display text-display-sm text-bone">
              Evidence <span className="font-serif text-amber">over prediction</span>
            </h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-bone-dim">
            Because the model is low-confidence, the descriptive evidence layer — citable collision
            corridors sourced from literature, news, and structured observations — is the headline
            feature judges and forest departments should trust first. The model is shown as a secondary,
            clearly-labelled overlay, never as a confident prediction across the 146,000 km it hasn't seen.
          </p>
        </section>

      </div>
    </div>
  );
}

function Stat({ label, value, mono, color }) {
  const colorMap = {
    leaf: "border-leaf/20",
    amber: "border-amber/20",
    ember: "border-ember/20",
  };
  return (
    <div className={`surface rounded-panel p-4 ${colorMap[color] || ""}`}>
      <div className="field-label">{label}</div>
      <div className={`data-value mt-1.5 ${mono ? "font-mono text-data-lg" : "font-display text-data-lg"} text-bone`}>{value}</div>
    </div>
  );
}

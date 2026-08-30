import { useState } from "react";
import RiskGauge from "./RiskGauge";
import SeasonalityCalendar from "./SeasonalityCalendar";
import { Check, Clock, Copy, External, MapPin, Shield, X } from "./icons";
import {
  INTERVENTION_BLURBS,
  INTERVENTION_LABELS,
  formatCoords,
  riskColor,
  riskLabel,
  speciesMixToList,
} from "../utils/format";

export default function DossierPanel({ hotspot, onClose, hideClose = false }) {
  const [copied, setCopied] = useState(false);
  if (!hotspot) return null;
  const p = hotspot.properties;
  const color = riskColor(p.risk_score);
  const confidence = Math.round((p.confidence ?? 0) * 100);
  const [lon, lat] = hotspot.geometry.coordinates || [0, 0];
  const mix = speciesMixToList(p.species_mix);
  const totalMix = mix.reduce((a, [, c]) => a + c, 0);

  const copyDetails = async () => {
    const text = [
      `SafePassage dossier — ${p.hotspot_id}`,
      `Highway: ${p.nearest_highway}`,
      `Risk: ${p.risk_score}/100 (${riskLabel(p.risk_score)})`,
      `Confidence: ${confidence}% · model ${p.model_version}`,
      `Observations: ${p.observation_count}`,
      `Intervention: ${INTERVENTION_LABELS[p.intervention] || p.intervention}`,
      `Coords: ${formatCoords(lon, lat)}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="surface-overlay grain flex flex-col overflow-hidden rounded-panel-lg animate-slide-in-right">
      {/* accent line */}
      <div className="h-[3px] w-full bg-leaf opacity-60" />

      <div className="scroll-slim flex-1 overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-4">
          <div>
            <div className="font-mono text-[10px] tracking-[0.16em] text-bone-faint">{p.hotspot_id}</div>
            <h2 className="mt-1 flex flex-wrap items-center gap-2 font-display text-display-sm text-bone">
              {p.nearest_highway}
              {p.endangered_flag && (
                <span className="inline-flex items-center gap-1 rounded-full border border-ember/40 bg-ember-muted px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-widest text-ember">
                  <Shield size={11} /> Endangered
                </span>
              )}
            </h2>
          </div>
          {!hideClose && (
            <button onClick={onClose} aria-label="Close dossier" className="rounded-lg p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-bone-faint transition-colors hover:bg-canopy-600 hover:text-bone">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Risk readout + intervention */}
        <div className="mt-3 grid grid-cols-1 gap-4 px-5 sm:grid-cols-[auto_1fr] sm:items-center">
          <RiskGauge score={Number(p.risk_score) || 0} size={132} />
          <div className="min-w-0">
            <div className="field-label">Recommended action</div>
            <div className="mt-1.5 flex items-center gap-2 font-display text-[15px] font-semibold text-bone">
              <span className="grid h-6 w-6 place-items-center rounded-md border border-rule bg-canopy-600" style={{ color }}>
                <Shield size={13} />
              </span>
              {INTERVENTION_LABELS[p.intervention] || p.intervention}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-bone-dim">
              {INTERVENTION_BLURBS[p.intervention] || ""}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10.5px] text-bone-faint">
              <span className="inline-flex items-center gap-1"><MapPin size={11} /> {formatCoords(lon, lat)}</span>
              <span className="inline-flex items-center gap-1"><Clock size={11} /> conf {confidence}%</span>
              <span>model {p.model_version}</span>
            </div>
          </div>
        </div>

        {/* Species mix */}
        <section className="mt-5 border-t border-rule px-5 py-4">
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="field-label">Species mix</h3>
            <span className="font-mono text-[10px] text-bone-faint">{p.observation_count ?? 0} observation{(p.observation_count ?? 0) === 1 ? "" : "s"}</span>
          </div>
          {mix.length ? (
            <ul className="space-y-2.5">
              {mix.map(([name, count]) => (
                <li key={name}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-bone">{name}</span>
                    <span className="font-mono text-[11px] text-bone-dim">
                      {count}
                      <span className="ml-1 text-bone-faint">{Math.round((count / totalMix) * 100)}%</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-canopy-600">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${(count / totalMix) * 100}%`, backgroundColor: color }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs italic text-bone-faint">No species records joined to this cluster.</p>
          )}
        </section>

        {/* Seasonality */}
        <section className="border-t border-rule px-5 py-4">
          <h3 className="mb-3 field-label">Seasonal collision curve</h3>
          <SeasonalityCalendar curve={p.season_curve} />
        </section>

        {/* Environmental context */}
        <section className="border-t border-rule px-5 py-4">
          <h3 className="mb-3 field-label">Environmental Context</h3>
          <div className="space-y-3">
            {/* Forest cover in 500m buffer */}
            <div>
              <div className="flex justify-between text-xs">
                <span className="text-bone-dim">Forest cover (500m buffer)</span>
                <span className="font-mono text-[11px] text-leaf">
                  {Math.round((p.forest_share || 0) * 100)}%
                </span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-canopy-600">
                <div
                  className="h-full rounded-full bg-leaf transition-all duration-700"
                  style={{ width: `${(p.forest_share || 0) * 100}%` }}
                />
              </div>
            </div>
            {/* Distance to water */}
            <div className="flex justify-between text-xs">
              <span className="text-bone-dim">Distance to water</span>
              <span className="font-mono text-[11px] text-bone">
                {p.water_distance_m ? `${Math.round(p.water_distance_m)}m` : "N/A"}
              </span>
            </div>
            {/* Road length */}
            <div className="flex justify-between text-xs">
              <span className="text-bone-dim">Segment length</span>
              <span className="font-mono text-[11px] text-bone">
                {p.road_length_km ? `${p.road_length_km.toFixed(1)} km` : "N/A"}
              </span>
            </div>
            {/* Neighbor density */}
            <div className="flex justify-between text-xs">
              <span className="text-bone-dim">Nearby observations (2km)</span>
              <span className="font-mono text-[11px] text-amber">
                {p.neighbor_density ?? "N/A"}
              </span>
            </div>
          </div>
        </section>

        {/* Evidence source */}
        <section className="border-t border-rule px-5 py-3">
          <a
            href={`https://www.inaturalist.org/observations?place_id=6737&taxon_id=47170&lat=${lat}&lng=${lon}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[11px] text-bone-faint hover:text-amber transition-colors"
          >
            <External size={11} />
            View raw observations on iNaturalist
          </a>
        </section>

        {/* Footer actions */}
        <div className="flex items-center gap-2 border-t border-rule px-5 py-3.5">
          <button onClick={copyDetails} className="btn-ghost flex-1 !py-2 text-xs">
            {copied ? <Check size={13} className="text-leaf-bright" /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy dossier"}
          </button>
          <a
            href={`https://www.inaturalist.org/observations?place_id=6737&taxon_id=47170&lat=${lat}&lng=${lon}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rule px-3 py-2 text-xs text-bone-dim transition-colors hover:border-amber/40 hover:text-bone"
          >
            <External size={13} />
            Evidence
          </a>
        </div>
      </div>
    </div>
  );
}

export const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* Risk ramp — the SafePassage signature (aligned to Tailwind palette) */
export const RISK_LOW = "#3D9B6F";
export const RISK_MID = "#E5A84B";
export const RISK_HIGH = "#E04D28";

export function riskColor(score) {
  if (score >= 70) return RISK_HIGH;
  if (score >= 40) return RISK_MID;
  return RISK_LOW;
}

export function riskLabel(score) {
  if (score >= 70) return "High risk";
  if (score >= 40) return "Medium risk";
  return "Low risk";
}

export const INTERVENTION_LABELS = {
  wildlife_crossing: "Wildlife crossing",
  fencing: "Fencing",
  signage: "Signage",
  speed_limit: "Seasonal speed limit",
  none: "No action recommended",
};

export const INTERVENTION_BLURBS = {
  wildlife_crossing:
    "A grade-separated crossing (viaduct or underpass) at this pinch point — the highest-cost, highest-impact option.",
  fencing:
    "Guiding fences funnel animals to a safe crossing point and keep them off the carriageway.",
  signage:
    "Reflective wildlife signage plus a reduced night speed limit — cheap, immediate, and easy to audit.",
  speed_limit:
    "A seasonally enforced speed limit during the peak collision months shown on the curve.",
  none:
    "Observation pressure is too thin here to justify spend — the honesty ladder says wait for more data.",
};

export function speciesMixToList(mix) {
  return Object.entries(mix || {}).sort((a, b) => b[1] - a[1]);
}

export function formatCoords(lon, lat) {
  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

export function riskTier(score) {
  if (score >= 70) return { label: "High", color: RISK_HIGH };
  if (score >= 40) return { label: "Medium", color: RISK_MID };
  return { label: "Low", color: RISK_LOW };
}

/**
 * Group hotspot features by highway corridor, sorted by descending max risk.
 * Powers the corridor leaderboard and the highway filter.
 */
export function corridorGroups(features = []) {
  const map = new Map();
  for (const f of features) {
    const p = f.properties || {};
    const highway = p.nearest_highway || "Unknown corridor";
    if (!map.has(highway)) {
      map.set(highway, { highway, scores: [], endangered: 0, hotspots: 0 });
    }
    const g = map.get(highway);
    g.scores.push(Number(p.risk_score) || 0);
    g.hotspots += 1;
    if (p.endangered_flag) g.endangered += 1;
  }
  return [...map.values()]
    .map((g) => ({
      highway: g.highway,
      hotspots: g.hotspots,
      endangered: g.endangered,
      avgRisk: Math.round(g.scores.reduce((a, b) => a + b, 0) / g.scores.length),
      maxRisk: Math.max(...g.scores),
    }))
    .sort((a, b) => b.maxRisk - a.maxRisk || b.hotspots - a.hotspots);
}

/**
 * Derive a stats summary from the loaded hotspot features, used as a live
 * fallback when the /api/stats/summary endpoint is unreachable.
 */
export function deriveStats(features = []) {
  const totalObs = features.reduce(
    (acc, f) => acc + (Number(f.properties?.observation_count) || 0), 0
  );
  const highRisk = features.filter((f) => (Number(f.properties?.risk_score) || 0) >= 70).length;
  const endangered = features.filter((f) => f.properties?.endangered_flag).length;
  const corridors = new Set(features.map((f) => f.properties?.nearest_highway)).size;
  const confidences = features.map((f) => Number(f.properties?.confidence) || 0);
  const avgConfidence = confidences.length
    ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100)
    : 0;
  const interventions = {};
  for (const f of features) {
    const k = f.properties?.intervention || "none";
    interventions[k] = (interventions[k] || 0) + 1;
  }
  return {
    hotspot_count: features.length,
    totalObs,
    highRisk,
    endangered,
    corridors,
    avgConfidence,
    interventions,
  };
}

/** Bound a number to 0-100. */
export function pct(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
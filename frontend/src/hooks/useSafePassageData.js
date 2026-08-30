import { useEffect, useState, useSyncExternalStore } from "react";

// Points at the FastAPI backend in dev (proxied via vite.config.js) and at
// the deployed API in prod. Falls back to committed fixtures so the map
// never shows a blank screen if the API is unreachable — the
// "fixture-first" rule from the collaboration doc, kept alive at runtime.
const API_BASE = import.meta.env.VITE_API_BASE || "/api";

async function fetchJson(path, fallbackPath) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`${res.status}`);
    return { data: await res.json(), fromFixture: false };
  } catch (err) {
    if (fallbackPath) {
      const res = await fetch(fallbackPath);
      if (!res.ok) throw err;
      return { data: await res.json(), fromFixture: true };
    }
    throw err;
  }
}

export function useHotspots(filters = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("loading");

  useEffect(() => {
    setLoading(true);
    let cancelled = false;
    const params = new URLSearchParams();
    if (filters.minScore != null) params.set("min_score", filters.minScore);
    if (filters.species) params.set("species", filters.species);
    if (filters.highway) params.set("highway", filters.highway);
    if (filters.endangeredOnly) params.set("endangered_only", "true");

    const path = `${API_BASE}/hotspots?${params.toString()}`;
    fetchJson(path, "/fixtures/hotspots.geojson")
      .then(({ data: json, fromFixture }) => {
        if (cancelled) return;
        setData(json);
        setSource(fromFixture ? "fixtures" : "api");
      })
      .catch(() => {
        if (cancelled) return;
        setData(null);
        setSource("error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters.minScore, filters.species, filters.highway, filters.endangeredOnly]);

  return { data, loading, source };
}

export function useSegments() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("loading");
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchJson(`${API_BASE}/segments`, "/fixtures/segments.geojson")
      .then(({ data: json, fromFixture }) => {
        if (!cancelled) {
          setData(json);
          setSource(fromFixture ? "fixtures" : "api");
        }
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return { data, loading, source };
}

/**
 * Hook for fetching stats summary.
 * Returns undefined while loading, null on error, or the stats object.
 * This allows pages to show loading skeletons during the initial fetch.
 */
export function useStats() {
  const [data, setData] = useState(undefined);
  useEffect(() => {
    let cancelled = false;
    fetchJson(`${API_BASE}/stats/summary`, "/fixtures/stats-summary.json")
      .then(({ data: json }) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return data;
}

export async function submitSighting(payload) {
  const res = await fetch(`${API_BASE}/sightings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to submit sighting");
  return res.json();
}

/* Media-query subscription (live tracks prefers-reduced-motion). */
function subscribeMedia(query, onChange) {
  const mql = window.matchMedia(query);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getMediaSnapshot(query) {
  return window.matchMedia(query).matches;
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (cb) => subscribeMedia("(prefers-reduced-motion: reduce)", cb),
    () => getMediaSnapshot("(prefers-reduced-motion: reduce)")
  );
}
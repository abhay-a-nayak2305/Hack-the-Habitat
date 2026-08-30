import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { RISK_HIGH, RISK_MID, RISK_LOW, riskLabel } from "../utils/format";
import { usePrefersReducedMotion } from "../hooks/useSafePassageData";
import { useTheme } from "../context/ThemeContext";

const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const LIGHT_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const FALLBACK_STYLE = "https://demotiles.maplibre.org/style.json";
const INDIA = { center: [79.5, 21.2], zoom: 4.4 };

/* ── Glow sprites: radial gradients rendered to canvas ── */
function hexToRgba(hex, alpha = 1) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function makeGlowSprite(color, size = 80) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const center = size / 2;
  const g = ctx.createRadialGradient(center, center, 2, center, center, center - 4);
  g.addColorStop(0, color);
  g.addColorStop(0.4, hexToRgba(color, 0.6));
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

/* ── Data-driven layer expressions ── */
const RISK_COLOR_EXPR = [
  "case",
  [">=", ["get", "risk_score"], 70], RISK_HIGH,
  [">=", ["get", "risk_score"], 40], RISK_MID,
  RISK_LOW,
];

const ICON_EXPR = [
  "case",
  [">=", ["get", "risk_score"], 70], "glow-ember",
  [">=", ["get", "risk_score"], 40], "glow-amber",
  "glow-leaf",
];

/* ── Hover popup ── */
function popupHtml(p) {
  const label = riskLabel(p.risk_score);
  const color = label.includes("High") ? RISK_HIGH : label.includes("Med") ? RISK_MID : RISK_LOW;
  const endangered = p.endangered_flag
    ? `<span style="display:inline-flex;align-items:center;gap:3px;color:${RISK_HIGH};font-weight:600;">
         <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 3l8 3.2V12c0 4.8-3.4 8.2-8 9-4.6-.8-8-4.2-8-9V6.2L12 3z"/></svg>
         ENDANGERED
       </span>`
    : "";

  return `
    <div style="min-width:220px;padding:14px 16px;font-family:'DM Sans',sans-serif;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <span style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.12em;color:var(--bone-faint);text-transform:uppercase;">${p.hotspot_id}</span>
        <span style="font-size:20px;font-weight:700;color:${color};letter-spacing:-0.02em;">${p.risk_score}<span style="font-size:12px;font-weight:500;opacity:0.6;">/100</span></span>
      </div>
      <div style="margin-top:6px;font-size:14px;font-weight:600;color:var(--bone);letter-spacing:-0.01em;">${p.nearest_highway || "Unknown corridor"}</div>
      <div style="margin-top:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:11px;color:var(--bone-dim);">
        <span style="display:inline-flex;align-items:center;gap:4px;">
          <span style="width:6px;height:6px;border-radius:50%;background:${color};"></span>
          ${label}
        </span>
        <span style="opacity:0.3;">·</span>
        <span>${p.observation_count ?? 0} obs</span>
        ${endangered ? `<span style="opacity:0.3;">·</span>${endangered}` : ""}
      </div>
    </div>
  `;
}

export default function Map({ hotspots, segments, selectedId, onSelectHotspot, layers = { hotspots: true, segments: true } }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const popupRef = useRef(null);
  const initializedRef = useRef(false);
  const reducedMotion = usePrefersReducedMotion();
  const { theme } = useTheme();
  const isLight = theme === "light";

  /* Latest data lives in a ref so it can be applied whenever the map
     finishes loading — even if the fetch resolves before the style does.
     Fixes: hotspot dots invisible until a filter was toggled. */
  const dataRef = useRef({ hotspots: null, segments: null });

  const onSelectRef = useRef(onSelectHotspot);
  useEffect(() => { onSelectRef.current = onSelectHotspot; }, [onSelectHotspot]);

  /* ── Initialize map once ── */
  useEffect(() => {
    if (mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: isLight ? LIGHT_STYLE : DARK_STYLE,
      center: INDIA.center,
      zoom: INDIA.zoom,
      attributionControl: true,
      fadeDuration: reducedMotion ? 0 : 300,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: false }), "top-right");
    try {
      map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: "metric" }), "bottom-left");
    } catch { /* optional */ }

    /* Fallback basemap on style error */
    map.on("styleerror", () => {
      if (!initializedRef.current) {
        initializedRef.current = true;
        map.setStyle(FALLBACK_STYLE);
      }
    });

    /* ── Setup function: add sprites, sources, layers, interactions ── */
    function setupMapLayers() {
      if (initializedRef.current) return;
      if (!map.isStyleLoaded()) return;
      /* Set flag immediately to prevent double-init from concurrent events */
      initializedRef.current = true;

      /* ── Glow sprites ── */
      [["glow-leaf", RISK_LOW], ["glow-amber", RISK_MID], ["glow-ember", RISK_HIGH]].forEach(([name, color]) => {
        try {
          if (!map.hasImage(name)) map.addImage(name, makeGlowSprite(color));
        } catch (e) {
          /* Sprite may already exist from a previous style load — safe to ignore */
        }
      });

      /* ── Sources ── */
      map.addSource("segments", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addSource("hotspots", { type: "geojson", data: { type: "FeatureCollection", features: [] } });

      /* ── Segment lines: risk-colored strokes ── */
      map.addLayer({
        id: "segments-line",
        type: "line",
        source: "segments",
        paint: {
          "line-color": RISK_COLOR_EXPR,
          "line-width": ["interpolate", ["linear"], ["get", "risk_score"], 0, 1.2, 50, 2.5, 100, 5],
          "line-opacity": ["case", [">=", ["get", "risk_score"], 70], 0.95, [">=", ["get", "risk_score"], 40], 0.8, 0.5],
          "line-blur": ["interpolate", ["linear"], ["get", "risk_score"], 70, 0, 100, 1.5],
        },
      });

      /* ── Hotspot glow halos ── */
      map.addLayer({
        id: "hotspots-glow",
        type: "symbol",
        source: "hotspots",
        layout: {
          "icon-image": ICON_EXPR,
          "icon-size": ["interpolate", ["linear"], ["get", "risk_score"], 0, 0.5, 50, 0.9, 100, 1.6],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
        paint: { "icon-opacity": 0.75 },
      });

      /* ── Hotspot core dots ── */
      map.addLayer({
        id: "hotspots-dot",
        type: "circle",
        source: "hotspots",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "risk_score"], 0, 3, 50, 5, 100, 8],
          "circle-color": RISK_COLOR_EXPR,
          "circle-stroke-color": isLight ? "rgba(255,255,255,0.9)" : "rgba(4,7,6,0.8)",
          "circle-stroke-width": 1.5,
          "circle-blur": ["interpolate", ["linear"], ["get", "risk_score"], 70, 0, 100, 0.3],
        },
      });

      /* ── Selection ring ── */
      map.addLayer({
        id: "hotspots-selected",
        type: "circle",
        source: "hotspots",
        filter: ["==", ["get", "hotspot_id"], selectedId || ""],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "risk_score"], 0, 10, 100, 16],
          "circle-color": "rgba(0,0,0,0)",
          "circle-stroke-color": isLight ? "#0F1713" : "#F0EDE4",
          "circle-stroke-width": 2,
          "circle-stroke-opacity": 0.9,
        },
      });

      /* ── Interactions ── */
      map.on("click", "hotspots-dot", (e) => {
        const feat = e.features?.[0];
        if (feat) onSelectRef.current?.(feat.properties.hotspot_id);
      });
      map.on("mouseenter", "hotspots-dot", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "hotspots-dot", () => { map.getCanvas().style.cursor = ""; });

      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: [0, -16],
        anchor: "bottom",
        maxWidth: "280px",
      });
      popupRef.current = popup;

      map.on("mouseenter", "hotspots-dot", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        popup.setLngLat(f.geometry.coordinates).setHTML(popupHtml(f.properties)).addTo(map);
      });
      map.on("mouseleave", "hotspots-dot", () => popup.remove());

      map.on("click", (e) => {
        const feats = map.queryRenderedFeatures(e.point, { layers: ["hotspots-dot", "hotspots-glow"] });
        if (!feats.length) onSelectRef.current?.(null);
      });

      /* ── Set initial data (from the ref, so data that arrived before
            the style loaded is not lost) ── */
      const { hotspots: currentHotspots, segments: currentSegments } = dataRef.current;
      if (currentHotspots) map.getSource("hotspots")?.setData(currentHotspots);
      if (currentSegments) map.getSource("segments")?.setData(currentSegments);
    }

    /* Try immediately; if style not yet loaded, poll and also listen for events */
    setupMapLayers();
    map.on("load", setupMapLayers);
    map.on("style.load", setupMapLayers);
    map.on("sourcedata", setupMapLayers);

    /* Poll as a fallback — covers edge cases where events don't fire */
    const pollId = setInterval(() => {
      if (initializedRef.current) { clearInterval(pollId); return; }
      setupMapLayers();
    }, 500);
    /* Stop polling after 15s regardless */
    setTimeout(() => clearInterval(pollId), 15000);

    return () => {
      clearInterval(pollId);
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
      initializedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Push data updates ── */
  useEffect(() => {
    dataRef.current = { hotspots, segments };
    const map = mapRef.current;
    if (!map || !initializedRef.current) return;
    const apply = () => {
      const { hotspots: h, segments: s } = dataRef.current;
      if (h && map.getSource("hotspots")) map.getSource("hotspots").setData(h);
      if (s && map.getSource("segments")) map.getSource("segments").setData(s);
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [hotspots, segments]);

  /* ── Layer visibility ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !initializedRef.current) return;
    const apply = () => {
      const set = (id, on) => {
        if (!map.getLayer(id)) return;
        map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
      };
      set("segments-line", layers.segments);
      set("hotspots-glow", layers.hotspots);
      set("hotspots-dot", layers.hotspots);
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [layers.hotspots, layers.segments]);

  /* ── Selection ring + fly-to ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !initializedRef.current) return;
    const apply = () => {
      if (map.getLayer("hotspots-selected")) {
        map.setFilter("hotspots-selected", ["==", ["get", "hotspot_id"], selectedId || ""]);
      }
      if (selectedId && hotspots) {
        const feat = hotspots.features?.find((f) => f.properties.hotspot_id === selectedId);
        if (feat) {
          const [lon, lat] = feat.geometry.coordinates;
          map.flyTo({ center: [lon, lat], zoom: Math.max(map.getZoom(), 8), duration: reducedMotion ? 0 : 1400, curve: 1.5 });
        }
      }
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [selectedId, hotspots, reducedMotion]);

  const recenter = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ ...INDIA, duration: reducedMotion ? 0 : 1400, curve: 1.5 });
  }, [reducedMotion]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Recenter control */}
      <button
        onClick={recenter}
        className="absolute right-11 top-18 z-10 hidden h-9 w-9 place-items-center rounded-xl border border-rule bg-surface/90 text-bone-dim backdrop-blur-xl transition-all duration-200 hover:border-rule-hover hover:text-bone hover:shadow-glow-amber sm:grid"
        aria-label="Re-centre map on India"
        title="Re-centre on India"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="7" />
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
        </svg>
      </button>

      {/* Risk legend — bottom center */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 sm:bottom-4 md:block" role="img" aria-label="Risk score legend: green (0) is low risk, amber (50) is medium risk, red (100) is high risk">
        <div className="flex items-center gap-3.5 rounded-full border border-rule bg-surface/80 px-4 py-1.5 backdrop-blur-xl sm:px-5 sm:py-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-bone-faint">Risk</span>
          <span className="flex items-center gap-1.5 text-[10px] text-bone-dim">
            <span className="h-2 w-2 rounded-full bg-leaf shadow-glow-leaf" /> 0
          </span>
          <span className="h-[3px] w-16 rounded-full opacity-70 sm:w-24" style={{ background: "linear-gradient(to right, #3D9B6F, #E5A84B 50%, #E04D28)" }} />
          <span className="flex items-center gap-1.5 text-[10px] text-bone-dim">
            100 <span className="h-2 w-2 rounded-full bg-ember shadow-glow-ember" />
          </span>
        </div>
      </div>
    </div>
  );
}

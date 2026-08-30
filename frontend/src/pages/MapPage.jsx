import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import DossierPanel from "../components/DossierPanel";
import FilterPanel from "../components/FilterPanel";
import CorridorLeaderboard from "../components/CorridorLeaderboard";
import StatsHeader from "../components/StatsHeader";
import { useHotspots, useSegments } from "../hooks/useSafePassageData";
import { useTheme } from "../context/ThemeContext";
import { Alert } from "../components/icons";
import { MapLoadingOverlay, LeaderboardSkeleton, StatSkeleton, DossierSkeleton } from "../components/LoadingSkeleton";

const Map = lazy(() => import("../components/Map"));

const SPECIES = ["Mammalia", "Aves", "Reptilia", "Amphibia"];

export default function MapPage({ onLiveChange, selectedId: externalSelectedId, onSelectHotspot: externalOnSelectHotspot, compact = false, onHotspotsLoaded }) {
  const { theme } = useTheme();
  const [filters, setFilters] = useState({ minScore: 0, species: null, highway: null, endangeredOnly: false });
  const [internalSelectedId, setInternalSelectedId] = useState(null);
  const [layers, setLayers] = useState({ hotspots: true, segments: true });

  // Use external selection if provided, otherwise use internal
  const selectedId = externalSelectedId !== undefined ? externalSelectedId : internalSelectedId;
  const setSelectedId = externalOnSelectHotspot || setInternalSelectedId;

  const { data: hotspots, loading: hotspotsLoading, source } = useHotspots(filters);
  const { data: segments, loading: segmentsLoading } = useSegments();

  useEffect(() => {
    onLiveChange?.(source);
  }, [source, onLiveChange]);

  // Pass hotspots data to parent in compact mode
  useEffect(() => {
    if (compact && hotspots && onHotspotsLoaded) {
      onHotspotsLoaded(hotspots);
    }
  }, [compact, hotspots, onHotspotsLoaded]);

  const features = useMemo(() => hotspots?.features ?? [], [hotspots]);
  const selectedHotspot = useMemo(
    () => hotspots?.features?.find((f) => f.properties.hotspot_id === selectedId) || null,
    [hotspots, selectedId]
  );

  const speciesOptions = useMemo(() => {
    const set = new Set(SPECIES);
    for (const f of features) {
      const mix = f.properties?.species_mix;
      if (mix && typeof mix === "object") Object.keys(mix).forEach((k) => set.add(k));
    }
    return [...set].filter(Boolean).sort();
  }, [features]);

  const highwayOptions = useMemo(() => {
    const set = new Set(features.map((f) => f.properties?.nearest_highway).filter(Boolean));
    return [...set].sort();
  }, [features]);

  const selectCorridor = (highway) => {
    setFilters((f) => ({ ...f, highway: f.highway === highway ? null : highway }));
    setSelectedId(null);
  };

  const clearFilters = () => setFilters({ minScore: 0, species: null, highway: null, endangeredOnly: false });

  const isLoading = hotspotsLoading || segmentsLoading;

  return (
    <div className="relative h-full w-full">
      {/* Remount on theme change so the basemap style (dark/light) reloads cleanly */}
      <Suspense fallback={<MapLoadingOverlay />}>
        <Map
          key={theme}
          hotspots={hotspots}
          segments={segments}
          selectedId={selectedId}
          onSelectHotspot={setSelectedId}
          layers={layers}
        />
      </Suspense>

      {source === "error" && (
        <div className="absolute inset-x-0 top-4 z-30 mx-auto w-fit max-w-md animate-fade-in" role="alert">
          <div className="flex items-center gap-2 rounded-xl border border-ember/30 bg-surface/95 px-4 py-2.5 text-sm text-bone shadow-panel-sm backdrop-blur-xl">
            <Alert size={15} className="text-ember" />
            We couldn't reach the API. Showing the last committed fixture snapshot instead.
          </div>
        </div>
      )}

      <FilterPanel
        filters={filters}
        onChange={setFilters}
        speciesOptions={speciesOptions}
        highwayOptions={highwayOptions}
        layers={layers}
        onToggleLayer={(k, v) => setLayers((prev) => ({ ...prev, [k]: v }))}
        onClear={clearFilters}
        defaultOpen={!compact}
      />

      {/* Dossier panel — only in standalone mode (not compact) */}
      {!compact && selectedId && (
        <div className="absolute left-3 top-[68px] z-30 w-[350px] max-w-[92vw] animate-fade-in md:top-4">
          {isLoading ? <DossierSkeleton /> : selectedHotspot && (
            <DossierPanel hotspot={selectedHotspot} onClose={() => setSelectedId(null)} />
          )}
        </div>
      )}

      {/* Desktop sidebar — only in standalone mode */}
      {!compact && (
        <div className="absolute bottom-4 left-3 z-20 hidden w-[300px] flex-col gap-3 md:flex">
          {isLoading ? (
            <>
              <StatSkeleton />
              <LeaderboardSkeleton />
            </>
          ) : (
            <>
              <StatsHeader features={features} />
              <CorridorLeaderboard features={features} onSelectHotspot={selectCorridor} />
            </>
          )}
        </div>
      )}

      {/* Mobile summary bar — only in standalone mode */}
      {!compact && (
        <div className="absolute inset-x-0 bottom-0 z-20 border-t border-rule bg-surface/90 px-4 py-2.5 backdrop-blur-md md:hidden">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-[10px] uppercase tracking-widest text-bone-faint">
              {isLoading ? (
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-amber" />
                  Loading…
                </span>
              ) : features.length === 0 ? (
                <span className="text-amber">No clusters match filters</span>
              ) : (
                `${features.length} clusters · source ${source === "api" ? "live" : "fixtures"}`
              )}
            </span>
            {!isLoading && features.length > 0 && features[0] && (
              <button
                onClick={() => setSelectedId(features[0].properties.hotspot_id)}
                className="btn-primary !px-3 !py-1 text-xs"
              >
                Top hotspot
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty state overlay — when filters return no results */}
      {!isLoading && features.length === 0 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
          <div className="surface rounded-panel p-6 text-center max-w-sm animate-fade-in">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-amber/20 bg-amber/[0.08] text-amber">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
            </div>
            <h3 className="mt-3 font-display text-[15px] font-semibold text-bone">No hotspots found</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-bone-dim">
              No hotspot clusters match your current filters. Try adjusting the risk slider or changing the species/corridor filter.
            </p>
            <button
              onClick={clearFilters}
              className="btn-ghost mt-4 !px-4 !py-1.5 text-xs"
            >
              Reset filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Reusable loading skeleton components for SafePassage.
 * These provide visual feedback during data fetching and improve perceived performance.
 */

/**
 * Pulse animation skeleton for text content.
 */
export function TextSkeleton({ lines = 3, className = "" }) {
  return (
    <div className={`animate-pulse space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-3 rounded bg-canopy-600 ${i === lines - 1 ? "w-3/4" : "w-full"}`}
        />
      ))}
    </div>
  );
}

/**
 * Stat card skeleton for the stats header.
 */
export function StatSkeleton({ count = 5 }) {
  return (
    <div className="surface grain rounded-panel px-4 py-3" aria-hidden="true">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="h-4 w-32 animate-pulse rounded bg-canopy-600" />
        <div className="h-3 w-16 animate-pulse rounded bg-canopy-600" />
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="min-w-0">
            <div className="h-6 w-12 animate-pulse rounded bg-canopy-600" />
            <div className="mt-1.5 h-2 w-8 animate-pulse rounded bg-canopy-600" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Leaderboard skeleton for the corridor list.
 */
export function LeaderboardSkeleton({ rows = 4 }) {
  return (
    <div className="surface grain rounded-panel p-4" aria-hidden="true">
      <div className="mb-3.5 flex items-baseline justify-between">
        <div className="h-4 w-40 animate-pulse rounded bg-canopy-600" />
        <div className="h-3 w-20 animate-pulse rounded bg-canopy-600" />
      </div>
      <ul className="space-y-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i}>
            <div className="flex items-center gap-3">
              <div className="h-4 w-5 animate-pulse rounded bg-canopy-600" />
              <div className="min-w-0 flex-1">
                <div className="h-3 w-24 animate-pulse rounded bg-canopy-600" />
                <div className="mt-2 h-1 w-full animate-pulse rounded-full bg-canopy-600" />
                <div className="mt-1.5 flex gap-3">
                  <div className="h-2 w-16 animate-pulse rounded bg-canopy-600" />
                  <div className="h-2 w-8 animate-pulse rounded bg-canopy-600" />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Dossier panel skeleton for when a hotspot is loading.
 */
export function DossierSkeleton() {
  return (
    <div className="surface-overlay grain flex flex-col overflow-hidden rounded-panel-lg animate-slide-in-right" aria-hidden="true">
      <div className="h-[3px] w-full bg-leaf opacity-30" />
      <div className="flex-1 p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="h-3 w-20 animate-pulse rounded bg-canopy-600" />
            <div className="mt-2 h-6 w-32 animate-pulse rounded bg-canopy-600" />
          </div>
          <div className="h-8 w-8 animate-pulse rounded-lg bg-canopy-600" />
        </div>
        <div className="mt-5 grid grid-cols-[auto_1fr] items-center gap-4">
          <div className="h-20 w-32 animate-pulse rounded-xl bg-canopy-600" />
          <div className="space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-canopy-600" />
            <div className="h-5 w-40 animate-pulse rounded bg-canopy-600" />
            <div className="h-3 w-32 animate-pulse rounded bg-canopy-600" />
          </div>
        </div>
        <div className="mt-5 border-t border-rule pt-4">
          <div className="h-3 w-24 animate-pulse rounded bg-canopy-600 mb-3" />
          <div className="space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-canopy-600" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-canopy-600" />
          </div>
        </div>
        <div className="mt-4 border-t border-rule pt-4">
          <div className="h-3 w-32 animate-pulse rounded bg-canopy-600 mb-3" />
          <div className="flex gap-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-12 flex-1 animate-pulse rounded bg-canopy-600" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Map loading overlay.
 */
export function MapLoadingOverlay({ message = "Initializing the map…" }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-canopy-950">
      <div className="flex items-center gap-2 rounded-xl border border-rule bg-surface/90 px-4 py-2.5 text-sm text-bone-dim backdrop-blur-xl">
        <span className="h-3 w-3 animate-pulse rounded-full bg-amber" />
        {message}
      </div>
    </div>
  );
}

/**
 * Full page loading state.
 */
export function PageLoadingSkeleton() {
  return (
    <div className="topo flex-1 overflow-y-auto scroll-slim" aria-busy="true" aria-live="polite">
      <div className="mx-auto max-w-3xl px-6 py-14 sm:py-16">
        <div className="animate-pulse space-y-4">
          <div className="h-3 w-32 animate-pulse rounded bg-canopy-600" />
          <div className="h-10 w-64 animate-pulse rounded bg-canopy-600" />
          <div className="h-4 w-96 animate-pulse rounded bg-canopy-600" />
        </div>
        <div className="mt-10 surface grain rounded-panel p-6 animate-pulse">
          <div className="h-6 w-48 animate-pulse rounded bg-canopy-600" />
          <div className="mt-4 space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-canopy-600" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-canopy-600" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-canopy-600" />
          </div>
          <div className="mt-6 h-8 w-full animate-pulse rounded-full bg-canopy-600" />
        </div>
      </div>
    </div>
  );
}

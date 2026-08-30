import { useEffect, useRef, useState } from "react";
import { useStats } from "../hooks/useSafePassageData";
import { useInView } from "../hooks/useInView";
import { ArrowRight, Book, ChevronDown, Paw, Shield } from "./icons";

const DEFAULTS = {
  hotspot_count: 28,
  total_structured_observations: 92,
  category_count: 4,
};

export default function Hero({ onReportClick }) {
  const stats = useStats();
  const [heroRef, heroInView] = useInView({ threshold: 0.1 });

  const hotspots = stats?.hotspot_count ?? DEFAULTS.hotspot_count;
  const records = stats?.total_structured_observations ?? DEFAULTS.total_structured_observations;
  const corridors = stats?.hotspots_by_highway
    ? Object.keys(stats.hotspots_by_highway).length
    : DEFAULTS.category_count;

  const scrollToMap = () => {
    document.getElementById("zone-map")?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToMethodology = () => {
    document.getElementById("zone-methodology")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      ref={heroRef}
      className="relative flex min-h-screen flex-col justify-center overflow-hidden px-6 py-20 sm:px-8"
      style={{
        backgroundColor: "var(--canopy)",
      }}
    >
      {/* Animated topographic contour lines */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.07]">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 800 600"
          preserveAspectRatio="none"
          className="animate-contour-drift"
        >
          <defs>
            <linearGradient id="contour-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#3D9B6F" />
              <stop offset="50%" stopColor="#E5A84B" />
              <stop offset="100%" stopColor="#E04D28" />
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#contour-grad)" strokeWidth="0.8">
            <path d="M-50 100 C 80 60, 160 160, 300 110 S 480 170, 600 120 S 750 180, 900 130" />
            <path d="M-50 180 C 80 140, 160 240, 300 190 S 480 250, 600 200 S 750 260, 900 210" />
            <path d="M-50 260 C 80 220, 160 320, 300 270 S 480 330, 600 280 S 750 340, 900 290" />
            <path d="M-50 340 C 80 300, 160 400, 300 350 S 480 410, 600 360 S 750 420, 900 370" />
            <path d="M-50 420 C 80 380, 160 480, 300 430 S 480 490, 600 440 S 750 500, 900 450" />
            <path d="M-50 500 C 80 460, 160 560, 300 510 S 480 570, 600 520 S 750 580, 900 530" />
          </g>
        </svg>
      </div>

      {/* Grain texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          mixBlendMode: "overlay",
        }}
      />

      <div className="relative mx-auto max-w-4xl">
        {/* Eyebrow */}
        <div className="animate-fade-up">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-amber/20 bg-amber/[0.06] px-4 py-1.5">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-amber/15 text-amber">
              <Paw size={13} />
            </span>
<span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber/80">
            Open-source wildlife corridor intelligence
          </span>
          </div>
        </div>

        {/* Headline — the thesis */}
        <h1 className="mt-8 animate-fade-up font-display text-[2.75rem] font-bold leading-[1.06] tracking-[-0.03em] text-bone sm:text-[3.75rem]">
          <span className="block">Show us your highway,</span>
          <span className="mt-1 block font-serif text-[1.15em] font-normal italic leading-[1.1] text-ember">
            we'll tell you where animals die next
          </span>
          <span className="mt-1 block">
            — and exactly{" "}
            <span className="relative inline-block">
              <span className="relative z-10 text-amber">what to build there</span>
              <span className="absolute bottom-1 left-0 right-0 h-3 -rotate-1 bg-amber/15 sm:h-4" />
            </span>{" "}
            to stop it.
          </span>
        </h1>

        {/* Subhead */}
        <p
          className="mt-7 max-w-2xl text-[15px] leading-[1.7] text-bone-dim animate-fade-up"
          style={{ animationDelay: "80ms" }}
        >
          The Supreme Court's night-traffic ban on NH-766 through Bandipur Tiger Reserve was
          argued blind — neither side could prove which stretches actually kill. SafePassage
          turns scattered citizen-science roadkill reports into a ranked, fundable list of
          crossings, fences, and speed limits for India's highways.
        </p>

        {/* Fact strip — animated counters */}
        <div
          className="mt-10 grid grid-cols-3 gap-3 animate-fade-up"
          style={{ animationDelay: "140ms" }}
        >
          <Fact
            value={records}
            suffix="structured records"
            label="below the 150-record honesty bar"
            accent="amber"
            animate={heroInView}
          />
          <Fact
            value={hotspots}
            suffix="hotspots mapped"
            label="clusters where collisions concentrate"
            accent="leaf"
            animate={heroInView}
          />
          <Fact
            value={corridors}
            suffix="corridors ranked"
            label="NH-766 · NH-48 · NH-37 · NH-27"
            accent="ember"
            animate={heroInView}
          />
        </div>

        {/* CTAs */}
        <div
          className="mt-10 flex flex-col gap-3 sm:flex-row animate-fade-up"
          style={{ animationDelay: "200ms" }}
        >
          <button onClick={scrollToMap} className="btn-primary !px-7 !py-3.5 text-[15px]">
            <ArrowRight size={16} />
            Enter the system
          </button>
          <button
            onClick={scrollToMethodology}
            className="btn-ghost !px-7 !py-3.5 text-[15px]"
          >
            <Book size={16} />
            Read the methodology
          </button>
        </div>

        {/* Trust strip */}
        <p
          className="mt-11 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-bone-faint animate-fade-up"
          style={{ animationDelay: "280ms" }}
        >
          <span className="inline-flex items-center gap-1.5">
            <Shield size={12} /> Evidence first · honesty ladder enforced
          </span>
          <span>Built entirely on open data</span>
          <span>Zero paid services</span>
        </p>
      </div>

      {/* Scroll-down indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-fade-in" style={{ animationDelay: "600ms" }}>
        <button
          onClick={scrollToMap}
          className="flex flex-col items-center gap-1.5 text-bone-faint transition-colors hover:text-bone"
          aria-label="Scroll down to explore the map"
        >
          <span className="font-mono text-[9px] uppercase tracking-[0.2em]">Scroll</span>
          <ChevronDown size={18} className="animate-bounce-down" />
        </button>
      </div>
    </div>
  );
}

/**
 * Animated number fact — counts up from 0 to `value` using CSS @property
 * with a fallback for browsers that don't support it.
 */
function AnimatedNumber({ value, animate }) {
  const [display, setDisplay] = useState(animate ? 0 : value);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!animate) {
      setDisplay(value);
      return;
    }

    const duration = 1200;
    const start = performance.now();

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [animate, value]);

  return <>{display.toLocaleString()}</>;
}

function Fact({ value, suffix, label, accent = "amber", animate = false }) {
  const accentColors = {
    amber: {
      border: "border-amber/20",
      text: "text-amber",
      bg: "bg-amber/[0.06]",
      dot: "bg-amber",
    },
    leaf: {
      border: "border-leaf/20",
      text: "text-leaf",
      bg: "bg-leaf/[0.06]",
      dot: "bg-leaf",
    },
    ember: {
      border: "border-ember/20",
      text: "text-ember",
      bg: "bg-ember/[0.06]",
      dot: "bg-ember",
    },
  };
  const c = accentColors[accent] || accentColors.amber;

  return (
    <div className={`surface rounded-panel px-4 py-4 ${c.border}`}>
      <div className="flex items-baseline gap-2">
        <span className={`data-value font-display text-data-lg ${c.text}`}>
          <AnimatedNumber value={value} animate={animate} />
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-bone-faint">
          {suffix}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] leading-snug text-bone-faint">
        <span className={`h-1 w-1 shrink-0 rounded-full ${c.dot}`} />
        {label}
      </div>
    </div>
  );
}

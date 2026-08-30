import { useInView } from "../hooks/useInView";
import { Alert, MapPin, Shield } from "./icons";

const STORY_STATS = [
  {
    value: "50,000+",
    label: "animals killed annually on India's roads",
    accent: "ember",
  },
  {
    value: "22",
    label: "hotspot clusters on NH-766 alone",
    accent: "amber",
  },
  {
    value: "150",
    label: "record threshold for full prediction",
    accent: "amber",
  },
];

export default function ProblemZone() {
  const [sectionRef, sectionInView] = useInView({ threshold: 0.08 });
  const [storyRef, storyInView] = useInView({ threshold: 0.15 });
  const [statsRef, statsInView] = useInView({ threshold: 0.15 });
  const [calloutRef, calloutInView] = useInView({ threshold: 0.2 });

  return (
    <div
      ref={sectionRef}
      className="relative overflow-hidden px-6 py-24 sm:py-32"
      style={{
        backgroundColor: "var(--canopy)",
      }}
    >
      {/* Decorative contour fragment */}
      <div className="pointer-events-none absolute right-0 top-0 h-full w-1/3 opacity-[0.04]">
        <svg width="100%" height="100%" viewBox="0 0 300 800" preserveAspectRatio="none">
          <g fill="none" stroke="#3D9B6F" strokeWidth="0.6">
            <path d="M0 100 Q 100 80, 200 140 T 300 160" />
            <path d="M0 200 Q 100 180, 200 240 T 300 260" />
            <path d="M0 300 Q 100 280, 200 340 T 300 360" />
            <path d="M0 400 Q 100 380, 200 440 T 300 460" />
            <path d="M0 500 Q 100 480, 200 540 T 300 560" />
            <path d="M0 600 Q 100 580, 200 640 T 300 660" />
            <path d="M0 700 Q 100 680, 200 740 T 300 760" />
          </g>
        </svg>
      </div>

      <div className="relative mx-auto max-w-5xl">
        {/* Section header */}
        <div className={`fade-in-view ${sectionInView ? "visible" : ""}`}>
          <div className="inline-flex items-center gap-2 rounded-full border border-ember/20 bg-ember/[0.06] px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-ember" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ember/80">
              The crisis on India's roads
            </span>
          </div>

          <h2 className="mt-6 font-display text-display-lg text-bone">
            Every year, thousands of{" "}
            <span className="font-serif italic text-ember">
              wildlife die on India's highways
            </span>
          </h2>

          <p className="mt-4 max-w-2xl text-base leading-relaxed text-bone-dim">
            India's expanding road network cuts through some of the world's most biodiverse
            corridors. From the Western Ghats to Assam's elephant passages, animals collide
            with vehicles at predictable hotspots — and the data to fix them already exists.
          </p>
        </div>

        {/* Two-column layout: Story + Stats */}
        <div className="mt-14 grid gap-10 lg:grid-cols-5 lg:gap-14">
          {/* LEFT: Story narrative */}
          <div
            ref={storyRef}
            className={`lg:col-span-3 fade-in-view ${storyInView ? "visible" : ""}`}
          >
            <h3 className="font-display text-display-sm text-bone">
              The Bandipur Dispute
            </h3>

            <div className="mt-5 space-y-4 text-[15px] leading-[1.75] text-bone-dim">
              <p
                className={`fade-in-view ${storyInView ? "visible" : ""}`}
                style={{ transitionDelay: "100ms" }}
              >
                In 2019, the Supreme Court of India imposed a{" "}
                <span className="font-semibold text-bone">night-traffic ban</span> on NH-766
                through Bandipur Tiger Reserve — one of the most critical tiger corridors in
                southern India.
              </p>
              <p
                className={`fade-in-view ${storyInView ? "visible" : ""}`}
                style={{ transitionDelay: "200ms" }}
              >
                Kerala and Karnataka argued blind. Neither state could produce granular data
                proving which specific stretches of highway were the deadliest. The debate
                raged over a <span className="text-amber">150 km corridor</span> with no one
                able to point to exact kill zones.
              </p>
              <p
                className={`fade-in-view ${storyInView ? "visible" : ""}`}
                style={{ transitionDelay: "300ms" }}
              >
                SafePassage changes that. We turn scattered citizen-science roadkill reports
                into a{" "}
                <span className="font-semibold text-leaf">
                  ranked, fundable list of crossings, fences, and speed limits
                </span>{" "}
                — giving policymakers the evidence layer they never had.
              </p>
            </div>
          </div>

          {/* RIGHT: Key stats */}
          <div
            ref={statsRef}
            className="lg:col-span-2 space-y-4"
          >
            {STORY_STATS.map((stat, i) => (
              <StoryStat
                key={stat.label}
                {...stat}
                visible={statsInView}
                delay={i * 120}
              />
            ))}
          </div>
        </div>

        {/* The Evidence Layer callout */}
        <div
          ref={calloutRef}
          className={`mt-16 fade-in-view ${calloutInView ? "visible" : ""}`}
          style={{ transitionDelay: "100ms" }}
        >
          <div
            className="relative overflow-hidden rounded-panel-lg px-8 py-8 sm:px-10 sm:py-10"
            style={{
              background: "var(--surface-solid)",
              border: "1px solid rgba(61,155,111,0.15)",
              boxShadow: "var(--shadow-panel-sm)",
            }}
          >
            {/* Accent bar */}
            <div className="absolute left-0 top-0 h-full w-1 bg-leaf opacity-60" />

            <div className="flex items-start gap-5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-leaf/20 bg-leaf/[0.08] text-leaf">
                <Shield size={20} />
              </span>
              <div>
                <h3 className="font-display text-display-sm text-bone">
                  The Evidence Layer
                </h3>
                <p className="mt-3 max-w-xl text-[15px] leading-[1.7] text-bone-dim">
                  The{" "}
                  <span className="font-semibold text-leaf">
                    descriptive evidence layer — citable collision corridors
                  </span>{" "}
                  — is the headline feature. Every hotspot carries a confidence score, a
                  transparency rank, and an honesty-ladder badge so policymakers know exactly
                  how much evidence sits behind each recommendation.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-leaf/15 bg-leaf/[0.06] px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-leaf/80">
                    <MapPin size={11} />
                    Citable corridors
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-amber/15 bg-amber/[0.06] px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-amber/80">
                    <Alert size={11} />
                    Honesty ladder
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StoryStat({ value, label, accent = "amber", visible, delay = 0 }) {
  const accents = {
    ember: {
      border: "border-ember/20",
      text: "text-ember",
      dot: "bg-ember",
      glow: "hover:shadow-glow-ember",
    },
    amber: {
      border: "border-amber/20",
      text: "text-amber",
      dot: "bg-amber",
      glow: "hover:shadow-glow-amber",
    },
    leaf: {
      border: "border-leaf/20",
      text: "text-leaf",
      dot: "bg-leaf",
      glow: "hover:shadow-glow-leaf",
    },
  };
  const c = accents[accent] || accents.amber;

  return (
    <div
      className={`stat-reveal ${visible ? "visible" : ""} surface rounded-panel border ${c.border} px-5 py-4 transition-shadow ${c.glow}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className={`font-display text-data-lg ${c.text}`}>{value}</div>
      <div className="mt-1 flex items-center gap-2 text-[12px] leading-snug text-bone-faint">
        <span className={`h-1 w-1 shrink-0 rounded-full ${c.dot}`} />
        {label}
      </div>
    </div>
  );
}

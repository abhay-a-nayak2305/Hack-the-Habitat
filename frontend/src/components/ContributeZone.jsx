import { useInView } from "../hooks/useInView";
import { ArrowRight, Book, Compass, MapPin, Plus } from "./icons";

const FEATURES = [
  {
    icon: MapPin,
    title: "Report a Sighting",
    description:
      "Submit roadkill observations from your highway. Every record counts — no account required.",
    accent: "ember",
    action: "report",
    tag: "Most impactful",
  },
  {
    icon: Compass,
    title: "Explore Data",
    description:
      "Dive into the interactive map and discover hotspot clusters across India's highway network.",
    accent: "amber",
    href: "zone-map",
    action: "explore",
    tag: null,
  },
  {
    icon: Book,
    title: "Read the Methodology",
    description:
      "Understand how we score risk, rank corridors, and why the honesty ladder matters.",
    accent: "leaf",
    href: "zone-methodology",
    action: "methodology",
    tag: null,
  },
];

const ACCENT_MAP = {
  ember: {
    iconBorder: "border-ember/20",
    iconBg: "border-ember/[0.08]",
    iconText: "text-ember",
    hoverBorder: "hover:border-ember/30",
    hoverShadow: "hover:shadow-glow-ember",
  },
  amber: {
    iconBorder: "border-amber/20",
    iconBg: "border-amber/[0.08]",
    iconText: "text-amber",
    hoverBorder: "hover:border-amber/30",
    hoverShadow: "hover:shadow-glow-amber",
  },
  leaf: {
    iconBorder: "border-leaf/20",
    iconBg: "border-leaf/[0.08]",
    iconText: "text-leaf",
    hoverBorder: "hover:border-leaf/30",
    hoverShadow: "hover:shadow-glow-leaf",
  },
};

export default function ContributeZone({ onReportClick }) {
  const [headerRef, headerInView] = useInView({ threshold: 0.2 });
  const [cardsRef, cardsInView] = useInView({ threshold: 0.1 });
  const [ctaRef, ctaInView] = useInView({ threshold: 0.3 });

  const handleAction = (feature) => {
    if (feature.action === "report" && onReportClick) {
      onReportClick();
    } else if (feature.href) {
      document.getElementById(feature.href)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div
      className="relative overflow-hidden px-6 py-24 sm:py-32"
      style={{
        backgroundColor: "var(--canopy)",
      }}
    >
      {/* Decorative contour fragment */}
      <div className="pointer-events-none absolute bottom-0 left-0 h-1/2 w-1/4 opacity-[0.03]">
        <svg width="100%" height="100%" viewBox="0 0 200 400" preserveAspectRatio="none">
          <g fill="none" stroke="#E5A84B" strokeWidth="0.5">
            <path d="M0 50 Q 80 30, 160 80 T 200 100" />
            <path d="M0 120 Q 80 100, 160 150 T 200 170" />
            <path d="M0 190 Q 80 170, 160 220 T 200 240" />
            <path d="M0 260 Q 80 240, 160 290 T 200 310" />
          </g>
        </svg>
      </div>

      <div className="relative mx-auto max-w-4xl">
        {/* Header */}
        <div
          ref={headerRef}
          className={`text-center fade-in-view ${headerInView ? "visible" : ""}`}
        >
          <span className="grid h-12 w-12 mx-auto place-items-center rounded-xl border border-amber/25 bg-amber/[0.08] text-amber">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="6" cy="7" r="1.6" />
              <circle cx="12" cy="5" r="1.6" />
              <circle cx="18" cy="7" r="1.6" />
              <circle cx="9" cy="12" r="1.6" />
              <circle cx="15" cy="12" r="1.6" />
              <path d="M12 13.5c-2.8 0-5.2 2-5.2 4.6 0 1.2 1 2 2.2 2 .6 0 1.1-.2 1.6-.5.5.3 1 .5 1.4.5s.9-.2 1.4-.5c.5.3 1 .5 1.6.5 1.2 0 2.2-.8 2.2-2 0-2.6-2.4-4.6-5.2-4.6z" />
            </svg>
          </span>

          <h2 className="mt-6 font-display text-display-lg text-bone">
            Contribute to the evidence layer
          </h2>

          <p className="mt-4 text-base leading-relaxed text-bone-dim">
            Every sighting makes the model smarter. The honesty ladder keeps us transparent —
            we won't overstate what the model knows until enough structured records prove it.
          </p>
        </div>

        {/* Feature cards */}
        <div
          ref={cardsRef}
          className="mt-12 grid gap-4 sm:grid-cols-3"
        >
          {FEATURES.map((feature, i) => (
            <FeatureCard
              key={feature.title}
              feature={feature}
              visible={cardsInView}
              delay={i * 100}
              onClick={() => handleAction(feature)}
            />
          ))}
        </div>

        {/* CTA buttons */}
        <div
          ref={ctaRef}
          className={`mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center fade-in-view ${ctaInView ? "visible" : ""}`}
          style={{ transitionDelay: "200ms" }}
        >
          <button
            onClick={onReportClick}
            className="btn-ember !px-8 !py-4 text-[15px]"
          >
            <Plus size={16} />
            Report a sighting
          </button>
          <button
            onClick={() =>
              document.getElementById("zone-map")?.scrollIntoView({ behavior: "smooth" })
            }
            className="btn-ghost !px-8 !py-4 text-[15px]"
          >
            <ArrowRight size={16} />
            Explore the map
          </button>
        </div>

        {/* Fine print */}
        <p className="mt-8 text-center text-xs text-bone-faint">
          Observations are submitted to the SafePassage dataset and cross-referenced with
          open biodiversity databases. No account required.
        </p>
      </div>
    </div>
  );
}

function FeatureCard({ feature, visible, delay = 0, onClick }) {
  const a = ACCENT_MAP[feature.accent] || ACCENT_MAP.amber;
  const Icon = feature.icon;

  return (
    <button
      onClick={onClick}
      className={`stat-reveal ${visible ? "visible" : ""} group surface rounded-panel px-6 py-7 text-left transition-all duration-300 ${a.hoverBorder} ${a.hoverShadow} hover:-translate-y-1`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <span
          className={`grid h-10 w-10 place-items-center rounded-lg border ${a.iconBorder} ${a.iconBg} ${a.iconText} transition-transform duration-300 group-hover:scale-110`}
        >
          <Icon size={18} />
        </span>
        {feature.tag && (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
            feature.accent === "ember"
              ? "border border-ember/20 bg-ember/[0.08] text-ember"
              : feature.accent === "amber"
              ? "border border-amber/20 bg-amber/[0.08] text-amber"
              : "border border-leaf/20 bg-leaf/[0.08] text-leaf"
          }`}>
            {feature.tag}
          </span>
        )}
      </div>

      <h3 className="mt-4 font-display text-display-sm text-bone transition-colors group-hover:text-bone-50">
        {feature.title}
      </h3>

      <p className="mt-2 text-[13px] leading-relaxed text-bone-dim">
        {feature.description}
      </p>

      <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-bone-faint transition-colors group-hover:text-bone-muted">
        {feature.action === "report" ? "Get started" : "Learn more"}
        <ArrowRight
          size={12}
          className="transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </span>
    </button>
  );
}

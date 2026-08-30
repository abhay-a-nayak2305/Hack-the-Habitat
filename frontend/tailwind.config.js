/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        /* All colors resolve from CSS variables in src/styles/index.css so the
           whole UI can be re-themed (dark / light) via [data-theme]. */
        /* Canopy — deep forest darkness (dark) / warm paper (light) */
        canopy: {
          950: "rgb(var(--canopy-950-rgb) / <alpha-value>)",
          900: "rgb(var(--canopy-900-rgb) / <alpha-value>)",
          800: "rgb(var(--canopy-800-rgb) / <alpha-value>)",
          700: "rgb(var(--canopy-700-rgb) / <alpha-value>)",
          600: "rgb(var(--canopy-600-rgb) / <alpha-value>)",
          500: "rgb(var(--canopy-500-rgb) / <alpha-value>)",
          400: "rgb(var(--canopy-400-rgb) / <alpha-value>)",
        },
        /* Bone — warm paper for type (dark) / forest ink (light) */
        bone: {
          DEFAULT: "rgb(var(--bone-rgb) / <alpha-value>)",
          50: "rgb(var(--bone-bright-rgb) / <alpha-value>)",
          100: "rgb(var(--bone-rgb) / <alpha-value>)",
          dim: "var(--bone-dim)",
          faint: "var(--bone-faint)",
          muted: "var(--bone-muted)",
        },
        /* Risk spectrum — the emotional core */
        leaf: {
          DEFAULT: "rgb(var(--leaf-rgb) / <alpha-value>)",
          bright: "rgb(var(--leaf-bright-rgb) / <alpha-value>)",
          deep: "rgb(var(--leaf-deep-rgb) / <alpha-value>)",
          glow: "var(--leaf-glow)",
          muted: "var(--leaf-muted)",
        },
        amber: {
          DEFAULT: "rgb(var(--amber-rgb) / <alpha-value>)",
          bright: "rgb(var(--amber-bright-rgb) / <alpha-value>)",
          deep: "rgb(var(--amber-deep-rgb) / <alpha-value>)",
          glow: "var(--amber-glow)",
          muted: "var(--amber-muted)",
        },
        ember: {
          DEFAULT: "rgb(var(--ember-rgb) / <alpha-value>)",
          bright: "rgb(var(--ember-bright-rgb) / <alpha-value>)",
          deep: "rgb(var(--ember-deep-rgb) / <alpha-value>)",
          glow: "var(--ember-glow)",
          muted: "var(--ember-muted)",
        },
        /* Surface system */
        surface: {
          DEFAULT: "rgb(var(--surface-rgb) / <alpha-value>)",
          solid: "rgb(var(--surface-solid-rgb) / <alpha-value>)",
          raised: "rgb(var(--surface-raised-rgb) / <alpha-value>)",
          overlay: "rgb(var(--surface-overlay-rgb) / <alpha-value>)",
        },
        /* Border system */
        rule: {
          DEFAULT: "var(--rule)",
          hover: "var(--rule-hover)",
          active: "var(--rule-active)",
        },
      },
      fontFamily: {
        display: ["'DM Sans'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
        serif: ["'Instrument Serif'", "serif"],
      },
      fontSize: {
        "display-xl": ["3.5rem", { lineHeight: "1.05", letterSpacing: "-0.03em", fontWeight: "700" }],
        "display-lg": ["2.5rem", { lineHeight: "1.1", letterSpacing: "-0.025em", fontWeight: "700" }],
        "display-md": ["1.75rem", { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "600" }],
        "display-sm": ["1.25rem", { lineHeight: "1.2", letterSpacing: "-0.015em", fontWeight: "600" }],
        "label-lg": ["0.75rem", { lineHeight: "1.4", letterSpacing: "0.08em", fontWeight: "500" }],
        "label-md": ["0.6875rem", { lineHeight: "1.4", letterSpacing: "0.1em", fontWeight: "500" }],
        "label-sm": ["0.625rem", { lineHeight: "1.4", letterSpacing: "0.12em", fontWeight: "500" }],
        "data-xl": ["2rem", { lineHeight: "1", letterSpacing: "-0.02em", fontWeight: "700" }],
        "data-lg": ["1.5rem", { lineHeight: "1.1", letterSpacing: "-0.01em", fontWeight: "600" }],
        "data-md": ["1.125rem", { lineHeight: "1.2", letterSpacing: "0", fontWeight: "600" }],
      },
      boxShadow: {
        "glow-leaf": "0 0 0 1px rgba(61,155,111,0.3), 0 0 24px rgba(61,155,111,0.15)",
        "glow-amber": "0 0 0 1px rgba(229,168,75,0.3), 0 0 24px rgba(229,168,75,0.15)",
        "glow-ember": "0 0 0 1px rgba(224,77,40,0.35), 0 0 28px rgba(224,77,40,0.18)",
        "panel": "var(--shadow-panel)",
        "panel-sm": "var(--shadow-panel-sm)",
        "float": "var(--shadow-float)",
        "inner-glow": "var(--shadow-inner-glow)",
      },
      borderRadius: {
        "panel": "1rem",
        "panel-lg": "1.25rem",
        "chip": "0.5rem",
      },
      animation: {
        "fade-in": "fadeIn 0.6s cubic-bezier(0.16,1,0.3,1) both",
        "fade-up": "fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) both",
        "slide-in-right": "slideInRight 0.5s cubic-bezier(0.16,1,0.3,1) both",
        "scale-in": "scaleIn 0.4s cubic-bezier(0.16,1,0.3,1) both",
        "pulse-glow": "pulseGlow 3s ease-in-out infinite",
        "contour-drift": "contourDrift 20s linear infinite",
        "data-count": "dataCount 0.4s cubic-bezier(0.16,1,0.3,1) both",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(32px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.05)" },
        },
        contourDrift: {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "160px 160px" },
        },
        dataCount: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      backgroundImage: {
        "contour-lines": `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cg fill='none' stroke='%233D9B6F' stroke-opacity='0.06' stroke-width='0.8'%3E%3Cpath d='M-20 50 C 30 20, 60 90, 110 55 S 170 95, 200 70'/%3E%3Cpath d='M-30 80 C 25 55, 55 120, 105 85 S 165 125, 195 100'/%3E%3Cpath d='M-20 115 C 30 90, 60 155, 110 120 S 170 160, 200 135'/%3E%3Cpath d='M-40 20 C 10 -5, 40 60, 90 25 S 150 65, 180 40'/%3E%3C/g%3E%3C/svg%3E")`,
      },
    },
  },
  plugins: [],
};

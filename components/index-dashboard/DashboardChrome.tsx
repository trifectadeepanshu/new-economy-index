import { useId, type CSSProperties, type ReactNode } from "react";

export function Skeleton({ width, height, radius = 6 }: { width?: string | number; height: number; radius?: number }) {
  return (
    <div
      style={{
        width: width ?? "100%",
        height,
        borderRadius: radius,
        background: "var(--nei-grid-strong)",
        animation: "nei-pulse 1.8s ease-in-out infinite",
      }}
    />
  );
}

export function Sparkline({ series, height = 80 }: { series: number[]; height?: number }) {
  const gradientId = `spark-${useId().replace(/:/g, "")}`;

  if (series.length < 2) return null;

  const min = Math.min(...series) * 0.998;
  const max = Math.max(...series) * 1.002;
  const range = max - min || 1;
  const width = 400;
  const path = series
    .map((value, index) => {
      const x = (index / (series.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const areaPath = `${path} L${width},${height} L0,${height} Z`;
  const color = series[series.length - 1] >= series[0] ? "var(--nei-pos)" : "var(--nei-neg)";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} className="nei-spark-area" />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        pathLength="1"
        strokeDasharray="1"
        strokeDashoffset="1"
        className="nei-spark-line"
      />
    </svg>
  );
}

export function SectionEyebrow({ number, label, light = false }: { number: string; label: string; light?: boolean }) {
  const lineColor = light ? "rgba(232,235,240,0.45)" : "rgba(11,15,25,0.35)";

  return (
    <div className="nei-section-eyebrow">
      <span style={{ width: 22, background: lineColor }} />
      <span className="nei-mono" style={{ color: light ? "rgba(232,235,240,0.95)" : "var(--nei-accent)" }}>
        §{number}
      </span>
      <span style={{ color: light ? "rgba(232,235,240,0.72)" : "rgba(11,15,25,0.6)" }}>
        {label}
      </span>
      <span style={{ width: 36, background: lineColor }} />
    </div>
  );
}

export function KineticBackdrop() {
  return (
    <div aria-hidden="true" className="nei-kinetic-backdrop">
      <div className="nei-kinetic-sheen" />
      <div className="nei-kinetic-field" />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="nei-kinetic-grid">
        <defs>
          <pattern id="nei-dot-grid" x="0" y="0" width="3.4" height="3.4" patternUnits="userSpaceOnUse">
            <circle cx="0.2" cy="0.2" r="0.18" fill="rgba(232,235,240,0.18)" />
          </pattern>
          <radialGradient id="nei-dot-mask" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="white" stopOpacity="0.9" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id="nei-dot-mask-ref">
            <rect x="0" y="0" width="100" height="100" fill="url(#nei-dot-mask)" />
          </mask>
        </defs>
        <rect x="0" y="0" width="100" height="100" fill="url(#nei-dot-grid)" mask="url(#nei-dot-mask-ref)" />
      </svg>
      <div className="nei-kinetic-vignette" />
    </div>
  );
}

export function TickFrame({
  children,
  className,
  inset = 24,
  lineLen = 76,
  corner = 18,
  opacity = 0.55,
  padded = true,
  tone = "ink",
  style,
}: {
  children: ReactNode;
  className?: string;
  inset?: number;
  lineLen?: number;
  corner?: number;
  opacity?: number;
  padded?: boolean;
  tone?: "paper" | "ink";
  style?: CSSProperties;
}) {
  const color =
    tone === "paper"
      ? `rgba(232,235,240,${opacity})`
      : `rgba(11,15,25,${opacity * 0.85})`;
  const corners: CSSProperties[] = [
    { top: inset, left: inset, transform: "rotate(0deg)" },
    { top: inset, right: inset, transform: "rotate(90deg)" },
    { right: inset, bottom: inset, transform: "rotate(180deg)" },
    { bottom: inset, left: inset, transform: "rotate(270deg)" },
  ];

  return (
    <div className={className} style={{ position: "relative", ...style }}>
      {corners.map((position, index) => (
        <span
          key={index}
          aria-hidden="true"
          style={{
            position: "absolute",
            width: lineLen,
            height: lineLen,
            pointerEvents: "none",
            zIndex: 1,
            ...position,
          }}
        >
          <span style={{ position: "absolute", top: 0, left: 0, height: 1, width: lineLen, background: color }} />
          <span style={{ position: "absolute", top: 0, left: 0, width: 1, height: lineLen, background: color }} />
          <span
            style={{
              position: "absolute",
              top: -corner / 2,
              left: -corner / 2,
              width: corner,
              height: corner,
              borderTop: `1px solid ${color}`,
              borderLeft: `1px solid ${color}`,
            }}
          />
        </span>
      ))}
      <div style={{ position: "relative", zIndex: 2, padding: padded ? inset + 22 : 0 }}>
        {children}
      </div>
    </div>
  );
}

export function ShoulderDivider({
  from,
  to,
  label,
  labelColor = "rgba(232,235,240,0.45)",
  height = 56,
}: {
  from: string;
  to: string;
  label?: string;
  labelColor?: string;
  height?: number;
}) {
  return (
    <div aria-hidden="true" className="nei-shoulder-divider" style={{ height, background: from }}>
      <div style={{ background: to }} />
      {label && <span style={{ color: labelColor }}>{label}</span>}
    </div>
  );
}

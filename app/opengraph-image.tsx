import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "New Economy 50 by Trifecta Capital";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const tick = (style: React.CSSProperties) => (
  <div style={{ position: "absolute", background: "rgba(232,235,240,0.55)", display: "flex", ...style }} />
);

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          backgroundColor: "#172C54",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        {/* Background glows */}
        <div style={{ position: "absolute", top: -80, left: -80, width: 360, height: 360, borderRadius: "50%", background: "rgba(122,149,242,0.15)", display: "flex" }} />
        <div style={{ position: "absolute", bottom: -100, right: -80, width: 400, height: 400, borderRadius: "50%", background: "rgba(40,88,224,0.13)", display: "flex" }} />

        {/* Corner ticks — top-left */}
        {tick({ top: 52, left: 52, width: 44, height: 3 })}
        {tick({ top: 52, left: 52, width: 3, height: 44 })}
        {/* top-right */}
        {tick({ top: 52, right: 52, width: 44, height: 3 })}
        {tick({ top: 52, right: 52, width: 3, height: 44 })}
        {/* bottom-left */}
        {tick({ bottom: 52, left: 52, width: 44, height: 3 })}
        {tick({ bottom: 52, left: 52, width: 3, height: 44 })}
        {/* bottom-right */}
        {tick({ bottom: 52, right: 52, width: 44, height: 3 })}
        {tick({ bottom: 52, right: 52, width: 3, height: 44 })}

        {/* Main content */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ fontSize: 92, fontWeight: 700, color: "#F2F4F8", lineHeight: 1, letterSpacing: -2 }}>
            New Economy 50
          </div>
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: 8, color: "rgba(232,235,240,0.70)", marginTop: 16, display: "flex" }}>
            MARKET-CAP WEIGHTED INDEX
          </div>
          <div style={{ fontSize: 23, fontWeight: 400, color: "rgba(232,235,240,0.62)", marginTop: 30, textAlign: "center", maxWidth: 680, display: "flex" }}>
            {"India's VC-backed public-market cohort, tracked as one market-cap weighted index."}
          </div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 52, gap: 14 }}>
            <div style={{ width: 28, height: 2, background: "rgba(232,235,240,0.35)", display: "flex" }} />
            <div style={{ fontSize: 19, fontWeight: 600, color: "#F2F4F8", letterSpacing: 0.5, display: "flex" }}>
              Trifecta Capital
            </div>
            <div style={{ width: 28, height: 2, background: "rgba(232,235,240,0.35)", display: "flex" }} />
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

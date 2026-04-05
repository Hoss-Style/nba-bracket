import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Lew's 2026 NBA Playoff Bracket Challenge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0a1a 0%, #1a1025 40%, #0f0a1a 100%)",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(229,96,32,0.15) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Basketball emoji */}
        <div style={{ fontSize: "80px", marginBottom: "20px", display: "flex" }}>🏀</div>

        {/* Title */}
        <div
          style={{
            fontSize: "52px",
            fontWeight: 800,
            color: "white",
            textAlign: "center",
            lineHeight: 1.1,
            marginBottom: "8px",
            display: "flex",
          }}
        >
          2026 NBA Bracket Challenge
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "24px",
            fontWeight: 500,
            background: "linear-gradient(90deg, #e56020, #ff8844)",
            backgroundClip: "text",
            color: "transparent",
            marginBottom: "32px",
            display: "flex",
          }}
        >
          Lew&apos;s Annual Playoff Challenge
        </div>

        {/* CTA bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            fontSize: "18px",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          <span style={{ display: "flex" }}>Pick Winners</span>
          <span style={{ color: "#e56020", display: "flex" }}>•</span>
          <span style={{ display: "flex" }}>Call Upsets</span>
          <span style={{ color: "#e56020", display: "flex" }}>•</span>
          <span style={{ display: "flex" }}>Win the Pot</span>
        </div>

        {/* Bottom accent line */}
        <div
          style={{
            position: "absolute",
            bottom: "0",
            left: "0",
            right: "0",
            height: "4px",
            background: "linear-gradient(90deg, #7b2d8e, #e56020, #ff8844)",
            display: "flex",
          }}
        />
      </div>
    ),
    { ...size }
  );
}

import { ImageResponse } from "next/og";
import { WEST_TEAMS, EAST_TEAMS } from "@/lib/teams";

export const runtime = "edge";
export const alt = "Lew's 2026 NBA Playoff Bracket Challenge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// R1 matchup pairs by seed: [top, bottom]
const R1_PAIRS = [[0, 7], [3, 4], [2, 5], [1, 6]];

function TeamBox({ name, seed, color }: { name: string; seed: number; color: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 10px",
        borderRadius: "6px",
        background: `${color}30`,
        borderLeft: `3px solid ${color}`,
        fontSize: "13px",
        color: "white",
        fontWeight: 600,
        width: "110px",
      }}
    >
      <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", display: "flex" }}>{seed}</span>
      <span style={{ display: "flex" }}>{name}</span>
    </div>
  );
}

function MatchupBox({ top, bottom }: { top: { name: string; seed: number; color: string }; bottom: { name: string; seed: number; color: string } }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      <TeamBox {...top} />
      <TeamBox {...bottom} />
    </div>
  );
}

function PlaceholderBox() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "110px",
        height: "52px",
        borderRadius: "6px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        fontSize: "14px",
        color: "rgba(255,255,255,0.2)",
      }}
    >
      ?
    </div>
  );
}

function RoundColumn({ matchups, count }: { matchups: Array<{ top: { name: string; seed: number; color: string }; bottom: { name: string; seed: number; color: string } }> | null; count: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-around", height: "100%", gap: "8px" }}>
      {matchups
        ? matchups.map((m, i) => <MatchupBox key={i} top={m.top} bottom={m.bottom} />)
        : Array.from({ length: count }).map((_, i) => <PlaceholderBox key={i} />)
      }
    </div>
  );
}

export default function OGImage() {
  const westR1 = R1_PAIRS.map(([t, b]) => ({
    top: { name: WEST_TEAMS[t].name, seed: WEST_TEAMS[t].seed, color: WEST_TEAMS[t].primaryColor },
    bottom: { name: WEST_TEAMS[b].name, seed: WEST_TEAMS[b].seed, color: WEST_TEAMS[b].primaryColor },
  }));

  const eastR1 = R1_PAIRS.map(([t, b]) => ({
    top: { name: EAST_TEAMS[t].name, seed: EAST_TEAMS[t].seed, color: EAST_TEAMS[t].primaryColor },
    bottom: { name: EAST_TEAMS[b].name, seed: EAST_TEAMS[b].seed, color: EAST_TEAMS[b].primaryColor },
  }));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: "linear-gradient(135deg, #0a0a1a 0%, #1a1025 40%, #0f0a1a 100%)",
          fontFamily: "system-ui, sans-serif",
          padding: "24px 32px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(229,96,32,0.12) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <span style={{ fontSize: "28px", display: "flex" }}>🏀</span>
          <span style={{ fontSize: "28px", fontWeight: 800, color: "white", display: "flex" }}>2026 NBA Bracket Challenge</span>
        </div>
        <div
          style={{
            fontSize: "15px",
            fontWeight: 500,
            color: "#e56020",
            marginBottom: "20px",
            display: "flex",
          }}
        >
          Pick Winners &bull; Call Upsets &bull; Win the Pot
        </div>

        {/* Bracket */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1, width: "100%" }}>
          {/* West label */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "30px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.3)", display: "flex", letterSpacing: "0.1em" }}>W</span>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.3)", display: "flex", letterSpacing: "0.1em" }}>E</span>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.3)", display: "flex", letterSpacing: "0.1em" }}>S</span>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.3)", display: "flex", letterSpacing: "0.1em" }}>T</span>
          </div>

          {/* West R1 */}
          <RoundColumn matchups={westR1} count={4} />
          {/* West R2 */}
          <RoundColumn matchups={null} count={2} />
          {/* West CF */}
          <RoundColumn matchups={null} count={1} />

          {/* Finals center */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", padding: "0 12px" }}>
            <span style={{ fontSize: "36px", display: "flex" }}>🏆</span>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "8px 16px",
                borderRadius: "10px",
                background: "rgba(255,215,0,0.08)",
                border: "1px solid rgba(255,215,0,0.2)",
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,215,0,0.6)", letterSpacing: "0.1em", display: "flex" }}>FINALS</span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "rgba(255,215,0,0.8)", display: "flex", marginTop: "2px" }}>Champion</span>
            </div>
          </div>

          {/* East CF */}
          <RoundColumn matchups={null} count={1} />
          {/* East R2 */}
          <RoundColumn matchups={null} count={2} />
          {/* East R1 */}
          <RoundColumn matchups={eastR1} count={4} />

          {/* East label */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "30px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.3)", display: "flex", letterSpacing: "0.1em" }}>E</span>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.3)", display: "flex", letterSpacing: "0.1em" }}>A</span>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.3)", display: "flex", letterSpacing: "0.1em" }}>S</span>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.3)", display: "flex", letterSpacing: "0.1em" }}>T</span>
          </div>
        </div>

        {/* Bottom accent */}
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

import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { FadeIn } from "../components/FadeIn";
import { ProgressBar } from "../components/ProgressBar";
import { GlowingOrb } from "../components/GlowingOrb";
import { colors, fonts } from "../styles";

export const SatelliteVerification: React.FC = () => {
  const frame = useCurrentFrame();

  const scanLineY = interpolate(frame, [30, 100], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const ndviValue = interpolate(frame, [60, 120], [0, 0.82], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const checkmarkOpacity = interpolate(frame, [120, 135], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: colors.gradientDark,
        fontFamily: fonts.heading,
        padding: 80,
        display: "flex",
        flexDirection: "row",
        gap: 60,
        alignItems: "center",
      }}
    >
      <GlowingOrb x={80} y={20} size={200} color={colors.primary} />

      {/* Left side - Satellite imagery mockup */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
        <FadeIn startFrame={5} duration={20}>
          <h2
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: colors.textPrimary,
              margin: 0,
            }}
          >
            🛰️ Satellite Verification
          </h2>
          <p style={{ fontSize: 20, color: colors.textSecondary, marginTop: 8 }}>
            Sentinel-2 NDVI analysis validates vegetation health
          </p>
        </FadeIn>

        {/* Satellite image mockup */}
        <FadeIn startFrame={20} duration={15}>
          <div
            style={{
              width: 500,
              height: 350,
              borderRadius: 16,
              border: `1px solid ${colors.border}`,
              background: "linear-gradient(135deg, #064e3b 0%, #065f46 30%, #047857 60%, #059669 100%)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Grid overlay */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `linear-gradient(${colors.primary}20 1px, transparent 1px), linear-gradient(90deg, ${colors.primary}20 1px, transparent 1px)`,
                backgroundSize: "50px 50px",
              }}
            />
            {/* Scan line */}
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: `${scanLineY}%`,
                height: 3,
                background: colors.primary,
                boxShadow: `0 0 20px ${colors.primary}, 0 0 40px ${colors.primary}60`,
              }}
            />
            {/* Corner markers */}
            {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([cx, cy], i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: cx ? undefined : 12,
                  right: cx ? 12 : undefined,
                  top: cy ? undefined : 12,
                  bottom: cy ? 12 : undefined,
                  width: 24,
                  height: 24,
                  borderTop: cy ? undefined : `2px solid ${colors.primary}`,
                  borderBottom: cy ? `2px solid ${colors.primary}` : undefined,
                  borderLeft: cx ? undefined : `2px solid ${colors.primary}`,
                  borderRight: cx ? `2px solid ${colors.primary}` : undefined,
                }}
              />
            ))}
            {/* Label */}
            <div
              style={{
                position: "absolute",
                bottom: 16,
                left: 16,
                background: "rgba(0,0,0,0.7)",
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: 12,
                color: colors.textSecondary,
                fontFamily: fonts.mono,
              }}
            >
              Sentinel-2 • Band B8/B4 • 10m resolution
            </div>
          </div>
        </FadeIn>
      </div>

      {/* Right side - Analysis results */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
        <FadeIn startFrame={40} duration={20}>
          <div
            style={{
              background: colors.bgCard,
              borderRadius: 16,
              border: `1px solid ${colors.border}`,
              padding: 32,
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <h3 style={{ fontSize: 20, color: colors.textPrimary, margin: 0, fontWeight: 600 }}>
              NDVI Analysis Results
            </h3>

            <ProgressBar startFrame={40} duration={60} label="Analyzing vegetation..." />

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: colors.textSecondary, fontSize: 14 }}>NDVI Score</span>
                <span
                  style={{
                    color: ndviValue > 0.6 ? colors.success : colors.warning,
                    fontSize: 24,
                    fontWeight: 700,
                    fontFamily: fonts.mono,
                  }}
                >
                  {ndviValue.toFixed(2)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: colors.textSecondary, fontSize: 14 }}>Coverage Area</span>
                <span style={{ color: colors.textPrimary, fontSize: 14 }}>2,450 hectares</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: colors.textSecondary, fontSize: 14 }}>Region</span>
                <span style={{ color: colors.textPrimary, fontSize: 14 }}>Amazon Basin, Brazil</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: colors.textSecondary, fontSize: 14 }}>Date Range</span>
                <span style={{ color: colors.textPrimary, fontSize: 14, fontFamily: fonts.mono }}>
                  2024-01 → 2024-06
                </span>
              </div>
            </div>

            {/* Verification badge */}
            <div
              style={{
                marginTop: 12,
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                background: `${colors.success}15`,
                borderRadius: 12,
                border: `1px solid ${colors.success}30`,
                opacity: checkmarkOpacity,
              }}
            >
              <span style={{ fontSize: 28 }}>✅</span>
              <div>
                <div style={{ color: colors.success, fontWeight: 600, fontSize: 14 }}>
                  Verification Passed
                </div>
                <div style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Eligible for carbon credit issuance
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </AbsoluteFill>
  );
};

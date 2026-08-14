import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { FadeIn } from "../components/FadeIn";
import { GlowingOrb } from "../components/GlowingOrb";
import { colors, fonts } from "../styles";

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(frame, [20, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(frame, [20, 45], [50, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subtitleOpacity = interpolate(frame, [50, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const globeScale = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const globeRotate = interpolate(frame, [0, 150], [0, 360]);

  return (
    <AbsoluteFill
      style={{
        background: colors.gradientDark,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: fonts.heading,
      }}
    >
      {/* Background orbs */}
      <GlowingOrb x={20} y={30} size={300} color={colors.primary} />
      <GlowingOrb x={80} y={70} size={250} color={colors.secondary} pulseSpeed={80} />
      <GlowingOrb x={50} y={20} size={180} color={colors.accent} pulseSpeed={100} />

      {/* Globe emoji */}
      <div
        style={{
          position: "absolute",
          fontSize: 120,
          transform: `scale(${globeScale}) rotate(${globeRotate * 0.05}deg)`,
          top: "25%",
        }}
      >
        🌍
      </div>

      {/* Title */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          marginTop: 80,
        }}
      >
        <h1
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: colors.textPrimary,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            margin: 0,
            letterSpacing: "-2px",
          }}
        >
          Carbon Credit
        </h1>
        <h1
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: colors.primary,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            margin: 0,
            letterSpacing: "-2px",
          }}
        >
          Marketplace
        </h1>

        <FadeIn startFrame={55} duration={20}>
          <p
            style={{
              fontSize: 24,
              color: colors.textSecondary,
              opacity: subtitleOpacity,
              maxWidth: 700,
              textAlign: "center",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Decentralized carbon credit trading on{" "}
            <span style={{ color: colors.textPrimary, fontWeight: 600 }}>Stellar</span>,
            verified by{" "}
            <span style={{ color: colors.textPrimary, fontWeight: 600 }}>Sentinel-2</span>{" "}
            satellite imagery
          </p>
        </FadeIn>
      </div>

      {/* Bottom tagline */}
      <FadeIn startFrame={90} direction="up" style={{ position: "absolute", bottom: 80 }}>
        <div
          style={{
            display: "flex",
            gap: 32,
            fontSize: 16,
            color: colors.textTertiary,
          }}
        >
          <span>🔗 On-Chain</span>
          <span>🛰️ Satellite Verified</span>
          <span>♻️ Carbon Neutral</span>
        </div>
      </FadeIn>
    </AbsoluteFill>
  );
};

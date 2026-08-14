import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { FadeIn } from "../components/FadeIn";
import { GlowingOrb } from "../components/GlowingOrb";
import { colors, fonts } from "../styles";

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();

  const logoScale = interpolate(frame, [10, 35], [0.5, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const logoOpacity = interpolate(frame, [10, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: colors.gradientDark,
        fontFamily: fonts.heading,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 32,
      }}
    >
      <GlowingOrb x={50} y={50} size={400} color={colors.primary} pulseSpeed={90} />
      <GlowingOrb x={30} y={30} size={200} color={colors.secondary} />
      <GlowingOrb x={70} y={70} size={200} color={colors.accent} />

      {/* Logo */}
      <div
        style={{
          fontSize: 80,
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
        }}
      >
        🌍
      </div>

      <FadeIn startFrame={30} duration={20}>
        <h2
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: colors.textPrimary,
            margin: 0,
            textAlign: "center",
            letterSpacing: "-1px",
          }}
        >
          Carbon<span style={{ color: colors.primary }}>Credit</span>
        </h2>
      </FadeIn>

      <FadeIn startFrame={50} duration={20}>
        <p
          style={{
            fontSize: 22,
            color: colors.textSecondary,
            margin: 0,
            textAlign: "center",
            maxWidth: 600,
            lineHeight: 1.6,
          }}
        >
          The future of transparent, satellite-verified carbon credit trading
        </p>
      </FadeIn>

      {/* CTA Button */}
      <FadeIn startFrame={75} duration={20}>
        <div
          style={{
            marginTop: 20,
            padding: "16px 40px",
            borderRadius: 12,
            background: colors.primary,
            color: "#fff",
            fontSize: 18,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow: `0 0 40px ${colors.primary}40`,
          }}
        >
          🚀 Get Started Today
        </div>
      </FadeIn>

      {/* Tech stack */}
      <FadeIn startFrame={95} duration={20}>
        <div
          style={{
            display: "flex",
            gap: 24,
            marginTop: 32,
            fontSize: 14,
            color: colors.textTertiary,
          }}
        >
          <span>⚡ Stellar Blockchain</span>
          <span>•</span>
          <span>🛰️ Sentinel-2 / openEO</span>
          <span>•</span>
          <span>🔒 Smart Contracts</span>
          <span>•</span>
          <span>⚛️ Next.js</span>
        </div>
      </FadeIn>

      {/* Footer */}
      <FadeIn startFrame={110} duration={20} style={{ position: "absolute", bottom: 40 }}>
        <p style={{ fontSize: 14, color: colors.textTertiary, margin: 0 }}>
          Built for a sustainable future 🌱
        </p>
      </FadeIn>
    </AbsoluteFill>
  );
};

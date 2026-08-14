import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { FadeIn } from "../components/FadeIn";
import { GlowingOrb } from "../components/GlowingOrb";
import { colors, fonts } from "../styles";

const stats = [
  { icon: "📋", label: "Total Credits Issued", value: 47, suffix: "" },
  { icon: "🌿", label: "Total Tonnes Issued", value: 128500, suffix: "" },
  { icon: "♻️", label: "Total Tonnes Retired", value: 42300, suffix: "" },
  { icon: "💰", label: "Trading Volume", value: 2.4, suffix: "M USD" },
];

export const Dashboard: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        background: colors.gradientDark,
        fontFamily: fonts.heading,
        padding: 80,
        display: "flex",
        flexDirection: "column",
        gap: 40,
      }}
    >
      <GlowingOrb x={15} y={85} size={280} color={colors.primary} />
      <GlowingOrb x={90} y={15} size={200} color={colors.accent} />

      <FadeIn startFrame={5} duration={20}>
        <div>
          <h2 style={{ fontSize: 48, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
            📊 Dashboard
          </h2>
          <p style={{ fontSize: 18, color: colors.textSecondary, marginTop: 8 }}>
            Real-time marketplace analytics
          </p>
        </div>
      </FadeIn>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
        {stats.map((stat, index) => {
          const cardStart = 20 + index * 15;
          const animatedValue = interpolate(
            frame - cardStart,
            [0, 40],
            [0, stat.value],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          const cardOpacity = interpolate(frame - cardStart, [0, 20], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const cardY = interpolate(frame - cardStart, [0, 20], [30, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={stat.label}
              style={{
                background: colors.bgCard,
                borderRadius: 16,
                border: `1px solid ${colors.border}`,
                padding: 24,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                opacity: cardOpacity,
                transform: `translateY(${cardY}px)`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 24 }}>{stat.icon}</span>
                <span style={{ fontSize: 13, color: colors.textSecondary, fontWeight: 500 }}>
                  {stat.label}
                </span>
              </div>
              <span style={{ fontSize: 32, fontWeight: 700, color: colors.textPrimary }}>
                {stat.value >= 1000
                  ? Math.round(animatedValue).toLocaleString()
                  : animatedValue.toFixed(stat.suffix ? 1 : 0)}
                {stat.suffix && (
                  <span style={{ fontSize: 16, color: colors.textSecondary, marginLeft: 4 }}>
                    {stat.suffix}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Chart mockup */}
      <FadeIn startFrame={60} duration={25}>
        <div
          style={{
            background: colors.bgCard,
            borderRadius: 16,
            border: `1px solid ${colors.border}`,
            padding: 32,
            height: 280,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: colors.textPrimary, margin: 0 }}>
              Credits Issued Over Time
            </h3>
            <span style={{ fontSize: 13, color: colors.textSecondary }}>Last 6 months</span>
          </div>

          {/* Bar chart */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "flex-end",
              gap: 12,
              paddingTop: 20,
            }}
          >
            {[35, 52, 48, 75, 62, 95, 88, 110, 98, 125, 115, 140].map((value, i) => {
              const barStart = 65 + i * 3;
              const barHeight = interpolate(
                frame - barStart,
                [0, 25],
                [0, (value / 140) * 180],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              );

              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: barHeight,
                    borderRadius: "4px 4px 0 0",
                    background:
                      i === 11
                        ? colors.primary
                        : `linear-gradient(180deg, ${colors.primary}80 0%, ${colors.primary}30 100%)`,
                  }}
                />
              );
            })}
          </div>
        </div>
      </FadeIn>
    </AbsoluteFill>
  );
};

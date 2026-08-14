import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { FadeIn } from "../components/FadeIn";
import { GlowingOrb } from "../components/GlowingOrb";
import { colors, fonts } from "../styles";

const mockCredits = [
  { id: 1, project: "Amazon Reforestation", type: "Reforestation", tonnes: 5000, price: 24.5, region: "Brazil", status: "Listed" },
  { id: 2, project: "Borneo Forest Conservation", type: "Conservation", tonnes: 3200, price: 18.0, region: "Indonesia", status: "Listed" },
  { id: 3, project: "Kenya Wind Farm", type: "Renewable Energy", tonnes: 8500, price: 12.8, region: "Kenya", status: "Sold" },
  { id: 4, project: "India Solar Grid", type: "Renewable Energy", tonnes: 12000, price: 9.5, region: "India", status: "Listed" },
];

export const Marketplace: React.FC = () => {
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
      <GlowingOrb x={85} y={85} size={300} color={colors.secondary} />

      <FadeIn startFrame={5} duration={20}>
        <div>
          <h2 style={{ fontSize: 48, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
            🌿 Marketplace
          </h2>
          <p style={{ fontSize: 18, color: colors.textSecondary, marginTop: 8 }}>
            Trade verified carbon credits peer-to-peer on Stellar
          </p>
        </div>
      </FadeIn>

      {/* Credits table */}
      <FadeIn startFrame={25} duration={20}>
        <div
          style={{
            borderRadius: 16,
            border: `1px solid ${colors.border}`,
            overflow: "hidden",
            background: colors.bgCard,
          }}
        >
          {/* Table header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "60px 1.5fr 1fr 0.8fr 0.8fr 0.8fr 0.8fr",
              padding: "16px 24px",
              background: "rgba(255,255,255,0.03)",
              borderBottom: `1px solid ${colors.border}`,
              fontSize: 13,
              fontWeight: 600,
              color: colors.textSecondary,
            }}
          >
            <span>ID</span>
            <span>Project</span>
            <span>Type</span>
            <span>Tonnes</span>
            <span>Price/t</span>
            <span>Region</span>
            <span>Status</span>
          </div>

          {/* Table rows */}
          {mockCredits.map((credit, index) => {
            const rowStart = 35 + index * 12;
            const rowOpacity = interpolate(frame - rowStart, [0, 15], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const rowX = interpolate(frame - rowStart, [0, 15], [30, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });

            return (
              <div
                key={credit.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "60px 1.5fr 1fr 0.8fr 0.8fr 0.8fr 0.8fr",
                  padding: "16px 24px",
                  borderBottom: index < mockCredits.length - 1 ? `1px solid ${colors.border}` : "none",
                  fontSize: 14,
                  opacity: rowOpacity,
                  transform: `translateX(${rowX}px)`,
                  alignItems: "center",
                }}
              >
                <span style={{ color: colors.textPrimary, fontFamily: fonts.mono }}>#{credit.id}</span>
                <span style={{ color: colors.textPrimary, fontWeight: 500 }}>{credit.project}</span>
                <span style={{ color: colors.textSecondary }}>{credit.type}</span>
                <span style={{ color: colors.textPrimary }}>{credit.tonnes.toLocaleString()}</span>
                <span style={{ color: colors.primary, fontWeight: 600 }}>${credit.price}</span>
                <span style={{ color: colors.textSecondary }}>{credit.region}</span>
                <span
                  style={{
                    display: "inline-flex",
                    padding: "4px 10px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 500,
                    background: credit.status === "Listed" ? `${colors.success}20` : `${colors.secondary}20`,
                    color: credit.status === "Listed" ? colors.success : colors.secondary,
                  }}
                >
                  {credit.status}
                </span>
              </div>
            );
          })}
        </div>
      </FadeIn>

      {/* Action buttons */}
      <FadeIn startFrame={90} duration={20}>
        <div style={{ display: "flex", gap: 16 }}>
          <div
            style={{
              padding: "12px 24px",
              borderRadius: 10,
              background: colors.primary,
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            🌿 Buy Credits
          </div>
          <div
            style={{
              padding: "12px 24px",
              borderRadius: 10,
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary,
              fontSize: 15,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            ♻️ Retire Credits
          </div>
        </div>
      </FadeIn>
    </AbsoluteFill>
  );
};

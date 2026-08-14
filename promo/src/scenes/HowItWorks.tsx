import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { FadeIn } from "../components/FadeIn";
import { GlowingOrb } from "../components/GlowingOrb";
import { colors, fonts } from "../styles";

const steps = [
  { num: 1, icon: "🛰️", title: "Verify", description: "Run satellite NDVI check on project area", color: colors.primary },
  { num: 2, icon: "📝", title: "Issue", description: "Admin issues carbon credit on Stellar", color: colors.secondary },
  { num: 3, icon: "💱", title: "Trade", description: "Buy and sell credits on the marketplace", color: colors.accent },
  { num: 4, icon: "♻️", title: "Retire", description: "Permanently retire credits to offset CO₂", color: "#F59E0B" },
];

export const HowItWorks: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        background: colors.gradientDark,
        fontFamily: fonts.heading,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 60,
        padding: 80,
      }}
    >
      <GlowingOrb x={10} y={80} size={250} color={colors.accent} />
      <GlowingOrb x={90} y={20} size={200} color={colors.primary} />

      <FadeIn startFrame={5} duration={20}>
        <h2
          style={{
            fontSize: 52,
            fontWeight: 700,
            color: colors.textPrimary,
            margin: 0,
            textAlign: "center",
          }}
        >
          How It Works
        </h2>
      </FadeIn>

      {/* Steps */}
      <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
        {steps.map((step, index) => {
          const stepStart = 20 + index * 25;
          const opacity = interpolate(frame - stepStart, [0, 20], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const translateY = interpolate(frame - stepStart, [0, 20], [40, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const lineProgress = interpolate(
            frame - (stepStart + 15),
            [0, 20],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          return (
            <React.Fragment key={step.num}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                  width: 200,
                  opacity,
                  transform: `translateY(${translateY}px)`,
                }}
              >
                {/* Circle with icon */}
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    background: `${step.color}20`,
                    border: `2px solid ${step.color}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 36,
                  }}
                >
                  {step.icon}
                </div>
                {/* Step number */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: step.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#fff",
                  }}
                >
                  {step.num}
                </div>
                <h3
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: colors.textPrimary,
                    margin: 0,
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: colors.textSecondary,
                    textAlign: "center",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {step.description}
                </p>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  style={{
                    width: 60,
                    height: 2,
                    marginTop: 40,
                    background: colors.border,
                    position: "relative",
                    overflow: "hidden",
                    borderRadius: 1,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      height: "100%",
                      width: `${lineProgress * 100}%`,
                      background: colors.primary,
                      borderRadius: 1,
                    }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

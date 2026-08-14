import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { colors } from "../styles";

interface ProgressBarProps {
  startFrame?: number;
  duration?: number;
  width?: number;
  label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  startFrame = 0,
  duration = 60,
  width = 400,
  label = "Processing...",
}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame - startFrame, [0, duration], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ width, display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 14,
          color: colors.textSecondary,
        }}
      >
        <span>{label}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div
        style={{
          width: "100%",
          height: 6,
          borderRadius: 3,
          backgroundColor: colors.border,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            borderRadius: 3,
            background: colors.gradientPrimary,
            transition: "width 0.1s",
          }}
        />
      </div>
    </div>
  );
};

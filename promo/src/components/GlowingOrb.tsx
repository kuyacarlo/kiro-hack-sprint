import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { colors } from "../styles";

interface GlowingOrbProps {
  size?: number;
  color?: string;
  x?: number;
  y?: number;
  pulseSpeed?: number;
}

export const GlowingOrb: React.FC<GlowingOrbProps> = ({
  size = 200,
  color = colors.primary,
  x = 50,
  y = 50,
  pulseSpeed = 60,
}) => {
  const frame = useCurrentFrame();
  const scale = interpolate(
    frame % pulseSpeed,
    [0, pulseSpeed / 2, pulseSpeed],
    [1, 1.15, 1]
  );

  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        filter: "blur(40px)",
      }}
    />
  );
};

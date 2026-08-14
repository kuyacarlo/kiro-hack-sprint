import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

interface FadeInProps {
  children: React.ReactNode;
  startFrame?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  distance?: number;
  style?: React.CSSProperties;
}

export const FadeIn: React.FC<FadeInProps> = ({
  children,
  startFrame = 0,
  duration = 25,
  direction = "up",
  distance = 40,
  style,
}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame - startFrame, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateMap = {
    up: `translateY(${(1 - progress) * distance}px)`,
    down: `translateY(${-(1 - progress) * distance}px)`,
    left: `translateX(${(1 - progress) * distance}px)`,
    right: `translateX(${-(1 - progress) * distance}px)`,
    none: "none",
  };

  return (
    <div
      style={{
        opacity: progress,
        transform: translateMap[direction],
        ...style,
      }}
    >
      {children}
    </div>
  );
};

import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

interface AnimatedTextProps {
  text: string;
  startFrame?: number;
  style?: React.CSSProperties;
  className?: string;
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  startFrame = 0,
  style,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame - startFrame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const translateY = interpolate(frame - startFrame, [0, 20], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        ...style,
      }}
    >
      {text}
    </div>
  );
};

import React from "react";
import { Audio, staticFile } from "remotion";

interface NarrationAudioProps {
  src: string;
  volume?: number;
  startFrom?: number;
}

/**
 * NarrationAudio component - plays a narration audio file in sync with the video.
 * Audio files should be placed in public/narration/ and generated via:
 *   npx ts-node scripts/generate-narration.ts
 */
export const NarrationAudio: React.FC<NarrationAudioProps> = ({
  src,
  volume = 0.9,
  startFrom = 0,
}) => {
  return (
    <Audio
      src={staticFile(`narration/${src}`)}
      volume={volume}
      startFrom={startFrom}
    />
  );
};

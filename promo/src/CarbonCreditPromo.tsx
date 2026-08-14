import React from "react";
import { AbsoluteFill, Sequence, Audio, staticFile } from "remotion";
import { Intro } from "./scenes/Intro";
import { SatelliteVerification } from "./scenes/SatelliteVerification";
import { HowItWorks } from "./scenes/HowItWorks";
import { Marketplace } from "./scenes/Marketplace";
import { Dashboard } from "./scenes/Dashboard";
import { Outro } from "./scenes/Outro";

/**
 * Main promo video composition - 30 seconds at 30fps (900 frames total).
 * Each scene is 5 seconds (150 frames).
 *
 * Narration audio files are generated via ElevenLabs TTS:
 *   npx ts-node scripts/generate-narration.ts
 *
 * Place .mp3 files in public/narration/ directory.
 */
export const CarbonCreditPromo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0f1a" }}>
      {/* Scene 1: Intro - Hero reveal */}
      <Sequence from={0} durationInFrames={150}>
        <Intro />
      </Sequence>

      {/* Scene 2: Satellite Verification - NDVI flow */}
      <Sequence from={150} durationInFrames={150}>
        <SatelliteVerification />
      </Sequence>

      {/* Scene 3: How It Works - 4-step flow */}
      <Sequence from={300} durationInFrames={150}>
        <HowItWorks />
      </Sequence>

      {/* Scene 4: Marketplace - Credit trading */}
      <Sequence from={450} durationInFrames={150}>
        <Marketplace />
      </Sequence>

      {/* Scene 5: Dashboard - Stats & analytics */}
      <Sequence from={600} durationInFrames={150}>
        <Dashboard />
      </Sequence>

      {/* Scene 6: Outro - CTA */}
      <Sequence from={750} durationInFrames={150}>
        <Outro />
      </Sequence>

      {/*
       * Narration Audio Tracks (uncomment after running generate-narration.ts)
       *
       * <Sequence from={0} durationInFrames={150}>
       *   <Audio src={staticFile("narration/intro.mp3")} volume={0.9} />
       * </Sequence>
       * <Sequence from={150} durationInFrames={150}>
       *   <Audio src={staticFile("narration/satellite.mp3")} volume={0.9} />
       * </Sequence>
       * <Sequence from={300} durationInFrames={150}>
       *   <Audio src={staticFile("narration/how-it-works.mp3")} volume={0.9} />
       * </Sequence>
       * <Sequence from={450} durationInFrames={150}>
       *   <Audio src={staticFile("narration/marketplace.mp3")} volume={0.9} />
       * </Sequence>
       * <Sequence from={600} durationInFrames={150}>
       *   <Audio src={staticFile("narration/dashboard.mp3")} volume={0.9} />
       * </Sequence>
       * <Sequence from={750} durationInFrames={150}>
       *   <Audio src={staticFile("narration/outro.mp3")} volume={0.9} />
       * </Sequence>
       */}
    </AbsoluteFill>
  );
};

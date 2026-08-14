/**
 * Narration script for Carbon Credit Marketplace promo video.
 * Each scene has timed narration text that will be converted to speech via ElevenLabs.
 */

export interface NarrationSegment {
  id: string;
  scene: string;
  text: string;
  startFrame: number;
  durationInFrames: number;
}

export const narrationScript: NarrationSegment[] = [
  {
    id: "intro",
    scene: "Intro",
    text: "Introducing Carbon Credit Marketplace. A decentralized platform for transparent carbon credit trading on the Stellar blockchain, verified by Sentinel-2 satellite imagery.",
    startFrame: 0,
    durationInFrames: 150,
  },
  {
    id: "satellite",
    scene: "SatelliteVerification",
    text: "Every carbon credit starts with satellite verification. Using Sentinel-2 imagery through openEO, we analyze NDVI vegetation indices to validate that reforestation projects are real and measurable.",
    startFrame: 150,
    durationInFrames: 150,
  },
  {
    id: "how-it-works",
    scene: "HowItWorks",
    text: "The process is simple. First, verify your project area with satellite data. Then, issue carbon credits as on-chain assets on Stellar. Trade them peer-to-peer on our marketplace. Finally, retire credits to permanently offset carbon emissions.",
    startFrame: 300,
    durationInFrames: 150,
  },
  {
    id: "marketplace",
    scene: "Marketplace",
    text: "Our marketplace connects carbon credit sellers with buyers worldwide. Browse verified credits from reforestation, conservation, and renewable energy projects. Every transaction is recorded immutably on the Stellar ledger.",
    startFrame: 450,
    durationInFrames: 150,
  },
  {
    id: "dashboard",
    scene: "Dashboard",
    text: "Track everything in real-time. Your dashboard shows total credits issued, tonnes retired, trading volume, and full transaction history. Complete transparency, powered by blockchain.",
    startFrame: 600,
    durationInFrames: 150,
  },
  {
    id: "outro",
    scene: "Outro",
    text: "Carbon Credit Marketplace. The future of transparent, satellite-verified carbon credit trading. Get started today and be part of the solution.",
    startFrame: 750,
    durationInFrames: 150,
  },
];

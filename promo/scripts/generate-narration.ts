/**
 * ElevenLabs Text-to-Speech API client for generating narration audio.
 *
 * Usage:
 *   npx ts-node scripts/generate-narration.ts
 *
 * This will generate .mp3 files in public/narration/ for each scene.
 */

import fs from "fs";
import path from "path";
import { narrationScript } from "../src/narration/script";

const ELEVENLABS_API_KEY = "sk_d1f117ffe634dd8df8a39d24c9d484b43fb36556a2180d7c";
const BASE_URL = "https://api.elevenlabs.io/v1";

// Default voice - "Adam" (deep, professional narrator voice)
// You can change this to any ElevenLabs voice ID
const DEFAULT_VOICE_ID = "pNInz6obpgDQGcFmaJgB"; // Adam

interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}

const defaultVoiceSettings: VoiceSettings = {
  stability: 0.75,
  similarity_boost: 0.75,
  style: 0.5,
  use_speaker_boost: true,
};

async function listVoices(): Promise<void> {
  const response = await fetch(`${BASE_URL}/voices`, {
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to list voices: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log("\n🎙️  Available Voices:");
  console.log("─".repeat(50));
  for (const voice of data.voices.slice(0, 10)) {
    console.log(`  ${voice.name} (${voice.voice_id})`);
  }
  console.log("");
}

async function generateSpeech(
  text: string,
  voiceId: string = DEFAULT_VOICE_ID,
  settings: VoiceSettings = defaultVoiceSettings
): Promise<Buffer> {
  const response = await fetch(`${BASE_URL}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_monolingual_v1",
      voice_settings: settings,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `ElevenLabs API error: ${response.status} ${response.statusText}\n${errorText}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function generateNarration(): Promise<void> {
  const outputDir = path.resolve(__dirname, "../public/narration");

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log("🎬 Carbon Credit Marketplace - Narration Generator");
  console.log("═".repeat(55));
  console.log(`📁 Output: ${outputDir}`);
  console.log(`🔑 API Key: ${ELEVENLABS_API_KEY.slice(0, 8)}...`);
  console.log("");

  // List available voices
  await listVoices();

  console.log("🎙️  Generating narration for each scene...\n");

  for (const segment of narrationScript) {
    const outputPath = path.join(outputDir, `${segment.id}.mp3`);

    // Skip if already generated
    if (fs.existsSync(outputPath)) {
      console.log(`  ⏭️  ${segment.scene} - already exists, skipping`);
      continue;
    }

    console.log(`  🔄 ${segment.scene} - generating...`);
    console.log(`     "${segment.text.slice(0, 60)}..."`);

    try {
      const audioBuffer = await generateSpeech(segment.text);
      fs.writeFileSync(outputPath, audioBuffer);
      console.log(`  ✅ ${segment.scene} - saved (${(audioBuffer.length / 1024).toFixed(1)} KB)\n`);
    } catch (error) {
      console.error(`  ❌ ${segment.scene} - failed: ${error}\n`);
    }

    // Rate limiting - wait 500ms between requests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log("\n✨ Narration generation complete!");
  console.log("   Run `npm start` to preview the video with narration.");
}

// Run if called directly
generateNarration().catch(console.error);

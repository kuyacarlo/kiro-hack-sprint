# 🎬 Carbon Credit Marketplace - Promo Video

A Remotion-powered promotional video demonstrating the Carbon Credit Marketplace platform.

## 📖 Video Structure (30 seconds, 6 scenes)

| Scene | Duration | Description |
|-------|----------|-------------|
| 1. Intro | 0:00–0:05 | Hero reveal with title, globe animation, tagline |
| 2. Satellite | 0:05–0:10 | NDVI verification flow with scan animation |
| 3. How It Works | 0:10–0:15 | 4-step animated flow (Verify→Issue→Trade→Retire) |
| 4. Marketplace | 0:15–0:20 | Credit trading table with staggered row reveals |
| 5. Dashboard | 0:20–0:25 | Stats cards and bar chart with counting animations |
| 6. Outro | 0:25–0:30 | CTA, tech stack, branding |

## 🚀 Getting Started

```bash
cd promo

# Install dependencies
npm install

# Launch Remotion Studio (preview in browser)
npm start

# Render final video
npm run build
```

## 🎙️ Narration (ElevenLabs TTS)

The video includes AI narration powered by ElevenLabs:

```bash
# Generate narration audio files
npm run narrate
```

This creates `.mp3` files in `public/narration/` for each scene. After generating:
1. Uncomment the Audio sequences in `src/CarbonCreditPromo.tsx`
2. Run `npm start` to preview with narration

### Configuration

- **API Key**: Set in `scripts/generate-narration.ts`
- **Voice**: Default is "Adam" (professional narrator). Change `DEFAULT_VOICE_ID` to use other voices.
- **Script**: Edit narration text in `src/narration/script.ts`

## 📁 Project Structure

```
promo/
├── package.json
├── tsconfig.json
├── remotion.config.ts
├── scripts/
│   └── generate-narration.ts    # ElevenLabs TTS generator
├── public/
│   └── narration/               # Generated .mp3 files
└── src/
    ├── index.ts                 # Remotion entry point
    ├── Root.tsx                  # Composition registry
    ├── CarbonCreditPromo.tsx     # Main composition (sequences scenes)
    ├── styles.ts                # Color palette & typography
    ├── narration/
    │   └── script.ts            # Narration text per scene
    ├── components/
    │   ├── AnimatedText.tsx      # Fade-in text with translate
    │   ├── FadeIn.tsx           # Directional fade-in wrapper
    │   ├── GlowingOrb.tsx       # Animated background orbs
    │   ├── NarrationAudio.tsx   # Audio playback component
    │   └── ProgressBar.tsx      # Animated progress bar
    └── scenes/
        ├── Intro.tsx            # Scene 1: Hero reveal
        ├── SatelliteVerification.tsx  # Scene 2: NDVI verification
        ├── HowItWorks.tsx       # Scene 3: 4-step flow
        ├── Marketplace.tsx      # Scene 4: Credit trading
        ├── Dashboard.tsx        # Scene 5: Analytics
        └── Outro.tsx            # Scene 6: CTA
```

## 🎨 Design

- **Resolution**: 1920×1080 (Full HD)
- **FPS**: 30
- **Theme**: Dark (#0a0f1a) with green accent (#10B981)
- **Style**: Glassmorphism, glowing orbs, staggered animations

## 🔧 Customization

### Change narration text
Edit `src/narration/script.ts` and re-run `npm run narrate`.

### Adjust timing
Each scene is 150 frames (5 seconds). Modify `durationInFrames` in `src/CarbonCreditPromo.tsx`.

### Add scenes
1. Create new scene in `src/scenes/`
2. Add to sequence in `src/CarbonCreditPromo.tsx`
3. Add narration text in `src/narration/script.ts`
4. Update `durationInFrames` in `src/Root.tsx`

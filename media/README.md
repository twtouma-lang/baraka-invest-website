# BARAKA Invest — investor film

`baraka-invest-film.mp4` is a 64-second brand film for investors: 1920×1080, 24 fps, H.264 with AAC stereo, mixed to −14 LUFS.

## Narration

> Every market tells a story. 40-plus markets, 11 sectors, 60-plus industries, all moving at once.
> Most investors hear the noise. The few who lead see the signal.
> Baraka Invest turns complexity into clarity. Institutional-grade research on countries, sectors and industries, with Shariah intelligence woven through every page.
> Business activity screens, financial ratios, purification guidance: conviction and compliance in the same document.
> So, before you commit capital, you already know the forces shaping the next 24 months.
> Knowledge, amplified. Decisions, sharpened.
> Baraka Invest. Intelligence, before it's obvious.

## Structure

| Time | Picture |
|---|---|
| 0:00 | A line of light becomes the Earth's horizon, then an accelerating dive into the Gulf |
| 0:06 | Counters over the Gulf, a solar field and a port: 40+ markets, 11 sectors, 60+ industries |
| 0:11 | A burst of world markets, then the noise: trading screens, shake and RGB split |
| 0:17 | Cut to black on a heartbeat. A gold signal line rises out of the noise and folds into a lit window |
| 0:20 | One unbroken push through that window into the library, timed to the music's lift at 0:24.6 |
| 0:25 | Institutional-grade research, then a gold blade wipes to the report on the desk |
| 0:30 | Shariah intelligence: a gold thread runs the report's spine, and an eight-point star opens onto the lattice |
| 0:34 | Glass card: Shariah screening, three checks, AAOIFI-aligned |
| 0:39 | Conviction & compliance: a market line and a Shariah line meet and frame one document |
| 0:43 | The investor at the glass, with a timeline: today, 12 months, 24 months |
| 0:49 | Sunrise: Knowledge, amplified. Decisions, sharpened. |
| 0:54 | The mark assembles stroke by stroke, landing on the music's bar line, then wordmark, tagline and disclaimer |

Every on-screen claim is taken from the site copy: 40+ markets, 11 sectors, 60+ industries, AAOIFI-aligned screens, the hero line, the tagline and "Research, not investment advice."

## How it was made

- **Stills.** 13 plates were generated on Higgsfield with Soul Cinema (2K, 16:9).
- **Narration.** One ElevenLabs v4 take was generated through Higgsfield with the "Alistair" preset voice. It was cut into 19 lines and re-timed to the picture.
- **Motion, typography and transitions.** `film-source/engine/` is a deterministic Canvas renderer: each frame is a pure function of time.
  - camera moves, transitions and the logo resolve
  - motion blur from sub-frame accumulation
  - bloom, vignette and film grain
- **Mix.** `film-source/tools/mix.py` places the narration and edits the music to land the track's final phrase on the logo. It rides the quiet intro up, ducks the music under the voice and places the sound effects. The result is then loudness-normalised.

## Credits and licences

- **Music.** "A New Life" by Eugenio Mininni, from Mixkit, used under the [Mixkit licence](https://mixkit.co/license/).
- **Sound effects.** All from Mixkit, under the same licence:
  - Magical light sweep
  - Magical light transition
  - Cinematic whoosh fast transition
  - Air woosh
  - Cinematic tunnel reverb woosh
  - Cinematic whoosh deep impact
  - Movie logo intro impact
  - Big cinematic impact
  - Deep heartbeat impact
  - Cool interface click tone
  - Interface option select
  - Page turn chime
  - Magic transition sweep presentation
  - Short transition sweep
  - Shot light energy flowing
- **Type.** Cinzel and Lato, the site's own fonts, under the SIL Open Font License.
- **Logo.** The mark is `image-01.svg` from this site.

## Re-rendering

The stills, narration, music and sound-effect files are not committed. To re-render:

1. Place the assets beside the engine under these names:
   - `engine/stills/s01_earth.jpg` … `s13_sunrise.jpg`
   - `engine/brand/`: the site's `image-01.svg` and the font files `font-02`, `font-04`, `font-06` and `font-08`
   - `vo/L*.wav`: the narration lines listed in `lines.json`
   - `music/543.mp3` and `sfx/*.mp3`
2. Run the commands below.

```bash
NODE_PATH=$(npm root -g) node engine/render.js frames 0:1536
```

```bash
python3 tools/mix.py .
```

The first command needs Playwright with Chromium.

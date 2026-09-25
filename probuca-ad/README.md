# Probuca: new specialist announcement (30 s, 3D)

**Deliverable:** `probuca-nouvelle-specialiste.mp4` (1920×1080, 30 fps, H.264 + AAC, 30 s)

Built on probuca.ca's identity: white and black blocks, uppercase grotesk type (Inter Tight), and the line **P mark** (three squares plus a half-circle). The mark animates in the site's pink `#CF5878` and resolves to the official lockup (mark + PROBUCA at the bottom right): black on white for the opening, white on black for the close. The mark is rebuilt as extruded 3D geometry and animated in Three.js, then rendered frame by frame in headless Chromium.

| Time | Scene |
|---|---|
| 0–6 s | The four pieces of the P mark fly in and lock together, then settle into the official black logo lockup with « Implantologie + Chirurgie buccale et maxillo-faciale » |
| 6–10 s | The mark opens up in 3D: « Dre Mireille Faucher et associés accueillent une nouvelle spécialiste » |
| 10–22 s | Camera pushes into the mark. Her portrait is revealed inside its centre square, with « Bienvenue à », name and specialty |
| 22–30 s | Black wipe (like the site's black sections). The lockup re-forms in white: « Dès décembre 2026 », « Prenez rendez-vous », PROBUCA.CA, address |

## Editing

All copy, colours and the photo path are in **`config.js`**. Before publishing, replace:

- `name`: `DRE SAVARIA` (add her first name if wanted; long names shrink to fit automatically)
- `specialty`: currently `SPÉCIALISTE EN — À CONFIRMER`

## Commands

```bash
npm install
npm run preview   # open http://localhost:8080 to watch it play live in a browser
npm run stills    # quick JPG checks in out/
npm run render    # music.py → frames → out/video-silent.mp4 → final MP4 with music (~15 min)
```

Rendering needs `pip install imageio-ffmpeg numpy` (provides an ffmpeg with H.264) and Playwright's Chromium.

## Files

- `index.html`: stage layout and typography (Inter Tight, bundled locally)
- `scene.js`: 3D P mark, choreography, animation timeline
- `music.py`: synthesized ambient music bed with chimes timed to each text reveal
- `render.mjs` / `mux.mjs`: frame capture and encoding
- `assets/specialist-square.jpg`: the supplied photo, square-cropped for the mark's centre square

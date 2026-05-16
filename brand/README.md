# Noxus Studios — Brand Assets

Brutalist geometric N monogram + supporting variants.

## Files

### Marks (SVG — primary, scalable to any size)

| File | Background | Mark color | Use case |
|---|---|---|---|
| `mark-orange.svg` | Orange (#E8540A) | Cream (#E8DCCB) | **Primary** — favicon, social avatars, app icons |
| `mark-cream.svg` | Cream (#E8DCCB) | Dark (#1A1A1A) + orange dot | Light surfaces, business cards |
| `mark-dark.svg` | Dark (#1A1A1A) | Cream (#E8DCCB) + orange dot | Dark surfaces, social on dark themes |
| `mark-monochrome.svg` | Transparent | `currentColor` | Embed inline, inherits parent color (print, single-color) |

### Lockups (mark + wordmark)

| File | Format | Use case |
|---|---|---|
| `lockup-horizontal.svg` | 160×32 | Email header, website header, business card front |
| `lockup-stacked.svg` | 200×200 | Square contexts — Instagram, LinkedIn profile, app icon |

### PNG exports (auto-generated, regenerable)

512×512 and 1024×1024 PNG versions of each mark. Used for social media uploads, print materials, anywhere SVG isn't supported.

- `mark-orange-512.png` — Twitter/X avatar, smaller social
- `mark-orange-1024.png` — Instagram avatar, LinkedIn profile
- `mark-cream-512.png` — light backgrounds
- `mark-dark-512.png` — dark backgrounds
- `lockup-stacked-1024.png` — square brand image for social posts

### Favicons (in project root, wired into all pages)

| File | Size | Purpose |
|---|---|---|
| `../favicon.svg` | scalable | Modern browsers (Chrome, Safari, Firefox, Edge) |
| `../favicon-192.png` | 192×192 | Android Chrome, PWA |
| `../favicon-512.png` | 512×512 | PWA splash, hi-dpi |
| `../apple-touch-icon.png` | 180×180 | iOS Safari home-screen bookmark |

## Color tokens

```
Orange    #E8540A   (primary brand)
Orange/h  #C44606   (hover/pressed)
Cream     #E8DCCB   (off-white, primary surface)
Dark      #1A1A1A   (charcoal, primary text on cream)
```

## Typography

- **Display:** Bebas Neue (free on Google Fonts) — for headlines, wordmark
- **Body:** Barlow Condensed (free on Google Fonts) — for body, UI
- **Mono:** Space Grotesk (free on Google Fonts) — for code/labels

Wordmark style: lowercase `noxus.` with the period in orange.

## Regenerating PNGs

Whenever you edit an SVG, regenerate the matching PNGs:

```
node noxus/brand/_generate-pngs.mjs
```

Requires puppeteer (already installed for the project's screenshot pipeline).

## When to use what

- **Browser tab / favicon** → `favicon.svg` (already wired in HTML)
- **Instagram avatar** → `mark-orange-1024.png` (or use `lockup-stacked-1024.png` if you want wordmark visible)
- **X/Twitter avatar** → `mark-orange-1024.png`
- **YouTube avatar** → `mark-orange-1024.png`
- **LinkedIn company logo** → `lockup-stacked-1024.png`
- **Business card front** → `lockup-horizontal.svg` (export to PDF from Figma/Illustrator)
- **Business card back** → `mark-cream.svg` centered, with `joseph@noxusstudios.com` below
- **Email signature image** → don't use one (you decided plain text)
- **Print materials** → use SVG sources, scale up

## Notes

- Wordmark SVGs use Bebas Neue as the typeface. The browser renders it correctly via the loaded Google Font; in Figma/Illustrator/etc., install Bebas Neue from Google Fonts (free) before opening.
- The cream and dark variants include a tiny orange square at the bottom-right — the visual echo of the `noxus.` wordmark period. The orange-bg variant doesn't need it (the entire background is the accent color).

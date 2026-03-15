# reqlog brand guidelines

## The mark

One line. One dot. That's it.

A white horizontal line terminating in a green circle — a request travelling to its endpoint, live. The green dot means *live*, means *connected*, means *it arrived*.

## Colors

| Token | Hex | Usage |
|---|---|---|
| `--reqlog-black` | `#0a0a0d` | Primary background, icon fill |
| `--reqlog-white` | `#ffffff` | Primary text on dark |
| `--reqlog-green` | `#00D084` | The dot — live indicator, accent only |
| `--reqlog-muted` | `#6e6e80` | "log" in light wordmark |
| `--reqlog-muted-dark` | `#4e4e5a` | "log" in dark wordmark |
| `--reqlog-surface` | `#111114` | Icon background on dark |

The green `#00D084` is used for **one thing only**: the dot. Never use it for backgrounds, text, or decorative elements. Its rarity is what makes it powerful.

## Typography

The wordmark uses system sans-serif: `-apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Display', sans-serif`

- `req` — weight 600–700 (semi-bold / bold)
- `log` — weight 200–300 (extralight / light)

The weight contrast *is* the logo. Never use the same weight for both halves.

## Files in this package

```
svg/
├── reqlog-light.svg          Primary lockup — use on white/light backgrounds
├── reqlog-dark.svg           Primary lockup — use on dark backgrounds
├── reqlog-hero.svg           Large display version — landing pages, slides
├── reqlog-wordmark.svg       Text + dot, no icon — README header
├── reqlog-wordmark-dark.svg  Text + dot, dark version
├── reqlog-icon-dark.svg      Square icon 56px — npm page, GitHub
├── reqlog-icon-light.svg     Square icon on light bg — docs
├── reqlog-icon-circle.svg    Circle — GitHub avatar, Discord
├── reqlog-compact-light.svg  Tiny inline — navbar, footer
├── reqlog-compact-dark.svg   Tiny inline dark
├── reqlog-favicon.svg        16×16 favicon optimized
└── reqlog-og-1200x630.svg   Social preview card (og:image)
```

## Usage by context

| Context | File |
|---|---|
| GitHub README header | `reqlog-light.svg` or `reqlog-wordmark.svg` |
| npm package page | `reqlog-icon-dark.svg` |
| Chrome Web Store icon | `reqlog-icon-dark.svg` (export 128×128 PNG) |
| Twitter/X avatar | `reqlog-icon-circle.svg` (export 400×400 PNG) |
| GitHub organization avatar | `reqlog-icon-circle.svg` |
| Discord server icon | `reqlog-icon-circle.svg` |
| Landing page hero | `reqlog-hero.svg` |
| Conference slides | `reqlog-hero.svg` |
| og:image / social preview | `reqlog-og-1200x630.svg` |
| Navbar / topbar | `reqlog-compact-light.svg` or `reqlog-compact-dark.svg` |
| Browser favicon | `reqlog-favicon.svg` |
| DEV.to article header | `reqlog-light.svg` |

## What never to do

- Never stretch or distort the mark
- Never change the green dot color
- Never use both `req` and `log` at the same font weight
- Never place the logo on a colored background (only black, white, or very dark gray)
- Never add a drop shadow or outline
- Never recreate the mark in a different font

## Exporting PNGs

Use any SVG-to-PNG tool. Recommended sizes:

```bash
# npm install -g svgexport
svgexport reqlog-icon-dark.svg reqlog-icon-128.png 128:128
svgexport reqlog-icon-dark.svg reqlog-icon-256.png 256:256
svgexport reqlog-icon-circle.svg reqlog-avatar-400.png 400:400
svgexport reqlog-og-1200x630.svg reqlog-og.png 1200:630
```

## In your web app

```html
<!-- Favicon -->
<link rel="icon" type="image/svg+xml" href="/brand/reqlog-favicon.svg">

<!-- og:image -->
<meta property="og:image" content="https://reqlog.dev/brand/reqlog-og.png">

<!-- In a React component -->
<img src="/brand/reqlog-compact-dark.svg" alt="reqlog" height="20" />
```

## In your npm package README

```markdown
<p align="center">
  <img src="https://raw.githubusercontent.com/yourusername/reqlog/main/brand/reqlog-hero.svg" alt="reqlog" width="240">
</p>
```

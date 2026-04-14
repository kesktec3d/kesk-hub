# Kesk Hub — Growth Mechanics Design
**Date:** 2026-04-14  
**Scope:** 6 priority ⭐ mechanics (01, 03, 05, 09, 12, 15) from the 15 growth mechanics spec  
**Stack:** Vercel serverless · Upstash KV · Three.js · Cloudinary · no auth required

---

## Context

The Kesk Hub is a radial configurator hub at kesk.ch with 5 active configurators (UV Art, Vase, Texte 3D, Constellation, Son & Onde). The codebase uses standalone HTML files per configurator, Vercel serverless functions in `/api`, and Upstash KV for persistence.

Already implemented: Seed SHA / K-code sharing (02), Spotify waveform preview in kesk-onde (06).

---

## Architecture Decision

**Approach B — Dedicated files per feature.** Each mechanic gets its own HTML page and/or API endpoint. No shared JS bundle. Follows the existing pattern of the repo.

Routes to add in `vercel.json`:
- `/galerie` → `kesk-galerie.html`
- `/badge` → `kesk-badge.html`

---

## Mechanic Designs

### 05 · Made in Valais Badge (priority 1 — lowest complexity)

**What:** After any config is saved (K-code exists), a button "Télécharger mon badge" appears. Generates a downloadable SVG vectoriel with: "Conçu par moi · Imprimé à Saillon · [canton] · [date]".

**Where:** New standalone page `kesk-badge.html` at `/badge`. Linked from the share flow in `index.html` after K-code is generated.

**How:**
- Client-side SVG generation only — no server needed
- URL params: `/badge?config=K-XXXX&canton=VS` (canton optional, default VS)
- SVG includes: Kesk logo mark, "Conçu par moi", "Imprimé à Saillon, Valais", date, canton flag emoji
- Download via `<a href="data:image/svg+xml..." download="kesk-badge.svg">`
- Also offers PNG download via Canvas `drawImage` of the SVG

**KV changes:** None.

---

### 01 · Édition Lunaire (priority 2)

**What:** A persistent banner in `index.html` showing the current lunar-exclusive color/motif available in configurators, with a countdown to the next new moon.

**Where:** A fixed pill/badge at the top of `index.html`, visible on the hub. Also a "lunar" tag on relevant petal cards when a lunar edition is active.

**How:**
- Lunar phase calculated client-side in JS (no API needed) using the known synodic cycle (29.53 days) anchored to a reference new moon date
- Current lunar color stored in Upstash KV as `lunar:current` — a JSON object `{name, hex, configurateurs, active_from, active_until}`
- New endpoint `api/lunar.js` (GET) returns current lunar edition data
- The badge shows: color swatch + name + countdown timer (days/hours)
- When no lunar edition is active, badge is hidden
- Initial lunar editions are seeded manually via KV (Kesk team sets them)

**KV keys:**
- `lunar:current` → `{name, hex, label, configurateurs[], active_from, active_until}`

---

### 12 · Carte Cadeau Vivante (priority 3)

**What:** Extend the existing gift flow in `index.html`. After the gift recommendation step, instead of just opening the configurator, a "Créer un lien cadeau" button generates a shareable URL. The recipient opens the URL and finds the configurator pre-loaded with the recommended config, with a gift message overlay.

**Where:** Extension of existing `#giftOverlay` flow in `index.html`.

**How:**
- Gift result step gains a second CTA: "Créer un lien cadeau 🎁" alongside existing "Configurer ce cadeau →"
- Clicking it: saves a gift object to KV via `api/save-gift.js` → returns a gift code `G-XXXX`
- Shareable URL: `/?gift=G-XXXX`
- On load, if `?gift=G-XXXX` is in URL: load the gift from `api/load-gift.js`, show a gift reveal overlay (recipient name, message, sender name) with a "Voir ma création" button that opens the relevant configurator with the pre-seeded config
- The gift object includes: `{dest, occasion, budget, configurateur_url, message, from_name, created_at}`
- No actual config params are pre-filled into the 3D configurator — the gift just opens the recommended configurator with a warm welcome overlay

**KV keys:**
- `gift:G-XXXX` → JSON gift object, TTL 365 days

**New API endpoints:**
- `api/save-gift.js` — POST `{dest, occasion, budget, configurateur_url, message, from_name}` → returns `{code}`
- `api/load-gift.js` — GET `?code=G-XXXX` → returns gift object

---

### 09 · Duo Créateur — option C (priority 4)

**What:** A "Créer avec quelqu'un" button in the hub. Simplified: generates a session link that opens the same configurator with a "duo mode" banner. No real-time sync — the second person starts from the same configurator entry point. The shared moment is the invitation itself.

**Where:** New floating button in `index.html`, visible alongside the share and gift buttons.

**How:**
- When a configurator iframe is open and a K-code exists, a "👥 Inviter" button appears
- Clicking it generates a duo URL: `/?duo=K-XXXX` (or `/?config=K-XXXX&duo=1`)
- On load, if `?duo=1` is present, a "Mode Duo" overlay appears briefly: "Quelqu'un vous a invité à co-créer · Vous partez du même point" with a dismiss button
- No WebSocket, no server state, no new API endpoint needed
- The duo URL IS the config URL with a `&duo=1` flag — the existing load-config system handles loading the base config

**KV changes:** None — reuses existing config system.

---

### 03 · Galerie des Créations (priority 5)

**What:** A public gallery page `/galerie` showing recent configurations saved via the K-code system. Auto-populated: every saved K-code is eligible to appear. No manual submission.

**Where:** New page `kesk-galerie.html` at `/galerie`. A "Galerie" link added to the hub footer and as a petal card (tagged "Nouveau").

**How:**
- When a config is saved via `api/save-config.js`, also push the code to a KV sorted set `gallery:codes` with score = timestamp (ZADD)
- New endpoint `api/gallery.js` (GET) — fetches last 50 codes from `gallery:codes` (ZRANGE by score desc), then batch-fetches configs, returns array of `{code, config, created_at}`
- `kesk-galerie.html` fetches from `/api/gallery`, renders a masonry-style grid of config cards
- Each card shows: configurateur type (icon), color swatches from config params, K-code, "Recréer →" button that opens `/?config=K-XXXX`
- Filter buttons: by configurateur type (UV, Vase, Texte, etc.)
- No names, no profiles — fully anonymous

**KV changes:**
- Modify `api/save-config.js` to also do `ZADD gallery:codes <timestamp> <code>`
- `gallery:codes` sorted set — capped at 200 entries (ZREMRANGEBYRANK on overflow)

**New files:**
- `kesk-galerie.html`
- `api/gallery.js`

---

### 15 · Effet Miroir (priority 6)

**What:** In each configurator, a "✦ Télécharger l'animation" button captures the rotating 3D object as a GIF (10 seconds, black background) using gif.js, downloadable without account.

**Where:** Each active configurator HTML file (kesk-vase.html, kesk-uv.html, kesk-text3d.html, kesk-constellation.html, kesk-onde.html) gets the button. Also surfaced in the hub's config-code panel.

**How:**
- Load `gif.js` (CDN) only when button is clicked (lazy load to avoid initial bundle cost)
- Capture ~60 frames from the Three.js canvas at 6fps over 10 seconds (or current canvas if not Three.js)
- gif.js assembles the frames client-side
- Download via object URL
- Button states: idle → "Génération… XX%" → "Télécharger le GIF ↓"
- Canvas must be accessible (not tainted) — all configurators use local/Cloudinary assets which are CORS-enabled

**Note on kesk-uv.html:** UV art is image-based, not a rotating 3D object. The "mirror effect" here captures the current UV render as a still + zoom animation (CSS transform recorded as frames).

**No new API endpoints needed.**

---

## File Changes Summary

| File | Change |
|------|--------|
| `index.html` | Add lunar badge, duo button, gift "create link" CTA, gallery petal |
| `api/save-config.js` | Also push code to `gallery:codes` sorted set |
| `api/save-gift.js` | New — saves gift objects |
| `api/load-gift.js` | New — loads gift by G-code |
| `api/lunar.js` | New — returns current lunar edition |
| `api/gallery.js` | New — returns last 50 gallery entries |
| `kesk-badge.html` | New — badge generator page |
| `kesk-galerie.html` | New — gallery page |
| `vercel.json` | Add routes for `/galerie` and `/badge` |
| configurators (5×) | Add Effet Miroir button + gif.js capture logic |

---

## Out of Scope (non-priority mechanics)

04 · Tirage du Jour · 07 · Série Numérotée · 08 · Configurateur Fantôme · 10 · Palmarès Valais · 11 · Snapshot AR · 13 · Trace de Fabrication · 14 · Saison des Formes — to be planned in a separate cycle.

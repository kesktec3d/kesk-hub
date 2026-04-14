# Growth Mechanics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 6 priority growth mechanics (01, 03, 05, 09, 12, 15) into the Kesk Hub to drive retention, acquisition, and conversion without requiring user accounts.

**Architecture:** Dedicated HTML files per feature (Approach B). Each mechanic is self-contained: new HTML pages get their own file + Vercel route, API endpoints follow the existing pattern (Upstash KV via REST, same CORS headers), and `index.html` receives targeted additions only.

**Tech Stack:** Vanilla JS · Vercel serverless (ESM exports) · Upstash KV REST API · Three.js (already loaded in configurators) · MediaRecorder API (browser-native, no library needed)

---

## File Map

| File | Status | Responsibility |
|------|--------|----------------|
| `vercel.json` | Modify | Add routes `/galerie` and `/badge` |
| `kesk-badge.html` | Create | Badge generator page (05) |
| `kesk-galerie.html` | Create | Public gallery page (03) |
| `api/lunar.js` | Create | GET current lunar edition from KV (01) |
| `api/save-gift.js` | Create | POST gift → returns G-code (12) |
| `api/load-gift.js` | Create | GET gift by G-code (12) |
| `api/gallery.js` | Create | GET last 50 gallery entries (03) |
| `api/save-config.js` | Modify | Also push code to `gallery:codes` sorted set (03) |
| `index.html` | Modify | Lunar banner (01), gift link CTA + gift reveal (12), duo button (09), gallery petal (03) |
| `kesk-vase.html` | Modify | Effet Miroir button (15) |
| `kesk-text3d.html` | Modify | Effet Miroir button (15) |
| `kesk-constellation.html` | Modify | Effet Miroir button (15) |

---

## Task 1: Routes — vercel.json

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Add the two new routes**

In `vercel.json`, inside the `"routes"` array, add after the existing `/constellation` route:

```json
{ "src": "/galerie", "dest": "/kesk-galerie.html" },
{ "src": "/badge", "dest": "/kesk-badge.html" },
```

The routes section should look like:
```json
"routes": [
  { "src": "/api/(.*)", "dest": "/api/$1" },
  { "src": "/vase", "dest": "/kesk-vase.html" },
  { "src": "/uv", "dest": "/kesk-uv.html" },
  { "src": "/texte", "dest": "/kesk-text3d.html" },
  { "src": "/onde", "dest": "/kesk-onde.html" },
  { "src": "/constellation", "dest": "/kesk-constellation.html" },
  { "src": "/galerie", "dest": "/kesk-galerie.html" },
  { "src": "/badge", "dest": "/kesk-badge.html" },
  { "src": "/(.*\\.html)", "dest": "/$1" },
  { "src": "/(.*)", "dest": "/index.html" }
]
```

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "feat: add routes for /galerie and /badge"
```

---

## Task 2: Made in Valais Badge — kesk-badge.html (05)

**Files:**
- Create: `kesk-badge.html`

The page reads `?config=K-XXXX` from the URL, renders an SVG badge preview, and offers SVG + PNG download. No API calls needed.

- [ ] **Step 1: Create kesk-badge.html**

```html
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Kesk · Mon Badge Valais</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#0d0d0d;--surface:#161616;--border:#2a2a2a;--accent:#c8f060;--text:#e8e8e0;--muted:#666}
body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;gap:32px}
h1{font-size:22px;font-weight:700;letter-spacing:-.3px}
h1 span{color:var(--accent)}
.subtitle{font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-top:6px}
.badge-wrap{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:32px;display:flex;flex-direction:column;align-items:center;gap:24px;max-width:560px;width:100%}
.badge-preview{width:100%;max-width:480px}
.badge-preview svg{width:100%;height:auto;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,.5)}
.btn-row{display:flex;gap:12px;flex-wrap:wrap;justify-content:center}
.btn{padding:10px 24px;border-radius:8px;border:none;font-family:'DM Mono',monospace;font-size:12px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;transition:all .2s}
.btn-svg{background:var(--accent);color:#000;font-weight:700}
.btn-svg:hover{background:#d4f570}
.btn-png{background:transparent;border:1px solid var(--border);color:var(--muted)}
.btn-png:hover{border-color:var(--accent);color:var(--accent)}
.back{font-family:'DM Mono',monospace;font-size:11px;color:var(--muted);text-decoration:none;letter-spacing:.1em;opacity:.6;transition:opacity .2s}
.back:hover{opacity:1}
.canton-row{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.canton-btn{padding:5px 14px;border-radius:20px;border:1px solid var(--border);background:transparent;color:var(--muted);font-family:'DM Mono',monospace;font-size:11px;cursor:pointer;transition:all .2s}
.canton-btn.active,.canton-btn:hover{border-color:var(--accent);color:var(--accent)}
</style>
</head>
<body>
<div>
  <h1>Mon Badge <span>Valais</span></h1>
  <p class="subtitle">Créé à Saillon · Imprimé localement</p>
</div>

<div class="badge-wrap">
  <div class="badge-preview" id="badgePreview"></div>
  <div class="canton-row" id="cantonRow"></div>
  <div class="btn-row">
    <button class="btn btn-svg" onclick="downloadSVG()">Télécharger SVG</button>
    <button class="btn btn-png" onclick="downloadPNG()">Télécharger PNG</button>
  </div>
</div>

<a class="back" href="/">← Retour au hub</a>

<script>
const CANTONS = ['VS','VD','GE','BE','ZH','FR','NE','JU','GR','TI'];
const params = new URLSearchParams(location.search);
const configCode = params.get('config') || '';
let selectedCanton = params.get('canton') || 'VS';

const now = new Date();
const dateStr = now.toLocaleDateString('fr-CH',{day:'numeric',month:'long',year:'numeric'});

function buildSVG(code, canton) {
  const codeText = code ? code.toUpperCase() : 'KESK · CH';
  return `<svg id="badge-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 240" width="480" height="240">
  <defs>
    <linearGradient id="bg-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#161616"/>
      <stop offset="1" stop-color="#0d0d0d"/>
    </linearGradient>
  </defs>
  <rect width="480" height="240" rx="16" fill="url(#bg-grad)"/>
  <rect x="1.5" y="1.5" width="477" height="237" rx="15" fill="none" stroke="#c8f060" stroke-width="1.5"/>
  <!-- K logo -->
  <rect x="28" y="28" width="60" height="60" rx="10" fill="#c8f060"/>
  <text x="58" y="69" font-family="Arial Black,Arial,sans-serif" font-size="38" fill="#000" text-anchor="middle" font-weight="900">K</text>
  <!-- Texts -->
  <text x="106" y="56" font-family="Arial,Helvetica,sans-serif" font-size="21" fill="#e8e8e0" font-weight="700">Conçu par moi</text>
  <text x="106" y="78" font-family="Courier New,Courier,monospace" font-size="11" fill="#666666" letter-spacing="1.5">IMPRIMÉ À SAILLON · ${canton}</text>
  <!-- Divider -->
  <line x1="28" y1="108" x2="452" y2="108" stroke="#2a2a2a" stroke-width="1"/>
  <!-- Config code -->
  <text x="28" y="142" font-family="Courier New,Courier,monospace" font-size="22" fill="#c8f060" letter-spacing="3" font-weight="700">${codeText}</text>
  <!-- Date -->
  <text x="28" y="172" font-family="Courier New,Courier,monospace" font-size="11" fill="#555555" letter-spacing="1">${dateStr.toUpperCase()}</text>
  <!-- Swiss cross -->
  <rect x="430" y="22" width="18" height="6" rx="1" fill="#ff0000"/>
  <rect x="436" y="16" width="6" height="18" rx="1" fill="#ff0000"/>
  <!-- kesk.ch -->
  <text x="452" y="220" font-family="Courier New,Courier,monospace" font-size="11" fill="#333333" text-anchor="end">kesk.ch</text>
</svg>`;
}

function renderBadge() {
  document.getElementById('badgePreview').innerHTML = buildSVG(configCode, selectedCanton);
}

function buildCantonButtons() {
  const row = document.getElementById('cantonRow');
  CANTONS.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'canton-btn' + (c === selectedCanton ? ' active' : '');
    btn.textContent = c;
    btn.onclick = () => {
      selectedCanton = c;
      document.querySelectorAll('.canton-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderBadge();
    };
    row.appendChild(btn);
  });
}

function downloadSVG() {
  const svg = document.getElementById('badge-svg');
  const data = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([data], {type:'image/svg+xml'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'kesk-badge.svg'; a.click();
  URL.revokeObjectURL(url);
}

function downloadPNG() {
  const svg = document.getElementById('badge-svg');
  const data = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 960; canvas.height = 480;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0,0,960,480);
    ctx.drawImage(img,0,0,960,480);
    const a = document.createElement('a');
    a.download = 'kesk-badge.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(data);
}

buildCantonButtons();
renderBadge();
</script>
</body>
</html>
```

- [ ] **Step 2: Verify in browser**

Run `vercel dev`. Open `http://localhost:3000/badge?config=K-TEST&canton=VS`.
Expected: badge preview renders with "K-TEST" code, date, canton selector works, SVG downloads correctly.

- [ ] **Step 3: Commit**

```bash
git add kesk-badge.html
git commit -m "feat(05): Made in Valais Badge page"
```

---

## Task 3: Badge link in index.html (05)

**Files:**
- Modify: `index.html` (3 locations)

The badge link appears in the iframe-bar (top bar of the open configurator) once a K-code is saved.

- [ ] **Step 1: Add badge button to iframe-bar HTML**

Find the `<div class="iframe-bar">` section (around line 547). After the `<button class="iframe-back" onclick="closeIframe()">Retour</button>`, add:

```html
<a id="badgeLink" href="/badge" target="_blank"
   style="display:none;font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.08em;
          text-transform:uppercase;color:rgba(200,240,96,.7);text-decoration:none;
          border:1px solid rgba(200,240,96,.3);padding:5px 12px;border-radius:20px;
          transition:all .2s"
   onmouseover="this.style.color='#c8f060';this.style.borderColor='rgba(200,240,96,.7)'"
   onmouseout="this.style.color='rgba(200,240,96,.7)';this.style.borderColor='rgba(200,240,96,.3)'">
  ✦ Mon badge
</a>
```

- [ ] **Step 2: Show badge link when K-code is set**

In the `saveConfig` function (around line 570), after the line `history.replaceState({}, '', url);`, add:

```js
// Show badge link in iframe bar
const badgeLink = document.getElementById('badgeLink');
if (badgeLink) {
  badgeLink.href = '/badge?config=' + d.code;
  badgeLink.style.display = 'inline-flex';
}
```

- [ ] **Step 3: Hide badge link on iframe close**

In the `closeIframe` function (around line 808), before `setTimeout`, add:

```js
const badgeLink = document.getElementById('badgeLink');
if (badgeLink) badgeLink.style.display = 'none';
```

- [ ] **Step 4: Verify in browser**

Open a configurator, complete a config that triggers a K-code save. Expected: "✦ Mon badge" link appears in the iframe top bar; clicking it opens `/badge?config=K-XXXX` in a new tab with the correct code in the badge.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(05): show badge link in iframe bar after config save"
```

---

## Task 4: Édition Lunaire — api/lunar.js (01)

**Files:**
- Create: `api/lunar.js`

The endpoint reads `lunar:current` from KV. If absent, returns `{active: false}`. Kesk team seeds the value manually in Upstash console.

- [ ] **Step 1: Create api/lunar.js**

```js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  try {
    const r = await fetch(`${url}/get/lunar:current`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await r.json();
    if (!data.result) return res.status(200).json({ active: false });
    const edition = JSON.parse(data.result);
    const now = new Date();
    const from = new Date(edition.active_from);
    const until = new Date(edition.active_until);
    const active = now >= from && now <= until;
    return res.status(200).json({ active, ...edition });
  } catch(e) {
    return res.status(200).json({ active: false });
  }
}
```

Expected KV value for `lunar:current` (seed manually in Upstash dashboard):
```json
{
  "name": "Vert Alpin",
  "hex": "#4a9e6b",
  "label": "Édition Lune de Mai",
  "configurateurs": ["vase", "texte"],
  "active_from": "2026-04-27T00:00:00Z",
  "active_until": "2026-05-26T00:00:00Z"
}
```

- [ ] **Step 2: Verify endpoint**

Run `vercel dev`. In terminal:
```bash
curl http://localhost:3000/api/lunar
```
Expected: `{"active":false}` (no KV value seeded yet — that's correct).

- [ ] **Step 3: Commit**

```bash
git add api/lunar.js
git commit -m "feat(01): lunar edition API endpoint"
```

---

## Task 5: Édition Lunaire — index.html banner (01)

**Files:**
- Modify: `index.html` (1 location: end of `<script>`)

Add a lunar pill badge at bottom-left (above the impact badge), visible only when an edition is active. Also calculate a client-side countdown to the next new moon as fallback display.

- [ ] **Step 1: Add lunar pill CSS**

Find the `<style>` block in index.html. Add before the closing `</style>`:

```css
/* ── LUNAR BADGE ── */
#lunarBadge{
  position:fixed;bottom:60px;left:16px;
  display:none;align-items:center;gap:8px;
  padding:6px 14px 6px 10px;
  background:rgba(14,13,12,.9);
  border:1px solid var(--lunar-color,#c8f060);
  border-radius:99px;cursor:default;
  font-family:'DM Mono',monospace;font-size:10px;
  color:rgba(247,243,238,.75);letter-spacing:.06em;
  z-index:20;backdrop-filter:blur(8px);
  animation:lunar-pulse 4s ease-in-out infinite;
}
.lunar-dot{
  width:8px;height:8px;border-radius:50%;
  background:var(--lunar-color,#c8f060);
  flex-shrink:0;
}
@keyframes lunar-pulse{
  0%,100%{box-shadow:0 0 0 0 transparent}
  50%{box-shadow:0 0 10px 2px var(--lunar-color,rgba(200,240,96,.3))}
}
```

- [ ] **Step 2: Add lunar badge HTML**

Find `<div class="impact-badge"` (around line 445 area, after the footer-fixed div). Add before it:

```html
<div id="lunarBadge">
  <div class="lunar-dot" id="lunarDot"></div>
  <span id="lunarLabel">Édition Lunaire</span>
  <span id="lunarCountdown" style="opacity:.5;margin-left:4px"></span>
</div>
```

- [ ] **Step 3: Add lunar JS at the end of the script block**

Before the closing `</script>` tag, add:

```js
// ─── ÉDITION LUNAIRE (01) ────────────────────────────────────
async function initLunar() {
  try {
    const r = await fetch('/api/lunar');
    const d = await r.json();
    if (!d.active) return;

    const badge = document.getElementById('lunarBadge');
    const dot = document.getElementById('lunarDot');
    const label = document.getElementById('lunarLabel');
    const countdown = document.getElementById('lunarCountdown');

    badge.style.setProperty('--lunar-color', d.hex || '#c8f060');
    dot.style.background = d.hex || '#c8f060';
    label.textContent = d.name || 'Édition Lunaire';
    badge.style.display = 'flex';

    // Countdown to active_until
    function updateCountdown() {
      const until = new Date(d.active_until);
      const diff = until - new Date();
      if (diff <= 0) { countdown.textContent = ''; return; }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      countdown.textContent = days > 0 ? `· J-${days}` : `· ${hours}h`;
    }
    updateCountdown();
    setInterval(updateCountdown, 60000);
  } catch(e) {}
}

window.addEventListener('load', () => {
  setTimeout(loadConfigFromURL, 1200);
  loadImpact();
  initLunar();
});
```

**Note:** This replaces the existing `window.addEventListener('load', ...)` line (around line 645). Remove the old one and use this combined version.

- [ ] **Step 4: Verify**

Seed a test value in Upstash KV for `lunar:current` (set `active_from` to yesterday, `active_until` to next month). Open `http://localhost:3000` — the lunar pill should appear at bottom-left with the correct color and countdown. When KV has no value or dates are out of range, pill stays hidden.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(01): Édition Lunaire badge with countdown"
```

---

## Task 6: Carte Cadeau Vivante — API endpoints (12)

**Files:**
- Create: `api/save-gift.js`
- Create: `api/load-gift.js`

Same pattern as `save-config.js` / `load-config.js`.

- [ ] **Step 1: Create api/save-gift.js**

```js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { dest, occasion, budget, configurateur_url, emoji, label, from_name, message } = req.body;
  if (!configurateur_url) return res.status(400).json({ error: 'configurateur_url requis' });

  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const code = 'G-' + rand;
  const key = 'gift:' + code;
  const value = JSON.stringify({
    dest: dest || '',
    occasion: occasion || '',
    budget: budget || '',
    configurateur_url,
    emoji: emoji || '🎁',
    label: label || 'Création Kesk',
    from_name: from_name || '',
    message: message || '',
    created_at: new Date().toISOString()
  });

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  try {
    await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['SET', key, value],
        ['EXPIRE', key, 31536000] // 365 days
      ])
    });
    return res.status(200).json({ code });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
```

- [ ] **Step 2: Create api/load-gift.js**

```js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'Code manquant' });

  const key = 'gift:' + code.toUpperCase();
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  try {
    const r = await fetch(`${url}/get/${key}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await r.json();
    if (!data.result) return res.status(404).json({ error: 'Cadeau introuvable' });
    return res.status(200).json({ gift: JSON.parse(data.result) });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
```

- [ ] **Step 3: Verify endpoints**

```bash
# Save a gift
curl -X POST http://localhost:3000/api/save-gift \
  -H "Content-Type: application/json" \
  -d '{"configurateur_url":"https://kesk-hub.vercel.app/vase","emoji":"🌿","label":"Vase personnalisé","from_name":"Marie","message":"Joyeux anniversaire !"}'
# Expected: {"code":"G-XXXX"}

# Then load it
curl "http://localhost:3000/api/load-gift?code=G-XXXX"
# Expected: {"gift":{...}}
```

- [ ] **Step 4: Commit**

```bash
git add api/save-gift.js api/load-gift.js
git commit -m "feat(12): save-gift and load-gift API endpoints"
```

---

## Task 7: Carte Cadeau Vivante — index.html (12)

**Files:**
- Modify: `index.html` (3 locations)

**Location A:** Add gift link creation form in `#giftResult` (inside the existing gift overlay).
**Location B:** Add gift reveal overlay HTML.
**Location C:** Add JS: `createGiftLink()` and `loadGiftFromURL()`.

- [ ] **Step 1: Extend giftResult div with "Créer un lien cadeau" UI**

Find `#giftResult` div (around line 486). Currently ends with a "Recommencer" button. After the existing "Configurer ce cadeau →" button, add:

```html
<div id="giftLinkSection" style="margin-top:16px;border-top:1px solid rgba(247,243,238,.1);padding-top:16px">
  <p style="font-size:12px;color:#9a948c;margin-bottom:10px;line-height:1.5">
    Offrir ce cadeau à quelqu'un ?<br>Créez un lien qu'ils pourront ouvrir.
  </p>
  <input id="giftFromName" class="modal-input" placeholder="Votre prénom (optionnel)" style="margin-bottom:8px;font-size:13px"/>
  <textarea id="giftMessage" class="modal-input" rows="2"
    placeholder="Un petit mot… (optionnel)"
    style="resize:none;font-size:13px;line-height:1.5;margin-bottom:10px"></textarea>
  <button class="modal-btn" id="giftLinkBtn" onclick="createGiftLink()" style="background:#1c1916;color:var(--cream);border:1px solid rgba(247,243,238,.2)">
    🎁 Créer le lien cadeau
  </button>
  <div id="giftLinkResult" style="display:none;margin-top:10px">
    <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.1em;color:#9a948c;margin-bottom:6px;text-transform:uppercase">Lien prêt à partager</div>
    <div style="display:flex;gap:8px;align-items:center">
      <input id="giftLinkUrl" class="modal-input" readonly style="font-size:11px;font-family:'DM Mono',monospace;margin:0;flex:1;cursor:pointer" onclick="this.select()"/>
      <button class="modal-btn" id="giftCopyBtn" onclick="copyGiftLink()" style="flex-shrink:0;width:auto;padding:12px 16px">Copier</button>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Add gift reveal overlay HTML**

After the `#giftOverlay` closing div (around line 497), add a new overlay:

```html
<!-- GIFT REVEAL OVERLAY -->
<div id="giftRevealOverlay" style="display:none;position:fixed;inset:0;background:rgba(14,13,12,.92);z-index:400;display:none;align-items:center;justify-content:center;padding:20px">
  <div style="background:var(--cream);border-radius:20px;padding:36px 32px;max-width:380px;width:100%;text-align:center;box-shadow:0 24px 80px rgba(0,0,0,.55);color:var(--ink)">
    <div id="giftRevealEmoji" style="font-size:48px;margin-bottom:12px">🎁</div>
    <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--terracotta);margin-bottom:8px">Vous avez reçu un cadeau</div>
    <div id="giftRevealLabel" style="font-family:'Playfair Display',serif;font-size:22px;font-weight:700;line-height:1.2;margin-bottom:8px">—</div>
    <div id="giftRevealFrom" style="font-size:13px;color:#6a6460;margin-bottom:6px"></div>
    <div id="giftRevealMessage" style="font-size:13px;color:#6a6460;font-style:italic;margin-bottom:24px;line-height:1.6"></div>
    <button onclick="openGiftReveal()" style="width:100%;padding:13px;background:var(--ink);color:var(--cream);border:none;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;transition:background .2s">
      Voir ma création →
    </button>
  </div>
</div>
```

- [ ] **Step 3: Add JS for gift link creation and reveal**

Before the closing `</script>`, add:

```js
// ─── CARTE CADEAU VIVANTE (12) ───────────────────────────────
let pendingGiftUrl = null;

async function createGiftLink() {
  const btn = document.getElementById('giftLinkBtn');
  btn.textContent = 'Création…'; btn.disabled = true;
  try {
    const r = await fetch('/api/save-gift', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dest: giftState.dest || '',
        occasion: giftState.occasion || '',
        budget: giftState.budget || '',
        configurateur_url: giftResultUrl || '',
        emoji: document.getElementById('giftEmoji')?.textContent || '🎁',
        label: document.getElementById('giftReco')?.textContent || '',
        from_name: document.getElementById('giftFromName').value.trim(),
        message: document.getElementById('giftMessage').value.trim()
      })
    });
    const d = await r.json();
    if (!d.code) throw new Error('Erreur serveur');
    const link = window.location.origin + '/?gift=' + d.code;
    document.getElementById('giftLinkUrl').value = link;
    document.getElementById('giftLinkResult').style.display = 'block';
    btn.textContent = '✓ Lien créé';
  } catch(e) {
    btn.textContent = '🎁 Créer le lien cadeau'; btn.disabled = false;
  }
}

function copyGiftLink() {
  const input = document.getElementById('giftLinkUrl');
  navigator.clipboard.writeText(input.value).then(() => {
    const btn = document.getElementById('giftCopyBtn');
    btn.textContent = 'Copié ✓';
    setTimeout(() => btn.textContent = 'Copier', 2000);
  }).catch(() => { input.select(); document.execCommand('copy'); });
}

async function loadGiftFromURL() {
  const params = new URLSearchParams(location.search);
  const code = params.get('gift');
  if (!code) return;

  try {
    const r = await fetch('/api/load-gift?code=' + code.toUpperCase());
    const d = await r.json();
    if (!d.gift) return;
    const g = d.gift;

    document.getElementById('giftRevealEmoji').textContent = g.emoji || '🎁';
    document.getElementById('giftRevealLabel').textContent = g.label || 'Création Kesk';
    document.getElementById('giftRevealFrom').textContent = g.from_name ? `De la part de ${g.from_name}` : '';
    document.getElementById('giftRevealMessage').textContent = g.message || '';
    pendingGiftUrl = g.configurateur_url;

    const overlay = document.getElementById('giftRevealOverlay');
    overlay.style.display = 'flex';
  } catch(e) {}
}

function openGiftReveal() {
  document.getElementById('giftRevealOverlay').style.display = 'none';
  if (pendingGiftUrl) openIframe(pendingGiftUrl);
}
```

- [ ] **Step 4: Call loadGiftFromURL on page load**

Find the combined `window.addEventListener('load', ...)` added in Task 5. Add `loadGiftFromURL()` to it:

```js
window.addEventListener('load', () => {
  setTimeout(loadConfigFromURL, 1200);
  loadImpact();
  initLunar();
  loadGiftFromURL();
});
```

- [ ] **Step 5: Verify**

1. Open the hub, click 🎁 gift button, go through all steps to the result.
2. Fill in "Votre prénom" and "Un petit mot", click "Créer le lien cadeau".
3. Expected: `G-XXXX` URL appears, copy button works.
4. Open the gift URL in a new tab.
5. Expected: reveal overlay appears with emoji, label, sender name, message, and "Voir ma création →" button that opens the right configurator.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat(12): Carte Cadeau Vivante - gift link creation and reveal overlay"
```

---

## Task 8: Duo Créateur — index.html (09)

**Files:**
- Modify: `index.html` (2 locations)

A "👥 Inviter" button appears in the iframe-bar once a K-code is saved. Opens the same config URL with `&duo=1`. On page load with `?duo=1`, a brief banner appears.

- [ ] **Step 1: Add duo button to iframe-bar HTML**

In the iframe-bar section (same area as the badge link from Task 3), after the badge link `<a>` tag, add:

```html
<button id="duoBtn" onclick="inviteDuo()"
  style="display:none;font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.08em;
         text-transform:uppercase;color:rgba(247,243,238,.6);
         background:transparent;border:1px solid rgba(247,243,238,.2);
         padding:5px 12px;border-radius:20px;cursor:pointer;transition:all .2s"
  onmouseover="this.style.color='#e8e8e0';this.style.borderColor='rgba(247,243,238,.5)'"
  onmouseout="this.style.color='rgba(247,243,238,.6)';this.style.borderColor='rgba(247,243,238,.2)'">
  👥 Inviter
</button>
```

- [ ] **Step 2: Add duo mode banner HTML**

After the `#giftRevealOverlay` div (end of body), add:

```html
<!-- DUO MODE BANNER -->
<div id="duoBanner" style="display:none;position:fixed;top:0;left:0;right:0;z-index:500;
  background:rgba(14,13,12,.95);border-bottom:1px solid rgba(247,243,238,.1);
  padding:14px 20px;display:none;align-items:center;justify-content:space-between;gap:16px">
  <div style="display:flex;align-items:center;gap:10px">
    <span style="font-size:20px">👥</span>
    <div>
      <div style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:rgba(200,240,96,.9)">Mode Duo</div>
      <div style="font-size:12px;color:rgba(247,243,238,.6);margin-top:2px">Quelqu'un vous a invité à co-créer · Vous partez du même point</div>
    </div>
  </div>
  <button onclick="document.getElementById('duoBanner').style.display='none'"
    style="background:none;border:none;color:rgba(247,243,238,.4);font-size:18px;cursor:pointer;padding:4px">✕</button>
</div>
```

- [ ] **Step 3: Add duo JS**

Before the closing `</script>`, add:

```js
// ─── DUO CRÉATEUR (09) ──────────────────────────────────────
function inviteDuo() {
  if (!currentCode) return;
  const url = window.location.origin + '/?config=' + currentCode + '&duo=1';
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.getElementById('duoBtn');
    btn.textContent = 'Lien copié ✓';
    setTimeout(() => btn.textContent = '👥 Inviter', 2000);
  }).catch(() => { prompt('Lien duo :', url); });
}

function initDuoMode() {
  const params = new URLSearchParams(location.search);
  if (params.get('duo') !== '1') return;
  const banner = document.getElementById('duoBanner');
  banner.style.display = 'flex';
  setTimeout(() => {
    banner.style.transition = 'opacity .6s';
    banner.style.opacity = '0';
    setTimeout(() => banner.style.display = 'none', 600);
  }, 5000);
}
```

- [ ] **Step 4: Show/hide duo button with K-code state**

In the `saveConfig` function, alongside the badge link visibility update (Task 3 Step 2), add:

```js
const duoBtn = document.getElementById('duoBtn');
if (duoBtn) duoBtn.style.display = 'inline-flex';
```

In the `closeIframe` function, alongside the badge link hide (Task 3 Step 3), add:

```js
const duoBtn = document.getElementById('duoBtn');
if (duoBtn) duoBtn.style.display = 'none';
```

- [ ] **Step 5: Call initDuoMode on load**

Add `initDuoMode()` to the combined load listener (alongside `initLunar()`, `loadGiftFromURL()`).

- [ ] **Step 6: Verify**

1. Open a configurator, trigger a K-code save. Expected: "👥 Inviter" button appears in iframe-bar.
2. Click it — expected: clipboard gets `/?config=K-XXXX&duo=1`, button shows "Lien copié ✓".
3. Open that URL in a new tab. Expected: banner "Mode Duo · Quelqu'un vous a invité…" appears for 5s, the config loads normally.

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "feat(09): Duo Créateur - invite button and duo mode banner"
```

---

## Task 9: Galerie — api/save-config.js modification (03)

**Files:**
- Modify: `api/save-config.js`

Add `ZADD gallery:codes <timestamp> <code>` and cap at 200 entries.

- [ ] **Step 1: Extend the pipeline in save-config.js**

Find the pipeline body (the `JSON.stringify([...])` with SET + EXPIRE). Replace it with:

```js
body: JSON.stringify([
  ['SET', key, value],
  ['EXPIRE', key, 63072000],
  ['ZADD', 'gallery:codes', Date.now(), code],
  ['ZREMRANGEBYRANK', 'gallery:codes', 0, -201]
])
```

The full updated `try` block:
```js
try {
  const r = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([
      ['SET', key, value],
      ['EXPIRE', key, 63072000],
      ['ZADD', 'gallery:codes', Date.now(), code],
      ['ZREMRANGEBYRANK', 'gallery:codes', 0, -201]
    ])
  });
  const data = await r.json();
  console.log('Upstash pipeline:', JSON.stringify(data));
  return res.status(200).json({ code });
} catch (e) {
  console.error('save-config error:', e.message);
  return res.status(500).json({ error: e.message });
}
```

- [ ] **Step 2: Verify**

Save a config via a configurator. Check Upstash dashboard — `gallery:codes` sorted set should contain the new code with a timestamp score.

- [ ] **Step 3: Commit**

```bash
git add api/save-config.js
git commit -m "feat(03): push config codes to gallery sorted set on save"
```

---

## Task 10: Galerie — api/gallery.js (03)

**Files:**
- Create: `api/gallery.js`

Fetches last 50 codes from sorted set, then batch-fetches their configs in a single pipeline call.

- [ ] **Step 1: Create api/gallery.js**

```js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  try {
    // Step 1: get last 50 codes (highest score = most recent)
    const zr = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['ZREVRANGE', 'gallery:codes', 0, 49, 'WITHSCORES']
      ])
    });
    const zdata = await zr.json();
    const raw = zdata[0]?.result || [];

    // raw is alternating [member, score, member, score, ...]
    const entries = [];
    for (let i = 0; i < raw.length; i += 2) {
      entries.push({ code: raw[i], ts: parseInt(raw[i + 1]) });
    }
    if (entries.length === 0) return res.status(200).json({ items: [] });

    // Step 2: batch GET all configs
    const pipeline = entries.map(e => ['GET', 'config:' + e.code]);
    const gr = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(pipeline)
    });
    const gdata = await gr.json();

    const items = entries
      .map((e, i) => {
        const raw = gdata[i]?.result;
        if (!raw) return null;
        try {
          return { code: e.code, config: JSON.parse(raw), created_at: new Date(e.ts).toISOString() };
        } catch { return null; }
      })
      .filter(Boolean);

    return res.status(200).json({ items });
  } catch(e) {
    console.error('gallery error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
```

- [ ] **Step 2: Verify**

```bash
curl http://localhost:3000/api/gallery
```
Expected: `{"items":[...]}` — array of objects with `code`, `config`, `created_at`. Empty array if no codes saved yet.

- [ ] **Step 3: Commit**

```bash
git add api/gallery.js
git commit -m "feat(03): gallery API endpoint"
```

---

## Task 11: Galerie — kesk-galerie.html (03)

**Files:**
- Create: `kesk-galerie.html`

Fetches from `/api/gallery`, renders a responsive grid of cards. Each card shows configurateur type icon, K-code, date, and "Recréer →" link.

- [ ] **Step 1: Create kesk-galerie.html**

```html
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Kesk · Galerie des Créations</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400&family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#0d0d0d;--surface:#161616;--card:#1c1c1c;--border:#2a2a2a;--accent:#c8f060;--text:#e8e8e0;--muted:#666;--terracotta:#B85C38}
body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;min-height:100vh}
header{padding:40px 32px 28px;border-bottom:1px solid var(--border);display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:16px}
.brand{display:flex;align-items:center;gap:14px}
.logo{width:36px;height:36px;background:var(--accent);border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:16px;color:#000;flex-shrink:0}
h1{font-size:22px;font-weight:700;letter-spacing:-.3px}
h1 em{color:var(--accent);font-style:normal}
.subtitle{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-top:4px}
.filters{display:flex;gap:8px;flex-wrap:wrap}
.f-btn{padding:6px 14px;border-radius:20px;border:1px solid var(--border);background:transparent;color:var(--muted);font-family:'DM Mono',monospace;font-size:11px;cursor:pointer;transition:all .2s}
.f-btn.active,.f-btn:hover{border-color:var(--accent);color:var(--accent)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1px;background:var(--border);padding:0}
.card{background:var(--card);padding:22px;display:flex;flex-direction:column;gap:12px;transition:background .15s;cursor:pointer}
.card:hover{background:#212121}
.card-top{display:flex;align-items:center;justify-content:space-between}
.card-type{font-size:20px;line-height:1}
.card-date{font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);letter-spacing:.08em}
.card-code{font-family:'DM Mono',monospace;font-size:13px;font-weight:700;color:var(--accent);letter-spacing:.08em}
.card-label{font-size:12px;color:rgba(232,232,224,.6);line-height:1.4}
.card-cta{margin-top:auto;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--terracotta)}
.empty{padding:80px 32px;text-align:center;color:var(--muted);font-family:'DM Mono',monospace;font-size:12px;letter-spacing:.1em;text-transform:uppercase}
.back{display:inline-flex;align-items:center;gap:6px;font-family:'DM Mono',monospace;font-size:11px;color:var(--muted);text-decoration:none;letter-spacing:.1em;padding:32px 32px 0;opacity:.6;transition:opacity .2s}
.back:hover{opacity:1}
footer{padding:28px 32px;border-top:1px solid var(--border);color:var(--muted);font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.08em;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px}
@media(max-width:600px){header{padding:28px 20px 20px}.filters{display:none}.grid{grid-template-columns:1fr 1fr}footer{padding:20px}}
</style>
</head>
<body>
<header>
  <div>
    <div class="brand">
      <div class="logo">K</div>
      <div>
        <h1>Galerie des <em>Créations</em></h1>
        <p class="subtitle">Configurations partagées · Anonymes · Cliquables</p>
      </div>
    </div>
  </div>
  <div class="filters" id="filters">
    <button class="f-btn active" data-filter="all">Toutes</button>
    <button class="f-btn" data-filter="vase">Vase</button>
    <button class="f-btn" data-filter="uv">UV</button>
    <button class="f-btn" data-filter="texte">Texte 3D</button>
    <button class="f-btn" data-filter="constellation">Constellation</button>
    <button class="f-btn" data-filter="onde">Onde</button>
  </div>
</header>

<div id="grid" class="grid"></div>
<div id="empty" class="empty" style="display:none">Aucune création encore · Soyez le premier ✦</div>

<a class="back" href="/">← Retour au hub</a>

<footer>
  <span>Kesk Studio · kesk.ch · Saillon, Valais</span>
  <span id="count" style="opacity:.4"></span>
</footer>

<script>
const TYPE_META = {
  vase:          { emoji:'🌿', label:'Vase personnalisé',      base:'https://kesk-hub.vercel.app/vase' },
  uv:            { emoji:'🖼',  label:'Tableau UV',             base:'https://kesk-hub.vercel.app/uv' },
  texte:         { emoji:'✍',  label:'Texte 3D',               base:'https://kesk-hub.vercel.app/texte' },
  constellation: { emoji:'🌌', label:'Constellation & Date',   base:'https://kesk-hub.vercel.app/constellation' },
  onde:          { emoji:'🎵', label:'Son & Onde',             base:'https://kesk-hub.vercel.app/onde' },
};

let allItems = [];
let activeFilter = 'all';

async function load() {
  try {
    const r = await fetch('/api/gallery');
    const d = await r.json();
    allItems = d.items || [];
    render();
    document.getElementById('count').textContent = allItems.length + ' créations';
  } catch(e) {
    document.getElementById('empty').style.display = 'block';
  }
}

function render() {
  const grid = document.getElementById('grid');
  const filtered = activeFilter === 'all'
    ? allItems
    : allItems.filter(item => item.config?.type === activeFilter);

  if (filtered.length === 0) {
    grid.innerHTML = '';
    document.getElementById('empty').style.display = 'block';
    return;
  }
  document.getElementById('empty').style.display = 'none';

  grid.innerHTML = filtered.map(item => {
    const type = item.config?.type || 'vase';
    const meta = TYPE_META[type] || TYPE_META.vase;
    const date = new Date(item.created_at).toLocaleDateString('fr-CH', {day:'numeric',month:'short'});
    const href = `/?config=${item.code}`;
    return `<div class="card" onclick="location.href='${href}'">
      <div class="card-top">
        <span class="card-type">${meta.emoji}</span>
        <span class="card-date">${date}</span>
      </div>
      <div class="card-code">${item.code}</div>
      <div class="card-label">${meta.label}</div>
      <div class="card-cta">Recréer →</div>
    </div>`;
  }).join('');
}

document.getElementById('filters').addEventListener('click', e => {
  const btn = e.target.closest('.f-btn');
  if (!btn) return;
  activeFilter = btn.dataset.filter;
  document.querySelectorAll('.f-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  render();
});

load();
</script>
</body>
</html>
```

- [ ] **Step 2: Verify**

Open `http://localhost:3000/galerie`. Expected: page loads, shows "Aucune création encore" if no configs saved yet. After saving a config in a configurator, refresh gallery — the new card appears.

- [ ] **Step 3: Commit**

```bash
git add kesk-galerie.html
git commit -m "feat(03): gallery page"
```

---

## Task 12: Galerie petal in index.html (03)

**Files:**
- Modify: `index.html` (1 location)

Add a "Galerie" entry to the `PETALS` array. It opens `/galerie` in a new tab (not an iframe, since it's a full page).

- [ ] **Step 1: Add gallery petal**

Find the `PETALS` array (around line 691). Add a new entry after the `onde` petal and before `assises`:

```js
{id:'galerie', name:'Galerie', desc:'Toutes les créations partagées, cliquables.', tag:'Nouveau', cta:'Explorer →', active:true, url:'/galerie', newTab:true},
```

The `newTab:true` flag is already handled by `handlePetal()` — it calls `window.open(p.url, '_blank')` when `p.newTab` is set.

- [ ] **Step 2: Verify**

Open the hub, click the K button. Expected: a "Galerie" petal card appears in the radial menu. Clicking it opens `/galerie` in a new tab.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat(03): add gallery petal to radial menu"
```

---

## Task 13: Effet Miroir — kesk-vase.html (15)

**Files:**
- Modify: `kesk-vase.html`

Uses the native `MediaRecorder` + `canvas.captureStream()` API. **Requires** adding `preserveDrawingBuffer: true` to the Three.js renderer so frames aren't cleared between captures.

- [ ] **Step 1: Add preserveDrawingBuffer to WebGLRenderer**

Find `ren=new THREE.WebGLRenderer({canvas:c,antialias:true});` in `kesk-vase.html`. Replace with:

```js
ren=new THREE.WebGLRenderer({canvas:c,antialias:true,preserveDrawingBuffer:true});
```

- [ ] **Step 2: Add the Effet Miroir button HTML**

Find the export buttons area (near `#btnDevis` or the export row). Add after the existing export button:

```html
<button id="mirrorBtn" onclick="startMirrorCapture()"
  style="display:none;margin-top:8px;width:100%;padding:.62rem;border-radius:6px;
         border:1.5px solid rgba(200,240,96,.3);background:transparent;
         font-family:'DM Mono',monospace;font-size:.63rem;letter-spacing:.1em;
         text-transform:uppercase;color:rgba(200,240,96,.7);cursor:pointer;transition:all .2s"
  onmouseover="this.style.borderColor='rgba(200,240,96,.7)';this.style.color='#c8f060'"
  onmouseout="this.style.borderColor='rgba(200,240,96,.3)';this.style.color='rgba(200,240,96,.7)'">
  ✦ Télécharger l'animation
</button>
```

Show the button once the 3D object is generated. Find where the vase finishes generating (where other export buttons become enabled) and add:

```js
document.getElementById('mirrorBtn').style.display = 'block';
```

- [ ] **Step 3: Add Effet Miroir JS**

At the end of the `<script>` block in kesk-vase.html, add:

```js
// ─── EFFET MIROIR (15) ───────────────────────────────────────
function startMirrorCapture() {
  const btn = document.getElementById('mirrorBtn');
  const canvas = document.getElementById('c3');

  if (!canvas || typeof canvas.captureStream !== 'function') {
    alert('Votre navigateur ne supporte pas la capture vidéo. Essayez Chrome ou Firefox.');
    return;
  }

  const mimeType = ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4']
    .find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';
  const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';

  btn.textContent = '⏺ Enregistrement…'; btn.disabled = true;

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4000000 });
  const chunks = [];

  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kesk-creation.' + ext;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    btn.textContent = '✦ Télécharger l\'animation'; btn.disabled = false;
  };

  recorder.start();
  let remaining = 5;
  const tick = setInterval(() => {
    remaining--;
    btn.textContent = `⏺ ${remaining}s…`;
    if (remaining <= 0) { clearInterval(tick); recorder.stop(); }
  }, 1000);
}
```

- [ ] **Step 4: Verify**

Open `/vase`, generate a vase. Expected: "✦ Télécharger l'animation" button appears. Click it — button shows countdown, then browser downloads a `.webm` or `.mp4` of the rotating vase.

- [ ] **Step 5: Commit**

```bash
git add kesk-vase.html
git commit -m "feat(15): Effet Miroir video capture in vase configurator"
```

---

## Task 14: Effet Miroir — kesk-text3d.html (15)

**Files:**
- Modify: `kesk-text3d.html`

Same pattern as Task 13. Canvas is `#c3`, renderer variable is `renderer`.

- [ ] **Step 1: Add preserveDrawingBuffer**

Find `renderer=new T.WebGLRenderer({canvas,antialias:true});`. Replace with:

```js
renderer=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
```

- [ ] **Step 2: Add mirrorBtn HTML**

Find the button area near the text configurator export/order section. Add the same `#mirrorBtn` HTML as in Task 13 Step 2 (identical markup). Show it when text generation completes (where other export buttons appear).

- [ ] **Step 3: Add Effet Miroir JS**

Add the identical `startMirrorCapture()` function from Task 13 Step 3 at the end of the `<script>` block. No changes needed — the function references `#c3` by ID which is the same.

- [ ] **Step 4: Verify**

Open `/texte`, type a word, generate. Expected: "✦ Télécharger l'animation" button appears. Click it — 5s countdown, downloads rotating text video.

- [ ] **Step 5: Commit**

```bash
git add kesk-text3d.html
git commit -m "feat(15): Effet Miroir video capture in text3d configurator"
```

---

## Task 15: Effet Miroir — kesk-constellation.html (15)

**Files:**
- Modify: `kesk-constellation.html`

The constellation uses a 2D canvas `#skyCanvas`. `captureStream()` works on 2D canvas without `preserveDrawingBuffer`. The animation loop must be running (stars twinkling) for the capture to show motion.

- [ ] **Step 1: Add mirrorBtn HTML**

Find the existing export/share buttons area in `kesk-constellation.html` (near the existing PNG/share buttons). Add:

```html
<button id="mirrorBtn" onclick="startMirrorCapture()"
  style="padding:.62rem 1rem;border-radius:6px;
         border:1.5px solid rgba(200,240,96,.3);background:transparent;
         font-family:'DM Mono',monospace;font-size:.63rem;letter-spacing:.1em;
         text-transform:uppercase;color:rgba(200,240,96,.7);cursor:pointer;transition:all .2s"
  onmouseover="this.style.borderColor='rgba(200,240,96,.7)';this.style.color='#c8f060'"
  onmouseout="this.style.borderColor='rgba(200,240,96,.3)';this.style.color='rgba(200,240,96,.7)'">
  ✦ Télécharger l'animation
</button>
```

- [ ] **Step 2: Add Effet Miroir JS**

At the end of the `<script>` block, add the same `startMirrorCapture()` function as Task 13 Step 3. The `#c3` reference must be changed to `#skyCanvas`:

```js
function startMirrorCapture() {
  const btn = document.getElementById('mirrorBtn');
  const canvas = document.getElementById('skyCanvas');  // ← different from vase/texte

  if (!canvas || typeof canvas.captureStream !== 'function') {
    alert('Votre navigateur ne supporte pas la capture vidéo. Essayez Chrome ou Firefox.');
    return;
  }

  const mimeType = ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4']
    .find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';
  const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';

  btn.textContent = '⏺ Enregistrement…'; btn.disabled = true;

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4000000 });
  const chunks = [];

  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kesk-constellation.' + ext;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    btn.textContent = '✦ Télécharger l\'animation'; btn.disabled = false;
  };

  recorder.start();
  let remaining = 5;
  const tick = setInterval(() => {
    remaining--;
    btn.textContent = `⏺ ${remaining}s…`;
    if (remaining <= 0) { clearInterval(tick); recorder.stop(); }
  }, 1000);
}
```

- [ ] **Step 3: Verify**

Open `/constellation`, render a sky. Expected: button present. Click it — downloads 5s animation of the twinkling constellation.

- [ ] **Step 4: Final commit**

```bash
git add kesk-constellation.html
git commit -m "feat(15): Effet Miroir video capture in constellation configurator"
```

---

## Self-Review Checklist

- [x] **05 Badge** — kesk-badge.html created, route added, link shown in iframe-bar after K-code save
- [x] **01 Lunaire** — api/lunar.js + badge HTML + JS, initLunar() called on load, hides when inactive
- [x] **12 Cadeau** — api/save-gift + load-gift, gift link UI in #giftResult, reveal overlay on ?gift= load
- [x] **09 Duo** — invite button in iframe-bar, copies ?config=K-XXXX&duo=1, banner on ?duo=1 load
- [x] **03 Galerie** — save-config pushes to sorted set, gallery API, kesk-galerie.html, petal in menu
- [x] **15 Miroir** — MediaRecorder on 3 configurators (vase, texte, constellation), preserveDrawingBuffer added
- [x] No TBDs, no "similar to Task N" — all code is complete
- [x] `window.addEventListener('load', ...)` consolidated once in Task 5 — Tasks 7, 8 reference the same combined listener
- [x] Canvas IDs consistent: `#c3` (vase, texte), `#skyCanvas` (constellation)
- [x] Renderer variable names consistent: `ren` (vase), `renderer` (texte)

## Known Risks

- **Effet Miroir CORS**: If a configurator loads external textures without CORS headers, the canvas will be tainted and `captureStream()` will throw. Vase and texte use procedural materials (no external textures) — should be fine. Constellation uses only Canvas 2D API with computed data — safe.
- **MediaRecorder on Safari**: Safari 15.4+ supports `video/mp4` via MediaRecorder. The mimeType probe handles this gracefully. Older Safari will show the "not supported" alert.
- **Lunar KV seeding**: The lunar badge only appears when a `lunar:current` KV key exists with valid dates. Seed it manually from the Upstash dashboard using the JSON format documented in Task 4.

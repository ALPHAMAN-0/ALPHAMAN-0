// Generates every static asset the profile README renders, into assets/, and
// the README blocks that show them.
//
// Static means "does not need the GitHub API": the hero, the contact chips,
// the Shasroi Bazar window, the project cards, the learning cards and the
// stack. They are deterministic, so they are committed to main where they can
// be reviewed in a diff and keep rendering even if CI is broken. Anything that
// needs live data stays in render-stats.mjs -> dist -> `output`.
//
// Each picture is drawn three times: dark and light for the desktop column,
// and a narrow file (both themes in one) for phones. The README blocks
// between <!-- BEGIN generated:x --> and <!-- END generated:x --> are written
// here too, so an image, its link and its alt text come from one place.
//
// Run from the repo root: node .github/scripts/render-static.mjs
// The workflow re-runs this and fails if assets/ or README.md changes, so a
// hand edit can never silently drift from its generator.
//
// Words and facts live in the data blocks below and in now.json. Every number
// was checked against its repository on 2026-11-18.

import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { THEMES, esc, measure, wrap, text, panel, rect, doc, delay, EASE, adaptive } from './lib/design.mjs'
import { icon, logoTile, usedIcons, WIDE, resetIcons } from './lib/icons.mjs'
import { diagram, centerNodes, resetDiagrams } from './lib/diagram.mjs'

const OUT = 'assets'
const NOW = JSON.parse(readFileSync('now.json', 'utf8'))

// GitHub renders a profile README in a column about 880px wide. Full-width
// assets are drawn at 860 and placed at width="100%"; two-up cards are drawn
// at 430 and placed at width="50%" with no whitespace between them, each card
// carrying its half of a 16px gutter as transparent space on its inner side,
// so every panel's outer edge lands on the same two lines as the full-width
// panels above and below it. Narrow files are 430 wide.
const W = 860
const HALF = 430
const NARROW = 430
const GUTTER = 16
const ROW_GAP = 12 // transparent space under a card; the line box adds ~4px

const f1 = (n) => +Number(n).toFixed(1)
const written = []
const labels = new Map()

// Every document starts its id counters at zero, so an edit to one card
// rewrites only that card's files.
function draw(fn, t, ...args) {
  resetIcons()
  resetDiagrams()
  return fn(t, ...args)
}

const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
const labelOf = (svg) => unesc(svg.match(/aria-label="([^"]*)"/)[1])

/**
 * Write <name>.svg (dark), <name>-light.svg and, given a narrow drawing,
 * <name>-narrow.svg (both themes). `fn` and `narrow` are called with a theme.
 */
async function emit(name, fn, narrow, shared = '') {
  const dark = draw(fn, THEMES.dark)
  const light = draw(fn, THEMES.light)
  await writeFile(`${OUT}/${name}.svg`, dark)
  await writeFile(`${OUT}/${name}-light.svg`, light)
  written.push(name)
  labels.set(name, labelOf(light))
  if (narrow) {
    await writeFile(`${OUT}/${name}-narrow.svg`, adaptive(draw(narrow, THEMES.dark), draw(narrow, THEMES.light), shared))
    written.push(`${name}-narrow`)
  }
}

// ============================================================== hero =====
//
// Name, role and a short introduction on the left; the hand-made ASCII
// portrait on the right, lifted out of assets/ascii-portrait.svg (which stays
// the untouched source) without its terminal frame. The art is lit for a dark
// ground, so it sits in a dark frame on both themes, like a photograph, rather
// than being inverted into a negative for the light one. On load the text
// rises in and the portrait develops row by row from the top; after a few
// seconds only the portrait's eyes blink a few times, then everything rests.

const HERO = {
  name: 'Siam Hossain',
  role: 'Full-stack and AI engineer in Dhaka',
  about:
    'BSc CSE, AIUB 2026. I build web apps in TypeScript, C# and Python, and LLM features with guardrails and tests. Three of my tools run at local businesses.',
  status: NOW.open_to,
}

// The portrait is parsed by structure, not by exact strings, so a reformatted
// copy (attribute order, short hex colours) still reads the same.
const PORTRAIT = (() => {
  const src = readFileSync(`${OUT}/ascii-portrait.svg`, 'utf8').replace(/#([0-9a-f])([0-9a-f])([0-9a-f])\b/gi, '#$1$1$2$2$3$3')
  const open = src.match(/<g\b[^>]*filter="url\(#glow\)"[^>]*>/)
  if (!open) throw new Error('portrait: no <g filter="url(#glow)"> art group in assets/ascii-portrait.svg')
  // Walk nested <g> tags to find the art group's own closing tag.
  let depth = 0
  let end = -1
  const tags = /<g\b[^>]*?(\/)?>|<\/g>/g
  tags.lastIndex = open.index
  for (let m; (m = tags.exec(src)); ) {
    if (m[0] === '</g>') depth--
    else if (!m[1]) depth++
    if (depth === 0) {
      end = m.index + m[0].length
      break
    }
  }
  if (end < 0) throw new Error('portrait: art group is not closed')
  const art = src.slice(open.index, end)
  const glow = src.match(/<filter\b[^>]*id="glow"[\s\S]*?<\/filter>/)?.[0] ?? ''
  let minX = Infinity
  let maxX = -Infinity
  for (const m of art.matchAll(/<tspan\b[^>]*>/g)) {
    const x = +(m[0].match(/\bx="([\d.]+)"/) || [])[1]
    const len = +(m[0].match(/\btextLength="([\d.]+)"/) || [])[1]
    if (Number.isFinite(x) && Number.isFinite(len)) {
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x + len)
    }
  }
  const rows = [...art.matchAll(/<text\b[^>]*class="row r(\d+)"[^>]*>/g)]
  const ys = rows.map((m) => +(m[0].match(/\by="([\d.]+)"/) || [])[1])
  if (!rows.length || !Number.isFinite(minX)) throw new Error('portrait: no rows found in the art group')
  return { art, glow, rows: rows.length, box: { x: minX, y: Math.min(...ys) - 9, w: maxX - minX, h: Math.max(...ys) - Math.min(...ys) + 12 } }
})()

const HERO_CSS = `
.breathe{transform-box:fill-box;transform-origin:center;animation:breathe 2.8s ease-in-out 6}
@keyframes breathe{0%,100%{transform:scale(.6);opacity:.35}50%{transform:scale(1.25);opacity:0}}
.row{animation:develop .5s ${EASE} both}
@keyframes develop{from{opacity:0}}
${Array.from({ length: PORTRAIT.rows }, (_, i) => `.r${i}{animation-delay:${+(0.3 + i * 0.018).toFixed(3)}s}`).join('')}
.eyes{transform-box:fill-box;transform-origin:center;animation:eyes 5s steps(1,end) 2s 4}
@keyframes eyes{0%,92%,100%{transform:scaleY(1)}94%,96%{transform:scaleY(.05)}98%{transform:scaleY(1)}}
.port text{font-family:'SFMono-Regular','Cascadia Mono',Consolas,'Liberation Mono',Menlo,monospace}`

// The portrait in its frame: dark on both themes (a hairline on dark). With
// no theme it draws the one frame both themes share (the narrow file).
function portrait(t, { x, y, w, h, pad = 18 }) {
  const P = PORTRAIT
  const s = Math.min((w - pad * 2) / P.box.w, (h - pad * 2) / P.box.h)
  const px = x + (w - P.box.w * s) / 2
  const py = y + (h - P.box.h * s) / 2
  const frame =
    t?.name === 'dark'
      ? rect({ x: x + 0.5, y: y + 0.5, w: w - 1, h: h - 1, r: 14, fill: '#0a0d14', stroke: t.line })
      : rect({ x, y, w, h, r: 14, fill: '#0d1117' })
  return `${frame}
<g class="port" transform="translate(${f1(px - P.box.x * s)} ${f1(py - P.box.y * s)}) scale(${+s.toFixed(4)})">${P.art}</g>`
}

const NARROW_PORTRAIT = { x: 14, y: 14, w: NARROW - 28, h: 262, pad: 16 }

// The availability pill: a breathing dot and the sentence from now.json, the
// sentence pinned to its measured width so the pill fits it in any face.
function statusPill(t, x, y) {
  const size = 13
  const m = measure(HERO.status, size, { weight: 500 })
  const w = f1(30 + m + 16)
  return `<g class="rise" style="${delay(0.05)}">
${rect({ x, y, w, h: 32, r: 16, fill: t.surface, stroke: t.line })}
<circle cx="${x + 16}" cy="${y + 16}" r="9" fill="${t.good}" opacity=".25" class="breathe"/>
<circle cx="${x + 16}" cy="${y + 16}" r="4" fill="${t.good}"/>
${text(HERO.status, { x: x + 30, y: y + 20.5, size, weight: 500, fill: t.ink, fit: true })}
</g>`
}

function hero(t) {
  const h = 384
  const x = 48
  const lines = wrap(HERO.about, 410, 15.5)
  return doc({
    w: W,
    h,
    label: `${HERO.name}. ${HERO.role}. ${HERO.about} ${HERO.status}.`,
    css: HERO_CSS,
    defs: PORTRAIT.glow,
    body: `${panel(t, { w: W, h, r: 18 })}
${statusPill(t, x, 46)}
<g class="rise" style="${delay(0.15)}">${text(HERO.name, { x: x - 3, y: 154, size: 62, weight: 600, ls: -2, fill: t.ink })}</g>
<g class="rise" style="${delay(0.25)}">${text(HERO.role, { x, y: 196, size: 22, weight: 500, ls: -0.3, fill: t.ink })}</g>
<g class="rise" style="${delay(0.35)}">
${lines.map((l, i) => text(l, { x, y: 242 + i * 25, size: 15.5, fill: t.muted })).join('\n')}
</g>
${portrait(t, { x: 548, y: 18, w: W - 18 - 548, h: h - 36 })}`,
  })
}

function heroNarrow(t) {
  const w = NARROW
  const x = 26
  const lines = wrap(HERO.about, 360, 15)
  const top = 300
  const h = top + 150 + lines.length * 23 + 18
  return doc({
    w,
    h,
    label: `${HERO.name}. ${HERO.role}. ${HERO.about} ${HERO.status}.`,
    css: HERO_CSS,
    body: `${panel(t, { w, h, r: 18 })}
${statusPill(t, x, top)}
<g class="rise" style="${delay(0.15)}">${text(HERO.name, { x: x - 2, y: top + 86, size: 46, weight: 600, ls: -1.4, fill: t.ink })}</g>
<g class="rise" style="${delay(0.25)}">${text(HERO.role, { x, y: top + 118, size: 18.5, weight: 500, ls: -0.2, fill: t.ink })}</g>
<g class="rise" style="${delay(0.35)}">
${lines.map((l, i) => text(l, { x, y: top + 152 + i * 23, size: 15, fill: t.muted })).join('\n')}
</g>`,
  })
}

// ============================================================= chips =====
// One file per link, because an <img>-loaded SVG cannot carry its own
// hyperlinks: each chip is wrapped in its own <a> in the README. "Email me" is
// the one filled button; the rest are the places to find me, each with its
// real logo, or a plain glyph where the site has none in a licensed set.

const LINKS = [
  { slug: 'email', label: 'Email me', icon: 'ui-mail', href: 'mailto:siam.cse.aiub@gmail.com', primary: true },
  { slug: 'linkedin', label: 'LinkedIn', icon: 'linkedin', href: 'https://www.linkedin.com/in/siamhossain4/' },
  { slug: 'portfolio', label: 'Portfolio', icon: 'ui-globe', href: 'https://siamhossain.vercel.app/' },
  { slug: 'x', label: 'X', name: 'X (Twitter)', icon: 'x', href: 'https://x.com/SIAM_HOSSAIN47' },
  { slug: 'facebook', label: 'Facebook', icon: 'facebook', href: 'https://www.facebook.com/SiamHossin11/' },
  { slug: 'instagram', label: 'Instagram', icon: 'instagram', href: 'https://www.instagram.com/__siam__hossain__/' },
  { slug: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp', href: 'https://wa.me/8801766479295' },
  { slug: 'codolio', label: 'Codolio', icon: 'ui-code-xml', href: 'https://codolio.com/profile/babaYagaa' },
]

const CHIP_GAP = 8

function chip(t, l, i) {
  const h = 38
  const pad = 14
  const iz = 17
  const fs = 13.5
  const w = Math.round(pad + iz + 9 + measure(l.label, fs, { weight: 500 }) + pad)
  const fill = l.primary ? t.accent : t.bg
  const ink = l.primary ? t.accentInk : t.ink
  return doc({
    w: w + CHIP_GAP,
    h,
    label: l.name ?? l.label,
    body: `<g class="rise" style="${delay(0.45 + i * 0.05)}">
${rect({ x: 0.5, y: 0.5, w: w - 1, h: h - 1, r: 10, fill, stroke: l.primary ? t.accent : t.border })}
${icon(l.icon, { x: pad, y: (h - iz) / 2, size: iz, t, color: l.primary ? t.accentInk : l.icon.startsWith('ui-') ? t.ink : undefined })}
${text(l.label, { x: pad + iz + 9, y: h / 2 + 4.8, size: fs, weight: 500, fill: ink, fit: true })}
</g>`,
  })
}

// ==================================================== Shasroi Bazar =====
//
// The app's own window, redrawn as vector from its screenshots with its own
// colours (theme.py), its own font and its own numbers. The title is the one
// the team's final report gives the app ("Shasroi Bazar - Food Price
// Tracker"); the build in the repo still shows its working name, BazarWatch
// BD, in the window. It plays the check the project is about three times and
// then rests on the result: a price is typed, Save is pressed, both rules
// fire, the Spike badge lands and the summary cards update.

const SHASROI = {
  repo: 'https://github.com/sumaiya-akter-roshni/Shasroi_Bazar',
  label:
    'Shasroi Bazar on its Add Price tab: onion (imported) at Dhaka Sadar entered at Tk 160 per kg is saved as M0003 and marked Spike. Its z-score of 3.32 is over the 2.5 limit, and it is 166.7% above a Tk 60 reference price set in the app. Summary cards: 762 prices saved, 1 Spike, a weekly basket of Tk 958.16 with each item at its cheapest market (best single market Narsingdi Sadar), 64% of a Tk 1500 budget used.',
}

const APP = {
  bg: '#eef2f5',
  card: '#ffffff',
  soft: '#f6f9f8',
  primary: '#1f6f5c',
  primaryDark: '#17574a',
  note: '#cfe6df',
  text: '#1f2933',
  muted: '#667085',
  border: '#d5dbe1',
  button: '#e6ebee',
  red: '#c62828',
  orange: '#d97706',
  green: '#2e7d32',
}
const APP_TITLE = 'Shasroi Bazar'
const APP_FONT = 12
const DIGIT = measure('0', APP_FONT)

// One cycle: 0.3-0.8 s type "160", 1.1 s press Save, 1.4 s the record, 1.7 s
// and 2.0 s the two rules, 2.3 s the badge lands and the summary updates, hold
// until 8.2 s, clear by 8.6 s. 2.9 cycles end inside the third hold, which is
// also the resting state, so the last frame never jumps.
const LOOP = 9
const RUNS = 2.9
const at = (s) => +((s / LOOP) * 100).toFixed(2)
const before = (s) => +(at(s) - 0.01).toFixed(2)
const CLEAR = 8.2

const SHASROI_CSS = (() => {
  const show = (from) => `0%,${before(from)}%{opacity:0}${at(from)}%,${at(CLEAR)}%{opacity:1}${at(CLEAR + 0.3)}%,100%{opacity:0}`
  const anim = (name) => `animation:${name} ${LOOP}s ${RUNS}`
  return `
.app{font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,'Noto Sans',Helvetica,Arial,sans-serif}
.d1{${anim('d1')};opacity:0}@keyframes d1{0%,${before(0.3)}%{opacity:0}${at(0.3)}%,${before(0.55)}%{opacity:1}${at(0.55)}%,100%{opacity:0}}
.d2{${anim('d2')};opacity:0}@keyframes d2{0%,${before(0.55)}%{opacity:0}${at(0.55)}%,${before(0.8)}%{opacity:1}${at(0.8)}%,100%{opacity:0}}
.d3{${anim('d3')}}@keyframes d3{${show(0.8)}}
.caret{${anim('caret')};opacity:0}
@keyframes caret{0%{transform:translateX(${f1(-3 * DIGIT)}px);opacity:1}${at(0.3)}%{transform:translateX(${f1(-2 * DIGIT)}px)}${at(0.55)}%{transform:translateX(${f1(-DIGIT)}px)}${at(0.8)}%{transform:translateX(0);opacity:1}${at(1.0)}%,100%{transform:translateX(0);opacity:0}}
.press{transform-box:fill-box;transform-origin:center;${anim('press')}}
@keyframes press{0%,${at(1.05)}%{transform:scale(1)}${at(1.15)}%{transform:scale(.95)}${at(1.3)}%,100%{transform:scale(1)}}
.saved{${anim('saved')}}@keyframes saved{${show(1.4)}}
.rule1{${anim('rule1')}}@keyframes rule1{${show(1.7)}}
.rule2{${anim('rule2')}}@keyframes rule2{${show(2.0)}}
.badge{transform-box:fill-box;transform-origin:center;${anim('badge')}}
@keyframes badge{0%,${before(2.3)}%{opacity:0;transform:scale(1.35)}${at(2.3)}%{opacity:1;transform:scale(1.35)}${at(2.55)}%{transform:scale(1)}${at(CLEAR)}%{opacity:1;transform:scale(1)}${at(CLEAR + 0.3)}%,100%{opacity:0;transform:scale(1)}}
.was{${anim('was')};opacity:0}@keyframes was{0%,${before(2.3)}%{opacity:1}${at(2.3)}%,${at(CLEAR + 0.3)}%{opacity:0}${at(CLEAR + 0.4)}%,100%{opacity:1}}
.now{${anim('now')}}@keyframes now{0%,${before(2.3)}%{opacity:0}${at(2.3)}%,${at(CLEAR + 0.3)}%{opacity:1}${at(CLEAR + 0.4)}%,100%{opacity:0}}`
})()

const app = (str, o) => text(str, { ...o, cls: `app${o.cls ? ' ' + o.cls : ''}` })

// Window frame and a Windows title bar (the app ran on Windows).
function appWindow(t, w, h) {
  const A = APP
  return `${rect({ x: 0.5, y: 0.5, w: w - 1, h: h - 1, r: 12, fill: A.bg, stroke: t.name === 'dark' ? t.border : A.border })}
<path d="M1 12.5A12 12 0 0 1 13 .5H${w - 13}A12 12 0 0 1 ${w - 1} 12.5V32H1z" fill="${A.card}"/>
<line x1="1" y1="32" x2="${w - 1}" y2="32" stroke="${A.border}"/>
${app(`${APP_TITLE} - Food Price Tracker`, { x: 16, y: 21, size: 12, fill: A.text })}
<g stroke="${A.muted}" stroke-width="1.1" fill="none"><path d="M${w - 118} 16.5h10"/><rect x="${w - 76}" y="11.5" width="9" height="9"/><path d="M${w - 34} 11.5l9 9M${w - 25} 11.5l-9 9"/></g>`
}

// A summary card; `before` values show until the price is saved.
function summaryCard(c, x, y, w, h, s = 1) {
  const A = APP
  const vy = y + 41 * s
  const sy = y + 57 * s
  const vs = 18 * s
  const ss = 10.5 * s
  const swap = c.before !== undefined
  const value = swap
    ? `<g class="was">${app(c.before, { x: x + 14, y: vy, size: vs, weight: 700, fill: c.beforeColour ?? c.colour })}</g>
<g class="now">${app(c.after, { x: x + 14, y: vy, size: vs, weight: 700, fill: c.colour })}</g>`
    : app(c.after, { x: x + 14, y: vy, size: vs, weight: 700, fill: c.colour })
  const sub =
    swap && c.subBefore !== c.subAfter
      ? `<g class="was">${app(c.subBefore, { x: x + 14, y: sy, size: ss, fill: A.muted })}</g>
<g class="now">${app(c.subAfter, { x: x + 14, y: sy, size: ss, fill: A.muted })}</g>`
      : app(c.subAfter, { x: x + 14, y: sy, size: ss, fill: A.muted })
  return `${rect({ x, y, w, h, r: 2, fill: A.card, stroke: A.border })}
${app(c.label, { x: x + 14, y: y + 19 * s, size: 9.5 * s, weight: 700, fill: A.muted, ls: 0.3 })}
${value}
${sub}`
}

const SUMMARY = [
  { label: 'PRICES SAVED', before: '761', after: '762', subBefore: '759 from WFP + 2 yours', subAfter: '759 from WFP + 3 yours', colour: APP.text },
  { label: 'UNUSUAL PRICES', before: '0 Spike', after: '1 Spike', subBefore: '11 Watch (last 365 days)', subAfter: '11 Watch (last 365 days)', colour: APP.red, beforeColour: APP.text },
  { label: 'BASKET (SPLIT PLAN)', after: 'Tk 958.16', subAfter: 'Best market: Narsingdi Sadar', colour: APP.text },
  { label: 'WEEKLY BUDGET', after: '64% used', subAfter: 'Within budget (Tk 1500)', colour: APP.green },
]

// The typed price, its caret and the Save button, shared by both layouts.
function priceInput(ix, iy, bw) {
  const A = APP
  return `${rect({ x: ix, y: iy, w: bw, h: 26, r: 1, fill: A.card, stroke: A.border })}
<g class="d1">${app('1', { x: ix + 8, y: iy + 17, size: APP_FONT, fill: A.text })}</g>
<g class="d2">${app('16', { x: ix + 8, y: iy + 17, size: APP_FONT, fill: A.text })}</g>
<g class="d3">${app('160', { x: ix + 8, y: iy + 17, size: APP_FONT, fill: A.text })}</g>
<g class="caret"><rect x="${f1(ix + 9 + 3 * DIGIT)}" y="${iy + 6}" width="1.2" height="15" fill="${A.text}"/></g>`
}

function saveButton(x, y, w = 104) {
  const A = APP
  return `<g class="press">${rect({ x, y, w, h: 30, r: 1, fill: A.primary })}
${app('Save price', { x: x + w / 2, y: y + 19.5, size: 12.5, weight: 700, fill: '#ffffff', anchor: 'middle' })}</g>`
}

function result(rx, y, w, rows = true) {
  const A = APP
  return `${app('RESULT', { x: rx, y: y + 22, size: 9.5, weight: 700, fill: A.muted, ls: 0.3 })}
<g class="badge">${rect({ x: rx, y: y + 32, w: 88, h: 34, r: 1, fill: A.red })}
${app('Spike', { x: rx + 44, y: y + 55, size: 18, weight: 700, fill: '#ffffff', anchor: 'middle' })}</g>
<g class="saved">${app('Saved as M0003', { x: rx, y: y + 88, size: 12, fill: A.text })}
${app('Onion (imported)  |  Dhaka Sadar  |  2026-11-07', { x: rx, y: y + 106, size: 12, fill: A.text })}
${app('Price: Tk 160.00 per kg', { x: rx, y: y + 124, size: 12, fill: A.text })}</g>
<g class="rule1">${app('Rule 1 - z-score: 3.32   (limit 2.5)', { x: rx, y: y + 150, size: 12, fill: A.text })}</g>
<g class="rule2">${app('Rule 2 - above reference: +166.7%   (limit +25%)', { x: rx, y: y + 168, size: 12, fill: A.text })}</g>${
    rows
      ? `
<line x1="${rx}" y1="${y + 188}" x2="${rx + w}" y2="${y + 188}" stroke="${A.border}"/>
${app('HOW THE ALERT WORKS', { x: rx, y: y + 208, size: 9.5, weight: 700, fill: A.muted, ls: 0.3 })}
${[
  ['Spike', A.red, 'both rules are true'],
  ['Watch', A.orange, 'one rule is true'],
  ['Normal', A.green, 'no rule is true'],
]
  .map(
    ([k, c, d], i) => `${rect({ x: rx, y: y + 220 + i * 19, w: 52, h: 15, r: 1, fill: c })}
${app(k, { x: rx + 26, y: y + 231 + i * 19, size: 9.5, weight: 700, fill: '#ffffff', anchor: 'middle' })}
${app(d, { x: rx + 62, y: y + 232 + i * 19, size: 11.5, fill: A.text })}`,
  )
  .join('\n')}`
      : ''
  }`
}

function shasroi(t) {
  const w = W
  const h = 520
  const A = APP
  const subX = f1(18 + measure(APP_TITLE, 19, { weight: 700 }) * 1.25 + 12)
  const cw = (w - 24 - 3 * 8) / 4
  let tx = 12
  const tabs = ['Add Price', 'Records', 'Statistics', 'My Basket']
    .map((label, i) => {
      const tw = f1(measure(label, 12.5, { weight: 700 }) + 26)
      const active = i === 0
      const g = `${rect({ x: tx, y: active ? 166 : 168, w: tw, h: active ? 28 : 26, r: 0, fill: active ? A.card : A.button, stroke: A.border })}
${app(label, { x: tx + tw / 2, y: 185, size: 12.5, weight: 700, fill: active ? A.primary : A.muted, anchor: 'middle' })}`
      tx += tw
      return g
    })
    .join('\n')
  const fx = 28
  const ix = 172
  const field = (label, value, y, select) => `${app(label, { x: fx, y: y + 17, size: 12, fill: A.text })}
${rect({ x: ix, y, w: select ? 228 : 132, h: 26, r: 1, fill: A.card, stroke: A.border })}
${app(value, { x: ix + 8, y: y + 17, size: 12, fill: A.text })}${select ? `\n<path d="M${ix + 214} ${y + 11}l4 4 4-4" fill="none" stroke="${A.text}" stroke-width="1.2"/>` : ''}`
  return doc({
    w,
    h,
    label: SHASROI.label,
    css: SHASROI_CSS,
    body: `${appWindow(t, w, h)}
<rect x="1" y="32.5" width="${w - 2}" height="48" fill="${A.primary}"/>
${app(APP_TITLE, { x: 18, y: 63, size: 19, weight: 700, fill: '#ffffff' })}
${app('Food prices around Dhaka - real WFP prices + your own', { x: subX, y: 62, size: 12.5, fill: A.note })}
${app('Today: 2026-11-07', { x: w - 18, y: 62, size: 12.5, fill: A.note, anchor: 'end' })}
${SUMMARY.map((c, i) => summaryCard(c, 12 + i * (cw + 8), 90, cw, 66)).join('\n')}
${tabs}
${rect({ x: 12, y: 194, w: w - 24, h: 314, r: 0, fill: A.card, stroke: A.border })}
${app('Add a price you paid', { x: fx, y: 228, size: 15, weight: 700, fill: A.text })}
${app('Choose the product and the market, then type the price.', { x: fx, y: 247, size: 11.5, fill: A.muted })}
${field('Product', 'Onion (imported) [ONION]', 262, true)}
${field('Market', 'Dhaka Sadar', 292, true)}
${field('Date (YYYY-MM-DD)', '2026-11-07', 322)}
${app('Price per unit (Tk)', { x: fx, y: 369, size: 12, fill: A.text })}
${priceInput(ix, 352, 132)}
${app('Unit: kg  |  Reference price: Tk 60.00  |  Type: perishable', { x: fx, y: 404, size: 11.5, fill: A.muted })}
${saveButton(fx, 420)}
${rect({ x: fx + 112, y: 420, w: 80, h: 30, r: 1, fill: A.button })}
${app('Clear', { x: fx + 152, y: 439.5, size: 12.5, fill: A.text, anchor: 'middle' })}
${rect({ x: 432, y: 208, w: w - 442, h: 288, r: 1, fill: A.soft, stroke: A.border })}
${result(446, 208, w - 484)}`,
  })
}

function shasroiNarrow(t) {
  const w = NARROW
  const h = 522
  const A = APP
  const cw = (w - 28) / 2
  return doc({
    w,
    h,
    label: SHASROI.label,
    css: SHASROI_CSS,
    body: `${appWindow(t, w, h)}
<rect x="1" y="32.5" width="${w - 2}" height="44" fill="${A.primary}"/>
${app(APP_TITLE, { x: 16, y: 60, size: 17, weight: 700, fill: '#ffffff' })}
${app('Today: 2026-11-07', { x: w - 16, y: 59, size: 11.5, fill: A.note, anchor: 'end' })}
${SUMMARY.map((c, i) => summaryCard(c, 10 + (i % 2) * (cw + 8), 86 + Math.floor(i / 2) * 72, cw, 64, 0.97)).join('\n')}
${rect({ x: 10, y: 236, w: w - 20, h: h - 246, r: 0, fill: A.card, stroke: A.border })}
${app('Add a price you paid', { x: 24, y: 262, size: 14, weight: 700, fill: A.text })}
${rect({ x: 24, y: 274, w: 196, h: 26, r: 1, fill: A.card, stroke: A.border })}
${app('Onion (imported)', { x: 32, y: 291, size: APP_FONT, fill: A.text })}
<path d="M206 285l4 4 4-4" fill="none" stroke="${A.text}" stroke-width="1.2"/>
${priceInput(228, 274, 72)}
${saveButton(308, 272, 98)}
${rect({ x: 24, y: 312, w: w - 48, h: 188, r: 1, fill: A.soft, stroke: A.border })}
${result(38, 312, w - 76, false)}`,
  })
}

// ========================================================== projects =====
//
// Six cards, two to a row. The top of each card is a diagram of how the
// project works, drawn with the real logos of what it runs on; the light runs
// as a relay across the grid (see lib/diagram.mjs), one card at a time, for
// two rounds. Node positions are rough: centerNodes() puts each drawing in the
// middle of its well.

const PROJECTS = [
  {
    slug: 'gridwise-llm',
    title: 'Gridwise LLM Energy Optimizer',
    href: 'https://github.com/ALPHAMAN-0/Gridwise_LLM_Energy_Optimizer',
    repo: 'ALPHAMAN-0/Gridwise_LLM_Energy_Optimizer',
    line: 'Gemini reads campus operator notes and a linear program plans the cheapest 24-hour energy schedule. Optimal on all 10 BUP CSE Fest 2026 samples.',
    how: 'operator notes go to Gemini, through guardrails, to a PuLP linear program that returns a 24-hour plan',
    diagram: {
      nodes: [
        { id: 'notes', kind: 'pill', label: 'Operator notes', x: 72, y: 38 },
        { id: 'llm', kind: 'tile', icon: 'google-gemini-icon', label: 'Gemini', x: 194, y: 38 },
        { id: 'guard', kind: 'pill', label: 'Guardrails', x: 318, y: 38 },
        { id: 'lp', kind: 'pill', label: 'PuLP solver', x: 318, y: 104 },
        { id: 'plan', kind: 'pill', label: '24-hour plan', x: 166, y: 104 },
      ],
      edges: [
        { from: 'notes', to: 'llm' },
        { from: 'llm', to: 'guard' },
        { from: 'guard', to: 'lp' },
        { from: 'lp', to: 'plan' },
      ],
    },
  },
  {
    slug: 'sleep-loop',
    title: 'Sleep Loop',
    href: 'https://github.com/ALPHAMAN-0/Sleep_Loop',
    repo: 'ALPHAMAN-0/Sleep_Loop',
    line: 'A Python repair loop of about 200 lines: a scripted maker proposes fixes, a checker runs ast, lint and pytest, and failures become rules.',
    how: 'a maker proposes a fix, a pytest checker gates it, a failure is written to RULES.md and goes back to the maker, a pass waits for a human to merge',
    diagram: {
      nodes: [
        { id: 'maker', kind: 'pill', label: 'Maker', x: 62, y: 36 },
        { id: 'check', kind: 'pill', icon: 'pytest', label: 'Checker', x: 200, y: 36 },
        { id: 'rules', kind: 'pill', label: 'RULES.md', x: 62, y: 102 },
        { id: 'human', kind: 'pill', icon: 'ui-user-check', label: 'Human merge', x: 318, y: 102 },
      ],
      edges: [
        { from: 'maker', to: 'check' },
        { from: 'check', to: 'rules', exit: 'bottom', entry: 'right' },
        { from: 'rules', to: 'maker' },
        { from: 'check', to: 'human', exit: 'right', entry: 'top' },
      ],
      runs: [
        ['maker', 'check', 0],
        ['check', 'rules', 0.5],
        ['rules', 'maker', 0.95],
        ['maker', 'check', 1.35],
        ['check', 'human', 1.85],
      ],
    },
  },
  {
    slug: 'aiub-notice-board',
    title: 'AIUB Notice Board',
    href: 'https://github.com/ALPHAMAN-0/AIUB_NOTICE_BOARD',
    repo: 'ALPHAMAN-0/AIUB_NOTICE_BOARD',
    line: 'Sends each new AIUB notice to Telegram with a category and a one-line summary from GPT-4o mini, four times a day since June 2026.',
    how: 'GitHub Actions checks the AIUB notices page, GPT-4o mini sorts and summarises each new notice, Telegram delivers it',
    diagram: {
      nodes: [
        { id: 'site', kind: 'pill', label: 'aiub.edu', x: 50, y: 50 },
        { id: 'gha', kind: 'tile', icon: 'github-actions', label: 'Actions', x: 146, y: 50 },
        { id: 'llm', kind: 'tile', icon: 'openai', label: 'GPT-4o mini', x: 246, y: 50 },
        { id: 'tg', kind: 'tile', icon: 'telegram', label: 'Telegram', x: 346, y: 50 },
      ],
      edges: [
        { from: 'site', to: 'gha' },
        { from: 'gha', to: 'llm' },
        { from: 'llm', to: 'tg' },
      ],
    },
  },
  {
    slug: 'sales-inventory-crm',
    title: 'Sales Inventory CRM',
    href: 'https://github.com/ALPHAMAN-0/Sales_Inventory_CRM',
    repo: 'ALPHAMAN-0/Sales_Inventory_CRM',
    line: 'Sales, stock and win-back of lost customers for shops with several branches. A two-process race test checks the last unit sells only once.',
    how: 'a React point of sale calls a Laravel API, which locks stock rows in MySQL and queues follow-up work in Redis',
    diagram: {
      nodes: [
        { id: 'pos', kind: 'tile', icon: 'react', label: 'POS', x: 52, y: 50 },
        { id: 'api', kind: 'tile', icon: 'laravel', label: 'Laravel API', x: 166, y: 50 },
        { id: 'db', kind: 'tile', icon: 'mysql', label: 'Row lock', x: 300, y: 26 },
        { id: 'q', kind: 'tile', icon: 'redis', label: 'Queue', x: 300, y: 104 },
      ],
      edges: [
        { from: 'pos', to: 'api' },
        { from: 'api', to: 'db' },
        { from: 'api', to: 'q' },
      ],
      runs: [
        ['pos', 'api', 0],
        ['api', 'db', 0.45],
        ['db', 'api', 0.95],
        ['api', 'q', 1.4],
        ['api', 'pos', 1.55],
      ],
    },
  },
  {
    slug: 'realtime-comms',
    title: 'Cipher',
    href: 'https://github.com/ALPHAMAN-0/CodeAlpha_RealTimeCommunicationApp',
    repo: 'ALPHAMAN-0/CodeAlpha_RealTimeCommunicationApp',
    line: 'End-to-end encrypted team chat with video calls for up to four people, screen sharing and a shared whiteboard. Built for my CodeAlpha internship.',
    how: 'browsers connect through a Socket.IO realtime server, call each other over a WebRTC mesh, and the server stores only ciphertext in MongoDB',
    diagram: {
      nodes: [
        { id: 'web', kind: 'tile', icon: 'react', label: 'Browser', x: 60, y: 50 },
        { id: 'srv', kind: 'core', icon: 'socket.io', label: 'Realtime server', x: 192, y: 50 },
        { id: 'rtc', kind: 'tile', icon: 'webrtc', label: 'Mesh call', x: 334, y: 32 },
        { id: 'store', kind: 'pill', icon: 'mongodb', label: 'Ciphertext', x: 326, y: 106 },
      ],
      edges: [
        { from: 'web', to: 'srv' },
        { from: 'srv', to: 'rtc' },
        { from: 'srv', to: 'store' },
      ],
      runs: [
        ['web', 'srv', 0],
        ['srv', 'rtc', 0.5],
        ['srv', 'store', 0.95],
        ['rtc', 'srv', 1.45],
      ],
    },
  },
  {
    slug: 'sir-ar-last-date',
    title: 'Sir ar Last Date',
    href: 'https://github.com/ALPHAMAN-0/Sir_ar_last_date',
    repo: 'ALPHAMAN-0/Sir_ar_last_date',
    line: 'Teachers upload a roster and a deadline and see who pushed to GitHub on time. Runs on Cloudflare Workers; the token stays server-side.',
    how: 'the browser reads the roster and builds the spreadsheet report; a Cloudflare Worker holds the GitHub token and asks the GraphQL API only about the repos',
    diagram: {
      nodes: [
        { id: 'roster', kind: 'tile', icon: 'xlsx', label: 'Roster', x: 40, y: 34 },
        { id: 'browser', kind: 'core', icon: 'ui-globe', label: 'Browser', x: 146, y: 34 },
        { id: 'worker', kind: 'tile', icon: 'cloudflare-workers', label: 'Worker', x: 252, y: 34 },
        { id: 'gh', kind: 'tile', icon: 'github', label: 'GraphQL', x: 352, y: 34 },
        { id: 'report', kind: 'pill', icon: 'xlsx', label: 'Report', x: 146, y: 110 },
      ],
      edges: [
        { from: 'roster', to: 'browser' },
        { from: 'browser', to: 'worker' },
        { from: 'worker', to: 'gh' },
        { from: 'browser', to: 'report' },
      ],
      runs: [
        ['roster', 'browser', 0],
        ['browser', 'worker', 0.4],
        ['worker', 'gh', 0.8],
        ['gh', 'worker', 1.2],
        ['browser', 'report', 1.65],
      ],
    },
  },
]

const CARD = { well: 132, h: 292 }
const WRAP = 350 // of the 374px between the paddings: a face 12% wider still fits

function card(t, p, i, narrow = false) {
  const left = i % 2 === 0
  const x0 = narrow || left ? 0 : GUTTER / 2
  const w = narrow ? NARROW : HALF - GUTTER / 2
  const pad = 24
  const wellW = w - 24
  const nodes = centerNodes(p.diagram.nodes, wellW, CARD.well).map((n) => ({ ...n, x: x0 + 12 + n.x, y: 12 + n.y }))
  const d = diagram(t, { ...p.diagram, nodes }, { index: i, slots: PROJECTS.length })
  const lines = wrap(p.line, WRAP, 13.5)
  if (lines.length > 3) throw new Error(`card ${p.slug}: description runs to ${lines.length} lines`)
  return doc({
    w: narrow ? NARROW : HALF,
    h: CARD.h + ROW_GAP,
    label: `${p.title}: ${p.line} How it works: ${p.how}.`,
    css: d.css,
    body: `<g class="rise" style="${delay(0.05 * i)}">
${panel(t, { x: x0, w, h: CARD.h, r: 16 })}
${rect({ x: x0 + 12, y: 12, w: wellW, h: CARD.well, r: 11, fill: t.surface })}
${d.svg}
${text(p.title, { x: x0 + pad, y: 12 + CARD.well + 34, size: 17, weight: 600, ls: -0.2, fill: t.ink })}
${lines.map((l, k) => text(l, { x: x0 + pad, y: 12 + CARD.well + 58 + k * 20, size: 13.5, fill: t.muted })).join('\n')}
${text(p.repo, { x: x0 + pad, y: CARD.h - 18, size: 12, mono: true, fill: t.muted })}
</g>`,
  })
}

// ========================================================== learning =====
//
// What I am learning now, from now.json: each card names the topic, what I am
// doing with it, and the public repo or page where the practice lives (the
// card links there). NestJS and .NET show their own logos; the two AI topics
// have no product of their own, so they show a small still diagram instead.

// Three small logos on their tiles, centred under the big one.
function smallRow(t, names, cx, y) {
  const size = 26
  const gap = 6
  const x0 = cx - (names.length * size + (names.length - 1) * gap) / 2
  return names.map((n, i) => logoTile(n, { x: x0 + i * (size + gap), y, size, t, color: n.startsWith('ui-') ? t.tileInk : undefined }).svg).join('\n')
}

const LEARN_VISUAL = {
  nestjs: (t, x, y, w, h) => `${icon('nestjs', { x: x + w / 2 - 30, y: y + 28, size: 60, t })}
${smallRow(t, ['typescript', 'postgres', 'docker'], x + w / 2, y + h - 46)}`,
  dotnet: (t, x, y, w, h) => `${icon('dotnet', { x: x + w / 2 - 29, y: y + 29, size: 58, t })}
${smallRow(t, ['c-sharp', 'ui-database', 'docker'], x + w / 2, y + h - 46)}`,
  // The roadmap's four phases, in order.
  'ai-engineering': (t, x, y, w, h) => {
    const steps = ['Foundations', 'Transformers', 'Diffusion', 'Original work']
    const nodes = centerNodes(
      steps.map((label, k) => ({ id: `s${k}`, kind: 'pill', label, x: 0, y: k * 42 })),
      w,
      h,
    ).map((n) => ({ ...n, x: x + n.x, y: y + n.y }))
    return diagram(t, { nodes, edges: steps.slice(1).map((_, k) => ({ from: `s${k}`, to: `s${k + 1}` })) }).svg
  },
  // A hub: Claude Code in the middle, the pieces a harness hands work to around it.
  'ai-harness': (t, x, y, w, h) => {
    const cx = x + w / 2
    const cy = y + h / 2
    const r = 48
    const spokes = ['square-terminal', 'bot', 'book-open-text', 'search'].map((glyph, k) => {
      const a = (-90 + k * 90) * (Math.PI / 180)
      return { id: glyph, kind: 'tile', icon: `ui-${glyph}`, x: f1(cx + r * Math.cos(a)), y: f1(cy + r * Math.sin(a)), size: 28, iconScale: 0.55 }
    })
    return diagram(t, {
      nodes: [{ id: 'core', kind: 'core', icon: 'claude-code', x: cx, y: cy, size: 40 }, ...spokes],
      edges: spokes.map((s) => ({ from: 'core', to: s.id })),
    }).svg
  },
}

const LEARN = { h: 196, visual: 132 }
const linkLabel = (href) =>
  href.startsWith('https://github.com/ALPHAMAN-0/') ? href.slice('https://github.com/ALPHAMAN-0/'.length) : href.replace(/^https?:\/\//, '').replace(/\/$/, '')

function learnCard(t, item, i, narrow = false) {
  const left = i % 2 === 0
  const x0 = narrow || left ? 0 : GUTTER / 2
  const w = narrow ? NARROW : HALF - GUTTER / 2
  const vis = LEARN_VISUAL[item.visual]
  if (!vis) throw new Error(`learning: no visual for ${item.visual}`)
  const tx = x0 + 12 + LEARN.visual + 20
  // Wrapped with 12% slack, like the project cards.
  const lines = wrap(item.focus, (w - (tx - x0) - 22) / 1.12, 13.5)
  if (lines.length > 5) throw new Error(`learning ${item.topic}: focus runs to ${lines.length} lines`)
  return doc({
    w: narrow ? NARROW : HALF,
    h: LEARN.h + ROW_GAP,
    label: `${item.topic}: ${item.focus} Practice: ${linkLabel(item.href)}.`,
    body: `<g class="rise" style="${delay(0.05 * i)}">
${panel(t, { x: x0, w, h: LEARN.h, r: 16 })}
${rect({ x: x0 + 12, y: 12, w: LEARN.visual, h: LEARN.h - 24, r: 11, fill: t.surface })}
${vis(t, x0 + 12, 12, LEARN.visual, LEARN.h - 24)}
${text(item.topic, { x: tx, y: 44, size: 17, weight: 600, ls: -0.2, fill: t.ink })}
${lines.map((l, k) => text(l, { x: tx, y: 69 + k * 19, size: 13.5, fill: t.muted })).join('\n')}
${text(linkLabel(item.href), { x: tx, y: LEARN.h - 20, size: 12, mono: true, fill: t.muted })}
</g>`,
  })
}

// ============================================================= stack =====
// The tools I work with, grouped, each with its real logo. Each group's chips
// are spread evenly over its lines instead of leaving a near-empty last line.

const STACK = [
  ['Languages', [['TypeScript', 'typescript'], ['JavaScript', 'javascript'], ['Python', 'python'], ['C#', 'c-sharp'], ['C++', 'c-plusplus'], ['C', 'c'], ['Go', 'go'], ['PHP', 'php'], ['Bash', 'bash']]],
  ['Web', [['Node.js', 'nodejs'], ['NestJS', 'nestjs'], ['Express', 'express'], ['React', 'react'], ['Next.js', 'nextjs'], ['Angular', 'angular'], ['.NET', 'dotnet'], ['Laravel', 'laravel'], ['FastAPI', 'fastapi'], ['Django', 'django'], ['Tailwind CSS', 'tailwindcss']]],
  ['Data', [['PostgreSQL', 'postgres'], ['MySQL', 'mysql'], ['MongoDB', 'mongodb'], ['Redis', 'redis']]],
  ['AI', [['OpenAI', 'openai'], ['Claude', 'claude'], ['Gemini', 'google-gemini-icon'], ['LangChain', 'langchain'], ['PyTorch', 'pytorch'], ['TensorFlow', 'tensorflow'], ['scikit-learn', 'scikitlearn'], ['NumPy', 'numpy'], ['pandas', 'pandas-icon']]],
  ['Ship', [['Docker', 'docker'], ['Kubernetes', 'kubernetes'], ['AWS', 'aws'], ['GitHub Actions', 'github-actions'], ['Cloudflare Workers', 'cloudflare-workers'], ['Vercel', 'vercel'], ['Linux', 'linux-tux'], ['Git', 'git-icon']]],
]

// The C mark is a pale one-colour mark (#A8B9CC) that vanishes on a white
// tile; it is printed in the tile's ink, as one-colour marks may be.
const MONO_ON_TILE = new Set(['c'])

const CHIP = { h: 34, gap: 8, rowGap: 10, fs: 13 }
const chipWidth = (name, ic) => {
  const tile = CHIP.h - 10
  const tw = WIDE.has(ic) ? Math.round(tile * 1.6) : tile
  return { tw, cw: Math.round(5 + tw + 9 + measure(name, CHIP.fs, { weight: 500 }) + 12) }
}

// Split items into lines no wider than `room`, with the lines as even as the
// widths allow.
function balance(items, room) {
  const widths = items.map(([name, ic]) => chipWidth(name, ic).cw)
  const total = widths.reduce((a, b) => a + b, 0) + CHIP.gap * (items.length - 1)
  const count = Math.max(1, Math.ceil(total / room))
  for (let n = count; n <= items.length; n++) {
    const target = total / n
    const lines = [[]]
    let x = 0
    widths.forEach((cw, k) => {
      const next = x ? x + CHIP.gap + cw : cw
      if (x && (next > room || (lines.length < n && x + CHIP.gap + cw / 2 > target))) {
        lines.push([])
        x = cw
      } else x = next
      lines.at(-1).push(k)
    })
    if (lines.length <= n && lines.every((l) => l.reduce((a, k) => a + widths[k], 0) + CHIP.gap * (l.length - 1) <= room)) return lines
  }
  return items.map((_, k) => [k])
}

function stackChips(t, items, lines, x0, y0, n0) {
  let n = n0
  return lines
    .map((line, li) => {
      let x = x0
      const cy = y0 + li * (CHIP.h + CHIP.rowGap)
      return line
        .map((k) => {
          const [name, ic] = items[k]
          const { tw, cw } = chipWidth(name, ic)
          const g = `<g class="rise" style="${delay(0.1 + n++ * 0.015)}">
${rect({ x, y: cy, w: cw, h: CHIP.h, r: 9, fill: t.surface })}
${logoTile(ic, { x: x + 5, y: cy + 5, size: CHIP.h - 10, t, r: 6, color: MONO_ON_TILE.has(ic) ? t.tileInk : undefined }).svg}
${text(name, { x: x + 5 + tw + 9, y: cy + 21.5, size: CHIP.fs, weight: 500, fill: t.ink })}
</g>`
          x += cw + CHIP.gap
          return g
        })
        .join('\n')
    })
    .join('\n')
}

const stackLabel = `Stack. ${STACK.map(([g, it]) => `${g}: ${it.map(([name]) => name).join(', ')}`).join('. ')}.`

function stack(t) {
  const padX = 28
  const labelW = 112
  const room = W - padX - (padX + labelW)
  let y = 28
  let n = 0
  const rows = []
  STACK.forEach(([group, items], gi) => {
    const lines = balance(items, room)
    rows.push(`${text(group, { x: padX, y: y + 21.5, size: 13, weight: 600, fill: t.muted })}
${stackChips(t, items, lines, padX + labelW, y, n)}`)
    n += items.length
    y += lines.length * (CHIP.h + CHIP.rowGap) + 8
    if (gi < STACK.length - 1) rows.push(`<line x1="${padX}" y1="${y - 9}" x2="${W - padX}" y2="${y - 9}" stroke="${t.line}"/>`)
  })
  const h = y + 18
  return doc({ w: W, h, label: stackLabel, body: `${panel(t, { w: W, h, r: 18 })}\n${rows.join('\n')}` })
}

function stackNarrow(t) {
  const padX = 20
  const room = NARROW - padX * 2
  let y = 22
  let n = 0
  const rows = []
  STACK.forEach(([group, items], gi) => {
    const lines = balance(items, room)
    rows.push(`${text(group, { x: padX, y: y + 14, size: 13, weight: 600, fill: t.muted })}
${stackChips(t, items, lines, padX, y + 26, n)}`)
    n += items.length
    y += 26 + lines.length * (CHIP.h + CHIP.rowGap) + 10
    if (gi < STACK.length - 1) rows.push(`<line x1="${padX}" y1="${y - 11}" x2="${NARROW - padX}" y2="${y - 11}" stroke="${t.line}"/>`)
  })
  const h = y + 10
  return doc({ w: NARROW, h, label: stackLabel, body: `${panel(t, { w: NARROW, h, r: 18 })}\n${rows.join('\n')}` })
}

// ============================================================ README =====
//
// The picture tags, their links and their alt texts, written into the README
// between marker comments. A phone gets the narrow file first; the desktop
// gets the dark or light file. Two-up cards carry width="860" on their narrow
// source, so on a phone each card fills the column instead of half of it.

const picture = (name, { width, height, narrowWidth } = {}) => {
  const narrow = written.includes(`${name}-narrow`)
    ? `<source media="(max-width: 600px)" srcset="${OUT}/${name}-narrow.svg"${narrowWidth ? ` width="${narrowWidth}"` : ''}>`
    : ''
  const size = `${width ? ` width="${width}"` : ''}${height ? ` height="${height}"` : ''}`
  return `<picture>${narrow}<source media="(prefers-color-scheme: dark)" srcset="${OUT}/${name}.svg"><img${size} src="${OUT}/${name}-light.svg" alt="${esc(labels.get(name))}"></picture>`
}
const link = (href, inner) => `<a href="${esc(href)}">${inner}</a>`

const BLOCKS = () => ({
  hero: picture('hero', { width: '100%' }),
  links: `<p>${LINKS.map((l) => link(l.href, picture(`chip-${l.slug}`, { height: 38 }))).join('')}</p>`,
  shasroi: link(SHASROI.repo, picture('shasroi-bazar', { width: '100%' })),
  projects: `<p>${PROJECTS.map((p) => link(p.href, picture(`card-${p.slug}`, { width: '50%', narrowWidth: 860 }))).join('')}</p>`,
  learning: `## Learning in ${NOW.month}\n\n<p>${NOW.learning.map((it) => link(it.href, picture(`learn-${it.slug}`, { width: '50%', narrowWidth: 860 }))).join('')}</p>`,
  stack: picture('stack', { width: '100%' }),
})

async function writeReadme() {
  let md = await readFile('README.md', 'utf8')
  for (const [name, html] of Object.entries(BLOCKS())) {
    const re = new RegExp(`(<!-- BEGIN generated:${name} -->\\n)[\\s\\S]*?(\\n<!-- END generated:${name} -->)`)
    if (!re.test(md)) throw new Error(`README.md: markers for "${name}" not found`)
    md = md.replace(re, (_, a, b) => `${a}${html}${b}`)
  }
  await writeFile('README.md', md)
}

// ============================================================== main =====

await mkdir(OUT, { recursive: true })

// The narrow hero stores the portrait once, over both theme halves.
await emit('hero', hero, heroNarrow, `<defs>${PORTRAIT.glow}</defs>\n${portrait(null, NARROW_PORTRAIT)}`)
for (const [i, l] of LINKS.entries()) await emit(`chip-${l.slug}`, (t) => chip(t, l, i))
await emit('shasroi-bazar', shasroi, shasroiNarrow)
for (const [i, p] of PROJECTS.entries()) {
  await emit(`card-${p.slug}`, (t) => card(t, p, i), (t) => card(t, p, i, true))
}
for (const [i, item] of NOW.learning.entries()) {
  await emit(`learn-${item.slug}`, (t) => learnCard(t, item, i), (t) => learnCard(t, item, i, true))
}
await emit('stack', stack, stackNarrow)
await writeReadme()

// An SVG in assets/ that this run did not write, and that is not a hand-made
// source, is a leftover from an older design: fail, so CI flags it.
const SOURCES = new Set(['ascii-portrait.svg'])
const fresh = new Set(written.flatMap((n) => (n.endsWith('-narrow') ? [`${n}.svg`] : [`${n}.svg`, `${n}-light.svg`])))
const stale = (await readdir(OUT)).filter((f) => f.endsWith('.svg') && !fresh.has(f) && !SOURCES.has(f))
if (stale.length) {
  console.error(`not written by this generator: ${stale.join(' ')} (delete them or add them to SOURCES)`)
  process.exitCode = 1
}

console.log(`assets: ${written.length} files -> ${OUT}/, README blocks: ${Object.keys(BLOCKS()).join(' ')}`)
console.log(`icons used: ${usedIcons().join(' ')}`)

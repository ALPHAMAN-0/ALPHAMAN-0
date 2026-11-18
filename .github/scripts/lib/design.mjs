// Shared design system for every generated SVG on the profile.
//
// One system: a white (light) or near-black (dark) panel with a hairline
// border, one blue accent, the reader's own system sans for words and a mono
// face only for code-ish labels. Real product logos carry the colour; the
// accent is reserved for the one thing on each panel that moves or matters.
//
// Palette dealt by the design-taste skill for a developer profile
// (start.mjs deal --page software): "white-link-blue" for light and
// "blue-black-cornflower" for dark. The dark panel takes GitHub's own canvas
// (#0d1117) instead of the dealt #0a0d14 so a panel sits flush on the page.
//
// Every file is drawn twice, once per theme, and the README picks one with
// <picture><source media="(prefers-color-scheme: dark)">. Panels are always
// filled, never transparent: a reader whose GitHub theme differs from their OS
// theme still gets a readable card, just in the other colour scheme.

export const THEMES = {
  light: {
    name: 'light',
    bg: '#ffffff',
    surface: '#f4f4f4',
    line: '#e6e6e6',
    border: '#d1d9e0',
    ink: '#111111',
    muted: '#6b6b6b',
    faint: '#a3a3a3',
    accent: '#1a4be0',
    accentInk: '#ffffff',
    accentSoft: '#e8eefc',
    good: '#1a7f37',
    // Logos sit on a tile so every brand colour reads on every ground.
    tile: '#ffffff',
    tileStroke: '#e3e3e3',
    tileInk: '#59636e',
    // Diagram connectors carry meaning (which way work flows), so they keep
    // 3:1 against the well they are drawn on (#f4f4f4).
    link: '#848d97',
    pill: '#ffffff',
    pillStroke: '#d1d9e0',
  },
  dark: {
    name: 'dark',
    bg: '#0d1117',
    surface: '#131824',
    line: '#202838',
    border: '#3d444d',
    ink: '#e9edf3',
    muted: '#8891a1',
    faint: '#566072',
    accent: '#5ab9fc',
    accentInk: '#0a0d14',
    accentSoft: '#12263a',
    good: '#3fb950',
    // A light tile on the dark ground: a dark logo (MySQL, pandas, AWS) would
    // otherwise vanish, and an ink logo can keep its own black.
    tile: '#e6eaf0',
    tileStroke: 'none',
    tileInk: '#3b4352',
    link: '#656d76',
    // A step above the #131824 well, so pills read as raised, as in light.
    pill: '#1c2230',
    pillStroke: '#3d444d',
  },
}

// The reader's own UI font. In an <img>-loaded SVG nothing can be fetched, so
// a webfont is out; GitHub's own stack renders as SF Pro on a Mac, Segoe UI on
// Windows and Noto Sans on Linux, which is what the rest of the page uses.
export const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif"
export const MONO = "ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,'Liberation Mono',monospace"

export const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const f1 = (n) => +Number(n).toFixed(1)

// ------------------------------------------------------------- measuring -----
// Helvetica advance widths (per 1000 em) for ASCII. SF Pro and Segoe UI run a
// few percent wider at text sizes, so measure() pads by 6% (8% for medium,
// 10% for semibold):
// every layout that places something after a run of text uses this number,
// and the stress render in the README check swaps the font for Verdana to
// prove the slack holds.
// Encoded as <char><width> pairs; the digits are all 556 and are added below,
// since a digit cannot be told apart from the width that follows it.
const AFM =
  ' 278!278"355#556$556%889&667\'191(333)333*389+584,278-333.278/278' +
  ':278;278<584=584>584?556@1015' +
  'A667B667C722D722E667F611G778H722I278J500K667L556M833N722O778P667Q778R722S667T611U722V667W944X667Y667Z611' +
  '[278\\278]278^469_556`333' +
  'a556b556c500d556e556f278g556h556i222j222k500l222m833n556o556p556q556r333s500t278u556v500w722x500y500z500' +
  '{334|260}334~584'
const WIDTHS = {}
for (let i = 0; i < AFM.length; ) {
  const ch = AFM[i]
  let j = i + 1
  while (j < AFM.length && /\d/.test(AFM[j])) j++
  WIDTHS[ch] = Number(AFM.slice(i + 1, j))
  i = j
}
for (const d of '0123456789') WIDTHS[d] = 556
Object.assign(WIDTHS, { '·': 278, '—': 1000, '–': 556, '’': 222, '…': 1000, '→': 1000, '↗': 800, '★': 800, '✓': 700, '×': 584, '₹': 556, '৳': 556 })

export function measure(str, size, { weight = 400, mono = false, ls = 0 } = {}) {
  const s = String(str)
  if (mono) return f1(s.length * size * 0.6 + ls * Math.max(0, s.length - 1))
  let units = 0
  for (const ch of s) units += WIDTHS[ch] ?? 600
  const pad = weight >= 600 ? 1.1 : weight >= 500 ? 1.08 : 1.06
  return f1((units / 1000) * size * pad + ls * Math.max(0, s.length - 1))
}

// Wrap by measured width. Lines are decided here, at build time, so the SVG
// never relies on the viewer's font to break a line. The lines are balanced:
// the narrowest width that keeps the same number of lines, so a paragraph
// never ends on one stranded word.
function greedy(str, maxWidth, size, opts) {
  const words = String(str).split(/\s+/)
  const lines = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (line && measure(next, size, opts) > maxWidth) {
      lines.push(line)
      line = w
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}

export function wrap(str, maxWidth, size, opts = {}) {
  const lines = greedy(str, maxWidth, size, opts)
  if (lines.length < 2) return lines
  let lo = maxWidth / 2
  let hi = maxWidth
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (greedy(str, mid, size, opts).length > lines.length) lo = mid
    else hi = mid
  }
  return greedy(str, hi, size, opts)
}

// ----------------------------------------------------------------- text -----

/**
 * A run of text. `mono` runs are pinned to the 0.6em monospace grid with
 * textLength, so code-ish labels line up whichever fallback face renders them.
 * Sans runs are left at their natural width and laid out with measure() slack.
 */
export function text(str, { x, y, size = 14, weight = 400, fill, anchor, mono = false, fit = false, ls, cls = '', style = '', opacity } = {}) {
  const a = anchor ? ` text-anchor="${anchor}"` : ''
  const classes = [mono ? 'm' : '', cls].filter(Boolean).join(' ')
  const c = classes ? ` class="${classes}"` : ''
  const s = style ? ` style="${style}"` : ''
  const w = weight !== 400 ? ` font-weight="${weight}"` : ''
  const l = ls ? ` letter-spacing="${ls}"` : ''
  const o = opacity !== undefined ? ` opacity="${opacity}"` : ''
  // `fit` pins a sans run to its measured width by adjusting only the spacing:
  // for a single line that sits inside a drawn shape (a pill), so a wider or
  // narrower fallback face can never spill out of it or leave it lopsided.
  const tl = mono
    ? ` textLength="${measure(str, size, { mono: true })}" lengthAdjust="spacingAndGlyphs"`
    : fit
      ? ` textLength="${measure(str, size, { weight })}" lengthAdjust="spacing"`
      : ''
  return `<text x="${f1(x)}" y="${f1(y)}" font-size="${size}"${w} fill="${fill}"${a}${l}${o}${c}${s}${tl}>${esc(str)}</text>`
}

// ---------------------------------------------------------------- motion -----
//
// Every entrance is written as a from-only keyframe with fill-mode `both`, so
// the RESTING state is the finished one: a renderer that never runs the
// animation, or a reader with reduced motion, sees the whole card at once.
// Nothing here waits for scroll (an <img> cannot know about it); entrances run
// once on load, and the few loops are 2.5 to 4 seconds of travel.

export const EASE = 'cubic-bezier(.2,.7,.2,1)'

export const BASE_CSS = `
text{font-family:${SANS}}
.m{font-family:${MONO}}
.rise{animation:rise .7s ${EASE} both}
@keyframes rise{from{opacity:0;transform:translateY(8px)}}
.fade{animation:fade .8s ease both}
@keyframes fade{from{opacity:0}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
`.trim()

export const delay = (s) => `animation-delay:${f1(s * 100) / 100}s`

// ----------------------------------------------------------------- shapes -----

export function panel(t, { x = 0, y = 0, w, h, r = 16, fill, stroke } = {}) {
  return `<rect x="${f1(x + 0.5)}" y="${f1(y + 0.5)}" width="${f1(w - 1)}" height="${f1(h - 1)}" rx="${r}" fill="${fill ?? t.bg}" stroke="${stroke ?? t.border}"/>`
}

export function rect({ x, y, w, h, r = 0, fill = 'none', stroke, sw, cls = '', style = '' }) {
  const s = stroke ? ` stroke="${stroke}"` : ''
  const k = sw ? ` stroke-width="${sw}"` : ''
  const c = cls ? ` class="${cls}"` : ''
  const st = style ? ` style="${style}"` : ''
  return `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${r}" fill="${fill}"${s}${k}${c}${st}/>`
}

/**
 * A whole SVG document. `label` is the accessible name for anyone opening the
 * file directly; the README carries the same words in the <img alt>.
 */
export function doc({ w, h, label, css = '', defs = '', body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}">
<style>${BASE_CSS}${css ? '\n' + css.trim() : ''}</style>
${defs ? `<defs>${defs}</defs>\n` : ''}${body}
</svg>
`
}

// ------------------------------------------------------------ narrow -----
//
// On a phone the README column is about 360px, so every desktop SVG would
// shrink to under half size. The README gives each picture a first <source
// media="(max-width: 600px)"> with a narrow file drawn 430 wide, which shows
// at about 0.85x. A colour-scheme test cannot be combined with the width test
// in that one media query (GitHub rewrites colour-scheme queries to follow its
// own theme setting), so a narrow file carries both themes and picks one with
// its own prefers-color-scheme rule. The two halves are drawn by the same
// functions as the desktop pair, so they cannot drift apart.

const prefixIds = (svg, p) =>
  svg
    .replace(/\bid="([^"]+)"/g, (_, id) => `id="${p}${id}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${p}${id})`)
    .replace(/href="#([^"]+)"/g, (_, id) => `href="#${p}${id}"`)

function parts(svg) {
  const open = svg.match(/<svg\b[^>]*>/)[0]
  const style = (svg.match(/<style>([\s\S]*?)<\/style>/) || [])[1] ?? ''
  const body = svg.slice(svg.indexOf('</style>') + 8, svg.lastIndexOf('</svg>'))
  return { open, style, body }
}

// `shared` is drawn once, over both halves, for anything that looks the same
// in both themes (the portrait): it would otherwise be stored twice.
export function adaptive(dark, light, shared = '') {
  const L = parts(light)
  const D = parts(prefixIds(dark, 'k'))
  // The CSS is drawn without colours, so one copy serves both halves.
  return `${L.open}
<style>${L.style}
.th-d{display:none}
@media (prefers-color-scheme:dark){.th-l{display:none}.th-d{display:inline}}</style>
<g class="th-l">${L.body}</g>
<g class="th-d">${D.body}</g>${shared ? `\n${shared}` : ''}
</svg>
`
}

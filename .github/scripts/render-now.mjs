// Generates the "now shipping" window the profile README renders.
//
// Reads now.json (the single source of truth for what I'm currently shipping,
// learning, and open to) and writes assets/now.svg + assets/now-light.svg using
// the same window chrome as every other asset on the profile.
//
// The window is three labelled columns inside one document, the way a manager
// would expect to see status written. Each row staggers in top-down so the
// whole card reads as a single beat, not three independent lists.
//
// Run: node .github/scripts/render-now.mjs
// The workflow re-runs this and fails on a dirty diff, so the rendered SVG can
// never silently drift from now.json.

import { mkdir, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { THEMES, esc, svg, mono, delay, adv, len } from './lib/chrome.mjs'

const OUT = 'assets'

// GitHub renders a README inside an ~890px column. Sizing to 860 keeps the
// asset crisp at 1:1 instead of being scaled down by the browser's max-width.
const WIDE = 860

// Sections rendered, in the order they appear on the card. Each one is a
// header plus a list of vertical strings. Sourced from now.json so a content
// edit never touches this file.
const data = JSON.parse(readFileSync('now.json', 'utf8'))

const SECTIONS = [
  { key: 'shipping', label: 'shipping' },
  { key: 'learning', label: 'learning' },
  { key: 'open_to', label: 'open_to' },
]

// Width budget: 860 minus 56px of side padding = 804, divided by 3 columns.
// Each column gets ~268px; with the 12.5px monospace that's ~36 columns of text.
const COL_W = (WIDE - 56) / SECTIONS.length
const FS = 11
const LH = 18
const HEAD_Y = 64
const ROW_Y = 92

function column(t, section, ci) {
  const items = data[section.key] || []
  const x = 28 + ci * COL_W

  const head = mono(`./${section.label}/`, {
    x,
    y: HEAD_Y,
    size: FS,
    fill: t.fg,
    cls: 'in',
    style: delay(0),
  })

  // Stagger index is the visual ROW, not a running counter, so all three
  // columns cascade downwards together. Indexing by generation order instead
  // would make column 3 wait for every row of columns 1-2 before it starts.
  //
  // Each item is clipped to the column's pixel budget so a long shipping line
  // never bleeds into the next column. budget = column width minus the branch
  // glyph plus the bullet square plus one gap. We use len()/adv() so the
  // math agrees with the rest of the design system instead of duplicating CH.
  const bullet = adv(FS) * 1.6
  const gap = bullet
  const budget = COL_W - len('└── ', FS) - bullet - gap
  const fit = (s) => {
    if (len(s, FS) <= budget) return s
    // Walk back from the end until the rendered width fits, then add an
    // ellipsis. Looping one char at a time is fine: items are short.
    let out = s
    while (len(out + '…', FS) > budget && out.length > 0) out = out.slice(0, -1)
    return out + '…'
  }

  const rows = items
    .map((item, k) => {
      const y = ROW_Y + k * LH
      const branch = k === items.length - 1 ? '└── ' : '├── '
      const bx = x + len(branch, FS)
      return `<g class="in" style="${delay(k + 1)}">
${mono(branch, { x, y, size: FS, fill: t.border })}
<rect x="${bx.toFixed(1)}" y="${(y - 7).toFixed(1)}" width="6" height="6" fill="${t.accent}"/>
${mono(fit(item), { x: +(bx + bullet + gap).toFixed(1), y, size: FS, fill: t.muted })}
</g>`
    })
    .join('\n')

  return [head, rows].filter(Boolean).join('\n')
}

function build(t) {
  // Height = header strip (60) + max section row count * line height + bottom
  // padding (24). Computed from the data so adding a row never silently
  // overflows the window.
  const maxRows = Math.max(...SECTIONS.map((s) => (data[s.key] || []).length))
  const h = ROW_Y + maxRows * LH + 24

  // Vertical hairline between columns, drawn over the chrome border so it
  // sits visually on top of the rounded rect. Two lines per gap so adjacent
  // columns get one separator each (drawn at the same x); one is enough to
  // read as a divider.
  const dividers = SECTIONS.slice(0, -1)
    .map((_, i) => {
      const x = 28 + (i + 1) * COL_W - 12
      return `<line x1="${x.toFixed(1)}" y1="50" x2="${x.toFixed(1)}" y2="${h - 14}" stroke="${t.border}"/>`
    })
    .join('\n')

  const body = SECTIONS.map((s, i) => column(t, s, i)).join('\n')

  return svg({
    w: WIDE,
    h,
    title: 'now',
    t,
    label: `Now: shipping — ${(data.shipping || []).join('; ')}; learning — ${(data.learning || []).join('; ')}; open to — ${(data.open_to || []).join('; ')}`,
    body: `${dividers}\n${body}`,
  })
}

await mkdir(OUT, { recursive: true })
await writeFile(`${OUT}/now.svg`, build(THEMES.dark))
await writeFile(`${OUT}/now-light.svg`, build(THEMES.light))

console.log(`now: 3 sections -> ${OUT}/now.svg ${OUT}/now-light.svg`)
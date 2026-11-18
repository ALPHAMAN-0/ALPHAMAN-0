// Small node-and-line diagrams for the project and learning cards: how each
// project works, drawn with the real logos of the tools it uses.
//
// At rest a diagram is complete on its own: every line ends in an arrowhead,
// so the direction of the flow reads without any motion, and connectors keep
// 3:1 contrast against their well.
//
// Motion is a relay. Every card on the grid shares one period (slots x slot
// seconds) and owns one window of it, so exactly one card is moving at any
// moment and the light appears to hand over from card to card. Inside its
// window a card's runs fire in order (the ripple), each pulse taking `travel`
// seconds, and the node a pulse reaches lights its ring. The relay plays
// `rounds` times and then stops for good: a README cannot offer a pause
// button, so nothing here moves forever. At rest, under reduced motion, or in
// a renderer that ignores CSS, the pulses and rings are invisible.

import { measure, text } from './design.mjs'
import { icon } from './icons.mjs'

const f1 = (n) => +Number(n).toFixed(1)
const pct = (n) => +Math.min(100, Math.max(0, n)).toFixed(3)

let uid = 0
/** Restart the id counter for a new document (see resetIcons). */
export const resetDiagrams = () => {
  uid = 0
}

// A pill may lead with a small logo (a step done by a named tool).
const PILL_ICON = 14
const PILL_ICON_GAP = 6
const PILL_FONT = 11.5

function box(n) {
  if (n.kind === 'pill') {
    const lead = n.icon ? PILL_ICON + PILL_ICON_GAP : 0
    const w = n.w ?? f1(measure(n.label, PILL_FONT, { weight: 500 }) + 24 + lead)
    return { x: n.x - w / 2, y: n.y - 14, w, h: 28 }
  }
  const s = n.size ?? (n.kind === 'core' ? 48 : 40)
  return { x: n.x - s / 2, y: n.y - s / 2, w: s, h: s }
}

// A tile's label hangs under it; a line leaving or reaching a tile from below
// starts under the label so it never runs through the words.
const LABEL_DROP = 21
const LABEL_SIZE = 11
const hasLabel = (n) => n.label && n.kind !== 'pill'
const bottom = (n, B) => B.y + B.h + (hasLabel(n) ? LABEL_DROP : 0)

/** The drawn extent of a node, label included. */
function extent(n) {
  const B = box(n)
  if (!hasLabel(n)) return B
  const lw = measure(n.label, LABEL_SIZE)
  const x = Math.min(B.x, n.x - lw / 2)
  return { x, y: B.y, w: Math.max(B.x + B.w, n.x + lw / 2) - x, h: B.h + LABEL_DROP - 4 }
}

/**
 * Shift hand-placed nodes so the drawing sits in the middle of a w x h well,
 * with equal margins left and right, top and bottom.
 */
export function centerNodes(nodes, w, h) {
  const ex = nodes.map(extent)
  const x0 = Math.min(...ex.map((e) => e.x))
  const y0 = Math.min(...ex.map((e) => e.y))
  const x1 = Math.max(...ex.map((e) => e.x + e.w))
  const y1 = Math.max(...ex.map((e) => e.y + e.h))
  const dx = (w - (x1 - x0)) / 2 - x0
  const dy = (h - (y1 - y0)) / 2 - y0
  return nodes.map((n) => ({ ...n, x: f1(n.x + dx), y: f1(n.y + dy) }))
}

// Where a line leaves or meets a node, and which way it is heading there.
function port(n, side) {
  const B = box(n)
  switch (side) {
    case 'right':
      return { x: B.x + B.w, y: n.y, nx: 1, ny: 0 }
    case 'left':
      return { x: B.x, y: n.y, nx: -1, ny: 0 }
    case 'bottom':
      return { x: n.x, y: bottom(n, B), nx: 0, ny: 1 }
    default:
      return { x: n.x, y: B.y, nx: 0, ny: -1 }
  }
}

function geometry(a, b, e = {}) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const flat = Math.abs(dx) >= Math.abs(dy)
  const exit = e.exit ?? (flat ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'bottom' : 'top')
  const entry = e.entry ?? (flat ? (dx > 0 ? 'left' : 'right') : dy > 0 ? 'top' : 'bottom')
  const s = port(a, exit)
  const t = port(b, entry)
  const reach = Math.max(14, Math.hypot(t.x - s.x, t.y - s.y) / 2.2)
  return {
    s,
    c1: { x: s.x + s.nx * reach, y: s.y + s.ny * reach },
    c2: { x: t.x + t.nx * reach, y: t.y + t.ny * reach },
    t,
  }
}

const pathOf = (g) => `M${f1(g.s.x)} ${f1(g.s.y)}C${f1(g.c1.x)} ${f1(g.c1.y)} ${f1(g.c2.x)} ${f1(g.c2.y)} ${f1(g.t.x)} ${f1(g.t.y)}`
const reversed = (g) => ({ s: g.t, c1: g.c2, c2: g.c1, t: g.s })

function node(t, n) {
  const b = box(n)
  if (n.kind === 'pill') {
    const lead = n.icon ? PILL_ICON + PILL_ICON_GAP : 0
    const tx = n.x + lead / 2
    const logo = n.icon
      ? `\n${icon(n.icon, { x: b.x + 11, y: n.y - PILL_ICON / 2, size: PILL_ICON, t, color: n.icon.startsWith('ui-') ? t.muted : undefined })}`
      : ''
    return `<rect x="${f1(b.x)}" y="${f1(b.y)}" width="${f1(b.w)}" height="${b.h}" rx="14" fill="${t.pill}" stroke="${t.pillStroke}"/>${logo}
${text(n.label, { x: tx, y: n.y + 4, size: PILL_FONT, weight: 500, fill: t.ink, anchor: 'middle' })}`
  }
  // Tiles are the theme's logo tile (light on both grounds), so every brand
  // colour reads. A core is the same tile, a little larger, with an accent
  // wash on the light theme; it gets no accent ring at rest, because a ring is
  // what the relay uses to say "the light is here now".
  const core = n.kind === 'core'
  const isz = Math.round(b.w * (n.iconScale ?? 0.56))
  const fill = core && t.name === 'light' ? t.accentSoft : t.tile
  const stroke = core ? ` stroke="${t.border}" stroke-width="1.2"` : t.tileStroke !== 'none' ? ` stroke="${t.border}"` : ''
  const tile = `<rect x="${f1(b.x)}" y="${f1(b.y)}" width="${b.w}" height="${b.h}" rx="${core ? 13 : 11}" fill="${fill}"${stroke}/>`
  const glyphColor = n.icon?.startsWith('ui-') ? t.tileInk : undefined
  const glyph = n.icon
    ? icon(n.icon, { x: n.x - isz / 2, y: n.y - isz / 2, size: isz, t, color: glyphColor, onLight: true })
    : text(n.mark ?? '', { x: n.x, y: n.y + 5, size: 14, weight: 600, fill: t.ink, anchor: 'middle' })
  const label = hasLabel(n) ? text(n.label, { x: n.x, y: b.y + b.h + 15, size: LABEL_SIZE, fill: t.muted, anchor: 'middle' }) : ''
  return `${tile}\n${glyph}${label ? '\n' + label : ''}`
}

/**
 * spec.nodes: [{ id, x, y, kind: 'tile' | 'core' | 'pill', icon?, label?, size?, w? }]
 *   x, y are the node's centre in the card's coordinates.
 * spec.edges: [{ from, to, exit?, entry? }]  the lines drawn, each with an
 *   arrowhead at `to`; exit/entry pick a side ('top' | 'right' | 'bottom' |
 *   'left') when the default would make two lines share a point.
 * spec.runs:  [[from, to, at?]]  firing order, `at` in seconds into this
 *   card's window (default: edge order, one stagger apart). A run may go
 *   against its line's arrow (a reply); it then travels the same line backwards.
 * relay: { index, slots, slot, stagger, travel, rounds } or nothing for a still.
 */
export function diagram(t, spec, relay) {
  const id = `d${++uid}`
  const byId = Object.fromEntries(spec.nodes.map((n) => [n.id, n]))
  const geo = new Map()
  for (const e of spec.edges) {
    if (!byId[e.from] || !byId[e.to]) throw new Error(`diagram: unknown node in edge ${e.from} -> ${e.to}`)
    geo.set(`${e.from}>${e.to}`, geometry(byId[e.from], byId[e.to], e))
  }

  const arrow = `<marker id="${id}-a" viewBox="0 0 10 10" refX="8.6" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto"><path d="M1.5 1.6L8.6 5L1.5 8.4" fill="none" stroke="${t.link}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></marker>`
  const lines = [...geo.values()].map((g) => `<path d="${pathOf(g)}" fill="none" stroke="${t.link}" stroke-width="1.4" marker-end="url(#${id}-a)"/>`)
  const nodes = spec.nodes.map((n) => node(t, n)).join('\n')

  if (!relay) return { svg: `<g aria-hidden="true">\n<defs>${arrow}</defs>\n${lines.join('\n')}\n${nodes}\n</g>`, css: '' }

  const { index = 0, slots = 1, slot = 3.6, stagger = 0.34, travel = 0.9, hold = 0.6, rounds = 2 } = relay
  const period = +(slots * slot).toFixed(3)
  const t0 = index * slot + 0.2
  const windowEnd = (index + 1) * slot
  const at = (s) => pct((s / period) * 100)

  const runs = spec.runs
    ? spec.runs.map(([from, to, when], k) => ({ from, to, at: when ?? k * stagger }))
    : spec.edges.map((e, k) => ({ from: e.from, to: e.to, at: k * stagger }))

  const css = []
  const pulses = []
  const rings = new Map()
  runs.forEach((run, k) => {
    const forward = geo.get(`${run.from}>${run.to}`)
    const back = geo.get(`${run.to}>${run.from}`)
    if (!forward && !back) throw new Error(`diagram ${id}: run ${run.from} -> ${run.to} has no line`)
    const d = pathOf(forward ?? reversed(back))
    const start = t0 + run.at
    const end = start + travel
    // The ring that lights on arrival must also be out before the window
    // closes, or it would still be glowing when the next card starts.
    if (end + hold > windowEnd + 1e-6) throw new Error(`diagram ${id}: run ${k} (${run.from} -> ${run.to}) overruns its ${slot}s window`)
    const s = at(start)
    const e = at(end)
    const n = `${id}p${k}`
    // Head and tail share one clock: the head is a 10-unit dash, the tail a
    // 30-unit one under it, both on a 100-unit normalised path; each starts
    // just before the path and ends just past it, so neither shows at rest.
    css.push(
      `@keyframes ${n}h{0%,${s}%{stroke-dashoffset:10;opacity:0}${pct(s + 0.01)}%{opacity:1}${e}%{stroke-dashoffset:-130;opacity:1}${pct(e + 0.01)}%,100%{stroke-dashoffset:-130;opacity:0}}`,
      `@keyframes ${n}t{0%,${s}%{stroke-dashoffset:30;opacity:0}${pct(s + 0.01)}%{opacity:.35}${e}%{stroke-dashoffset:-110;opacity:.35}${pct(e + 0.01)}%,100%{stroke-dashoffset:-110;opacity:0}}`,
      `.${n}h{animation:${n}h ${period}s linear ${rounds}}.${n}t{animation:${n}t ${period}s linear ${rounds}}`,
    )
    pulses.push(
      `<path class="${n}t" d="${d}" pathLength="100" fill="none" stroke="${t.accent}" stroke-width="4" stroke-linecap="round" stroke-dasharray="30 200" stroke-dashoffset="30" opacity="0"/>`,
      `<path class="${n}h" d="${d}" pathLength="100" fill="none" stroke="${t.accent}" stroke-width="2.8" stroke-linecap="round" stroke-dasharray="10 200" stroke-dashoffset="10" opacity="0"/>`,
    )
    const r = rings.get(run.to) ?? []
    r.push(end)
    rings.set(run.to, r)
  })

  const ringEls = []
  for (const [nid, times] of rings) {
    const n = byId[nid]
    const b = box(n)
    const name = `${id}r${nid}`
    const frames = ['0%{opacity:0}']
    for (const tEnd of times.sort((x, y) => x - y)) {
      const a = at(tEnd)
      frames.push(`${pct(a - 0.01)}%{opacity:0}${a}%{opacity:1}${at(tEnd + hold)}%{opacity:0}`)
    }
    frames.push('100%{opacity:0}')
    css.push(`@keyframes ${name}{${frames.join('')}}.${name}{animation:${name} ${period}s linear ${rounds}}`)
    const pad = 3
    const rx = n.kind === 'pill' ? 17 : n.kind === 'core' ? 15 : 13
    ringEls.push(
      `<rect class="${name}" x="${f1(b.x - pad)}" y="${f1(b.y - pad)}" width="${f1(b.w + pad * 2)}" height="${f1(b.h + pad * 2)}" rx="${rx}" fill="none" stroke="${t.accent}" stroke-width="2" opacity="0"/>`,
    )
  }

  const svg = `<g aria-hidden="true">
<defs>${arrow}</defs>
${lines.join('\n')}
${pulses.join('\n')}
${ringEls.join('\n')}
${nodes}
</g>`
  return { svg, css: css.join('\n') }
}

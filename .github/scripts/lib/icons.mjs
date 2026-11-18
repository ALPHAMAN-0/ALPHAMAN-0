// Real product logos, inlined into the generated SVGs.
//
// The files in ../icons are the real marks in their owners' colours, fetched
// once from pinned sources (gilbarbara/logos, Simple Icons, Lucide; licences in
// ../icons/README.md) and committed, so the generator stays offline and
// deterministic and CI can re-run it byte for byte.
//
// An <img>-loaded SVG cannot load another file, so each mark is nested as an
// inner <svg> with its ids prefixed (two logos both defining id="a" would
// otherwise paint each other's gradients). Black marks (GitHub, X, Next.js,
// Vercel...) carry data-ic="ink" and are inverted on the dark theme, the way
// their owners print them on dark grounds.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'icons')
const cache = new Map()
const used = new Set()

/** Every mark drawn so far, so the generator can report unused files. */
export const usedIcons = () => [...used].sort()

// Ids only have to be unique inside one document. The counter restarts for
// every document (resetIcons), so an edit to one card renumbers only that
// card's file, and a dark/light pair carries the same ids.
let serial = 0
export const resetIcons = () => {
  serial = 0
}

function load(name) {
  if (cache.has(name)) return cache.get(name)
  const src = readFileSync(join(DIR, `${name}.svg`), 'utf8')
  const open = src.match(/<svg\b[^>]*>/)[0]
  const attr = (k) => (open.match(new RegExp(`\\s${k}="([^"]*)"`)) || [])[1]
  const entry = {
    vb: attr('viewBox'),
    ink: attr('data-ic') === 'ink',
    // Simple Icons and Lucide paint from the root element; keep those
    // presentation attributes when the root is replaced.
    paint: ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin']
      .filter((k) => attr(k) !== undefined)
      .map((k) => [k, attr(k)]),
    inner: src.slice(src.indexOf(open) + open.length, src.lastIndexOf('</svg>')),
  }
  if (!entry.vb) throw new Error(`icons: ${name}.svg has no viewBox`)
  cache.set(name, entry)
  return entry
}

// Wordmarks: logos that are a word rather than a symbol. They get a wider box
// (and a wider tile) so the word is not printed at the height of a symbol.
export const WIDE = new Set(['go', 'php', 'aws'])

/**
 * Draw `name` fitted inside a box whose top-left is (x, y): size x size, or
 * w x h when given. `color` replaces currentColor (Lucide glyphs) and the
 * paint of a one-colour mark. `onLight` says the mark sits on a light tile
 * even on the dark theme, so a black mark keeps its own black.
 */
export function icon(name, { x, y, size, w, h, t, color, onLight = false }) {
  const ic = load(name)
  used.add(name)
  const bw = w ?? size
  const bh = h ?? size
  const dark = t.name === 'dark' && !onLight
  const inkFill = dark ? t.ink : '#111111'
  const p = `i${++serial}-`
  // xlink:href would need the xlink namespace declared on the outer document;
  // plain SVG 2 href means the same thing everywhere this renders.
  const inner = ic.inner
    .replace(/xlink:href=/g, 'href=')
    .replace(/\bid="([^"]+)"/g, (_, id) => `id="${p}${id}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${p}${id})`)
    .replace(/href="#([^"]+)"/g, (_, id) => `href="#${p}${id}"`)
    .replace(/currentColor/g, color ?? t.ink)

  const paint = ic.paint
    .map(([k, v]) => {
      if (v === 'currentColor') v = color ?? t.ink
      else if (k === 'fill' && ic.ink && v !== 'none') v = inkFill
      else if (k === 'fill' && color && v !== 'none') v = color
      return ` ${k}="${v}"`
    })
    .join('')

  // A black mark painted only through its root fill (Simple Icons) is simply
  // recoloured above. A drawn black mark (gilbarbara) straight on the dark
  // ground is inverted, the way its owner prints it on dark.
  const rootPainted = ic.ink && ic.paint.some(([k]) => k === 'fill')
  const invert = ic.ink && !rootPainted && dark
  const body = invert
    ? `<defs><filter id="${p}inv" color-interpolation-filters="sRGB"><feColorMatrix values="-1 0 0 0 1 0 -1 0 0 1 0 0 -1 0 1 0 0 0 1 0"/></filter></defs><g filter="url(#${p}inv)">${inner}</g>`
    : inner

  return `<svg x="${+x.toFixed(1)}" y="${+y.toFixed(1)}" width="${bw}" height="${bh}" viewBox="${ic.vb}" preserveAspectRatio="xMidYMid meet"${paint}>${body}</svg>`
}

/**
 * A logo on its tile: a rounded square (wider for a wordmark) in the theme's
 * tile colour, the mark centred inside at about 70% of the tile.
 */
export function logoTile(name, { x, y, size, t, r = 6, color }) {
  const wide = WIDE.has(name)
  const w = wide ? Math.round(size * 1.6) : size
  const pad = Math.round(size * (wide ? 0.2 : 0.16))
  const stroke = t.tileStroke !== 'none' ? ` stroke="${t.tileStroke}"` : ''
  return {
    w,
    svg: `<rect x="${+(x + 0.5).toFixed(1)}" y="${+(y + 0.5).toFixed(1)}" width="${w - 1}" height="${size - 1}" rx="${r}" fill="${t.tile}"${stroke}/>
${icon(name, { x: x + pad, y: y + pad, w: w - 2 * pad, h: size - 2 * pad, t, color, onLight: true })}`,
  }
}

/** Whether a mark exists, so callers can fail loudly on a typo at build time. */
export function hasIcon(name) {
  try {
    load(name)
    return true
  } catch {
    return false
  }
}

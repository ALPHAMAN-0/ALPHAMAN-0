// Shared design system for every generated SVG on the profile.
//
// The whole page is one idea: a desktop of terminal windows. Every asset draws
// the same chrome — 10px radius, hairline border, 30px title bar, three dots, a
// centered `siam@dhaka: ~/path` label — so the ASCII portrait stops looking like
// an orphan and starts looking like the design language.
//
// Tokens are lifted verbatim from assets/ascii-portrait.svg, which was here
// first and already had the right palette. Nothing about that file changes.

export const MONO =
  "'SFMono-Regular','Cascadia Mono',Consolas,'Liberation Mono',Menlo,monospace"

// The prompt every window shows. One constant so the stats card, generated in
// CI from the GitHub login, can't drift into saying `alphaman-0@dhaka` while
// every hand-authored window beside it says `siam@dhaka`.
export const HOST = 'siam@dhaka'

// Monospace advance ratio. The portrait renders 11 chars at font-size 10 with
// textLength=66, so 6.0/10 = 0.6 — the standard monospace em advance. Every
// width in this file is derived from it, which is what makes the typing clips
// and the chip auto-sizing land on exact pixel boundaries.
export const CH = 0.6
export const adv = (size) => size * CH
export const len = (str, size) => +(str.length * size * CH).toFixed(1)

// The art in the portrait is a 5-step luminance ramp over the window fill. The
// light theme inverts that ramp rather than just swapping bg/fg, so the ASCII
// keeps its depth instead of collapsing into one flat gray.
export const THEMES = {
  dark: {
    name: 'dark',
    bg: '#0d1117',
    border: '#30363d',
    fg: '#ffffff',
    muted: '#8b949e',
    dim: '#555d66',
    accent: '#c9d1d9',
    dots: ['#ffffff', '#848d97', '#2f353d'],
  },
  light: {
    name: 'light',
    bg: '#ffffff',
    border: '#d0d7de',
    fg: '#1f2328',
    muted: '#57606a',
    dim: '#afb8c1',
    accent: '#424a53',
    dots: ['#1f2328', '#6e7781', '#d0d7de'],
  },
}

export const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

// Motion contract, shared by every asset.
//
// `.in` is written as a from-only keyframe with fill-mode `both` on purpose: the
// RESTING state is the visible one, so the element is painted correctly even
// when the animation never runs. Writing it the obvious way (0% opacity 0 ->
// 100% opacity 1) means reduced-motion users get a blank card, which is the
// single most common way profile READMEs break accessibility.
//
// `pathLength="1"` on a drawn path lets one `draw` keyframe serve every path in
// the repo regardless of its real length — dash math is rescaled to 0..1.
export const MOTION = `
text{font-family:${MONO}}
.in{animation:in .52s cubic-bezier(.2,.7,.3,1) both}
@keyframes in{from{opacity:0;transform:translateY(6px)}}
.draw{stroke-dasharray:1;animation:draw 1.6s cubic-bezier(.2,.7,.3,1) both}
@keyframes draw{from{stroke-dashoffset:1}}
.cur{animation:blink 1.1s steps(1) infinite}
@keyframes blink{50%{opacity:0}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
`.trim()

// Stagger step. Slow enough to read as a sequence, fast enough that the last
// element in a 20-row list still lands inside a second.
export const STEP = 0.04

export const delay = (i, step = STEP) => `animation-delay:${(i * step).toFixed(2)}s`

/**
 * The window chrome, identical across every asset.
 * Returns the background rect, title-bar rule, three dots and the path label.
 */
export function chrome({ w, h, title, t }) {
  const dots = t.dots
    .map((fill, i) => `<circle cx="${22 + i * 18}" cy="15" r="5.5" fill="${fill}"/>`)
    .join('')
  return `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="10" fill="${t.bg}" stroke="${t.border}"/>
<line x1="0" y1="30" x2="${w}" y2="30" stroke="${t.border}"/>
${dots}
<text x="${w / 2}" y="19" text-anchor="middle" font-size="11" fill="${t.muted}">${esc(`${HOST}: ~/${title}`)}</text>`
}

/**
 * A full window document. `body` is drawn below the 30px title bar.
 */
export function svg({ w, h, title, t, label, body, extraCss = '' }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}">
<style>${MOTION}${extraCss ? '\n' + extraCss.trim() : ''}</style>
${chrome({ w, h, title, t })}
${body}
</svg>
`
}

/**
 * A monospace run with its advance pinned to the grid.
 *
 * textLength + lengthAdjust="spacingAndGlyphs" is the portrait's trick: it makes
 * the rendered width independent of which fallback font the viewer actually has,
 * so box-drawing characters and the typing clip-rects stay aligned everywhere.
 */
export function mono(str, { x, y, size = 12, fill, anchor, cls = '', style = '' }) {
  const a = anchor ? ` text-anchor="${anchor}"` : ''
  const c = cls ? ` class="${cls}"` : ''
  const s = style ? ` style="${style}"` : ''
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}"${a}${c}${s} textLength="${len(str, size)}" lengthAdjust="spacingAndGlyphs">${esc(str)}</text>`
}

// Generates every static asset the profile README renders, into assets/.
//
// Static means "does not need the GitHub API": the hero, the section rule, the
// stack tree, the social chips, the project cards, and the light variant of the
// ASCII portrait. These are deterministic, so they are committed to main where
// they can be reviewed in a diff and keep rendering even if CI is broken.
// Anything that needs live data stays in render-stats.mjs -> dist -> `output`.
//
// Run: node .github/scripts/render-static.mjs
// The workflow re-runs this and fails on a dirty diff, so a hand-edited asset
// can never silently drift from its generator.

import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { THEMES, adv, len, esc, svg, mono, delay } from './lib/chrome.mjs'

const OUT = 'assets'
const written = []

// GitHub renders a README inside an ~890px column. Sizing to 860 keeps every
// asset crisp at 1:1 instead of being scaled down by the browser's max-width.
// HERO_W is sized to sit beside the ASCII portrait inside that same 860.
const WIDE = 860
const HERO_W = 520
const CARD_W = 420

async function emit(name, dark, light) {
  await writeFile(`${OUT}/${name}.svg`, dark)
  await writeFile(`${OUT}/${name}-light.svg`, light)
  written.push(name)
}

// Render a component for both themes from one function of the theme.
const pair = (fn) => [fn(THEMES.dark), fn(THEMES.light)]

// ---------------------------------------------------------------- hero -----
//
// Replaces readme-typing-svg.demolab.com with a self-hosted equivalent.
//
// The typing effect is a cover rect the colour of the window background that
// slides right in steps(charCount), revealing one character per step, with the
// cursor riding along inside the same group so it follows the caret for free.
//
// The direction matters: the cover's BASE position is fully-revealed, and the
// keyframes drive it backwards to hidden and forwards again. With animation
// disabled (reduced motion, or a renderer that ignores CSS) the base position
// applies and the text simply reads as finished, never as a blank window.

const CYCLE = 12 // seconds
const HERO_LINES = [
  'MERN · MEAN · LLM internals · RAG · networking',
  'building intelligent systems, one commit at a time',
]

function hero(t) {
  const w = HERO_W
  const h = 176
  const fs = 13
  const a = adv(fs)
  const prompt = '❯ '
  const px = 24
  const tx = px + len(prompt, fs)

  // Cycle beats as percentages of CYCLE: type line 1, type line 2, hold, erase.
  const B = { l1: 16.7, l2start: 20.8, l2: 37.5, hold: 83, clear: 91.7 }

  const css = []
  const body = HERO_LINES.map((text, i) => {
    const y = 90 + i * 26
    const tw = len(text, fs)
    const n = text.length
    const cy = y - fs + 2
    const ch = fs + 4

    // Cover + cursor. Base transform is the revealed state, so a renderer that
    // ignores the animation shows finished text rather than an empty window.
    // steps() is declared on both the typing leg and the erase leg, so clearing
    // reads as backspacing rather than as a smooth wipe.
    const start = i === 0 ? '0%' : `0%,${B.l2start}%`
    const to = i === 0 ? B.l1 : B.l2
    const last = i === HERO_LINES.length - 1
    css.push(
      `@keyframes ty${i}{${start}{transform:translateX(0);animation-timing-function:steps(${n})}` +
        `${to}%,${B.hold}%{transform:translateX(${tw}px);animation-timing-function:steps(${n})}` +
        `${B.clear}%,100%{transform:translateX(0)}}`,
    )
    // A terminal only ever shows one caret, so gate each line's to the window in
    // which it is the active line. The last line holds its caret afterwards, the
    // way a prompt waiting for input does.
    const on = i === 0 ? 0 : B.l2start
    const off = last ? 100 : B.l2start
    css.push(
      `@keyframes cg${i}{` +
        (on > 0 ? `0%,${on}%{opacity:0}${(on + 0.1).toFixed(1)}%,` : '0%,') +
        `${off}%{opacity:1}` +
        (off < 100 ? `${(off + 0.1).toFixed(1)}%,100%{opacity:0}` : '') +
        `}`,
    )

    return `<g>
${mono(prompt, { x: px, y, size: fs, fill: t.muted })}
${mono(text, { x: tx, y, size: fs, fill: i === 0 ? t.fg : t.accent })}
<g style="transform:translateX(${tw}px);animation:ty${i} ${CYCLE}s infinite">
<rect x="${tx}" y="${cy}" width="${(tw + a).toFixed(1)}" height="${ch}" fill="${t.bg}"/>
<g style="animation:cg${i} ${CYCLE}s infinite">
<rect class="cur" x="${tx}" y="${cy}" width="${a.toFixed(1)}" height="${ch}" fill="${t.fg}"/>
</g>
</g>
</g>`
  }).join('\n')

  const head = mono('siam@dhaka:~$ ./whoami --verbose', { x: px, y: 58, size: 11, fill: t.muted, cls: 'in' })
  const foot = `${mono('siam@dhaka:~$', { x: px, y: 152, size: 11, fill: t.muted, cls: 'in', style: delay(4, 0.1) })}
<g class="in" style="${delay(5, 0.1)}"><rect class="cur" x="${px + len('siam@dhaka:~$ ', 11)}" y="143" width="${adv(11).toFixed(1)}" height="12" fill="${t.fg}"/></g>`

  return svg({
    w,
    h,
    t,
    title: 'whoami',
    label: `Terminal: siam@dhaka — ${HERO_LINES.join('; ')}`,
    // The cover rect travels past the right edge of its line; clipping to the
    // window interior stops it painting over the rounded border.
    extraCss: css.join('\n'),
    body: `<clipPath id="win"><rect x="1" y="31" width="${w - 2}" height="${h - 32}"/></clipPath>
<g clip-path="url(#win)">
${head}
${body}
${foot}
</g>`,
  })
}

// ---------------------------------------------------------------- rule -----
// One divider, reused for all six section breaks. Draws itself once, then rests.

function rule(t) {
  const w = WIDE
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} 13" width="${w}" height="13" role="img" aria-label="">
<style>
.draw{stroke-dasharray:1;animation:draw 1.4s cubic-bezier(.2,.7,.3,1) both}
@keyframes draw{from{stroke-dashoffset:1}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<line class="draw" pathLength="1" x1="0" y1="6.5" x2="${w}" y2="6.5" stroke="${t.border}"/>
<line class="draw" pathLength="1" x1="0" y1="6.5" x2="96" y2="6.5" stroke="${t.accent}" style="animation-duration:.7s"/>
</svg>
`
}

// --------------------------------------------------------------- stack -----
// The README's `tree ./stack` block, same content and same conceit, but drawn
// as a window with one column per group so it reads as a wide banner rather
// than a 600px tower, with rows cascading in top-down.

const STACK = [
  ['languages', ['bash', 'javascript', 'typescript', 'python', 'c', 'cpp', 'csharp', 'go']],
  ['mern-mean', ['mongodb', 'express', 'react', 'angular', 'node.js', 'django', 'dotnet']],
  ['ml-ai-cloud', ['pytorch', 'tensorflow', 'openai', 'docker', 'kubernetes', 'aws']],
  ['net-tools', ['wireshark', 'mysql', 'git', 'postman', 'vscode', 'linux']],
]

function stack(t) {
  const w = WIDE
  const fs = 12.5
  const a = adv(fs)
  const lh = 19
  const top = 60
  const rows = Math.max(...STACK.map(([, items]) => items.length)) + 1
  const h = top + (rows - 1) * lh + 26

  // One column per group. Four short columns fill the README's width and keep
  // the window a wide banner instead of a 600px tower.
  //
  // The stagger index is the visual ROW, not a running counter, so all four
  // columns cascade downwards together. Indexing by generation order instead
  // makes column 4 wait for every row of columns 1-3 before it starts.
  const colW = (w - 56) / STACK.length
  const body = STACK.map(([name, items], ci) => {
    const x = 28 + ci * colW
    const head = mono(`./${name}/`, { x, y: top, size: fs, fill: t.fg, cls: 'in', style: delay(0) })
    const lines = items.map((item, k) => {
      const y = top + (k + 1) * lh
      const branch = k === items.length - 1 ? '└── ' : '├── '
      const bx = x + len(branch, fs)
      return `<g class="in" style="${delay(k + 1)}">
${mono(branch, { x, y, size: fs, fill: t.border })}
<rect x="${bx.toFixed(1)}" y="${(y - 7).toFixed(1)}" width="6" height="6" fill="${t.accent}"/>
${mono(item, { x: +(bx + a * 1.6).toFixed(1), y, size: fs, fill: t.muted })}
</g>`
    })
    return [head, ...lines].join('\n')
  }).join('\n')

  return svg({
    w,
    h,
    t,
    title: 'stack',
    label: `Tech stack: ${STACK.map(([g, it]) => `${g}: ${it.join(', ')}`).join('; ')}`,
    body,
  })
}

// --------------------------------------------------------------- chips -----
// Replaces img.shields.io. One file per link because an <img>-loaded SVG cannot
// carry per-element hyperlinks — each chip is wrapped in its own <a> in the
// README. Separate documents can't share a stagger, so each bakes in its own
// animation-delay to fake one running left to right.

const ICONS = {
  linkedin: '<rect x="1" y="1" width="12" height="12" rx="2"/><path d="M4 6v5M4 3.6v.1M7 11V7.6a1.6 1.6 0 0 1 3.2 0V11"/>',
  globe: '<circle cx="7" cy="7" r="6"/><path d="M1 7h12M7 1a9 9 0 0 1 0 12A9 9 0 0 1 7 1"/>',
  x: '<path d="M2.5 2.5l9 9M11.5 2.5l-9 9"/>',
  mail: '<rect x="1" y="2.5" width="12" height="9" rx="1.5"/><path d="M1.6 3.4L7 7.6l5.4-4.2"/>',
  chat: '<path d="M13 6.8a5.6 5.6 0 0 1-8.3 4.9L1.4 12.6l1-3.2A5.6 5.6 0 1 1 13 6.8z"/>',
  doc: '<path d="M3 1h5l3 3v9H3z"/><path d="M8 1v3h3M5 7.5h4M5 10h4"/>',
}

const LINKS = [
  ['linkedin', 'LINKEDIN', 'linkedin', 'https://www.linkedin.com/in/siamhossain4/'],
  ['portfolio', 'PORTFOLIO', 'globe', 'https://siamhossain.vercel.app/'],
  ['x', 'X', 'x', 'https://x.com/SIAM_HOSSAIN47'],
  ['gmail', 'GMAIL', 'mail', 'mailto:siam.cse.aiub@gmail.com'],
  ['whatsapp', 'WHATSAPP', 'chat', 'https://wa.me/8801766479295'],
  ['resume', 'RESUME', 'doc', 'https://codolio.com/profile/babaYagaa'],
]

function chip(t, label, icon, i) {
  const fs = 11
  const h = 30
  const padX = 12
  const gap = 8
  const tw = len(label, fs)
  const w = Math.round(padX + 14 + gap + tw + padX)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}">
<style>
text{font-family:'SFMono-Regular','Cascadia Mono',Consolas,'Liberation Mono',Menlo,monospace}
.in{animation:in .5s cubic-bezier(.2,.7,.3,1) both;animation-delay:${(i * 0.06).toFixed(2)}s}
@keyframes in{from{opacity:0;transform:translateY(5px)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<g class="in">
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="6" fill="${t.bg}" stroke="${t.border}"/>
<g transform="translate(${padX},${(h - 14) / 2})" fill="none" stroke="${t.fg}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${ICONS[icon]}</g>
${mono(label, { x: padX + 14 + gap, y: h / 2 + 4, size: fs, fill: t.muted })}
</g>
</svg>
`
}

// --------------------------------------------------------------- cards -----
// Project cards. Same rect, radius and hairline as a window, but with a
// left-aligned `❯ name` header instead of the dots + centered path label —
// they read as cards inside the desktop rather than as six more terminals.

const PROJECTS = [
  {
    slug: 'sales-inventory-crm',
    name: 'Sales_Inventory_CRM',
    url: 'https://github.com/ALPHAMAN-0/Sales_Inventory_CRM',
    desc: ['Full-stack Sales, Inventory & CRM system with', 'atomic inventory and employee KPI tracking.'],
    tags: ['laravel', 'react', 'mysql'],
  },
  {
    slug: 'sleep-loop',
    name: 'Sleep_Loop',
    url: 'https://github.com/ALPHAMAN-0/Sleep_Loop',
    desc: ['A self-learning agent loop that repairs code', 'overnight, gated on human approval before merge.'],
    tags: ['agents', 'llm', 'python'],
  },
  {
    slug: 'aiub-notice-board',
    name: 'AIUB_NOTICE_BOARD',
    url: 'https://github.com/ALPHAMAN-0/AIUB_NOTICE_BOARD',
    desc: ['AI-powered Telegram bot classifying and', 'summarising notices, serverless on Actions.'],
    tags: ['telegram', 'llm', 'actions'],
  },
  {
    slug: 'realtime-comms',
    name: 'RealTimeCommunicationApp',
    url: 'https://github.com/ALPHAMAN-0/CodeAlpha_RealTimeCommunicationApp',
    desc: ['Real-time video conferencing with multi-user', 'calls, screen sharing and a shared whiteboard.'],
    tags: ['webrtc', 'socket.io', 'node'],
  },
]

function card(t, p, i) {
  const w = CARD_W
  const h = 148
  const px = 20
  const nameSize = 13
  const descSize = 10.5
  const tagSize = 9.5

  let tagX = px
  const tags = p.tags
    .map((tag) => {
      const tw = len(tag, tagSize)
      const bw = Math.round(tw + 16)
      const g = `<g><rect x="${tagX}" y="112" width="${bw}" height="19" rx="5" fill="none" stroke="${t.border}"/>${mono(tag, { x: tagX + 8, y: 125, size: tagSize, fill: t.muted })}</g>`
      tagX += bw + 7
      return g
    })
    .join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(`${p.name} — ${p.desc.join(' ')}`)}">
<style>
text{font-family:'SFMono-Regular','Cascadia Mono',Consolas,'Liberation Mono',Menlo,monospace}
.in{animation:in .5s cubic-bezier(.2,.7,.3,1) both;animation-delay:${(i * 0.09).toFixed(2)}s}
@keyframes in{from{opacity:0;transform:translateY(7px)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<g class="in">
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="10" fill="${t.bg}" stroke="${t.border}"/>
<line x1="0" y1="42" x2="${w}" y2="42" stroke="${t.border}"/>
${mono('❯', { x: px, y: 27, size: nameSize, fill: t.muted })}
${mono(p.name, { x: px + len('❯ ', nameSize), y: 27, size: nameSize, fill: t.fg })}
${mono(p.desc[0], { x: px, y: 70, size: descSize, fill: t.muted })}
${mono(p.desc[1], { x: px, y: 88, size: descSize, fill: t.muted })}
${tags}
</g>
</svg>
`
}

// ------------------------------------------------------- portrait light -----
// The portrait is hand-made and stays untouched; its light twin is a mechanical
// remap of the palette. The art is a 5-step luminance ramp, so the ramp is
// INVERTED rather than merely recoloured, otherwise the depth flattens out.
//
// Substitution is single-pass through a lookup. Doing it as sequential
// .replace() calls would double-substitute — #0d1117 -> #ffffff would land on
// colours that #ffffff -> #1f2328 had already produced.

const RAMP = {
  '#ffffff': '#1f2328',
  '#c9d1d9': '#424a53',
  '#848d97': '#6e7781',
  '#555d66': '#afb8c1',
  '#2f353d': '#d0d7de',
  '#0d1117': '#ffffff',
  '#30363d': '#d0d7de',
  '#8b949e': '#57606a',
}

async function portraitLight() {
  const src = await readFile(`${OUT}/ascii-portrait.svg`, 'utf8')
  const out = src.replace(/#(?:[0-9a-f]{6})/gi, (m) => RAMP[m.toLowerCase()] ?? m)
  await writeFile(`${OUT}/ascii-portrait-light.svg`, out)
  written.push('ascii-portrait-light')
}

// ----------------------------------------------------------------- main -----

await mkdir(OUT, { recursive: true })

await emit('hero', ...pair(hero))
await emit('rule', ...pair(rule))
await emit('stack', ...pair(stack))

for (const [i, [slug, label, icon]] of LINKS.entries()) {
  await emit(`chip-${slug}`, chip(THEMES.dark, label, icon, i), chip(THEMES.light, label, icon, i))
}

for (const [i, p] of PROJECTS.entries()) {
  await emit(`card-${p.slug}`, card(THEMES.dark, p, i), card(THEMES.light, p, i))
}

await portraitLight()

console.log(`assets: ${written.length} components -> ${OUT}/`)
console.log(written.join(' '))

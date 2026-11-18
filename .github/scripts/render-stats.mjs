// Renders the profile stats card as two SVGs (dark + light) into dist/.
//
// Why this exists instead of a third-party card service: every shared public
// instance of github-readme-stats / streak-stats is saturated and returns a 503,
// a 402, or a "Failed to retrieve contributions" sad face. Generating the SVG
// here means the image is served from GitHub's own CDN, and if this job ever
// fails the last good card stays on the profile instead of breaking.
//
// Palette, type and motion come from lib/design.mjs, so this card is drawn in
// the same system as every asset in assets/ rather than a lookalike.

import { mkdir, writeFile } from 'node:fs/promises'
import { THEMES, text, panel, doc, delay, EASE, adaptive } from './lib/design.mjs'

const USER = process.env.STATS_USER ?? 'ALPHAMAN-0'
const TOKEN = process.env.GITHUB_TOKEN
if (!TOKEN) throw new Error('GITHUB_TOKEN is not set')

async function gql(query, variables = {}) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': `${USER}-profile-stats`,
    },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}: ${await res.text()}`)
  const body = await res.json()
  if (body.errors) throw new Error(`GraphQL: ${JSON.stringify(body.errors)}`)
  return body.data
}

// Followers and total stars are fetched here so the README's footer can drop
// its two img.shields.io badges — they were the last third-party images on the
// profile, and they were showing the same numbers this card already had to load.
// Repositories are paged rather than capped at `first: 100`, so the star total
// stays correct as the account grows past a hundred public repos.
let publicRepos = 0
let followers = 0
let stars = 0
let createdAt = null

for (let cursor = null, more = true; more; ) {
  const data = await gql(
    `query ($login: String!, $cursor: String) {
       user(login: $login) {
         createdAt
         followers { totalCount }
         repositories(privacy: PUBLIC, ownerAffiliations: OWNER, first: 100, after: $cursor) {
           totalCount
           pageInfo { hasNextPage endCursor }
           nodes { stargazerCount }
         }
       }
     }`,
    { login: USER, cursor },
  )
  const u = data.user
  createdAt = new Date(u.createdAt)
  followers = u.followers.totalCount
  publicRepos = u.repositories.totalCount
  stars += u.repositories.nodes.reduce((sum, r) => sum + r.stargazerCount, 0)
  more = u.repositories.pageInfo.hasNextPage
  cursor = u.repositories.pageInfo.endCursor
}

// contributionsCollection caps at one year per call, so walk year-long windows
// from account creation to now and stitch the calendars together.
const windows = []
for (let from = new Date(createdAt); from < new Date(); ) {
  const to = new Date(from)
  to.setUTCFullYear(to.getUTCFullYear() + 1)
  const capped = to > new Date() ? new Date() : to
  windows.push([new Date(from), capped])
  from = capped
}

let commitsLastYear = 0
let reposCreatedLastYear = 0
const days = new Map()

for (const [from, to] of windows) {
  const data = await gql(
    `query ($login: String!, $from: DateTime!, $to: DateTime!) {
       user(login: $login) {
         contributionsCollection(from: $from, to: $to) {
           totalCommitContributions
           totalRepositoryContributions
           contributionCalendar {
             totalContributions
             weeks { contributionDays { date contributionCount } }
           }
         }
       }
     }`,
    { login: USER, from: from.toISOString(), to: to.toISOString() },
  )
  const c = data.user.contributionsCollection
  // A window reports days outside its own range as 0, so merge with max or a
  // later window silently clobbers a real count from an earlier one.
  for (const w of c.contributionCalendar.weeks)
    for (const d of w.contributionDays)
      days.set(d.date, Math.max(days.get(d.date) ?? 0, d.contributionCount))
}

// The windows above start at account creation, so the last one is a partial
// year. Query the trailing 12 months separately for the "12 mo" figures.
{
  const to = new Date()
  const from = new Date(to)
  from.setUTCFullYear(from.getUTCFullYear() - 1)
  const data = await gql(
    `query ($login: String!, $from: DateTime!, $to: DateTime!) {
       user(login: $login) {
         contributionsCollection(from: $from, to: $to) {
           totalCommitContributions
           totalRepositoryContributions
         }
       }
     }`,
    { login: USER, from: from.toISOString(), to: to.toISOString() },
  )
  commitsLastYear = data.user.contributionsCollection.totalCommitContributions
  reposCreatedLastYear = data.user.contributionsCollection.totalRepositoryContributions
}

const today = new Date().toISOString().slice(0, 10)

const totalContributions = [...days.entries()]
  .filter(([date]) => date <= today)
  .reduce((sum, [, n]) => sum + n, 0)

// Streaks. Today counts as "not yet broken" while it is still in progress, so a
// zero-contribution today does not end an otherwise live streak.
const sorted = [...days.keys()].sort()
let longest = 0
let run = 0
for (const date of sorted) {
  if (date > today) break
  if (days.get(date) > 0) { run += 1; longest = Math.max(longest, run) }
  else if (date !== today) run = 0
}
let current = 0
for (let i = sorted.length - 1; i >= 0; i--) {
  const date = sorted[i]
  if (date > today) continue
  if (days.get(date) > 0) current += 1
  else if (date === today) continue
  else break
}

// Sparkline. `days` already holds every date this account has ever contributed
// on — it was being used only for the totals and the streaks and then thrown
// away. Bucketing its trailing 52 weeks costs no extra API calls.
const WEEKS = 52
const recent = sorted.filter((d) => d <= today).slice(-WEEKS * 7)
const series = Array.from({ length: WEEKS }, (_, w) =>
  recent.slice(w * 7, w * 7 + 7).reduce((sum, d) => sum + days.get(d), 0),
)
// The line is scaled to the 95th-percentile week, not the busiest one: a
// single outlier week (October 2026's account-wide security cleanup touched
// every repo at once) would otherwise flatten the rest of the year. Weeks
// above the scale are drawn at the top edge.
const peak = Math.max(...series, 1)
const ranked = [...series].sort((a, b) => a - b)
const scale = Math.max(ranked[Math.floor(0.95 * (ranked.length - 1))], 1)

// [value, label, qualifier]. Eight columns of about 100px each, so labels stay
// under 15 characters and the qualifier takes a second line.
const STATS = [
  [totalContributions.toLocaleString('en-US'), 'contributions', 'all time'],
  [commitsLastYear.toLocaleString('en-US'), 'commits', 'last 12 months'],
  [String(reposCreatedLastYear), 'new repos', 'last 12 months'],
  [String(publicRepos), 'public repos', ''],
  [stars.toLocaleString('en-US'), 'stars', ''],
  [followers.toLocaleString('en-US'), 'followers', ''],
  [String(current), 'day streak', 'current'],
  [String(longest), 'day streak', 'longest'],
]

const LABEL = `GitHub activity for ${USER}: ${STATS.map(([v, l, q]) => `${v} ${l}${q ? ` (${q})` : ''}`).join(', ')}. Contributions per week over the last 52 weeks.`
const CSS = `.draw{stroke-dasharray:1;animation:draw 1.8s ${EASE} .3s both}
@keyframes draw{from{stroke-dashoffset:1}}`

function cell(t, [value, label, sub], x, y, i) {
  return `<g class="rise" style="${delay(0.05 * i)}">
${text(value, { x, y, size: 26, weight: 600, ls: -0.6, fill: t.ink })}
${text(label, { x, y: y + 22, size: 12, fill: t.ink })}
${sub ? text(sub, { x, y: y + 38, size: 12, fill: t.muted }) : ''}
</g>`
}

function spark(t, x0, x1, top, band) {
  const base = top + band
  const step = (x1 - x0) / (WEEKS - 1)
  const pts = series.map((n, i) => [+(x0 + i * step).toFixed(1), +(base - (Math.min(n, scale) / scale) * band).toFixed(1)])
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('')
  const area = `${line}L${x1} ${base}L${x0} ${base}Z`
  return `<line x1="${x0}" y1="${base}" x2="${x1}" y2="${base}" stroke="${t.line}"/>
<path class="fade" style="${delay(0.6)}" d="${area}" fill="${t.accentSoft}"/>
<path class="draw" pathLength="1" d="${line}" fill="none" stroke="${t.accent}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>`
}

const W = 860
const H = 248
const PAD = 32

function render(t) {
  const colW = (W - 2 * PAD) / STATS.length
  return doc({
    w: W,
    h: H,
    label: LABEL,
    css: CSS,
    body: `${panel(t, { w: W, h: H, r: 18 })}
${STATS.map((s, i) => cell(t, s, +(PAD + colW * i).toFixed(1), 62, i)).join('\n')}
${spark(t, PAD, W - PAD, 134, 64)}
${text('Contributions per week, last 52 weeks', { x: PAD, y: H - 22, size: 12, fill: t.muted })}`,
  })
}

// A phone gets a 4 x 2 grid in a 430-wide file that carries both themes.
const NW = 430
const NH = 326

function renderNarrow(t) {
  const pad = 24
  const colW = (NW - 2 * pad) / 4
  return doc({
    w: NW,
    h: NH,
    label: LABEL,
    css: CSS,
    body: `${panel(t, { w: NW, h: NH, r: 18 })}
${STATS.map((s, i) => cell(t, s, +(pad + colW * (i % 4)).toFixed(1), 52 + Math.floor(i / 4) * 78, i)).join('\n')}
${spark(t, pad, NW - pad, 212, 62)}
${text('Contributions per week, last 52 weeks', { x: pad, y: NH - 20, size: 12, fill: t.muted })}`,
  })
}

await mkdir('dist', { recursive: true })
await writeFile('dist/stats.svg', render(THEMES.dark))
await writeFile('dist/stats-light.svg', render(THEMES.light))
await writeFile('dist/stats-narrow.svg', adaptive(renderNarrow(THEMES.dark), renderNarrow(THEMES.light)))

console.log(`stats: ${STATS.map(([v, l, q]) => `${v} ${l}${q ? ` (${q})` : ''}`).join(' | ')}`)
console.log(`sparkline: ${WEEKS} weeks, scaled to the 95th-percentile week (${scale}); busiest week ${peak}`)

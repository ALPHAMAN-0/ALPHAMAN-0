// Renders the profile stats card as two SVGs (dark + light) into dist/.
//
// Why this exists instead of a third-party card service: every shared public
// instance of github-readme-stats / streak-stats is saturated and returns a 503,
// a 402, or a "Failed to retrieve contributions" sad face. Generating the SVG
// here means the image is served from GitHub's own CDN, and if this job ever
// fails the last good card stays on the profile instead of breaking.
//
// Chrome and palette come from lib/chrome.mjs, so this card is the same window
// as every hand-authored asset in assets/ rather than a lookalike.

import { mkdir, writeFile } from 'node:fs/promises'
import { THEMES, HOST, esc, svg, mono, delay } from './lib/chrome.mjs'

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
const peak = Math.max(...series, 1)

const STATS = [
  [totalContributions.toLocaleString('en-US'), 'contributions'],
  [commitsLastYear.toLocaleString('en-US'), 'commits 12mo'],
  [String(reposCreatedLastYear), 'repos 12mo'],
  [String(publicRepos), 'public repos'],
  [stars.toLocaleString('en-US'), 'stars'],
  [followers.toLocaleString('en-US'), 'followers'],
  [String(current), 'day streak'],
  [String(longest), 'longest'],
]

const W = 860
const H = 226
const PAD = 28

function render(t) {
  const colW = (W - 2 * PAD) / STATS.length
  const cells = STATS.map(([value, label], i) => {
    const cx = +(PAD + colW * i + colW / 2).toFixed(1)
    return `<g class="in" style="${delay(i, 0.05)}">
${mono(value, { x: cx, y: 100, size: 25, fill: t.fg, anchor: 'middle' })}
${mono(label, { x: cx, y: 120, size: 9.5, fill: t.muted, anchor: 'middle' })}
</g>`
  }).join('\n')

  // pathLength="1" lets the shared `draw` keyframe animate this line without
  // knowing its real length; see lib/chrome.mjs.
  const top = 152
  const band = 44
  const step = (W - 2 * PAD) / (WEEKS - 1)
  const pts = series
    .map((n, i) => `${(PAD + i * step).toFixed(1)},${(top + band - (n / peak) * band).toFixed(1)}`)
    .join(' ')

  return svg({
    w: W,
    h: H,
    t,
    title: 'git-log',
    label: `GitHub activity for ${esc(USER)}: ${STATS.map(([v, l]) => `${v} ${l}`).join(', ')}`,
    body: `${mono(`${HOST} ❯ git log --shortstat --all`, { x: PAD, y: 54, size: 11, fill: t.muted, cls: 'in' })}
<line x1="${PAD}" y1="68" x2="${W - PAD}" y2="68" stroke="${t.border}"/>
${cells}
<line x1="${PAD}" y1="136" x2="${W - PAD}" y2="136" stroke="${t.border}"/>
<polyline class="draw" pathLength="1" points="${pts}" fill="none" stroke="${t.fg}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>
<line x1="${PAD}" y1="${top + band}" x2="${W - PAD}" y2="${top + band}" stroke="${t.border}"/>
${mono('contributions · last 52 weeks', { x: PAD, y: 212, size: 9.5, fill: t.muted, cls: 'in', style: delay(9, 0.05) })}
${mono(`peak ${peak}/wk`, { x: W - PAD, y: 212, size: 9.5, fill: t.muted, anchor: 'end', cls: 'in', style: delay(9, 0.05) })}`,
  })
}

await mkdir('dist', { recursive: true })
await writeFile('dist/stats.svg', render(THEMES.dark))
await writeFile('dist/stats-light.svg', render(THEMES.light))

console.log(`stats: ${STATS.map(([v, l]) => `${v} ${l}`).join(' | ')}`)
console.log(`sparkline: ${WEEKS} weeks, peak ${peak}/wk`)

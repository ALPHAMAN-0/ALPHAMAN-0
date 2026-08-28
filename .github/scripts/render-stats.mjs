// Renders the profile stats card as two SVGs (dark + light) into dist/.
//
// Why this exists instead of a third-party card service: every shared public
// instance of github-readme-stats / streak-stats is saturated and returns a 503,
// a 402, or a "Failed to retrieve contributions" sad face. Generating the SVG
// here means the image is served from GitHub's own CDN, and if this job ever
// fails the last good card stays on the profile instead of breaking.
//
// Palette is the README's: #0d1117 / #30363d / #ffffff / #8b949e.

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

const profile = await gql(
  `query ($login: String!) {
     user(login: $login) {
       createdAt
       repositories(privacy: PUBLIC, ownerAffiliations: OWNER) { totalCount }
     }
   }`,
  { login: USER },
)

const createdAt = new Date(profile.user.createdAt)
const publicRepos = profile.user.repositories.totalCount

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

const totalContributions = [...days.entries()]
  .filter(([date]) => date <= new Date().toISOString().slice(0, 10))
  .reduce((sum, [, n]) => sum + n, 0)

// Streaks. Today counts as "not yet broken" while it is still in progress, so a
// zero-contribution today does not end an otherwise live streak.
const sorted = [...days.keys()].sort()
const today = new Date().toISOString().slice(0, 10)
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

const STATS = [
  [totalContributions.toLocaleString('en-US'), 'contributions'],
  [commitsLastYear.toLocaleString('en-US'), 'commits · 12 mo'],
  [String(reposCreatedLastYear), 'repos · 12 mo'],
  [String(publicRepos), 'public repos'],
  [`${current}`, 'day streak'],
  [`${longest}`, 'longest streak'],
]

const MONO = "'SFMono-Regular','Cascadia Mono',Consolas,'Liberation Mono',Menlo,monospace"
const W = 860
const H = 132

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function render({ bg, border, fg, muted }) {
  const colW = (W - 2 * 28) / STATS.length
  const cells = STATS.map(([value, label], i) => {
    const cx = 28 + colW * i + colW / 2
    return `  <text x="${cx.toFixed(1)}" y="82" text-anchor="middle" font-family="${MONO}" font-size="30" font-weight="600" fill="${fg}">${esc(value)}</text>
  <text x="${cx.toFixed(1)}" y="104" text-anchor="middle" font-family="${MONO}" font-size="11" fill="${muted}">${esc(label)}</text>`
  }).join('\n')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="GitHub activity for ${esc(USER)}: ${STATS.map(([v, l]) => `${v} ${l}`).join(', ')}">
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="10" fill="${bg}" stroke="${border}"/>
  <text x="28" y="36" font-family="${MONO}" font-size="13" fill="${muted}">${esc(`${USER.toLowerCase()}@dhaka ❯ git log --shortstat --all`)}</text>
  <line x1="28" y1="50" x2="${W - 28}" y2="50" stroke="${border}"/>
${cells}
</svg>
`
}

const { mkdir, writeFile } = await import('node:fs/promises')
await mkdir('dist', { recursive: true })
await writeFile('dist/stats.svg', render({ bg: '#0d1117', border: '#30363d', fg: '#ffffff', muted: '#8b949e' }))
await writeFile('dist/stats-light.svg', render({ bg: '#ffffff', border: '#d0d7de', fg: '#1f2328', muted: '#57606a' }))

console.log(`stats: ${STATS.map(([v, l]) => `${v} ${l}`).join(' | ')}`)

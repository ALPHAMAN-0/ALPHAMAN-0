# CLAUDE.md — ALPHAMAN-0

- No manifest file present (no package.json/go.mod/pyproject.toml/Cargo.toml) — no build/test/lint commands found.
- This is a GitHub profile README repo, not a runnable application.
- `.github/workflows/snake.yml` pushes generated output to an `output` branch — do not hand-edit generated snake.svg output; it's produced by CI.
- The stats workflow falls back `secrets.STATS_TOKEN || secrets.GITHUB_TOKEN` on purpose: default GITHUB_TOKEN suffices for public contribution data; STATS_TOKEN is opt-in only if a 401 ever appears. Do not remove the fallback.

Files worth reading first:
- README.md — the actual rendered content (profile page)
- .github/workflows/snake.yml — only automation in the repo
- assets/ascii-portrait.svg — image referenced by README.md

Architecture: see ARCHITECTURE.md — read before structural changes

# CLAUDE.md — ALPHAMAN-0

- GitHub profile README repo, not an application. No manifest and no dependencies: the scripts are plain Node 22 ESM.
- Build: `node .github/scripts/render-static.mjs` from the repo root. It redraws every SVG in `assets/` and rewrites the README blocks between `<!-- BEGIN generated:x -->` and `<!-- END generated:x -->`. Commit both. CI fails if they differ from its output or if an image the README shows is untracked.
- Never hand-edit `assets/*.svg` or a generated README block. Change the data in `render-static.mjs` (hero, links, Shasroi Bazar window, projects, stack) or `now.json` (availability, learning cards), then run the script.
- `assets/ascii-portrait.svg` is hand-made and is a generator input: the hero reads its `<g filter="url(#glow)">` art group and its `class="row rN"` rows. Keep that structure if you replace it.
- `.github/workflows/profile-assets.yml` has two jobs: `verify` (the drift check above) and `generate` (snake + stats card, pushed to the `output` branch). Do not hand-edit the `output` branch.
- The stats step falls back `secrets.STATS_TOKEN || secrets.GITHUB_TOKEN` on purpose: the default GITHUB_TOKEN suffices for public contribution data; STATS_TOKEN is opt-in only if a 401 ever appears. Do not remove the fallback.
- Logos in `.github/scripts/icons/` come from pinned sources; licences in its README.md.

Files worth reading first:
- README.md — the rendered profile page
- .github/scripts/render-static.mjs — every static image and the README blocks
- now.json — availability and the learning cards

Architecture: see ARCHITECTURE.md — read before structural changes

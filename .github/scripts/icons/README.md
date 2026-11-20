# Icons

The real marks the profile generator inlines into its SVGs. Fetched once with the
design-taste skill's `icons.mjs` from pinned sources, then trimmed (comments and
whitespace removed, coordinates rounded to 0.01 of the viewBox) and committed, so
`render-static.mjs` runs offline and gives the same bytes every time.

| Set | Source (pinned) | Licence |
|---|---|---|
| `logos` | [gilbarbara/logos](https://github.com/gilbarbara/logos) at `d6960edc1b73` | CC0-1.0 |
| `si` | [Simple Icons](https://github.com/simple-icons/simple-icons) 16.30.0 | CC0-1.0 |
| `ui` | [Lucide](https://github.com/lucide-icons/lucide) via `@iconify-json/lucide` 1.2.100 | ISC |
| `file` | [vscode-icons](https://github.com/vscode-icons/vscode-icons) via `@iconify-json/vscode-icons` 1.2.30 | MIT |

Every product mark is its owner's trademark and is used only to name a tool a
project really uses. Black marks carry `data-ic="ink"` and are inverted on the
dark theme by `lib/icons.mjs`.

To add one: `node <skill>/scripts/icons.mjs fetch <id> --out <dir>`, trim it the
same way, drop it here and reference it by file name (without `.svg`).

| File | Mark | Source id | Licence |
|---|---|---|---|
| `angular.svg` | Angular | `logos:angular-icon` | CC0-1.0 |
| `bash.svg` | Bash | `logos:bash-icon` | CC0-1.0 |
| `c-plusplus.svg` | C++ | `logos:c-plusplus` | CC0-1.0 |
| `c-sharp.svg` | C Sharp | `logos:c-sharp` | CC0-1.0 |
| `c.svg` | C | `si:c` | CC0-1.0 |
| `claude-code.svg` | Claude Code | `logos:claude-code` | CC0-1.0 |
| `claude.svg` | Claude | `logos:claude-icon` | CC0-1.0 |
| `cloudflare-workers.svg` | Cloudflare Workers | `logos:cloudflare-workers-icon` | CC0-1.0 |
| `docker.svg` | Docker | `logos:docker-icon` | CC0-1.0 |
| `dotnet.svg` | .NET | `logos:dotnet` | CC0-1.0 |
| `express.svg` | Express | `si:express` | CC0-1.0 |
| `facebook.svg` | Facebook | `logos:facebook` | CC0-1.0 |
| `fastapi.svg` | FastAPI | `logos:fastapi-icon` | CC0-1.0 |
| `git-icon.svg` | Git | `logos:git-icon` | CC0-1.0 |
| `github-actions.svg` | GitHub Actions | `logos:github-actions` | CC0-1.0 |
| `github.svg` | GitHub | `logos:github-icon` | CC0-1.0 |
| `go.svg` | Go | `logos:go` | CC0-1.0 |
| `google-gemini-icon.svg` | Google Gemini | `logos:google-gemini-icon` | CC0-1.0 |
| `instagram.svg` | Instagram | `logos:instagram-icon` | CC0-1.0 |
| `javascript.svg` | Javascript (JS) | `logos:javascript` | CC0-1.0 |
| `laravel.svg` | Laravel | `logos:laravel` | CC0-1.0 |
| `linkedin.svg` | LinkedIn | `logos:linkedin-icon` | CC0-1.0 |
| `linux-tux.svg` | Linux | `logos:linux-tux` | CC0-1.0 |
| `mongodb.svg` | MongoDB | `logos:mongodb-icon` | CC0-1.0 |
| `mysql.svg` | MySQL | `logos:mysql-icon` | CC0-1.0 |
| `nestjs.svg` | NestJS | `logos:nestjs` | CC0-1.0 |
| `nextjs.svg` | Next.js | `logos:nextjs-icon` | CC0-1.0 |
| `nodejs.svg` | Node.js | `logos:nodejs-icon` | CC0-1.0 |
| `numpy.svg` | Numpy | `logos:numpy` | CC0-1.0 |
| `openai.svg` | OpenAI | `logos:openai-icon` | CC0-1.0 |
| `pandas-icon.svg` | Pandas | `logos:pandas-icon` | CC0-1.0 |
| `php.svg` | PHP | `logos:php` | CC0-1.0 |
| `postgres.svg` | PostgreSQL | `logos:postgresql` | CC0-1.0 |
| `pytest.svg` | Pytest | `si:pytest` | CC0-1.0 |
| `python.svg` | Python | `logos:python` | CC0-1.0 |
| `pytorch.svg` | PyTorch | `logos:pytorch-icon` | CC0-1.0 |
| `react.svg` | React | `logos:react` | CC0-1.0 |
| `redis.svg` | Redis | `logos:redis` | CC0-1.0 |
| `scikitlearn.svg` | scikit-learn | `si:scikitlearn` | CC0-1.0 |
| `socket.io.svg` | Socket.io | `logos:socket.io` | CC0-1.0 |
| `tailwindcss.svg` | Tailwind CSS | `logos:tailwindcss-icon` | CC0-1.0 |
| `telegram.svg` | Telegram | `logos:telegram` | CC0-1.0 |
| `typescript.svg` | Typescript | `logos:typescript-icon` | CC0-1.0 |
| `ui-book-open-text.svg` | Book Open Text | `ui:book-open-text` | ISC |
| `ui-bot.svg` | Bot | `ui:bot` | ISC |
| `ui-code-xml.svg` | Code Xml | `ui:code-xml` | ISC |
| `ui-database.svg` | Database | `ui:database` | ISC |
| `ui-globe.svg` | Globe | `ui:globe` | ISC |
| `ui-mail.svg` | Mail | `ui:mail` | ISC |
| `ui-search.svg` | Search | `ui:search` | ISC |
| `ui-square-terminal.svg` | Square Terminal | `ui:square-terminal` | ISC |
| `ui-user-check.svg` | User Check | `ui:user-check` | ISC |
| `vercel.svg` | Vercel | `logos:vercel-icon` | CC0-1.0 |
| `webrtc.svg` | WebRTC | `logos:webrtc` | CC0-1.0 |
| `whatsapp.svg` | WhatsApp | `logos:whatsapp-icon` | CC0-1.0 |
| `x.svg` | X | `si:x` | CC0-1.0 |
| `xlsx.svg` | Excel workbook | `file:file-type-excel` | MIT |

## Lucide

The `ui-*.svg` glyphs are Lucide icons. Their licence, quoted from the Lucide
repository:

```text
ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

`ui-database.svg` and `ui-search.svg` are Lucide icons derived from Feather, which
Lucide lists under this notice:

```text
The MIT License (MIT) (for the icons listed above)

Copyright (c) 2013-present Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## vscode-icons

`xlsx.svg` is the vscode-icons Excel file-type icon:

```text
The MIT License (MIT)

Copyright The vscode-icons Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

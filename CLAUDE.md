# Toke Haus — Claude Code Project Guide

## Project overview

Local WooCommerce site built on WordPress + Kadence Blocks.
Local dev runs via **Local by Flywheel** on Windows.

| Item | Value |
|------|-------|
| WP root | `C:/Users/dstea/Local Sites/tokehaus/app/public/` |
| Local URL | `http://tokehaus.local` (nginx proxy → `http://localhost:8080`) |
| Live URL | `https://tokehaus.com` |
| VPS | `root@31.97.211.144` |
| Theme | `wp-content/themes/kadence-child/` |
| Homepage post ID | `4212` |
| DB table prefix | `w_` |
| Local MySQL port | `10004` |
| MySQL binary | `C:/Users/dstea/AppData/Roaming/Local/lightning-services/mysql-8.0.35+4/bin/win64/bin/mysql.exe` |

All secrets (SSH IP, DB credentials) live in `.env` at the project root.
**Never hardcode credentials. Always `source .env` before reading them.**

---

## gstack

This project uses gstack — Garry Tan's Claude Code skill suite.
For all web browsing and QA, use the `/browse` skill from gstack.
Never use `mcp__claude-in-chrome__*` tools.

Available gstack skills:
- `/office-hours` — product/feature review before writing code
- `/plan-ceo-review` — scope and direction review
- `/plan-eng-review` — architecture, data flow, edge cases, tests
- `/plan-design-review` — senior designer review with AI slop detection
- `/design-consultation` — build design system from scratch → writes DESIGN.md
- `/design-shotgun` — generate 4-6 visual mockup variants, pick and iterate
- `/design-html` — turn approved mockup into production HTML/CSS
- `/design-review` — visual audit, fixes with atomic commits + before/after screenshots
- `/review` — staff engineer code review
- `/investigate` — root-cause debugging, no fixes without investigation first
- `/qa` — full QA run with auto-generated regression tests
- `/qa-only` — QA report only, no code changes
- `/ship` — sync main, run tests, audit coverage, push, open PR
- `/land-and-deploy` — merge PR, wait for CI/deploy, verify production health
- `/canary` — post-deploy monitoring for errors and regressions
- `/benchmark` — Core Web Vitals and page load baselines
- `/document-release` — update all docs after shipping
- `/retro` — weekly retro with shipping streaks
- `/browse` — real Chromium browser for QA
- `/careful` — warn before destructive commands
- `/freeze` — lock edits to one directory while debugging
- `/guard` — /careful + /freeze combined
- `/autoplan` — one command runs CEO + design + eng review automatically
- `/context-save` / `/context-restore` — save and resume working context

---

## Deployment commands

Run all deploy scripts from the **project root** using Git Bash or WSL.

---

### `deploy-styles` — push CSS changes live

Uploads `kadence-child/style.css` to the VPS via SCP, then flushes the
WordPress object cache (and WP Rocket / LiteSpeed if installed).

```bash
bash deploy/deploy-styles.sh
```

**When to use:** after any change to
`wp-content/themes/kadence-child/style.css`.

**What it does:**
1. Reads `REMOTE_SSH_USER`, `REMOTE_SSH_IP`, `REMOTE_PATH` from `.env`
2. `scp` uploads the file to `${REMOTE_PATH}/wp-content/themes/kadence-child/style.css`
3. SSH → `wp cache flush --allow-root` (+ plugin-specific cache clears)

---

### `deploy-db` — push local database live

Exports the local DB, normalises line endings, replaces the local URL with
the live URL in the SQL, uploads to the VPS, imports, runs WP-CLI
search-replace, and flushes cache.

```bash
bash deploy/deploy-db.sh
```

**When to use:** after content changes to post 4212 (homepage), WooCommerce
products, or any database-driven content that needs to go live.

**What it does:**
1. Prompts `yes` confirmation — aborts on anything else
2. `mysqldump` from Local by Flywheel (port 10004) → `/deploy/tmp/deploy_<ts>.sql`
3. `tr -d '\r'` — strips Windows CRLF → LF
4. `sed` — replaces every `http://tokehaus.local` with `https://tokehaus.com`
5. `scp` → VPS `/tmp/deploy_<ts>.sql`
6. SSH → `wp db import`, `wp search-replace`, `wp cache flush`
7. Deletes temp files locally and on remote

⚠️ **This overwrites the live database.** The script requires typing `yes`
at the confirmation prompt.

---

### `test-ui` — run Playwright test suite

Runs all 13 homepage tests against the local site.

```bash
bash deploy/test-ui.sh
```

Options (passed through to Playwright):
```bash
bash deploy/test-ui.sh --headed          # show browser
bash deploy/test-ui.sh --ui              # interactive Playwright UI
PWTEST_GREP="hero" bash deploy/test-ui.sh  # run only tests matching "hero"
```

**Always run `test-ui` before `deploy-db` or `deploy-styles`.**
All 13 tests must pass before deploying.

---

## Key technical notes

### Kadence Blocks layout rules
Every `kadence/rowlayout` that needs columns side-by-side **must** have
`display: flex !important` on `.kt-row-column-wrap` in the child theme CSS.
Kadence defaults to `display: grid` which collapses to single-column when
our CSS overrides conflict. Sections already fixed: hero, stats, trust bar,
rewards, shipping, email CTA.

### DB content modifications
Use Node.js scripts via the Bash tool — not direct MySQL editing.
Pattern:
```js
const r = spawnSync(MYSQL, [...ARGS, '-e', 'SELECT post_content FROM w_posts WHERE ID=4212;'], ...);
// modify html
const sql = 'UPDATE w_posts SET post_content=\'' + esc + '\' WHERE ID=4212;';
spawnSync(MYSQL, ARGS_W, { input: sql });
```
Always detect EOL at runtime: `const N = html.includes('\r\n') ? '\r\n' : '\n'`

### CSS specificity
Child theme (`kadence-child/style.css`) is loaded via `kadence-global` handle.
To beat Kadence's inline styles, use parent-selector nesting and `!important`.
To beat the post's inline `<style>` blocks (specificity 0,0,1,x), nest inside
the section's wrapper class (adds one class to specificity).

### Image sizes
Deal card images: use `510x510` variants (not `280x280` thumbnails).
Natural size must be ≥ rendered size to avoid upscaling blur.

### Playwright tests
Suite: `tests/homepage.spec.js` — 13 tests, all must pass.
Screenshots saved to `tests/screenshots/`.
Base URL configured in `playwright.config.js` → `http://localhost:8080`.
## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

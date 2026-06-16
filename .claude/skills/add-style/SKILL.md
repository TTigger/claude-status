---
name: add-style
description: Use when adding a new visual style to the Claude Code statusline HUD. Covers the full closed loop from registry entry to README, tests, and changelog.
---

# Add a New Visual Style

Follow these steps in order. Do not skip any step — `npm test` will catch missing README entries, and the per-style smoke test will catch missing or malformed descriptors.

1. **Add a descriptor object to `STYLES` in `src/registry.js`.**

   The full descriptor shape is:

   ```js
   {
     name: 'my-style',          // kebab-case, unique
     label: 'My Style',         // human-readable display name
     bar: { full: '█', empty: '░' },  // bar fill characters
     barWrap: ['[', ']'],        // characters wrapping the bar
     labels: {
       branch: 'branch',        // label text for each segment
       ctx: 'ctx',
       sess: 'sess',
       wk: 'wk',
       ac: 'ac',
     },
     icons: null,               // null OR { model: '…', project: '…' } for icon variants
     decimals: false,           // boolean: show one decimal place on % / token k
     rawTokens: false,          // boolean: show raw token counts (e.g. '47k/200k') instead of just used
     lowercase: false,          // boolean: lowercase all label text
     requires: 'truecolor',     // terminal capability: 'ascii' | 'color256' | 'truecolor' | 'nerd'
     decoration: { type: 'none' },  // 'none' | 'pill' | 'segment' — see step 2
     palette: {                 // per-theme role colours as 24-bit truecolor hex
       dark:  { text:'#cfc6ba', dim:'#5d6370', accent:'#d97757', accent2:'#e8a07e',
                low:'#d97757', mid:'#e8a07e', high:'#e0533d' },
       light: { text:'#4a4640', dim:'#9a9080', accent:'#bf5a3c', accent2:'#c8714e',
                low:'#bf5a3c', mid:'#c8714e', high:'#a83a22' },
     },
   }
   ```

   Append the new entry to the `STYLES` array. The array order determines display order in `config list` and `--help`.

2. **Set `requires`, `palette`, and `decoration`.**

   `requires` — the most restrictive terminal capability your characters/colours need:
   - `requires: 'ascii'` — plain text only, no extended Unicode.
   - `requires: 'color256'` — 256-colour (and Unicode block elements) allowed.
   - `requires: 'truecolor'` — 24-bit colour required.
   - `requires: 'nerd'` — Nerd Font glyphs required.

   `palette` — per-theme (`dark`/`light`) role colours as truecolor hex. `palette.js`'s
   `resolveStylePalette` turns these into ANSI and degrades automatically truecolor → 256 → 8-colour;
   backgrounds drop entirely on no-colour terminals. Roles: `text`, `dim`, `accent`, `accent2`, and the
   tier colours `low`/`mid`/`high` (used by the bar + %). Always set `low`/`mid`/`high` (they have an
   8-colour fallback); `text`/`accent` may be `''` to mean "terminal default".

   `decoration.type` — how backgrounds are applied (the `decorate` stage in `src/engine.js`):
   - `'none'` — foreground only, no backgrounds (e.g. `claude`).
   - `'pill'` — rounded background behind assigned segments. Add `decoration.assign` mapping part keys
     (`project`/`branch`/`context`/`session`/`weekly`/`cost`) to deco role names, and a `deco` map in each
     palette theme: `deco: { <role>: { bg:'#…', fg:'#…' }, … }` (e.g. `mist`).
   - `'segment'` — powerline blocks grouped by band. Set `decoration.byGroup: true` and `assign` mapping
     `_env`/`_context`/`_limits` to deco roles, plus a `deco` map. Use `requires: 'nerd'` for the powerline
     half-circle caps; without a Nerd Font it falls back to rounded blocks automatically (e.g. `neon`).

   Choose the most restrictive `requires` that your characters and colours actually need.

3. **Add the README "Styles" gallery block, then regenerate it from real output.**

   First add a `### \`<name>\``  heading with an (empty or rough) fenced code block in the README "Styles" section so the section exists. Then run:

   ```sh
   node scripts/sync-readme-styles.js
   ```

   This rewrites every Styles block (and the "The HUD" line) from the ACTUAL `renderHud` output — correct labels, %, bar width, and Nerd-Font/Unicode glyphs, with zero hand-transcription. **Never hand-type the fenced block contents.** The README gallery is the authoritative public catalogue; a maintainer-local design spec (not in the repo) is optional.

4. **Run `npm test` and confirm all tests pass.**

   Three guards cover new styles automatically:
   - `test/render.test.js` — per-style smoke; a malformed descriptor (wrong shape, missing field) fails here.
   - `test/docdrift.test.js` — fails if the style `name` is not present in `README.md`.
   - `test/readme-mockups.test.js` — fails if the README mockup doesn't byte-match `renderHud` output (re-run the sync script to fix).

   Fix any failures before proceeding.

5. **Add a `CHANGELOG.md` entry** under `[Unreleased]`:**

   ```md
   ### Added
   - New style `my-style`: <one-sentence description of the aesthetic>.
   ```

   See `sync-docs` skill for the full change → file map.

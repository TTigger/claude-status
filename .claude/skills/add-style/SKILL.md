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
     colorMode: 'coral',        // 'coral' | 'traffic'
     decimals: false,           // boolean: show one decimal place on % / token k (e.g. data style)
     rawTokens: false,          // boolean: show raw token counts (e.g. '47k/200k') instead of just used
     lowercase: false,          // boolean: lowercase all label text
     requires: 'unicode',       // terminal capability: 'ascii' | 'unicode' | 'truecolor' | 'nerd' | 'braille' | 'emoji'
   }
   ```

   Append the new entry to the `STYLES` array. The array order determines display order in `config list` and `--help`.

2. **Set the correct `requires` capability and `colorMode`.**

   - `requires: 'ascii'` — plain text only, no extended Unicode.
   - `requires: 'unicode'` — Unicode block elements allowed.
   - `requires: 'truecolor'` — 24-bit color required.
   - `requires: 'nerd'` — Nerd Font icons required.
   - `requires: 'braille'` — Braille dot characters required.
   - `requires: 'emoji'` — Emoji characters required.
   - `colorMode: 'coral'` — uses the coral/warm palette.
   - `colorMode: 'traffic'` — uses red/yellow/green traffic-light palette.

   Choose the most restrictive `requires` that your new characters actually need.

3. **Add the README "Styles" gallery block, then regenerate it from real output.**

   First add a `### \`<name>\``  heading with an (empty or rough) fenced code block in the README "Styles" section so the section exists. Then run:

   ```sh
   node scripts/sync-readme-styles.js
   ```

   This rewrites every Styles block (and the "The HUD" line) from the ACTUAL `renderHud` output — correct labels, %, bar width, and Nerd/braille/emoji glyphs, with zero hand-transcription. **Never hand-type the fenced block contents.** The README gallery is the authoritative public catalogue; a maintainer-local design spec (not in the repo) is optional.

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

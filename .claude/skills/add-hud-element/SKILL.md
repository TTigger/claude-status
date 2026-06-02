---
name: add-hud-element
description: Use when adding a new data element to the Claude Code statusline HUD display. Covers the full closed loop from data source mapping through engine rendering, config schema, docs, and tests.
---

# Add a New HUD Element

Follow these steps in order. Each layer of the render pipeline depends on the previous one, so work top-to-bottom.

1. **Map the data source in `src/elements.js`.**

   `buildElements` reads raw Claude Code session data and returns a normalized model object. Add a new key to that returned object:

   ```js
   // src/elements.js — inside buildElements(data)
   myElement: deriveMyElement(data),   // add your key here
   ```

   Implement `deriveMyElement(data)` in the same file. Keep derivation pure (no side effects). Reference the HUD data sources table in the maintainer-local design spec §4 (if present; the spec is not tracked in the repo) for available raw fields.

2. **Render it in `src/engine.js` `buildParts` and assign a `group`.**

   `buildParts` iterates the normalized element model and produces an array of segment objects. Add a new segment push:

   ```js
   // src/engine.js — inside buildParts({ els, style, palette, config, now, opts })
   // `push(key, text, group)` is the local helper; `text` is the fully-rendered
   // (already colored) string. For a bar metric use renderMetric:
   if (config.elements.myElement && els.myElement) {
     const text = renderMetric({
       label: lc(L.myEl), pct: els.myElement.pct, suffix: '',
       style, palette, thresholds, barWidth,
     });
     push('myElement', text, 'context');   // group ∈ 'env' | 'context' | 'limits'
   }
   ```

   For a non-bar element, build the string directly (see the `autoCompact` /
   `branch` cases) and `push('myElement', \`${lc(L.myEl)} ${value}\`, 'context')`.
   Segments are `{ key, text, group }` objects (NOT `{ label, value }`).

   Group semantics (must match the real bands in `buildParts`):
   - `'env'` — identity/environment: model, project, git branch.
   - `'context'` — context-window info: context bar, auto-compact remaining.
   - `'limits'` — usage limits: Session (5h), Weekly (7d).

3. **Add an `elements.<name>` boolean key to `CONFIG_SCHEMA` in `src/registry.js`.**

   ```js
   // src/registry.js — CONFIG_SCHEMA (flat object with dotted keys)
   'elements.myElement': { type: 'bool', default: true },
   ```

   This key is used by config validation, `config list`, and `--help` auto-generation. Setting `default: false` hides the element unless the user opts in. (Note: schema keys are flat dotted strings like `'elements.myElement'`, and the boolean type is `'bool'`, not `'boolean'`.)

4. **Update documentation in two places:**

   - **README HUD section** — add a description of the new element so users know it exists and how to enable/disable it via config.
   - **Maintainer-local design spec §4** (if present; the spec is not tracked in the repo) — add a row to the HUD data sources table with: element name, raw data field(s) it reads, derivation notes.

5. **Add tests in `test/elements.test.js` and `test/engine.test.js`.**

   - `test/elements.test.js` — unit-test `deriveMyElement` with representative inputs (including edge cases: missing field, zero value, maximum value).
   - `test/engine.test.js` — integration-test that `buildParts` includes the new segment when `config.elements.myElement` is `true`, and omits it when `false`.

   Run `npm test` and confirm the suite stays green before committing.

   See `sync-docs` skill for the full change → file map.

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

   Implement `deriveMyElement(data)` in the same file. Keep derivation pure (no side effects). Reference the HUD data sources table in the design spec (`docs/superpowers/specs/2026-06-02-cc-statusline-design.md` §4) for available raw fields.

2. **Render it in `src/engine.js` `buildParts` and assign a `group`.**

   `buildParts` iterates the normalized element model and produces an array of segment objects. Add a new segment push:

   ```js
   // src/engine.js — inside buildParts(elements, style, config)
   if (config.elements.myElement) {
     parts.push({
       group: 'context',          // 'env' | 'context' | 'limits'
       label: style.labels.myElement ?? 'my-el',
       value: elements.myElement,
       // …any additional segment fields
     });
   }
   ```

   Group semantics:
   - `'env'` — environment/identity info (model, project).
   - `'context'` — session/workspace context (branch, session id, working dir).
   - `'limits'` — resource consumption (token counts, cost).

3. **Add an `elements.<name>` boolean key to `CONFIG_SCHEMA` in `src/registry.js`.**

   ```js
   // src/registry.js — CONFIG_SCHEMA.elements object
   myElement: { type: 'boolean', default: true, description: 'Show my element' },
   ```

   This key is used by config validation, `config list`, and `--help` auto-generation. Setting `default: false` hides the element unless the user opts in.

4. **Update documentation in two places:**

   - **Design spec §4** (`docs/superpowers/specs/2026-06-02-cc-statusline-design.md`) — add a row to the HUD data sources table with: element name, raw data field(s) it reads, derivation notes.
   - **README HUD section** — add a description of the new element so users know it exists and how to enable/disable it via config.

5. **Add tests in `test/elements.test.js` and `test/engine.test.js`.**

   - `test/elements.test.js` — unit-test `deriveMyElement` with representative inputs (including edge cases: missing field, zero value, maximum value).
   - `test/engine.test.js` — integration-test that `buildParts` includes the new segment when `config.elements.myElement` is `true`, and omits it when `false`.

   Run `npm test` and confirm the suite stays green before committing.

   See `sync-docs` skill for the full change → file map.

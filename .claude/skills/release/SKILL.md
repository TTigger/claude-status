---
name: release
description: Use when cutting a new npm release of @ttigger/claude-status. Covers the full closed loop from green tests through version bump, changelog, git tag, and publish via GitHub Actions or locally.
---

# Cut a Release

Follow these steps in order. Do not tag or publish before the suite is green.

1. **Ensure `npm test` is green.**

   Run `npm test` (uses `node --test`). All tests must pass (61 as of v0.1.0). Fix any failures before proceeding. Do not skip this step.

2. **Bump `version` in `package.json`.**

   Use semantic versioning:
   - `patch` (x.y.Z) — bug fixes, doc updates, no API change.
   - `minor` (x.Y.0) — new backward-compatible features (new style, new HUD element).
   - `major` (X.0.0) — breaking config/API changes.

   Update the `"version"` field directly in `package.json`. The value must match the git tag you create in step 4.

3. **Move `CHANGELOG.md` `[Unreleased]` entries under a new dated version heading.**

   Replace the `[Unreleased]` section header with a versioned heading and today's date:

   ```md
   ## [1.2.3] — 2026-06-02
   ```

   Add a fresh empty `[Unreleased]` section above it so future changes have a place to land:

   ```md
   ## [Unreleased]

   ## [1.2.3] — 2026-06-02
   ### Added
   - …
   ```

4. **Commit and tag.**

   ```sh
   git add package.json CHANGELOG.md
   git commit -m "chore: release v1.2.3"
   git tag v1.2.3
   ```

   The tag name must be `v` + the exact version string from `package.json`.

5. **Publish.**

   **Preferred — push the tag and let GitHub Actions publish:**

   ```sh
   git push origin main
   git push origin v1.2.3
   ```

   The `.github/workflows/publish.yml` workflow triggers on `push: tags: ['v*']`, runs `npm test`, then calls `npm publish --access public` using the `NPM_TOKEN` repo secret. Monitor the Actions run at `https://github.com/<owner>/claude-status/actions`.

   **Fallback — publish locally (if CI is unavailable):**

   ```sh
   npm publish --access public
   ```

   Requires you to be logged in to npm (`npm whoami`) and have publish rights to the `@ttigger` scope.

   See `sync-docs` skill for the full change → file map.

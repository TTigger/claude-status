# Contributing to @ttigger/claude-status

## Setup

There are no dependencies to install. The project uses only Node built-ins.

```sh
git clone https://github.com/ttigger/claude-status.git
cd claude-status
npm test   # runs node --test — all tests should pass before you start
```

Node ≥ 18 is required (the project uses `node:test` and `node:assert`).

## Running Tests

```sh
npm test                        # full suite
node --test test/<file>.test.js # single file
```

All new code must be accompanied by tests. Tests live in `test/` alongside source files.

## Branch and Commit Conventions

- Work on a feature branch (`feat/my-feature`, `fix/my-bug`).
- Use **conventional commits**:
  - `feat:` — new feature
  - `fix:` — bug fix
  - `test:` — new or updated tests only
  - `docs:` — documentation only
  - `refactor:` — code change that neither fixes a bug nor adds a feature
  - `chore:` — build scripts, config, maintenance

Example: `feat: add powerline style descriptor`

## Maintenance Map

When changing styles or adding HUD elements, follow the closed-loop maintenance map in [AGENTS.md](./AGENTS.md#maintenance-map-closed-loop) to keep all four layers (code, tests, README, docs) in sync. The `test/docdrift.test.js` test will catch README drift automatically.

## Skills

Agent skills in `.claude/skills/` cover the most common workflows:

| Skill | When to use |
|---|---|
| `.claude/skills/add-style` | Adding a new visual style end-to-end |
| `.claude/skills/add-hud-element` | Adding a new HUD data element end-to-end |
| `.claude/skills/release` | Version bump, changelog, tag, and npm publish |
| `.claude/skills/sync-docs` | Check all four doc layers are consistent |

## Code Conventions

- CommonJS only (`require` / `module.exports`).
- Zero runtime dependencies — use Node built-ins exclusively.
- Keep engine and layout functions pure (no I/O or side effects).
- Isolate side-effectful code (fs, git, installer, subprocess) in dedicated modules.

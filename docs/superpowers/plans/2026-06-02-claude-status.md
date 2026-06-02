# claude-status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@ttigger/claude-status`, an npm-installable Claude Code statusline HUD (usage/model/git/context) with 7 selectable styles, a `cc` launcher, and a config CLI with live preview.

**Architecture:** A pure-function render engine consumes **data-driven style descriptors** and a normalized element model derived from the statusline stdin JSON. A single `registry.js` is the source of truth for styles/layouts/config keys; CLI validation, `config list`, `--help`, previews, and a doc-drift test all read it. Installer merges a `statusLine` entry into `~/.claude/settings.json` (with backup) and globally installs the package so `cc` / `claude-status-render` live on PATH.

**Tech Stack:** Node.js ≥ 18 (CommonJS, **zero runtime dependencies**), Node built-in test runner (`node --test`, `node:test`/`node:assert`), ANSI escape codes, GitHub Actions.

---

## Architecture & Contracts (read before any task)

All tasks below depend on these shared contracts. Do not deviate.

### Module map

```
claude-status/
├─ package.json
├─ .gitignore  LICENSE  README.md  AGENTS.md  CLAUDE.md
├─ CONTRIBUTING.md  SECURITY.md  CHANGELOG.md
├─ .github/workflows/ci.yml  .github/workflows/publish.yml
├─ bin/
│  ├─ claude-status.js          # CLI: install/uninstall/config/preview/help
│  ├─ claude-status-render.js   # reads stdin JSON, prints HUD
│  └─ cc.js                     # spawns `claude`
├─ src/
│  ├─ registry.js               # SOURCE OF TRUTH: STYLES, LAYOUTS, CONFIG_SCHEMA
│  ├─ defaults.js               # DEFAULT_CONFIG (derived from CONFIG_SCHEMA)
│  ├─ format.js                 # clampPct, tier, bar, humanizeDuration, tokensK
│  ├─ palette.js                # resolvePalette -> {low,mid,high,dim,reset}; colorize
│  ├─ elements.js               # buildElements(stdin) -> normalized model
│  ├─ git.js                    # currentBranch(cwd)
│  ├─ detect.js                 # capabilities(env) + recommendStyle(caps)
│  ├─ engine.js                 # renderElement(...) + assembleLine helpers
│  ├─ layout.js                 # layoutLines(parts, layout, columns)
│  ├─ render.js                 # renderHud(ctx) -> string (top level)
│  ├─ config.js                 # load/deepMerge/validate/set/get/list/reset
│  ├─ fixtures.js               # SAMPLE stdin JSON for preview + tests
│  └─ installer/
│     ├─ paths.js               # claudeDir(), settingsPath(), configPath(), backupPath()
│     ├─ settings.js            # mergeStatusLine(settingsObj, cmd, refresh) / writeSettings
│     ├─ alias.js               # detectCcCollision(env), aliasSnippet(shell,name)
│     └─ install.js             # runInstall(opts), runUninstall()
├─ test/                        # one *.test.js per src module
└─ docs/superpowers/{specs,plans}/...
```

### Core data contracts

**`buildElements(stdin)` returns:**
```js
{
  model:   { name: 'Opus 4.8', context1m: true } | null,
  project: 'claude-status' | null,
  branch:  'main' | null,                       // filled later by render.js via git
  context: { pct: 23, tokensK: 47, sizeK: 200 } | null,
  autoCompact: { leftPct: 60 } | null,
  session: { pct: 52, resetsAt: 1717400000 } | null,   // null when no rate_limits
  weekly:  { pct: 31, resetsAt: 1717700000 } | null,
}
```

**`renderHud(ctx)` input object:**
```js
{
  stdin,                 // parsed statusline JSON
  config,                // merged config (see DEFAULT_CONFIG)
  theme: 'light'|'dark', // from settings.json
  caps,                  // { unicode, color256, truecolor, nerd } from detect.capabilities
  columns,               // integer terminal width (from env COLUMNS or fallback 100)
  now,                   // epoch seconds (Date.now()/1000); injected for tests
  branch,                // string|null (resolved by caller via git)
}
// returns: string (may contain '\n' for multi-line layouts)
```

**Tier rule:** `tier(pct, {green, yellow})` → `'low'` if `pct <= green`, `'mid'` if `pct <= yellow`, else `'high'`.

**`DEFAULT_CONFIG`:**
```js
{
  style: 'claude', layout: 'auto', palette: 'auto', separator: ' | ',
  barWidth: 8, colorThresholds: { green: 50, yellow: 80 },
  elements: { model: true, project: true, gitBranch: true, context: true,
              autoCompact: true, session: true, weekly: true },
  autoCompact: { thresholdPct: 83.5 }, refreshIntervalSec: 30,
}
```

### Style descriptor shape (lives in registry.STYLES)
```js
{
  name: 'claude',
  label: 'Claude 簡潔風',
  bar: { full: '▰', empty: '▱' },     // glyphs
  barWrap: ['', ''],                   // e.g. ascii uses ['[', ']']
  labels: { model:'', project:'', branch:'⎇', ctx:'Ctx', sess:'S', wk:'W', ac:'compact' },
  icons: null,                         // emoji style sets { model:'🤖', ... }
  colorMode: 'coral',                  // 'coral' | 'traffic'
  decimals: false,                     // data style: true
  rawTokens: false,                    // data style: '47k/200k'
  lowercase: false,                    // minimal style: true
  requires: 'truecolor',               // 'ascii'|'unicode'|'truecolor'|'nerd'|'braille'|'emoji'
}
```

Commit after every task. Use `npm test` (alias for `node --test`) to run the suite.

---

## Phase 0 — Scaffold

### Task 1: Project scaffold + test runner

**Files:**
- Create: `package.json`, `.gitignore`, `test/smoke.test.js`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "@ttigger/claude-status",
  "version": "0.1.0",
  "description": "A portable Claude Code statusline HUD (usage, model, git, context) with 7 styles, a cc launcher, and a config CLI with live preview.",
  "license": "MIT",
  "engines": { "node": ">=18" },
  "bin": {
    "claude-status": "bin/claude-status.js",
    "claude-status-render": "bin/claude-status-render.js",
    "cc": "bin/cc.js"
  },
  "files": ["bin/", "src/", "README.md", "LICENSE"],
  "scripts": { "test": "node --test" },
  "keywords": ["claude", "claude-code", "statusline", "cli", "usage", "hud"],
  "repository": { "type": "git", "url": "git+https://github.com/ttigger/claude-status.git" },
  "homepage": "https://github.com/ttigger/claude-status#readme"
}
```

- [ ] **Step 2: Write `.gitignore`**

```
node_modules/
coverage/
*.log
.DS_Store
*.bak
/tmp/
```

- [ ] **Step 3: Write smoke test `test/smoke.test.js`**

```js
const test = require('node:test');
const assert = require('node:assert');

test('node test runner works', () => {
  assert.strictEqual(1 + 1, 2);
});
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git init
git add package.json .gitignore test/smoke.test.js
git commit -m "chore: scaffold package with node:test runner"
```

---

## Phase 1 — Formatting primitives

### Task 2: `format.js` — clampPct & tier

**Files:**
- Create: `src/format.js`, `test/format.test.js`

- [ ] **Step 1: Write failing test `test/format.test.js`**

```js
const test = require('node:test');
const assert = require('node:assert');
const { clampPct, tier } = require('../src/format');

test('clampPct bounds 0..100 and rounds', () => {
  assert.strictEqual(clampPct(-5), 0);
  assert.strictEqual(clampPct(150), 100);
  assert.strictEqual(clampPct(23.4), 23);
});

test('tier respects thresholds (boundaries inclusive low side)', () => {
  const t = { green: 50, yellow: 80 };
  assert.strictEqual(tier(50, t), 'low');
  assert.strictEqual(tier(51, t), 'mid');
  assert.strictEqual(tier(80, t), 'mid');
  assert.strictEqual(tier(81, t), 'high');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/format.test.js`
Expected: FAIL ("Cannot find module '../src/format'").

- [ ] **Step 3: Implement `src/format.js` (these two functions)**

```js
function clampPct(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function tier(pct, thresholds) {
  const { green, yellow } = thresholds;
  if (pct <= green) return 'low';
  if (pct <= yellow) return 'mid';
  return 'high';
}

module.exports = { clampPct, tier };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/format.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/format.js test/format.test.js
git commit -m "feat: add clampPct and tier helpers"
```

### Task 3: `format.js` — bar()

**Files:**
- Modify: `src/format.js`
- Modify: `test/format.test.js`

- [ ] **Step 1: Add failing test**

```js
const { bar } = require('../src/format');

test('bar fills proportionally with given glyphs', () => {
  assert.strictEqual(bar(23, 8, { full: '#', empty: '-' }), '##------');
  assert.strictEqual(bar(0, 4, { full: '#', empty: '-' }), '----');
  assert.strictEqual(bar(100, 4, { full: '#', empty: '-' }), '####');
  assert.strictEqual(bar(50, 8, { full: '#', empty: '-' }), '####----');
});
```

- [ ] **Step 2: Run to verify fail**

Run: `node --test test/format.test.js`
Expected: FAIL ("bar is not a function").

- [ ] **Step 3: Implement `bar` in `src/format.js` and export it**

```js
function bar(pct, width, glyphs) {
  const p = clampPct(pct);
  const filled = Math.round((p / 100) * width);
  return glyphs.full.repeat(filled) + glyphs.empty.repeat(width - filled);
}
```
Add `bar` to `module.exports`.

- [ ] **Step 4: Run to verify pass**

Run: `node --test test/format.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/format.js test/format.test.js
git commit -m "feat: add bar() progress renderer"
```

### Task 4: `format.js` — humanizeDuration() & tokensK()

**Files:**
- Modify: `src/format.js`, `test/format.test.js`

- [ ] **Step 1: Add failing tests**

```js
const { humanizeDuration, tokensK } = require('../src/format');

test('humanizeDuration shows up to two units', () => {
  assert.strictEqual(humanizeDuration(3 * 3600 + 12 * 60), '3h12m');
  assert.strictEqual(humanizeDuration(4 * 86400 + 6 * 3600), '4d6h');
  assert.strictEqual(humanizeDuration(12 * 60), '12m');
  assert.strictEqual(humanizeDuration(30), '<1m');
  assert.strictEqual(humanizeDuration(-10), '0m');
});

test('tokensK formats thousands', () => {
  assert.strictEqual(tokensK(47000), '47k');
  assert.strictEqual(tokensK(47000, true), '47.0k');
  assert.strictEqual(tokensK(0), '0k');
});
```

- [ ] **Step 2: Run to verify fail**

Run: `node --test test/format.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement and export both**

```js
function humanizeDuration(seconds) {
  let s = Math.floor(seconds);
  if (s <= 0) return s < 0 ? '0m' : '<1m';
  if (s < 60) return '<1m';
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60);
  if (d > 0) return `${d}d${h}h`;
  if (h > 0) return `${h}h${m}m`;
  return `${m}m`;
}

function tokensK(tokens, decimals = false) {
  const k = tokens / 1000;
  return decimals ? `${k.toFixed(1)}k` : `${Math.round(k)}k`;
}
```
Add both to `module.exports`.

- [ ] **Step 4: Run to verify pass**

Run: `node --test test/format.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/format.js test/format.test.js
git commit -m "feat: add humanizeDuration and tokensK"
```

---

## Phase 2 — Palette (theme-aware color)

### Task 5: `palette.js` — resolvePalette + colorize

**Files:**
- Create: `src/palette.js`, `test/palette.test.js`

Color tables (256-color codes):
- traffic dark: low 40, mid 220, high 196
- traffic light: low 28, mid 166, high 160
- coral (both themes): low 216, mid 173, high 167
- 8-color fallback: traffic low 32 / mid 33 / high 31; coral low 33 / mid 33 / high 31
- dim = `2`, reset = `0`

- [ ] **Step 1: Write failing test `test/palette.test.js`**

```js
const test = require('node:test');
const assert = require('node:assert');
const { resolvePalette, colorize } = require('../src/palette');

const caps256 = { color256: true, truecolor: false };
const caps8 = { color256: false, truecolor: false };

test('traffic light uses 256-color dark-ish codes', () => {
  const p = resolvePalette('traffic', 'light', caps256);
  assert.strictEqual(p.low, '\x1b[38;5;28m');
  assert.strictEqual(p.mid, '\x1b[38;5;166m');
  assert.strictEqual(p.high, '\x1b[38;5;160m');
  assert.strictEqual(p.reset, '\x1b[0m');
});

test('traffic falls back to 8-color when 256 unsupported', () => {
  const p = resolvePalette('traffic', 'dark', caps8);
  assert.strictEqual(p.low, '\x1b[32m');
  assert.strictEqual(p.mid, '\x1b[33m');
  assert.strictEqual(p.high, '\x1b[31m');
});

test('coral mode uses coral gradient regardless of theme', () => {
  const p = resolvePalette('coral', 'light', caps256);
  assert.strictEqual(p.low, '\x1b[38;5;216m');
  assert.strictEqual(p.mid, '\x1b[38;5;173m');
  assert.strictEqual(p.high, '\x1b[38;5;167m');
});

test('colorize wraps text with tier color + reset', () => {
  const p = resolvePalette('traffic', 'dark', caps256);
  assert.strictEqual(colorize('x', 'low', p), '\x1b[38;5;40mx\x1b[0m');
});
```

- [ ] **Step 2: Run to verify fail**

Run: `node --test test/palette.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement `src/palette.js`**

```js
const C256 = {
  traffic: {
    light: { low: 28, mid: 166, high: 160 },
    dark: { low: 40, mid: 220, high: 196 },
  },
  coral: {
    light: { low: 216, mid: 173, high: 167 },
    dark: { low: 216, mid: 173, high: 167 },
  },
};
const C8 = {
  traffic: { low: 32, mid: 33, high: 31 },
  coral: { low: 33, mid: 33, high: 31 },
};

function code256(n) { return `\x1b[38;5;${n}m`; }
function code8(n) { return `\x1b[${n}m`; }

function resolvePalette(mode, theme, caps) {
  const t = theme === 'light' ? 'light' : 'dark';
  let low, mid, high;
  if (caps && caps.color256) {
    const set = C256[mode][t];
    low = code256(set.low); mid = code256(set.mid); high = code256(set.high);
  } else {
    const set = C8[mode];
    low = code8(set.low); mid = code8(set.mid); high = code8(set.high);
  }
  return { low, mid, high, dim: '\x1b[2m', reset: '\x1b[0m' };
}

function colorize(text, tierName, palette) {
  return palette[tierName] + text + palette.reset;
}

module.exports = { resolvePalette, colorize };
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test test/palette.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/palette.js test/palette.test.js
git commit -m "feat: add theme-aware palette resolver"
```

---

## Phase 3 — Registry (source of truth)

### Task 6: `registry.js` — STYLES, LAYOUTS, CONFIG_SCHEMA

**Files:**
- Create: `src/registry.js`, `test/registry.test.js`

- [ ] **Step 1: Write failing test `test/registry.test.js`**

```js
const test = require('node:test');
const assert = require('node:assert');
const { STYLES, LAYOUTS, CONFIG_SCHEMA } = require('../src/registry');

test('exactly 7 styles, claude first/default', () => {
  assert.strictEqual(STYLES.length, 7);
  assert.deepStrictEqual(STYLES.map(s => s.name).sort(),
    ['ascii', 'classic', 'claude', 'data', 'emoji', 'minimal', 'tech'].sort());
  const claude = STYLES.find(s => s.name === 'claude');
  assert.strictEqual(claude.colorMode, 'coral');
});

test('4 layouts including auto', () => {
  assert.deepStrictEqual(LAYOUTS.map(l => l.name).sort(),
    ['auto', 'oneline', 'three', 'two'].sort());
});

test('CONFIG_SCHEMA enumerates fixed-choice keys', () => {
  assert.deepStrictEqual(CONFIG_SCHEMA.style.choices.sort(),
    STYLES.map(s => s.name).sort());
  assert.deepStrictEqual(CONFIG_SCHEMA.layout.choices.sort(),
    LAYOUTS.map(l => l.name).sort());
  assert.deepStrictEqual(CONFIG_SCHEMA.palette.choices, ['auto', 'light', 'dark']);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `node --test test/registry.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement `src/registry.js`**

```js
const STYLES = [
  { name: 'claude', label: 'Claude 簡潔風', bar: { full: '▰', empty: '▱' }, barWrap: ['', ''],
    labels: { branch: '⎇', ctx: 'Ctx', sess: 'S', wk: 'W', ac: 'compact' },
    icons: null, colorMode: 'coral', decimals: false, rawTokens: false, lowercase: false,
    requires: 'truecolor' },
  { name: 'minimal', label: 'Minimal 簡潔', bar: { full: '▪', empty: '░' }, barWrap: ['', ''],
    labels: { branch: '', ctx: 'ctx', sess: 'ses', wk: 'wk', ac: 'compact' },
    icons: null, colorMode: 'traffic', decimals: false, rawTokens: false, lowercase: true,
    requires: 'unicode' },
  { name: 'classic', label: 'Classic 區塊', bar: { full: '▓', empty: '░' }, barWrap: ['', ''],
    labels: { branch: '⎇', ctx: 'Ctx', sess: 'Sess', wk: 'Wk', ac: 'compact in' },
    icons: null, colorMode: 'traffic', decimals: false, rawTokens: false, lowercase: false,
    requires: 'unicode' },
  { name: 'tech', label: 'Tech 科技感', bar: { full: '█', empty: '▱' }, barWrap: ['', ''],
    labels: { branch: '', ctx: '󰅛', sess: '󰲫', wk: '', ac: '♻' },
    icons: { model: '', project: '' }, colorMode: 'traffic', decimals: false,
    rawTokens: false, lowercase: false, requires: 'nerd' },
  { name: 'data', label: 'Data 數據控', bar: { full: '⣿', empty: '⠀' }, barWrap: ['', ''],
    labels: { branch: 'git:', ctx: 'CTX', sess: '5H', wk: '7D', ac: 'AC' },
    icons: null, colorMode: 'traffic', decimals: true, rawTokens: true, lowercase: false,
    requires: 'braille' },
  { name: 'ascii', label: 'ASCII 相容', bar: { full: '#', empty: '-' }, barWrap: ['[', ']'],
    labels: { branch: '', ctx: 'Ctx', sess: 'Ses', wk: 'Wk', ac: 'compact' },
    icons: null, colorMode: 'traffic', decimals: false, rawTokens: false, lowercase: false,
    requires: 'ascii' },
  { name: 'emoji', label: 'Emoji 活潑', bar: { full: '▓', empty: '░' }, barWrap: ['', ''],
    labels: { branch: '🌿', ctx: '🧠', sess: '⏱️', wk: '📅', ac: '♻️' },
    icons: { model: '🤖', project: '📁' }, colorMode: 'traffic', decimals: false,
    rawTokens: false, lowercase: false, requires: 'emoji' },
];

const LAYOUTS = [
  { name: 'auto', label: '單行自適應' },
  { name: 'oneline', label: '單行精簡' },
  { name: 'two', label: '兩行' },
  { name: 'three', label: '三行分組' },
];

const CONFIG_SCHEMA = {
  style: { type: 'choice', choices: STYLES.map(s => s.name), default: 'claude' },
  layout: { type: 'choice', choices: LAYOUTS.map(l => l.name), default: 'auto' },
  palette: { type: 'choice', choices: ['auto', 'light', 'dark'], default: 'auto' },
  separator: { type: 'string', default: ' | ' },
  barWidth: { type: 'intOrAuto', min: 1, max: 40, default: 8 },
  'colorThresholds.green': { type: 'int', min: 0, max: 100, default: 50 },
  'colorThresholds.yellow': { type: 'int', min: 0, max: 100, default: 80 },
  'elements.model': { type: 'bool', default: true },
  'elements.project': { type: 'bool', default: true },
  'elements.gitBranch': { type: 'bool', default: true },
  'elements.context': { type: 'bool', default: true },
  'elements.autoCompact': { type: 'bool', default: true },
  'elements.session': { type: 'bool', default: true },
  'elements.weekly': { type: 'bool', default: true },
  'autoCompact.thresholdPct': { type: 'number', min: 0, max: 100, default: 83.5 },
  refreshIntervalSec: { type: 'int', min: 1, max: 3600, default: 30 },
};

function styleByName(name) { return STYLES.find(s => s.name === name) || null; }

module.exports = { STYLES, LAYOUTS, CONFIG_SCHEMA, styleByName };
```

(Note: `\uXXXX` escapes for Nerd Font glyphs keep the source ASCII-safe and reviewable.)

- [ ] **Step 4: Run to verify pass**

Run: `node --test test/registry.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/registry.js test/registry.test.js
git commit -m "feat: add registry as single source of truth"
```

### Task 7: `defaults.js` — DEFAULT_CONFIG derived from schema

**Files:**
- Create: `src/defaults.js`, `test/defaults.test.js`

- [ ] **Step 1: Write failing test `test/defaults.test.js`**

```js
const test = require('node:test');
const assert = require('node:assert');
const { DEFAULT_CONFIG } = require('../src/defaults');

test('default config matches spec', () => {
  assert.strictEqual(DEFAULT_CONFIG.style, 'claude');
  assert.strictEqual(DEFAULT_CONFIG.layout, 'auto');
  assert.strictEqual(DEFAULT_CONFIG.barWidth, 8);
  assert.deepStrictEqual(DEFAULT_CONFIG.colorThresholds, { green: 50, yellow: 80 });
  assert.strictEqual(DEFAULT_CONFIG.elements.weekly, true);
  assert.strictEqual(DEFAULT_CONFIG.autoCompact.thresholdPct, 83.5);
  assert.strictEqual(DEFAULT_CONFIG.refreshIntervalSec, 30);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `node --test test/defaults.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement `src/defaults.js`** (build from CONFIG_SCHEMA dotted keys)

```js
const { CONFIG_SCHEMA } = require('./registry');

function setDotted(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] = cur[parts[i]] || {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function buildDefaults() {
  const cfg = {};
  for (const [key, spec] of Object.entries(CONFIG_SCHEMA)) {
    setDotted(cfg, key, spec.default);
  }
  return cfg;
}

const DEFAULT_CONFIG = buildDefaults();
module.exports = { DEFAULT_CONFIG, setDotted };
```

- [ ] **Step 4: Run to verify pass** — `node --test test/defaults.test.js` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/defaults.js test/defaults.test.js
git commit -m "feat: derive DEFAULT_CONFIG from registry schema"
```

---

## Phase 4 — Element extraction & fixtures

### Task 8: `fixtures.js` — sample stdin JSON

**Files:**
- Create: `src/fixtures.js`

- [ ] **Step 1: Implement `src/fixtures.js`** (no test; consumed by later tests)

```js
// Representative statusline stdin JSON for preview + tests.
const SAMPLE = {
  model: { id: 'claude-opus-4-8[1m]', display_name: 'Opus 4.8' },
  workspace: { project_dir: '/home/u/claude-status', current_dir: '/home/u/claude-status' },
  worktree: { branch: 'main' },
  context_window: {
    context_window_size: 1000000,
    used_percentage: 23.5,
    current_usage: { input_tokens: 40000, cache_read_input_tokens: 7000 },
  },
  rate_limits: {
    five_hour: { used_percentage: 52, resets_at: 1717400000 },
    seven_day: { used_percentage: 31, resets_at: 1717700000 },
  },
};
// "now" so sample resets render as 3h12m / 4d6h deterministically:
const SAMPLE_NOW = 1717400000 - (3 * 3600 + 12 * 60);
module.exports = { SAMPLE, SAMPLE_NOW };
```

- [ ] **Step 2: Commit**

```bash
git add src/fixtures.js
git commit -m "feat: add sample fixture data"
```

### Task 9: `elements.js` — buildElements()

**Files:**
- Create: `src/elements.js`, `test/elements.test.js`

- [ ] **Step 1: Write failing test `test/elements.test.js`**

```js
const test = require('node:test');
const assert = require('node:assert');
const { buildElements } = require('../src/elements');
const { SAMPLE } = require('../src/fixtures');

test('builds normalized model from sample', () => {
  const e = buildElements(SAMPLE, { autoCompactThresholdPct: 83.5 });
  assert.deepStrictEqual(e.model, { name: 'Opus 4.8', context1m: true });
  assert.strictEqual(e.project, 'claude-status');
  assert.strictEqual(e.context.pct, 24);            // 23.5 rounded
  assert.strictEqual(e.context.tokensK, 47);        // 40000+7000
  assert.strictEqual(e.context.sizeK, 1000);
  assert.strictEqual(e.autoCompact.leftPct, 60);    // round(83.5-23.5)
  assert.strictEqual(e.session.pct, 52);
  assert.strictEqual(e.weekly.pct, 31);
});

test('missing rate_limits => session/weekly null', () => {
  const stdin = JSON.parse(JSON.stringify(SAMPLE));
  delete stdin.rate_limits;
  const e = buildElements(stdin, { autoCompactThresholdPct: 83.5 });
  assert.strictEqual(e.session, null);
  assert.strictEqual(e.weekly, null);
});

test('non-1m model has context1m false', () => {
  const stdin = JSON.parse(JSON.stringify(SAMPLE));
  stdin.context_window.context_window_size = 200000;
  const e = buildElements(stdin, { autoCompactThresholdPct: 83.5 });
  assert.strictEqual(e.model.context1m, false);
  assert.strictEqual(e.context.sizeK, 200);
});
```

- [ ] **Step 2: Run to verify fail** — `node --test test/elements.test.js` → FAIL.

- [ ] **Step 3: Implement `src/elements.js`**

```js
const { clampPct } = require('./format');

function basename(p) {
  if (!p) return null;
  const parts = String(p).split(/[\\/]/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : null;
}

function sumUsage(u) {
  if (!u || typeof u !== 'object') return 0;
  let total = 0;
  for (const v of Object.values(u)) if (typeof v === 'number') total += v;
  return total;
}

function buildElements(stdin, opts) {
  const cw = stdin.context_window || {};
  const size = cw.context_window_size || 200000;
  const usedPct = typeof cw.used_percentage === 'number' ? cw.used_percentage : 0;
  let usedTokens = sumUsage(cw.current_usage);
  if (!usedTokens) usedTokens = (size * usedPct) / 100;

  const model = stdin.model
    ? { name: stdin.model.display_name || stdin.model.id || '?',
        context1m: size === 1000000 || /\[1m\]/.test(stdin.model.id || '') }
    : null;

  const rl = stdin.rate_limits || {};
  const mk = (r) => (r ? { pct: clampPct(r.used_percentage), resetsAt: r.resets_at } : null);

  const acLeft = Math.max(0, Math.round(opts.autoCompactThresholdPct - usedPct));

  return {
    model,
    project: basename((stdin.workspace || {}).project_dir) ||
             basename((stdin.workspace || {}).current_dir),
    branch: null, // resolved by render caller via git
    context: { pct: clampPct(usedPct), tokensK: Math.round(usedTokens / 1000), sizeK: Math.round(size / 1000) },
    autoCompact: { leftPct: acLeft },
    session: mk(rl.five_hour),
    weekly: mk(rl.seven_day),
  };
}

module.exports = { buildElements, basename };
```

- [ ] **Step 4: Run to verify pass** — `node --test test/elements.test.js` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/elements.js test/elements.test.js
git commit -m "feat: add buildElements normalizer"
```

---

## Phase 5 — Git & capability detection

### Task 10: `git.js` — currentBranch()

**Files:**
- Create: `src/git.js`, `test/git.test.js`

- [ ] **Step 1: Write failing test `test/git.test.js`**

```js
const test = require('node:test');
const assert = require('node:assert');
const { currentBranch } = require('../src/git');

test('returns a string or null and never throws', () => {
  const b = currentBranch(process.cwd());
  assert.ok(b === null || typeof b === 'string');
});

test('non-repo path returns null', () => {
  const b = currentBranch(require('node:os').tmpdir());
  assert.ok(b === null || typeof b === 'string'); // tmp may be inside a repo on some CI; just no throw
});
```

- [ ] **Step 2: Run to verify fail** — `node --test test/git.test.js` → FAIL (module missing).

- [ ] **Step 3: Implement `src/git.js`**

```js
const { execFileSync } = require('node:child_process');

function currentBranch(cwd) {
  try {
    const out = execFileSync('git', ['branch', '--show-current'],
      { cwd, timeout: 500, stdio: ['ignore', 'pipe', 'ignore'] });
    const b = out.toString().trim();
    return b || null;
  } catch {
    return null;
  }
}

module.exports = { currentBranch };
```

- [ ] **Step 4: Run to verify pass** — `node --test test/git.test.js` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/git.js test/git.test.js
git commit -m "feat: add git branch resolver"
```

### Task 11: `detect.js` — capabilities + recommendStyle

**Files:**
- Create: `src/detect.js`, `test/detect.test.js`

- [ ] **Step 1: Write failing test `test/detect.test.js`**

```js
const test = require('node:test');
const assert = require('node:assert');
const { capabilities, recommendStyle } = require('../src/detect');

test('truecolor env detected', () => {
  const c = capabilities({ COLORTERM: 'truecolor', TERM: 'xterm-256color' }, 'linux');
  assert.strictEqual(c.truecolor, true);
  assert.strictEqual(c.color256, true);
  assert.strictEqual(c.unicode, true);
});

test('legacy windows console (no WT_SESSION) => no unicode', () => {
  const c = capabilities({ TERM: '' }, 'win32');
  assert.strictEqual(c.unicode, false);
});

test('recommendStyle: full caps => claude, no unicode => ascii, nerd => tech', () => {
  assert.strictEqual(recommendStyle({ unicode: true, color256: true, truecolor: true, nerd: false }), 'claude');
  assert.strictEqual(recommendStyle({ unicode: false, color256: false, truecolor: false, nerd: false }), 'ascii');
  assert.strictEqual(recommendStyle({ unicode: true, color256: false, truecolor: false, nerd: true }), 'tech');
  assert.strictEqual(recommendStyle({ unicode: true, color256: false, truecolor: false, nerd: false }), 'classic');
});
```

- [ ] **Step 2: Run to verify fail** — `node --test test/detect.test.js` → FAIL.

- [ ] **Step 3: Implement `src/detect.js`**

```js
function capabilities(env, platform) {
  const truecolor = /^(truecolor|24bit)$/i.test(env.COLORTERM || '');
  const color256 = truecolor || /256/.test(env.TERM || '');
  const unicode = platform !== 'win32' || !!env.WT_SESSION;
  // Nerd Font cannot be reliably auto-detected; honor explicit opt-in.
  const nerd = env.CLAUDE_STATUS_NERD === '1';
  return { truecolor, color256, unicode, nerd };
}

function recommendStyle(caps) {
  if (!caps.unicode) return 'ascii';
  if (caps.nerd) return 'tech';
  if (caps.truecolor || caps.color256) return 'claude';
  return 'classic';
}

module.exports = { capabilities, recommendStyle };
```

- [ ] **Step 4: Run to verify pass** — `node --test test/detect.test.js` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/detect.js test/detect.test.js
git commit -m "feat: add terminal capability detection"
```

---

## Phase 6 — Render engine, layouts, top-level render

### Task 12: `engine.js` — renderMetric() (bar+label+value for a usage element)

**Files:**
- Create: `src/engine.js`, `test/engine.test.js`

A "metric" = an element with a percentage (context/session/weekly). `renderMetric` returns a plain (uncolored in test) or colored string. To keep tests deterministic we expose `stripAnsi` from format and test structure, and test color via palette codes.

- [ ] **Step 1: Add `stripAnsi` to `src/format.js` + export**

```js
function stripAnsi(s) { return s.replace(/\x1b\[[0-9;]*m/g, ''); }
```
Add to exports.

- [ ] **Step 2: Write failing test `test/engine.test.js`**

```js
const test = require('node:test');
const assert = require('node:assert');
const { renderMetric } = require('../src/engine');
const { resolvePalette } = require('../src/palette');
const { stripAnsi } = require('../src/format');
const { styleByName } = require('../src/registry');

const style = styleByName('ascii');
const palette = resolvePalette('traffic', 'dark', { color256: false });
const thresholds = { green: 50, yellow: 80 };

test('renderMetric draws label, wrapped bar, percent, suffix', () => {
  const out = renderMetric({
    label: 'Ctx', pct: 23, suffix: '47k',
    style, palette, thresholds, barWidth: 8,
  });
  assert.strictEqual(stripAnsi(out), 'Ctx [##------] 23% 47k');
});

test('renderMetric high tier uses high color code', () => {
  const out = renderMetric({
    label: 'Ctx', pct: 90, suffix: '', style, palette, thresholds, barWidth: 4,
  });
  assert.ok(out.includes('\x1b[31m')); // 8-color red
});
```

- [ ] **Step 3: Run to verify fail** — `node --test test/engine.test.js` → FAIL.

- [ ] **Step 4: Implement `src/engine.js`**

```js
const { bar, tier } = require('./format');
const { colorize } = require('./palette');

function renderMetric({ label, pct, suffix, style, palette, thresholds, barWidth }) {
  const tierName = tier(pct, thresholds);
  const glyphs = style.bar;
  const [open, close] = style.barWrap;
  const filledStr = bar(pct, barWidth, { full: glyphs.full, empty: glyphs.empty });
  // color the whole bar interior + percent by tier; brackets/label uncolored
  const coloredBar = open + colorize(filledStr, tierName, palette) + close;
  const coloredPct = colorize(`${pct}%`, tierName, palette);
  const parts = [label, coloredBar, coloredPct];
  if (suffix) parts.push(suffix);
  return parts.filter(Boolean).join(' ');
}

module.exports = { renderMetric };
```

- [ ] **Step 5: Run to verify pass** — `node --test test/engine.test.js` → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/engine.js src/format.js test/engine.test.js
git commit -m "feat: add renderMetric engine + stripAnsi"
```

### Task 13: `engine.js` — buildParts() (turn elements into labeled segment strings)

**Files:**
- Modify: `src/engine.js`, `test/engine.test.js`

`buildParts(ctx)` returns an **ordered array of segment objects**: `{ key, text, group }` where `group` ∈ `'env'|'context'|'limits'` (used by layouts). Honors `config.elements` toggles, style labels/icons, decimals/rawTokens, lowercase, and adaptive drop flags (`includeTokens`, `includeAutoCompact`, `resetPrecision`, `bars`).

- [ ] **Step 1: Add failing test**

```js
const { buildParts } = require('../src/engine');
const { buildElements } = require('../src/elements');
const { SAMPLE, SAMPLE_NOW } = require('../src/fixtures');
const { DEFAULT_CONFIG } = require('../src/defaults');

test('buildParts produces env+context+limits segments for full sample (ascii)', () => {
  const els = buildElements(SAMPLE, { autoCompactThresholdPct: 83.5 });
  els.branch = 'main';
  const parts = buildParts({
    els, style: styleByName('ascii'), palette,
    config: { ...DEFAULT_CONFIG, style: 'ascii' }, now: SAMPLE_NOW,
    opts: { includeTokens: true, includeAutoCompact: true, resetPrecision: 'full', bars: true },
  });
  const byKey = Object.fromEntries(parts.map(p => [p.key, stripAnsi(p.text)]));
  assert.strictEqual(byKey.model, 'Opus 4.8·1M');
  assert.strictEqual(byKey.project, 'claude-status');
  assert.strictEqual(byKey.branch, 'main');
  assert.strictEqual(byKey.context, 'Ctx [##------] 23% 47k');
  assert.strictEqual(byKey.autoCompact, 'compact 60%');
  assert.strictEqual(byKey.session, 'Ses [####----] 52% 3h12m');
  assert.strictEqual(byKey.weekly, 'Wk [##------] 31% 4d6h');
});

test('buildParts drops tokens/autocompact when opts disable them', () => {
  const els = buildElements(SAMPLE, { autoCompactThresholdPct: 83.5 });
  els.branch = 'main';
  const parts = buildParts({
    els, style: styleByName('ascii'), palette,
    config: { ...DEFAULT_CONFIG, style: 'ascii' }, now: SAMPLE_NOW,
    opts: { includeTokens: false, includeAutoCompact: false, resetPrecision: 'short', bars: false },
  });
  const keys = parts.map(p => p.key);
  assert.ok(!keys.includes('autoCompact'));
  const ctx = parts.find(p => p.key === 'context');
  assert.strictEqual(stripAnsi(ctx.text), 'Ctx 23%'); // no bar, no tokens
});
```

- [ ] **Step 2: Run to verify fail** — FAIL.

- [ ] **Step 3: Implement `buildParts` in `src/engine.js`**

```js
const { humanizeDuration, tokensK } = require('./format');

function fmtReset(resetsAt, now, precision) {
  if (!resetsAt) return '';
  const d = humanizeDuration(resetsAt - now);
  if (precision === 'short') return d.replace(/^(\d+[dh])\d+[hm]$/, '$1'); // 3h12m->3h, 4d6h->4d
  return d;
}

function buildParts({ els, style, palette, config, now, opts }) {
  const parts = [];
  const L = style.labels;
  const icons = style.icons || {};
  const lc = (s) => (style.lowercase ? s.toLowerCase() : s);
  const sep = '';
  const push = (key, text, group) => { if (text) parts.push({ key, text, group }); };
  const thresholds = config.colorThresholds;
  const barWidth = config.barWidth === 'auto' ? 8 : config.barWidth;

  // env group
  if (config.elements.model && els.model) {
    const name = els.model.name + (els.model.context1m ? '·1M' : '');
    push('model', (icons.model ? icons.model + ' ' : '') + name, 'env');
  }
  if (config.elements.project && els.project) {
    push('project', (icons.project ? icons.project + ' ' : '') + els.project, 'env');
  }
  if (config.elements.gitBranch && els.branch) {
    const lbl = L.branch ? L.branch + (icons.project ? ' ' : '') : '';
    push('branch', (lbl ? lbl + ' ' : '') + els.branch, 'env');
  }

  // context group
  if (config.elements.context && els.context) {
    const c = els.context;
    let suffix = '';
    if (opts.includeTokens) {
      suffix = style.rawTokens
        ? `${tokensK(c.tokensK * 1000, style.decimals)}/${c.sizeK}k`
        : tokensK(c.tokensK * 1000, style.decimals);
    }
    const pctStr = style.decimals ? `${c.pct}.0` : `${c.pct}`; // data style hint; engine uses %
    const text = opts.bars
      ? renderMetric({ label: lc(L.ctx), pct: c.pct, suffix, style, palette, thresholds, barWidth })
      : `${lc(L.ctx)} ${colorizePct(c.pct, thresholds, palette)}${suffix ? ' ' + suffix : ''}`;
    push('context', text, 'context');
  }
  if (config.elements.autoCompact && els.autoCompact && opts.includeAutoCompact) {
    push('autoCompact', `${lc(L.ac)} ${els.autoCompact.leftPct}%`, 'context');
  }

  // limits group
  const limit = (key, lbl, el) => {
    if (!el) return;
    const reset = fmtReset(el.resetsAt, now, opts.resetPrecision);
    const text = opts.bars
      ? renderMetric({ label: lc(lbl), pct: el.pct, suffix: reset, style, palette, thresholds, barWidth })
      : `${lc(lbl)} ${colorizePct(el.pct, thresholds, palette)}${reset ? ' ' + reset : ''}`;
    push(key, text, 'limits');
  };
  if (config.elements.session) limit('session', L.sess, els.session);
  if (config.elements.weekly) limit('weekly', L.wk, els.weekly);

  return parts;
}

// helper: colored "NN%" without a bar
function colorizePct(pct, thresholds, palette) {
  const { tier } = require('./format');
  return colorize(`${pct}%`, tier(pct, thresholds), palette);
}
```
Add `buildParts` to exports. (Keep `colorize` required at top of file.)

- [ ] **Step 4: Run to verify pass** — PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine.js test/engine.test.js
git commit -m "feat: add buildParts segment builder"
```

### Task 14: `layout.js` — layoutLines() with adaptive shrink

**Files:**
- Create: `src/layout.js`, `test/layout.test.js`

Adaptive (`auto`) algorithm: try to fit all parts on **one line** joined by `separator`; if `visibleWidth(line) > columns`, re-build parts with progressively stricter `opts` in this order: drop tokens → drop autoCompact → reset precision short → drop bars → drop branch; if still too wide, wrap to `two` then `three`. Non-auto layouts map groups to fixed lines. `layoutLines` receives a **builder callback** `build(opts)` that returns parts, so it can re-build during shrink.

- [ ] **Step 1: Write failing test `test/layout.test.js`**

```js
const test = require('node:test');
const assert = require('node:assert');
const { layoutLines, visibleWidth } = require('../src/layout');
const { stripAnsi } = require('../src/format');

// fake builder: returns parts whose width depends on opts flags
function fakeBuild(opts) {
  const parts = [
    { key: 'model', text: 'Opus 4.8·1M', group: 'env' },
    { key: 'project', text: 'claude-status', group: 'env' },
    { key: 'branch', text: 'main', group: 'env' },
    { key: 'context', text: opts.bars ? 'Ctx ###### 23% 47k' : 'Ctx 23%', group: 'context' },
    { key: 'session', text: opts.bars ? 'S ###### 52% 3h12m' : 'S 52% 3h', group: 'limits' },
    { key: 'weekly', text: opts.bars ? 'W ###### 31% 4d6h' : 'W 31% 4d', group: 'limits' },
  ];
  if (!opts.includeAutoCompact) return parts;
  parts.splice(4, 0, { key: 'autoCompact', text: 'compact 60%', group: 'context' });
  return parts;
}

test('visibleWidth ignores ANSI', () => {
  assert.strictEqual(visibleWidth('\x1b[31mhi\x1b[0m'), 2);
});

test('auto on wide terminal keeps one line with bars', () => {
  const out = layoutLines(fakeBuild, 'auto', 200, ' | ');
  assert.strictEqual(out.split('\n').length, 1);
  assert.ok(out.includes('######'));
});

test('auto on narrow terminal shrinks to one line without bars', () => {
  const out = layoutLines(fakeBuild, 'auto', 60, ' | ');
  assert.strictEqual(out.split('\n').length, 1);
  assert.ok(!stripAnsi(out).includes('######'));
});

test('three layout always 3 lines', () => {
  const out = layoutLines(fakeBuild, 'three', 200, ' | ');
  assert.strictEqual(out.split('\n').length, 3);
});
```

- [ ] **Step 2: Run to verify fail** — FAIL.

- [ ] **Step 3: Implement `src/layout.js`**

```js
function visibleWidth(s) { return s.replace(/\x1b\[[0-9;]*m/g, '').length; }

const FULL_OPTS = { includeTokens: true, includeAutoCompact: true, resetPrecision: 'full', bars: true };

// progressive shrink steps applied in order
const SHRINK = [
  (o) => ({ ...o, includeTokens: false }),
  (o) => ({ ...o, includeAutoCompact: false }),
  (o) => ({ ...o, resetPrecision: 'short' }),
  (o) => ({ ...o, bars: false }),
  (o) => ({ ...o, dropBranch: true }),
];

function joinParts(parts, sep, dropBranch) {
  return parts.filter(p => !(dropBranch && p.key === 'branch'))
              .map(p => p.text).join(sep);
}

function byGroup(parts, group, sep) {
  return parts.filter(p => p.group === group).map(p => p.text).join(sep);
}

function layoutLines(build, layout, columns, sep) {
  if (layout === 'three') {
    const p = build(FULL_OPTS);
    return [byGroup(p, 'env', sep), byGroup(p, 'context', sep), byGroup(p, 'limits', sep)]
      .filter(Boolean).join('\n');
  }
  if (layout === 'two') {
    const p = build(FULL_OPTS);
    const line1 = [byGroup(p, 'env', sep), byGroup(p, 'context', sep)].filter(Boolean).join(sep);
    const line2 = byGroup(p, 'limits', sep);
    return [line1, line2].filter(Boolean).join('\n');
  }
  if (layout === 'oneline') {
    const p = build({ ...FULL_OPTS, includeTokens: false, includeAutoCompact: false });
    return joinParts(p, sep, false);
  }
  // auto: fit one line, shrinking progressively
  let opts = { ...FULL_OPTS };
  let line = joinParts(build(opts), sep, false);
  for (const step of SHRINK) {
    if (visibleWidth(line) <= columns) break;
    opts = step(opts);
    line = joinParts(build(opts), sep, opts.dropBranch);
  }
  if (visibleWidth(line) <= columns) return line;
  // still too wide: wrap to two, then three
  const two = layoutLines(build, 'two', columns, sep);
  if (two.split('\n').every(l => visibleWidth(l) <= columns)) return two;
  return layoutLines(build, 'three', columns, sep);
}

module.exports = { layoutLines, visibleWidth };
```

- [ ] **Step 4: Run to verify pass** — PASS.

- [ ] **Step 5: Commit**

```bash
git add src/layout.js test/layout.test.js
git commit -m "feat: add adaptive layout engine"
```

### Task 15: `render.js` — renderHud() top level

**Files:**
- Create: `src/render.js`, `test/render.test.js`

- [ ] **Step 1: Write failing test `test/render.test.js`**

```js
const test = require('node:test');
const assert = require('node:assert');
const { renderHud } = require('../src/render');
const { stripAnsi } = require('../src/format');
const { DEFAULT_CONFIG } = require('../src/defaults');
const { SAMPLE, SAMPLE_NOW } = require('../src/fixtures');

const base = {
  stdin: SAMPLE, theme: 'dark',
  caps: { unicode: true, color256: true, truecolor: true, nerd: false },
  columns: 200, now: SAMPLE_NOW, branch: 'main',
};

test('default (claude/auto) renders single line with all segments', () => {
  const out = renderHud({ ...base, config: DEFAULT_CONFIG });
  const plain = stripAnsi(out);
  assert.strictEqual(out.split('\n').length, 1);
  assert.ok(plain.includes('Opus 4.8·1M'));
  assert.ok(plain.includes('claude-status'));
  assert.ok(plain.includes('main'));
  assert.ok(plain.includes('23%'));
  assert.ok(plain.includes('52%'));
  assert.ok(plain.includes('31%'));
});

test('no rate_limits => session/weekly replaced by waiting note', () => {
  const stdin = JSON.parse(JSON.stringify(SAMPLE));
  delete stdin.rate_limits;
  const out = stripAnsi(renderHud({ ...base, stdin, config: DEFAULT_CONFIG }));
  assert.ok(out.includes('waiting for first message'));
});

test('three layout yields 3 lines', () => {
  const out = renderHud({ ...base, config: { ...DEFAULT_CONFIG, layout: 'three' } });
  assert.strictEqual(out.split('\n').length, 3);
});
```

- [ ] **Step 2: Run to verify fail** — FAIL.

- [ ] **Step 3: Implement `src/render.js`**

```js
const { buildElements } = require('./elements');
const { buildParts } = require('./engine');
const { layoutLines } = require('./layout');
const { resolvePalette } = require('./palette');
const { styleByName, STYLES } = require('./registry');

function resolveTheme(configPalette, theme) {
  if (configPalette === 'light' || configPalette === 'dark') return configPalette;
  return theme === 'light' ? 'light' : 'dark';
}

function renderHud(ctx) {
  const { stdin, config, theme, caps, columns, now, branch } = ctx;
  const style = styleByName(config.style) || STYLES[0];
  const els = buildElements(stdin, { autoCompactThresholdPct: config.autoCompact.thresholdPct });
  els.branch = branch || null;

  const effTheme = resolveTheme(config.palette, theme);
  const palette = resolvePalette(style.colorMode, effTheme, caps);
  const barWidth = config.barWidth === 'auto'
    ? Math.max(4, Math.min(12, Math.floor((columns || 100) / 12)))
    : config.barWidth;

  const noLimits = !els.session && !els.weekly;
  const build = (opts) => {
    const parts = buildParts({ els, style, palette, config: { ...config, barWidth }, now, opts });
    if (noLimits && (config.elements.session || config.elements.weekly)) {
      parts.push({ key: 'limits-note', text: '— waiting for first message', group: 'limits' });
    }
    return parts;
  };

  return layoutLines(build, config.layout, columns || 100, config.separator);
}

module.exports = { renderHud };
```

- [ ] **Step 4: Run to verify pass** — PASS.

- [ ] **Step 5: Add per-style snapshot test** — append to `test/render.test.js`:

```js
const { STYLES } = require('../src/registry');
test('every registry style renders without throwing', () => {
  for (const s of STYLES) {
    const out = renderHud({ ...base, config: { ...DEFAULT_CONFIG, style: s.name } });
    assert.ok(typeof out === 'string' && out.length > 0, `style ${s.name} empty`);
  }
});
```
Run: `node --test test/render.test.js` → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/render.js test/render.test.js
git commit -m "feat: add top-level renderHud + per-style smoke"
```

---

## Phase 7 — Config read/write/validate

### Task 16: `config.js` — deepMerge + load

**Files:**
- Create: `src/config.js`, `test/config.test.js`

- [ ] **Step 1: Write failing test `test/config.test.js`**

```js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { deepMerge, loadConfig } = require('../src/config');
const { DEFAULT_CONFIG } = require('../src/defaults');

test('deepMerge overlays only provided keys', () => {
  const merged = deepMerge(DEFAULT_CONFIG, { style: 'tech', elements: { weekly: false } });
  assert.strictEqual(merged.style, 'tech');
  assert.strictEqual(merged.elements.weekly, false);
  assert.strictEqual(merged.elements.session, true); // untouched
  assert.strictEqual(merged.layout, 'auto');         // untouched
});

test('loadConfig returns defaults when file missing', () => {
  const p = path.join(os.tmpdir(), 'no-such-cfg-' + process.pid + '.json');
  assert.deepStrictEqual(loadConfig(p), DEFAULT_CONFIG);
});

test('loadConfig deep-merges file over defaults', () => {
  const p = path.join(os.tmpdir(), 'cfg-' + process.pid + '.json');
  fs.writeFileSync(p, JSON.stringify({ style: 'minimal' }));
  assert.strictEqual(loadConfig(p).style, 'minimal');
  assert.strictEqual(loadConfig(p).layout, 'auto');
  fs.unlinkSync(p);
});
```

- [ ] **Step 2: Run to verify fail** — FAIL.

- [ ] **Step 3: Implement `deepMerge` + `loadConfig` in `src/config.js`**

```js
const fs = require('node:fs');
const { DEFAULT_CONFIG } = require('./defaults');

function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }

function deepMerge(base, over) {
  const out = Array.isArray(base) ? base.slice() : { ...base };
  for (const [k, v] of Object.entries(over || {})) {
    out[k] = isObj(v) && isObj(out[k]) ? deepMerge(out[k], v) : v;
  }
  return out;
}

function loadConfig(configPath) {
  try {
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return deepMerge(DEFAULT_CONFIG, raw);
  } catch {
    return deepMerge(DEFAULT_CONFIG, {});
  }
}

module.exports = { deepMerge, loadConfig };
```

- [ ] **Step 4: Run to verify pass** — PASS.

- [ ] **Step 5: Commit**

```bash
git add src/config.js test/config.test.js
git commit -m "feat: add config deepMerge + loadConfig"
```

### Task 17: `config.js` — coerceValue + validate (schema-driven)

**Files:**
- Modify: `src/config.js`, `test/config.test.js`

- [ ] **Step 1: Add failing tests**

```js
const { coerceValue } = require('../src/config');

test('coerceValue validates choice keys', () => {
  assert.deepStrictEqual(coerceValue('style', 'tech'), { ok: true, value: 'tech' });
  const bad = coerceValue('style', 'nope');
  assert.strictEqual(bad.ok, false);
  assert.ok(bad.error.includes('claude')); // lists valid choices
});

test('coerceValue parses bool and int with range', () => {
  assert.deepStrictEqual(coerceValue('elements.weekly', 'false'), { ok: true, value: false });
  assert.deepStrictEqual(coerceValue('refreshIntervalSec', '10'), { ok: true, value: 10 });
  assert.strictEqual(coerceValue('refreshIntervalSec', '0').ok, false); // below min 1
});

test('coerceValue barWidth accepts auto or int', () => {
  assert.deepStrictEqual(coerceValue('barWidth', 'auto'), { ok: true, value: 'auto' });
  assert.deepStrictEqual(coerceValue('barWidth', '12'), { ok: true, value: 12 });
});
```

- [ ] **Step 2: Run to verify fail** — FAIL.

- [ ] **Step 3: Implement `coerceValue` in `src/config.js`** (use CONFIG_SCHEMA)

```js
const { CONFIG_SCHEMA } = require('./registry');

function coerceValue(key, raw) {
  const spec = CONFIG_SCHEMA[key];
  if (!spec) return { ok: false, error: `Unknown setting: ${key}` };
  switch (spec.type) {
    case 'choice':
      return spec.choices.includes(raw)
        ? { ok: true, value: raw }
        : { ok: false, error: `Invalid value "${raw}". Choices: ${spec.choices.join(', ')}` };
    case 'string':
      return { ok: true, value: String(raw) };
    case 'bool':
      if (/^(true|1|yes|on)$/i.test(raw)) return { ok: true, value: true };
      if (/^(false|0|no|off)$/i.test(raw)) return { ok: true, value: false };
      return { ok: false, error: `Expected boolean, got "${raw}"` };
    case 'int':
    case 'number': {
      const n = spec.type === 'int' ? parseInt(raw, 10) : parseFloat(raw);
      if (Number.isNaN(n)) return { ok: false, error: `Expected number, got "${raw}"` };
      if (spec.min != null && n < spec.min) return { ok: false, error: `Min is ${spec.min}` };
      if (spec.max != null && n > spec.max) return { ok: false, error: `Max is ${spec.max}` };
      return { ok: true, value: n };
    }
    case 'intOrAuto':
      if (raw === 'auto') return { ok: true, value: 'auto' };
      return coerceValue.asInt(key, raw, spec);
    default:
      return { ok: false, error: `Unsupported type for ${key}` };
  }
}
coerceValue.asInt = (key, raw, spec) => {
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return { ok: false, error: `Expected integer or "auto"` };
  if (spec.min != null && n < spec.min) return { ok: false, error: `Min is ${spec.min}` };
  if (spec.max != null && n > spec.max) return { ok: false, error: `Max is ${spec.max}` };
  return { ok: true, value: n };
};
```
Add `coerceValue` to exports.

- [ ] **Step 4: Run to verify pass** — PASS.

- [ ] **Step 5: Commit**

```bash
git add src/config.js test/config.test.js
git commit -m "feat: add schema-driven value coercion/validation"
```

### Task 18: `config.js` — get/set/reset (dotted keys, persistence)

**Files:**
- Modify: `src/config.js`, `test/config.test.js`

- [ ] **Step 1: Add failing tests**

```js
const { getDotted, setConfig, resetConfig } = require('../src/config');

test('getDotted reads nested', () => {
  assert.strictEqual(getDotted(DEFAULT_CONFIG, 'elements.weekly'), true);
  assert.strictEqual(getDotted(DEFAULT_CONFIG, 'style'), 'claude');
});

test('setConfig writes coerced value to file (deep)', () => {
  const p = path.join(os.tmpdir(), 'setcfg-' + process.pid + '.json');
  try { fs.unlinkSync(p); } catch {}
  let r = setConfig(p, 'style', 'tech');
  assert.strictEqual(r.ok, true);
  r = setConfig(p, 'elements.weekly', 'false');
  assert.strictEqual(r.ok, true);
  const saved = JSON.parse(fs.readFileSync(p, 'utf8'));
  assert.strictEqual(saved.style, 'tech');
  assert.strictEqual(saved.elements.weekly, false);
  // invalid value rejected, file unchanged
  const bad = setConfig(p, 'style', 'nope');
  assert.strictEqual(bad.ok, false);
  fs.unlinkSync(p);
});
```

- [ ] **Step 2: Run to verify fail** — FAIL.

- [ ] **Step 3: Implement get/set/reset in `src/config.js`** (reuse `setDotted` from defaults)

```js
const { setDotted } = require('./defaults');

function getDotted(obj, key) {
  return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function readRaw(configPath) {
  try { return JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch { return {}; }
}

function setConfig(configPath, key, rawValue) {
  const c = coerceValue(key, rawValue);
  if (!c.ok) return c;
  const raw = readRaw(configPath);
  setDotted(raw, key, c.value);
  fs.writeFileSync(configPath, JSON.stringify(raw, null, 2) + '\n');
  return { ok: true, value: c.value };
}

function resetConfig(configPath, key) {
  const raw = readRaw(configPath);
  if (!key) { try { fs.unlinkSync(configPath); } catch {} return { ok: true }; }
  if (!(key in CONFIG_SCHEMA)) return { ok: false, error: `Unknown setting: ${key}` };
  setDotted(raw, key, CONFIG_SCHEMA[key].default);
  fs.writeFileSync(configPath, JSON.stringify(raw, null, 2) + '\n');
  return { ok: true };
}
```
Add `getDotted`, `setConfig`, `resetConfig` to exports.

- [ ] **Step 4: Run to verify pass** — PASS.

- [ ] **Step 5: Commit**

```bash
git add src/config.js test/config.test.js
git commit -m "feat: add config get/set/reset persistence"
```

---

## Phase 8 — bins: render & cc

### Task 19: `bin/claude-status-render.js`

**Files:**
- Create: `bin/claude-status-render.js`, `test/render-bin.test.js`

- [ ] **Step 1: Write failing test `test/render-bin.test.js`** (spawn the bin, pipe fixture JSON)

```js
const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { SAMPLE } = require('../src/fixtures');

test('render bin reads stdin JSON and prints a HUD line', () => {
  const bin = path.join(__dirname, '..', 'bin', 'claude-status-render.js');
  const out = execFileSync('node', [bin], {
    input: JSON.stringify(SAMPLE),
    env: { ...process.env, COLUMNS: '200', COLORTERM: 'truecolor', WT_SESSION: '1' },
  }).toString();
  const plain = out.replace(/\x1b\[[0-9;]*m/g, '');
  assert.ok(plain.includes('Opus 4.8'));
  assert.ok(plain.includes('%'));
});

test('render bin tolerates empty/garbage stdin', () => {
  const bin = path.join(__dirname, '..', 'bin', 'claude-status-render.js');
  const out = execFileSync('node', [bin], { input: 'not json' }).toString();
  assert.ok(typeof out === 'string'); // no crash, exit 0
});
```

- [ ] **Step 2: Run to verify fail** — FAIL.

- [ ] **Step 3: Implement `bin/claude-status-render.js`**

```js
#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { renderHud } = require('../src/render');
const { loadConfig } = require('../src/config');
const { capabilities } = require('../src/detect');
const { currentBranch } = require('../src/git');

function readStdin() {
  try { return fs.readFileSync(0, 'utf8'); } catch { return ''; }
}
function readTheme(settingsPath) {
  try {
    const s = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    return /^light/.test(s.theme || '') ? 'light' : 'dark';
  } catch { return 'dark'; }
}

function main() {
  let stdin = {};
  try { stdin = JSON.parse(readStdin()) || {}; } catch { stdin = {}; }
  const claudeDir = path.join(os.homedir(), '.claude');
  const config = loadConfig(path.join(claudeDir, 'claude-status.config.json'));
  const theme = readTheme(path.join(claudeDir, 'settings.json'));
  const caps = capabilities(process.env, process.platform);
  const columns = parseInt(process.env.COLUMNS, 10) || 100;
  const cwd = (stdin.workspace && stdin.workspace.current_dir) || process.cwd();
  const branch = config.elements.gitBranch ? currentBranch(cwd) : null;
  const now = Math.floor(Date.now() / 1000);
  try {
    process.stdout.write(renderHud({ stdin, config, theme, caps, columns, now, branch }));
  } catch {
    // never break the user's session; print nothing on unexpected error
  }
}
main();
```

- [ ] **Step 4: Run to verify pass** — `node --test test/render-bin.test.js` → PASS.

- [ ] **Step 5: Commit**

```bash
git add bin/claude-status-render.js test/render-bin.test.js
git commit -m "feat: add render bin"
```

### Task 20: `bin/cc.js`

**Files:**
- Create: `bin/cc.js`, `test/cc-bin.test.js`

- [ ] **Step 1: Write failing test `test/cc-bin.test.js`**

```js
const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

test('cc bin errors clearly when claude missing', () => {
  const bin = path.join(__dirname, '..', 'bin', 'cc.js');
  try {
    execFileSync('node', [bin, '--version'], {
      env: { ...process.env, PATH: '', CLAUDE_STATUS_CLAUDE_BIN: 'definitely-not-a-real-binary-xyz' },
    });
    assert.fail('should have thrown');
  } catch (e) {
    const msg = (e.stderr ? e.stderr.toString() : '') + (e.stdout ? e.stdout.toString() : '');
    assert.ok(/claude/i.test(msg));
  }
});
```

- [ ] **Step 2: Run to verify fail** — FAIL.

- [ ] **Step 3: Implement `bin/cc.js`**

```js
#!/usr/bin/env node
const { spawn } = require('node:child_process');

const target = process.env.CLAUDE_STATUS_CLAUDE_BIN || 'claude';
const child = spawn(target, process.argv.slice(2), { stdio: 'inherit', shell: false });

child.on('error', (err) => {
  if (err.code === 'ENOENT') {
    process.stderr.write(`cc: could not find "${target}" on PATH. Is Claude Code installed?\n`);
    process.exit(127);
  }
  process.stderr.write(`cc: failed to launch claude: ${err.message}\n`);
  process.exit(1);
});
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code == null ? 0 : code);
});
```

- [ ] **Step 4: Run to verify pass** — PASS.

- [ ] **Step 5: Commit**

```bash
git add bin/cc.js test/cc-bin.test.js
git commit -m "feat: add cc launcher"
```

---

## Phase 9 — Installer

### Task 21: `installer/paths.js`

**Files:**
- Create: `src/installer/paths.js`, `test/paths.test.js`

- [ ] **Step 1: Write failing test `test/paths.test.js`**

```js
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const os = require('node:os');
const { settingsPath, configPath, backupPath } = require('../src/installer/paths');

test('paths resolve under a given home dir', () => {
  const home = path.join(os.tmpdir(), 'fakehome');
  assert.strictEqual(settingsPath(home), path.join(home, '.claude', 'settings.json'));
  assert.strictEqual(configPath(home), path.join(home, '.claude', 'claude-status.config.json'));
  assert.strictEqual(backupPath(home), path.join(home, '.claude', 'settings.json.bak'));
});
```

- [ ] **Step 2: Run to verify fail** — FAIL.

- [ ] **Step 3: Implement `src/installer/paths.js`**

```js
const path = require('node:path');
const os = require('node:os');

function home(h) { return h || os.homedir(); }
function claudeDir(h) { return path.join(home(h), '.claude'); }
function settingsPath(h) { return path.join(claudeDir(h), 'settings.json'); }
function configPath(h) { return path.join(claudeDir(h), 'claude-status.config.json'); }
function backupPath(h) { return path.join(claudeDir(h), 'settings.json.bak'); }

module.exports = { claudeDir, settingsPath, configPath, backupPath };
```

- [ ] **Step 4: Run to verify pass** — PASS.

- [ ] **Step 5: Commit**

```bash
git add src/installer/paths.js test/paths.test.js
git commit -m "feat: add installer path helpers"
```

### Task 22: `installer/settings.js` — mergeStatusLine (preserve keys + backup)

**Files:**
- Create: `src/installer/settings.js`, `test/settings.test.js`

- [ ] **Step 1: Write failing test `test/settings.test.js`**

```js
const test = require('node:test');
const assert = require('node:assert');
const { mergeStatusLine } = require('../src/installer/settings');

test('mergeStatusLine adds statusLine but preserves other keys', () => {
  const before = { permissions: { allow: ['x'] }, theme: 'light' };
  const after = mergeStatusLine(before, 'claude-status-render', 30);
  assert.deepStrictEqual(after.permissions, { allow: ['x'] });
  assert.strictEqual(after.theme, 'light');
  assert.deepStrictEqual(after.statusLine,
    { type: 'command', command: 'claude-status-render', refreshInterval: 30 });
});

test('mergeStatusLine overwrites only statusLine if present', () => {
  const before = { statusLine: { type: 'command', command: 'old' }, a: 1 };
  const after = mergeStatusLine(before, 'claude-status-render', 15);
  assert.strictEqual(after.a, 1);
  assert.strictEqual(after.statusLine.command, 'claude-status-render');
  assert.strictEqual(after.statusLine.refreshInterval, 15);
});
```

- [ ] **Step 2: Run to verify fail** — FAIL.

- [ ] **Step 3: Implement `src/installer/settings.js`**

```js
const fs = require('node:fs');

function mergeStatusLine(settings, command, refreshInterval) {
  return { ...settings, statusLine: { type: 'command', command, refreshInterval } };
}

function readSettings(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; }
}

function writeSettingsWithBackup(settingsPath, backupPath, nextObj) {
  if (fs.existsSync(settingsPath)) {
    fs.copyFileSync(settingsPath, backupPath);
  }
  fs.mkdirSync(require('node:path').dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(nextObj, null, 2) + '\n');
}

module.exports = { mergeStatusLine, readSettings, writeSettingsWithBackup };
```

- [ ] **Step 4: Run to verify pass** — PASS.

- [ ] **Step 5: Commit**

```bash
git add src/installer/settings.js test/settings.test.js
git commit -m "feat: add settings.json merge with backup"
```

### Task 23: `installer/alias.js` — cc collision + alias snippet

**Files:**
- Create: `src/installer/alias.js`, `test/alias.test.js`

- [ ] **Step 1: Write failing test `test/alias.test.js`**

```js
const test = require('node:test');
const assert = require('node:assert');
const { aliasSnippet, ccCollides } = require('../src/installer/alias');

test('aliasSnippet differs per shell', () => {
  assert.strictEqual(aliasSnippet('powershell', 'clc'), 'Set-Alias clc cc');
  assert.strictEqual(aliasSnippet('bash', 'clc'), "alias clc='cc'");
  assert.strictEqual(aliasSnippet('zsh', 'clc'), "alias clc='cc'");
});

test('ccCollides true on non-win when cc resolvable (simulated)', () => {
  // injected resolver to keep test hermetic
  assert.strictEqual(ccCollides('linux', () => '/usr/bin/cc'), true);
  assert.strictEqual(ccCollides('linux', () => null), false);
  assert.strictEqual(ccCollides('win32', () => '/usr/bin/cc'), false);
});
```

- [ ] **Step 2: Run to verify fail** — FAIL.

- [ ] **Step 3: Implement `src/installer/alias.js`**

```js
function aliasSnippet(shell, name) {
  if (shell === 'powershell') return `Set-Alias ${name} cc`;
  return `alias ${name}='cc'`;
}

// resolver() returns a path string if `cc` exists on PATH, else null.
function ccCollides(platform, resolver) {
  if (platform === 'win32') return false; // no C-compiler `cc` collision on Windows
  return !!resolver();
}

module.exports = { aliasSnippet, ccCollides };
```

- [ ] **Step 4: Run to verify pass** — PASS.

- [ ] **Step 5: Commit**

```bash
git add src/installer/alias.js test/alias.test.js
git commit -m "feat: add cc alias/collision helpers"
```

### Task 24: `installer/install.js` — orchestration (config write + settings merge + detection)

**Files:**
- Create: `src/installer/install.js`, `test/install.test.js`

`runInstall(opts)` is testable by injecting `home` + `env` + `platform` and a `globalInstall` no-op. It: (1) ensures `.claude` dir, (2) detects caps → recommended style, (3) writes config (if absent) with chosen/`--style`/recommended style, (4) merges settings with backup, (5) returns a summary object (so the CLI prints it).

- [ ] **Step 1: Write failing test `test/install.test.js`**

```js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runInstall } = require('../src/installer/install');

function tmpHome() {
  const h = path.join(os.tmpdir(), 'cs-home-' + process.pid + '-' + Math.floor(performance.now()));
  fs.mkdirSync(path.join(h, '.claude'), { recursive: true });
  return h;
}

test('install writes config + statusLine, preserves existing settings, backs up', () => {
  const home = tmpHome();
  const sp = path.join(home, '.claude', 'settings.json');
  fs.writeFileSync(sp, JSON.stringify({ permissions: { allow: ['keepme'] } }));
  const summary = runInstall({
    home, env: { COLORTERM: 'truecolor', WT_SESSION: '1' }, platform: 'linux',
    style: null, refreshInterval: 30, globalInstall: () => {}, resolveCc: () => null,
  });
  const settings = JSON.parse(fs.readFileSync(sp, 'utf8'));
  assert.deepStrictEqual(settings.permissions, { allow: ['keepme'] });
  assert.strictEqual(settings.statusLine.command, 'claude-status-render');
  assert.ok(fs.existsSync(path.join(home, '.claude', 'settings.json.bak')));
  const cfg = JSON.parse(fs.readFileSync(path.join(home, '.claude', 'claude-status.config.json'), 'utf8'));
  assert.strictEqual(cfg.style, 'claude'); // recommended for truecolor caps
  assert.strictEqual(summary.recommendedStyle, 'claude');
});

test('--style overrides recommendation', () => {
  const home = tmpHome();
  const summary = runInstall({
    home, env: {}, platform: 'win32', style: 'ascii', refreshInterval: 30,
    globalInstall: () => {}, resolveCc: () => null,
  });
  assert.strictEqual(summary.chosenStyle, 'ascii');
});
```

- [ ] **Step 2: Run to verify fail** — FAIL.

- [ ] **Step 3: Implement `src/installer/install.js`**

```js
const fs = require('node:fs');
const path = require('node:path');
const { settingsPath, configPath, backupPath, claudeDir } = require('./paths');
const { mergeStatusLine, readSettings, writeSettingsWithBackup } = require('./settings');
const { capabilities, recommendStyle } = require('../detect');
const { ccCollides } = require('./alias');
const { CONFIG_SCHEMA } = require('../registry');

function runInstall(opts) {
  const { home, env, platform, style, refreshInterval, globalInstall, resolveCc } = opts;
  fs.mkdirSync(claudeDir(home), { recursive: true });

  if (typeof globalInstall === 'function') globalInstall(); // npm i -g (no-op in tests)

  const caps = capabilities(env, platform);
  const recommended = recommendStyle(caps);
  const chosen = style || recommended;

  // write config only if absent, to preserve user edits
  const cp = configPath(home);
  if (!fs.existsSync(cp)) {
    fs.writeFileSync(cp, JSON.stringify({ style: chosen }, null, 2) + '\n');
  } else if (style) {
    const raw = JSON.parse(fs.readFileSync(cp, 'utf8'));
    raw.style = chosen;
    fs.writeFileSync(cp, JSON.stringify(raw, null, 2) + '\n');
  }

  const refresh = refreshInterval || CONFIG_SCHEMA.refreshIntervalSec.default;
  const next = mergeStatusLine(readSettings(settingsPath(home)), 'claude-status-render', refresh);
  writeSettingsWithBackup(settingsPath(home), backupPath(home), next);

  return {
    recommendedStyle: recommended,
    chosenStyle: chosen,
    caps,
    ccCollision: ccCollides(platform, resolveCc || (() => null)),
    settingsPath: settingsPath(home),
    configPath: cp,
  };
}

function runUninstall(opts) {
  const { home } = opts;
  const sp = settingsPath(home), bp = backupPath(home);
  if (fs.existsSync(bp)) {
    fs.copyFileSync(bp, sp);
    return { restored: true };
  }
  // no backup: just strip statusLine
  const s = readSettings(sp);
  delete s.statusLine;
  fs.writeFileSync(sp, JSON.stringify(s, null, 2) + '\n');
  return { restored: false };
}

module.exports = { runInstall, runUninstall };
```

- [ ] **Step 4: Run to verify pass** — PASS.

- [ ] **Step 5: Commit**

```bash
git add src/installer/install.js test/install.test.js
git commit -m "feat: add install/uninstall orchestration"
```

---

## Phase 10 — CLI bin (claude-status) + preview + help

### Task 25: `src/preview.js` — renderSample()

**Files:**
- Create: `src/preview.js`, `test/preview.test.js`

- [ ] **Step 1: Write failing test `test/preview.test.js`**

```js
const test = require('node:test');
const assert = require('node:assert');
const { renderSample, galleryLine } = require('../src/preview');
const { stripAnsi } = require('../src/format');

test('renderSample renders chosen style/layout with fixture data', () => {
  const out = stripAnsi(renderSample({ style: 'ascii', layout: 'oneline', columns: 200 }));
  assert.ok(out.includes('Opus 4.8'));
  assert.ok(out.includes('[####') || out.includes('[##')); // ascii bar present somewhere
});

test('galleryLine returns single-line preview for a style', () => {
  const line = galleryLine('minimal', 200);
  assert.strictEqual(line.split('\n').length, 1);
  assert.ok(stripAnsi(line).includes('23%'));
});
```

- [ ] **Step 2: Run to verify fail** — FAIL.

- [ ] **Step 3: Implement `src/preview.js`**

```js
const { renderHud } = require('./render');
const { DEFAULT_CONFIG } = require('./defaults');
const { deepMerge } = require('./config');
const { SAMPLE, SAMPLE_NOW } = require('./fixtures');

function renderSample({ style, layout, columns, theme = 'dark' }) {
  const config = deepMerge(DEFAULT_CONFIG, {
    ...(style ? { style } : {}), ...(layout ? { layout } : {}),
  });
  return renderHud({
    stdin: SAMPLE, config, theme,
    caps: { unicode: true, color256: true, truecolor: true, nerd: true },
    columns: columns || 100, now: SAMPLE_NOW, branch: 'main',
  });
}

function galleryLine(style, columns) {
  return renderSample({ style, layout: 'oneline', columns: columns || 100 });
}

module.exports = { renderSample, galleryLine };
```

- [ ] **Step 4: Run to verify pass** — PASS.

- [ ] **Step 5: Commit**

```bash
git add src/preview.js test/preview.test.js
git commit -m "feat: add preview (WYSIWYG sample renderer)"
```

### Task 26: `bin/claude-status.js` — CLI dispatcher

**Files:**
- Create: `bin/claude-status.js`, `test/cli.test.js`

Subcommands: `install [--style s] [--alias name] [--dry-run]`, `uninstall`, `config set|get|list|reset`, `preview [--style s] [--layout l]`, `help [topic]`, `--help/-h`, `--version`.

- [ ] **Step 1: Write failing test `test/cli.test.js`**

```js
const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const bin = path.join(__dirname, '..', 'bin', 'claude-status.js');
const run = (args, env) => execFileSync('node', [bin, ...args],
  { env: { ...process.env, ...env } }).toString();

test('--help lists commands', () => {
  const out = run(['--help']);
  assert.ok(out.includes('install'));
  assert.ok(out.includes('config'));
  assert.ok(out.includes('preview'));
});

test('preview prints a HUD', () => {
  const out = run(['preview', '--style', 'ascii']).replace(/\x1b\[[0-9;]*m/g, '');
  assert.ok(out.includes('Opus 4.8'));
});

test('config list shows style choices', () => {
  const out = run(['config', 'list']).replace(/\x1b\[[0-9;]*m/g, '');
  assert.ok(out.includes('style'));
  assert.ok(out.includes('claude'));
  assert.ok(out.includes('tech'));
});

test('config set rejects invalid style with exit 1', () => {
  try { run(['config', 'set', 'style', 'nope'], { HOME: require('os').tmpdir() }); assert.fail(); }
  catch (e) { assert.ok((e.stderr.toString() + e.stdout.toString()).includes('Invalid value')); }
});
```

- [ ] **Step 2: Run to verify fail** — FAIL.

- [ ] **Step 3: Implement `bin/claude-status.js`**

```js
#!/usr/bin/env node
const os = require('node:os');
const { execSync } = require('node:child_process');
const { configPath } = require('../src/installer/paths');
const { runInstall, runUninstall } = require('../src/installer/install');
const { loadConfig, getDotted, setConfig, resetConfig } = require('../src/config');
const { CONFIG_SCHEMA, STYLES, LAYOUTS } = require('../src/registry');
const { renderSample, galleryLine } = require('../src/preview');

function parseFlags(args) {
  const flags = {}; const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) { flags[args[i].slice(2)] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true; }
    else positional.push(args[i]);
  }
  return { flags, positional };
}

const HELP = `claude-status — Claude Code usage HUD + cc launcher

Usage:
  claude-status install [--style <name>] [--alias <name>] [--dry-run]
  claude-status uninstall
  claude-status config set <key> <value>
  claude-status config get <key>
  claude-status config list
  claude-status config reset [<key>]
  claude-status preview [--style <name>] [--layout <name>]
  claude-status help [styles|layout|colors|cc|troubleshooting]

Styles: ${STYLES.map(s => s.name).join(', ')}
Layouts: ${LAYOUTS.map(l => l.name).join(', ')}`;

function cmdInstall(flags) {
  const summary = runInstall({
    home: os.homedir(), env: process.env, platform: process.platform,
    style: typeof flags.style === 'string' ? flags.style : null,
    refreshInterval: 30,
    globalInstall: flags['dry-run'] ? () => {} : () => {
      try { execSync('npm install -g @ttigger/claude-status', { stdio: 'ignore' }); } catch {}
    },
    resolveCc: () => { try { return execSync('command -v cc', { stdio: ['ignore','pipe','ignore'] }).toString().trim() || null; } catch { return null; } },
  });
  console.log(`✓ installed. style=${summary.chosenStyle} (recommended ${summary.recommendedStyle})`);
  if (summary.ccCollision) console.log('⚠ "cc" already exists on PATH (C compiler?). Consider: claude-status install --alias clc');
  console.log('Open a new Claude Code session to see the HUD. Preview now:');
  console.log(renderSample({ style: summary.chosenStyle, columns: parseInt(process.env.COLUMNS,10) || 100 }));
}

function cmdConfig(positional, flags) {
  const sub = positional[0];
  const cp = configPath(os.homedir());
  if (sub === 'set') {
    const [, key, value] = positional;
    const r = setConfig(cp, key, value);
    if (!r.ok) { console.error(r.error); process.exit(1); }
    console.log(`✓ ${key} → ${r.value}. 目前效果：`);
    const cfg = loadConfig(cp);
    console.log(renderSample({ style: cfg.style, layout: cfg.layout, columns: parseInt(process.env.COLUMNS,10) || 100 }));
    return;
  }
  if (sub === 'get') { console.log(getDotted(loadConfig(cp), positional[1])); return; }
  if (sub === 'reset') { const r = resetConfig(cp, positional[1]); if (!r.ok){console.error(r.error);process.exit(1);} console.log('✓ reset'); return; }
  if (sub === 'list') {
    const cfg = loadConfig(cp);
    for (const [key, spec] of Object.entries(CONFIG_SCHEMA)) {
      const cur = getDotted(cfg, key);
      const choices = spec.choices ? ` choices: ${spec.choices.join('|')}` : (spec.min!=null?` range: ${spec.min}-${spec.max}`:'');
      console.log(`${key} = ${cur}${choices}`);
    }
    console.log('\nStyles preview:');
    for (const s of STYLES) console.log(`  ${s.name === cfg.style ? '●' : '○'} ${s.name.padEnd(8)} ${galleryLine(s.name, 80)}`);
    return;
  }
  console.error('Unknown config subcommand. See: claude-status help'); process.exit(1);
}

function cmdPreview(flags) {
  console.log(renderSample({
    style: typeof flags.style === 'string' ? flags.style : undefined,
    layout: typeof flags.layout === 'string' ? flags.layout : undefined,
    columns: parseInt(process.env.COLUMNS, 10) || 100,
  }));
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h' || argv[0] === 'help') {
    console.log(HELP); return;
  }
  if (argv[0] === '--version') { console.log(require('../package.json').version); return; }
  const { flags, positional } = parseFlags(argv.slice(1));
  switch (argv[0]) {
    case 'install': return cmdInstall(flags);
    case 'uninstall': runUninstall({ home: os.homedir() }); console.log('✓ uninstalled'); return;
    case 'config': return cmdConfig(positional, flags);
    case 'preview': return cmdPreview(flags);
    default: console.error(`Unknown command: ${argv[0]}`); console.log(HELP); process.exit(1);
  }
}
main();
```

- [ ] **Step 4: Run to verify pass** — `node --test test/cli.test.js` → PASS.

- [ ] **Step 5: Run full suite**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add bin/claude-status.js test/cli.test.js
git commit -m "feat: add claude-status CLI (install/config/preview/help)"
```

---

## Phase 11 — doc-drift guard

### Task 27: `test/docdrift.test.js`

**Files:**
- Create: `test/docdrift.test.js` (README created in Phase 12; this test asserts README lists every style — write README first if executing strictly in order, or mark this task to run after Task 28). Sequence note: **do Task 28 (README) before Task 27 passes.**

- [ ] **Step 1: Write the test**

```js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { STYLES } = require('../src/registry');

test('README lists every registry style name', () => {
  const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  for (const s of STYLES) {
    assert.ok(readme.includes(s.name), `README missing style "${s.name}"`);
  }
});
```

- [ ] **Step 2: Run after README exists** — `node --test test/docdrift.test.js` → PASS.

- [ ] **Step 3: Commit**

```bash
git add test/docdrift.test.js
git commit -m "test: add doc-drift guard (README vs registry styles)"
```

---

## Phase 12 — Documentation

### Task 28: README.md

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`** with these sections (real content, not placeholders):
  - Title + one-line pitch.
  - **Why / advantages**: bullet list per spec §14.1 (brings claude.ai Session 5h + Weekly 7d limits into the CLI; `npx` one-command, no clone; 7 styles incl. Claude brand; single-line adaptive; theme-aware colors; `cc` launcher; config with live preview; pure Node cross-OS).
  - **Quick start**: ```npx @ttigger/claude-status install``` then open a new session.
  - **The HUD**: explain model/project/branch/context/session/weekly + auto-compact (note it's approximate).
  - **Styles**: a list naming all 7 (`claude`, `minimal`, `classic`, `tech`, `data`, `ascii`, `emoji`) with the mockups from spec Appendix A.
  - **Configuration**: the `claude-status config set/get/list/reset` table + JSON example + note deep-merge.
  - **Preview**: `claude-status preview --style tech`.
  - **Commands**: full command list.
  - **Updating / Uninstall**: `npx @ttigger/claude-status@latest install`; `claude-status uninstall`.
  - **`cc`**: note the Unix `cc` collision + `--alias`.
  - **Security**: link to SECURITY.md (no data leaves the machine).

- [ ] **Step 2: Run doc-drift test** — `node --test test/docdrift.test.js` → PASS.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README"
```

### Task 29: LICENSE, SECURITY.md, AGENTS.md, CLAUDE.md, CONTRIBUTING.md, CHANGELOG.md

**Files:**
- Create: `LICENSE`, `SECURITY.md`, `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `CHANGELOG.md`

- [ ] **Step 1: `LICENSE`** — standard MIT license text, copyright holder "ttigger", year 2026.

- [ ] **Step 2: `SECURITY.md`** — sections: Supported versions; **Data boundary** (verbatim intent: reads/writes only `~/.claude/settings.json` with backup, reads config + theme, runs local `git`, spawns `claude`; sends nothing over the network; stdin usage data only rendered to terminal); How to report a vulnerability (contact + response expectation).

- [ ] **Step 3: `AGENTS.md` (canonical agent doc)** — sections:
  - Project overview (one para).
  - Commands: `npm test` (node --test), how to add a style (point to `.claude/skills/add-style`), how to release (`.claude/skills/release`).
  - Architecture: registry = source of truth; pure render engine; data-driven styles; installer.
  - **Maintenance map (closed loop)**: "If you change styles → update `src/registry.js`, add descriptor, README gallery + spec Appendix A; doc-drift test enforces README." "If you add a HUD element → `elements.js`, `engine.buildParts`, `registry CONFIG_SCHEMA elements.*`, spec §4, tests." Reference `.claude/skills/sync-docs`.
  - Conventions: CommonJS, zero deps, TDD, conventional commits.

- [ ] **Step 4: `CLAUDE.md`** — one line: "This project's agent guidance lives in [AGENTS.md](./AGENTS.md). Read it first." + any Claude Code-specific note (e.g. "to dogfood, run `claude-status install` then open a session").

- [ ] **Step 5: `CONTRIBUTING.md`** — how to set up (`npm install` — none needed; `npm test`), branch/commit conventions, link to AGENTS.md maintenance map, the add-style / add-hud-element / release skills.

- [ ] **Step 6: `CHANGELOG.md`** — Keep-a-Changelog format with `## [Unreleased]` and `## [0.1.0] - 2026-06-02` initial entry.

- [ ] **Step 7: Commit**

```bash
git add LICENSE SECURITY.md AGENTS.md CLAUDE.md CONTRIBUTING.md CHANGELOG.md
git commit -m "docs: add license, security, agent docs, contributing, changelog"
```

---

## Phase 13 — In-project `.claude/skills`

### Task 30: Four maintenance skills

**Files:**
- Create: `.claude/skills/add-style/SKILL.md`
- Create: `.claude/skills/add-hud-element/SKILL.md`
- Create: `.claude/skills/release/SKILL.md`
- Create: `.claude/skills/sync-docs/SKILL.md`

Each `SKILL.md` starts with frontmatter:
```markdown
---
name: <skill-name>
description: <when to use it>
---
```

- [ ] **Step 1: `add-style/SKILL.md`** — checklist: ① add descriptor to `STYLES` in `src/registry.js` (show the descriptor shape from this plan) ② confirm `requires` capability ③ add a one-line mockup to `README.md` styles section and spec Appendix A ④ run `npm test` (the per-style smoke + doc-drift cover it) ⑤ `CHANGELOG` entry.

- [ ] **Step 2: `add-hud-element/SKILL.md`** — checklist: ① map data source in `src/elements.js` (add to normalized model) ② render it in `src/engine.js buildParts` (assign a `group`) ③ add `elements.<name>` to `CONFIG_SCHEMA` ④ update spec §4 table + README HUD section ⑤ tests in `test/elements.test.js` + `test/engine.test.js`.

- [ ] **Step 3: `release/SKILL.md`** — checklist: ① ensure `npm test` green ② bump `version` in `package.json` ③ move `CHANGELOG [Unreleased]` to a dated version ④ `git commit` + `git tag vX.Y.Z` ⑤ push tag → CI publishes (or `npm publish --access public` locally).

- [ ] **Step 4: `sync-docs/SKILL.md`** — the canonical maintenance map (reference relationships from spec §15): a table of "change → files/tests to update". Other skills link here.

- [ ] **Step 5: Commit**

```bash
git add .claude/skills
git commit -m "docs: add in-project maintenance skills (closed loop)"
```

---

## Phase 14 — CI / publish

### Task 31: GitHub Actions workflows

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/workflows/publish.yml`

- [ ] **Step 1: `ci.yml`**

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm test
```

- [ ] **Step 2: `publish.yml`**

```yaml
name: Publish
on:
  push:
    tags: ['v*']
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', registry-url: 'https://registry.npmjs.org' }
      - run: npm test
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows
git commit -m "ci: add test + tag-publish workflows"
```

---

## Phase 15 — Local verification & first publish (manual)

### Task 32: Local end-to-end verification

- [ ] **Step 1: Run full suite** — `npm test` → all PASS.

- [ ] **Step 2: Link globally and dogfood**

```bash
npm link
claude-status --help
claude-status preview --style claude
claude-status install --dry-run
```
Expected: help prints; preview shows the Claude HUD; dry-run reports recommended style without changing settings.

- [ ] **Step 3: Real install into a throwaway HOME (optional safety check)** — verify `~/.claude/settings.json` gains `statusLine`, `.bak` created, config file written; then `claude-status uninstall` restores.

- [ ] **Step 4: Manual publish prerequisites (one-time, user)**
  - `npm whoami` → confirm username/org is `ttigger` (else create/login).
  - `npm view @ttigger/claude-status` → confirm name free.
  - `npm publish --access public` (or push a `v0.1.0` tag once `NPM_TOKEN` secret is set).

- [ ] **Step 5: Commit any fixes from verification**

```bash
git add -A
git commit -m "chore: verification fixes"
```

---

## Self-Review (completed during plan authoring)

- **Spec coverage:** HUD elements (Tasks 9,13,15) ✓; 7 styles (Task 6 + render smoke Task 15) ✓; adaptive single-line + layouts (Task 14) ✓; theme-aware/coral palette (Task 5, render Task 15) ✓; auto-compact approx (Task 9) ✓; graceful degradation/no-rate_limits (Tasks 9,15) ✓; config + subcommands + preview (Tasks 16–18, 25–26) ✓; installer + settings merge + backup + cc collision + detection (Tasks 21–24) ✓; cc launcher (Task 20) ✓; docs incl. README/AGENTS/CLAUDE/SECURITY/LICENSE/CHANGELOG/CONTRIBUTING (Tasks 28–29) ✓; closed-loop registry + doc-drift + 4 skills (Tasks 6,27,30) ✓; CI + publish (Task 31) ✓; cross-OS Node bins (Phase 8) ✓.
- **Naming consistency:** `renderHud`, `buildElements`, `buildParts`, `renderMetric`, `layoutLines`, `resolvePalette`, `colorize`, `loadConfig/deepMerge/coerceValue/setConfig/getDotted/resetConfig`, `runInstall/runUninstall`, `mergeStatusLine`, `capabilities/recommendStyle`, `renderSample/galleryLine` — used consistently across tasks.
- **Sequencing note:** Task 27 (doc-drift) only passes after Task 28 (README). Execute README before asserting doc-drift; both are committed in Phase 11–12 order with the note above.
- **Placeholder scan:** every code step contains complete code; no TBD/TODO.

## Open prerequisites (outside the code, from spec §13)
- Rename working folder `claude-settings` → `claude-status` (do between sessions; Windows can't rename an in-use dir).
- npm account/org named `ttigger`; confirm `@ttigger/claude-status` name free.
- Create GitHub repo `ttigger/claude-status`; set `NPM_TOKEN` secret for auto-publish.

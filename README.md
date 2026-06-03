<h1 align="center">@ttigger/claude-status</h1>

<p align="center">A portable Claude Code statusline HUD — model, project, git, context, and real usage limits, right in your terminal.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@ttigger/claude-status"><img src="https://img.shields.io/npm/v/@ttigger/claude-status" alt="npm version"></a>
  <a href="https://github.com/TTigger/claude-status/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/TTigger/claude-status/ci.yml?branch=main&logo=github&label=CI" alt="CI status"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/node/v/@ttigger/claude-status" alt="node >=18"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <a href="https://packagephobia.com/result?p=@ttigger/claude-status"><img src="https://packagephobia.com/badge?p=@ttigger/claude-status" alt="install size"></a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/TTigger/claude-status/main/media/demo.png" width="820" alt="claude-status statusline HUD rendered in a terminal showing model, project, git branch, context, session and weekly usage">
</p>

```sh
npx @ttigger/claude-status install
```

---

## Why

- **Usage limits in the CLI** — brings the claude.ai Session (5 h rolling) and Weekly (7 d) usage meters and their reset countdowns into every Claude Code session; no browser tab required.
- **One command, nothing to clone** — `npx @ttigger/claude-status install` fetches and wires everything; works on any machine with Node ≥ 18.
- **7 styles including Claude brand** — coral `claude` default, `minimal`, `classic`, `tech` (Nerd Font), `data` (braille), `ascii` (most compatible), `emoji`.
- **Single-line adaptive layout** — `auto` layout packs everything onto one line and gracefully wraps to two or three lines only when the terminal is narrow.
- **Theme-aware colors** — reads `~/.claude/settings.json` and mirrors Claude Code's light/dark/system theme; no manual palette config required.
- **`cc` launcher** — a tiny `cc` shim that forwards all args to `claude`, saving keystrokes on every invocation.
- **`cs` short command** — a built-in `cs` bin that runs the same CLI as `claude-status` (e.g. `cs style claude`, `cs help cc`).
- **Config with live preview** — `claude-status config set` and `claude-status preview` let you tweak and instantly see the result in your actual terminal colors.
- **Pure Node, cross-OS** — CommonJS, zero runtime dependencies, works on Windows, macOS, and Linux.

---

## Quick Start

```sh
npx @ttigger/claude-status install
```

Then open a new Claude Code session. The HUD appears automatically at the top of every prompt.

---

## The HUD

The default style is `claude` with the `auto` layout — a single adaptive line that
packs onto one row on a wide terminal and only wraps to 2–3 rows when space runs out:

```
Opus 4.8·1M | claude-status | ⎇ main | Ctx ▰▰▱▱▱▱▱▱ 24% 47k | compact 60% | S ▰▰▰▰▱▱▱▱ 52% 3h12m | W ▰▰▱▱▱▱▱▱ 31% 4d6h
```

On a narrow terminal the same data wraps (and sheds detail) automatically — see the
`claude` style and the layout options below.

| Element | What it shows |
|---|---|
| **Model** | Current model name, e.g. `Opus 4.8`. The `·1M` tag appears when the 1 M-token context window is active. |
| **Project folder** | The base name of the current working directory. |
| **Git branch** | Active branch name (blank when not in a git repo). |
| **Context bar + %** | A progress bar showing how full the context window is, plus a percentage and token count in thousands (e.g. `47k`). |
| **Auto-compact remaining** | The percentage of context headroom left before Claude Code triggers auto-compaction. **This value is approximate** — the threshold is configurable (default ~83.5 %) and may differ from Claude Code's internal trigger. |
| **Session usage** | Rolling 5-hour usage bar + percentage + countdown to reset (e.g. `3h12m`). |
| **Weekly usage** | 7-day usage bar + percentage + countdown to reset (e.g. `4d6h`). |

---

## Cost estimate (API-key mode) & usage limits

In **API-key / free usage** the HUD can show a **session cost estimate** in place of the Session/Weekly bars:

```
$0.0123 est · 47k ctx
```

The `$` value is `cost.total_cost_usd` from Claude Code's statusline data, in USD. The `· 47k ctx` part is the **current context-window occupancy** (tokens currently in context) — not cumulative session tokens.

### This is an estimate

The dollar figure is a **client-side estimate of the current session**, computed locally from token counts. It is **not a bill, not an account balance, and may differ from the real charge on the Anthropic Console.** The `est` marker is always shown precisely to signal this — treat the number as a rough running estimate, not an invoice.

### When it appears

The cost estimate appears **only when Claude Code provides no `rate_limits`**:

- **API-key / free usage** — there are no subscription rate limits, so the estimate is shown.
- A **subscriber's very first render**, before they send their first message.

Once a subscriber sends a message and `rate_limits` appear, the cost element **automatically disappears** and the normal Session (5 h) / Weekly (7 d) bars return. **Subscribers stay clean** — no dollar figures during normal subscription use.

### `LIMIT` at 100%

When a Session or Weekly meter reaches **100% usage**, it switches from a bar to a red `LIMIT` marker that still shows the reset countdown:

```
S LIMIT 3h12m
```

This just makes "you've hit the cap" obvious.

### What it can't show

The HUD **cannot** display, because Claude Code does **not** expose this data to statusline scripts:

- Usage-credit balance / remaining credit
- Monthly spend limit
- Current account balance
- Auto-reload status

None of that billing data is available to statusline scripts, so it is not (and cannot be) shown — including by the `LIMIT` marker.

### Hiding the cost estimate

The cost element is controlled by `elements.cost` (default `true`). To hide it:

```sh
claude-status config set elements.cost false
```

With it off, the old `— waiting for first message` note returns in no-`rate_limits` situations.

---

## Styles

Seven styles are available. Choose with `claude-status style <name>` (shortcut) or `claude-status config set style <name>`.

### `claude` (default — Claude coral brand)

Default layout is `auto` (single adaptive line). Shown here as `three` (grouped lines)
to make the parts clear; labels are `Ctx` / `S` / `W` and the bar is 8 cells wide:

```
Opus 4.8·1M | claude-status | ⎇ main
Ctx ▰▰▱▱▱▱▱▱ 24% 47k | compact 60%
S ▰▰▰▰▱▱▱▱ 52% 3h12m | W ▰▰▱▱▱▱▱▱ 31% 4d6h
```

### `minimal`

```
Opus 4.8·1M | claude-status | main
ctx ▪▪░░░░ 23% 47k · compact 60%
ses ▪▪▪░░░ 52% 3h12m · wk ▪▪░░░ 31% 4d6h
```

### `classic` (fallback default)

```
Opus 4.8·1M | claude-status | ⎇ main
Ctx ▓▓░░░░░░ 23% · 47k | compact in 60%
Sess ▓▓▓▓▓░ 52% · 3h12m | Wk ▓▓░░░ 31% · 4d6h
```

### `tech` (needs Nerd Font)

```
 Opus 4.8 1M │  claude-status │  main
󰍛 ███▱▱▱▱ 23% 47k │ ♻ 60%
 █████▱ 52% 3h12m │  ██▱▱▱ 31% 4d6h
```

### `data`

```
Opus-4.8[1M] | claude-status | git:main
CTX ⣿⣿⣀⠀⠀ 23.4% 47.0k/200k | AC 60.0%
5H  ⣿⣿⣿⣀⠀ 52.1% ⟳3h12m | 7D ⣿⣀⠀⠀⠀ 31.0% ⟳4d6h
```

### `ascii` (most compatible)

```
Opus 4.8 1M | claude-status | main
Ctx [##------] 23% 47k | compact 60%
Ses [####----] 52% 3h12m | Wk [##------] 31% 4d6h
```

### `emoji`

```
🤖 Opus 4.8·1M | 📁 claude-status | 🌿 main
🧠 ▓▓░░░░ 23% 47k | ♻️ 60%
⏱️ ▓▓▓▓▓░ 52% 3h12m | 📅 ▓░░░░ 31% 4d6h
```

---

## Configuration

Configuration is stored in `~/.claude/claude-status.config.json`. Only the keys you change are written — it is a **deep merge**, so you never need to specify the full config.

### CLI

| Command | Description |
|---|---|
| `claude-status config set <key> <value>` | Set a single config key |
| `claude-status config get <key>` | Print the current value of a key |
| `claude-status config list` | Print all current settings |
| `claude-status config reset [key]` | Reset one key (or all) to defaults |

> **Tip:** `claude-status style` and `claude-status layout` are quick shortcuts. `claude-status style claude` is shorthand for `config set style claude`; `claude-status style` with no argument shows a gallery of all styles (● marks the current one). Likewise, `claude-status layout two` switches layout and `claude-status layout` lists available layouts. Even shorter: `cs style claude` — the built-in `cs` bin is an alias for `claude-status`.

### Dotted keys for nested settings

```sh
claude-status config set elements.weekly false       # hide weekly usage
claude-status config set elements.cost false         # hide the API-key cost estimate
claude-status config set colorThresholds.green 40    # green up to 40 %
claude-status config set colorThresholds.yellow 70   # yellow 40–70 %, red above
claude-status config set autoCompact.thresholdPct 80 # approximate compaction threshold
claude-status config set barWidth 10                 # wider bars
claude-status config set style minimal               # switch style
claude-status config set layout two                  # two-line layout
```

### Example config file

```json
{
  "style": "claude",
  "layout": "auto",
  "barWidth": 8,
  "colorThresholds": {
    "green": 50,
    "yellow": 80
  },
  "elements": {
    "model": true,
    "project": true,
    "gitBranch": true,
    "context": true,
    "autoCompact": true,
    "session": true,
    "weekly": true,
    "cost": true
  },
  "autoCompact": {
    "thresholdPct": 83.5
  }
}
```

Only include keys you want to override — unset keys fall back to defaults.

---

## Preview

See the HUD rendered in your actual terminal colors before committing to a style:

```sh
claude-status preview --style tech
claude-status preview --style emoji --layout three
```

`preview` is a live WYSIWYG render — it applies the real theme colors from `~/.claude/settings.json` and prints every layout variant side by side.

---

## Commands

| Command | Description |
|---|---|
| `npx @ttigger/claude-status install` | Install / re-install the HUD into Claude Code |
| `claude-status uninstall` | Remove the HUD and restore `~/.claude/settings.json` from backup |
| `claude-status style [<name>]` | No arg: gallery of all styles (● = current). With name: switch style (shortcut for `config set style <name>`). |
| `claude-status layout [<name>]` | No arg: show current + available layouts. With name: switch layout (shortcut for `config set layout <name>`). |
| `cs <args...>` | Built-in shorthand for `claude-status <args...>` (e.g. `cs style claude`, `cs help cc`). Installed automatically. |
| `claude-status alias <name> [--for cc\|self]` | Add a shell alias. `--for cc` (default): alias points at the `cc` launcher. `--for self`: alias points at `claude-status` itself (pick any name, e.g. `qq`). Writes to shell RC on macOS/Linux, prints `Set-Alias` line on Windows. |
| `claude-status config set <key> <value>` | Set a config value |
| `claude-status config get <key>` | Get a config value |
| `claude-status config list` | List all config values |
| `claude-status config reset [key]` | Reset to default(s) |
| `claude-status preview [--style s] [--layout l]` | Live WYSIWYG preview |
| `claude-status help [<topic>]` | Print help (topics: `styles` `layout` `colors` `cc` `troubleshooting`) |

---

## Updating / Uninstall

**Update to the latest version:**

```sh
npx @ttigger/claude-status@latest install
```

**Uninstall:**

```sh
claude-status uninstall
```

The uninstaller restores `~/.claude/settings.json` from the `.bak` backup created during install, so your previous hooks configuration is preserved.

---

## `cc` Launcher

The `cc` bin is a thin wrapper that calls `claude` and passes all arguments through unchanged. It saves a few keystrokes on every invocation.

**Name collision on macOS / Linux:** `cc` is the POSIX name for the system C compiler. The installer detects this and warns you on macOS and Linux so you can make an informed choice. Windows has no such collision.

**Setting an alias — recommended approach:** run `claude-status alias clc` at any time. On macOS/Linux it appends `alias clc=cc` to `~/.zshrc` or `~/.bashrc` (idempotent — safe to run again). On Windows it prints a `Set-Alias clc cc` line for you to add to your PowerShell `$PROFILE`.

You can also set the alias during install with `--alias`:

```sh
npx @ttigger/claude-status install --alias clc
```

Either way, `clc` (or whatever name you choose) becomes a shortcut for `cc`, avoiding any conflict with the system compiler.

**`cs` short command for the CLI:** the package also ships a built-in `cs` bin that is a direct alias for `claude-status` (not for `cc`). Use it for CLI commands: `cs style claude`, `cs alias clc`, `cs help cc`, etc.

> **Note:** if you already have a `cs` on PATH (e.g. Scala's `coursier` tool), the installer warns you that the new `cs` may shadow it. In that case you can create your own short name instead: `claude-status alias qq --for self` writes a shell alias called `qq` pointing at `claude-status` itself (any name works). Use `--for cc` (or omit `--for`) to alias the `cc` launcher as usual.

**Custom alias for the CLI itself:** `claude-status alias <name> --for self` lets you pick any name for the `claude-status` CLI. On macOS/Linux it writes to `~/.zshrc` / `~/.bashrc`; on Windows it prints the `Set-Alias` line for your `$PROFILE`.

---

## Security

No data leaves your machine — the package only reads/writes `~/.claude/settings.json` (with a `.bak` backup), reads your config and theme, runs local `git`, and spawns `claude`. See [SECURITY.md](./SECURITY.md) for the full data boundary statement.

---

## License

MIT © 2026 ttigger

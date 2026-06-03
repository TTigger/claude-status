'use strict';

const { STYLES, LAYOUTS } = require('./registry');

const HELP = `claude-status — Claude Code usage HUD + cc launcher

Usage:
  claude-status install [--style <name>] [--alias <name>] [--dry-run]
  claude-status uninstall
  claude-status style [<name>]            # show gallery, or switch style
  claude-status layout [<name>]           # show layouts, or switch layout
  claude-status alias <name> [--for cc|self]   # cc launcher alias, or a short name for claude-status itself
  claude-status config set <key> <value>
  claude-status config get <key>
  claude-status config list
  claude-status config reset [<key>]
  claude-status preview [--style <name>] [--layout <name>]
  claude-status help [styles|layout|colors|cost|cc|troubleshooting]

Styles: ${STYLES.map(s => s.name).join(', ')}
Layouts: ${LAYOUTS.map(l => l.name).join(', ')}

Tip: \`cs\` is a built-in short command — \`cs style claude\` works the same as \`claude-status style claude\`.`;

function topicHelp(topic) {
  switch (topic) {
    case 'styles': return _stylesHelp();
    case 'layout': return _layoutHelp();
    case 'colors': return _colorsHelp();
    case 'cost':   return _costHelp();
    case 'cc':     return _ccHelp();
    case 'troubleshooting': return _troubleshootingHelp();
    default: return HELP;
  }
}

function _stylesHelp() {
  const list = STYLES.map(s => {
    const req = s.requires ? ` (requires: ${s.requires})` : '';
    return `  ${s.name.padEnd(10)} — ${s.label}${req}`;
  }).join('\n');

  return `Styles — Visual appearance of the HUD

Each style controls the bar characters, label text, icon glyphs, and colour
mode used when rendering the statusline.

${list}

Switch style:
  claude-status style <name>
  claude-status config set style <name>

Preview a style without installing:
  claude-status preview --style <name>

The 'claude' style uses a coral/brand colour palette. All other styles use a
traffic-light palette (green → yellow → red) that tracks context/usage levels.`;
}

function _layoutHelp() {
  const list = LAYOUTS.map(l => `  ${l.name.padEnd(10)} — ${l.label}`).join('\n');

  return `Layouts — How HUD segments are distributed across lines

${list}

  auto        Adapts to terminal width. Collapses to one line on narrow
              terminals; expands to two or three lines when space permits.
  oneline     Forces everything onto a single line (may truncate on narrow
              terminals).
  two         Splits into two lines: env info on line 1, usage on line 2.
  three       Three-line split: env / context / limits each on their own line.

Switch layout:
  claude-status layout <name>
  claude-status config set layout <name>`;
}

function _colorsHelp() {
  return `Colors — Theme-aware colour palette

claude-status reads the \`theme\` field from ~/.claude/settings.json to decide
whether to use a light or dark variant. When \`palette\` is set to \`auto\`
(the default) this detection is automatic. You can override it:
  claude-status config set palette light
  claude-status config set palette dark

Colour modes:
  coral     Used by the \`claude\` style. Renders with Anthropic's coral brand
            colours instead of traffic-light hues.
  traffic   Used by all other styles. Maps usage percentage to a green →
            yellow → red gradient.

Thresholds (traffic mode only):
  colorThresholds.green   Context % below which colour is green  (default 50)
  colorThresholds.yellow  Context % below which colour is yellow (default 80)
  Above the yellow threshold the colour switches to red.

Adjust thresholds:
  claude-status config set colorThresholds.green 40
  claude-status config set colorThresholds.yellow 75

If colours look flat or wrong, your terminal may lack truecolor/256-colour
support. Try: claude-status config set style classic`;
}

function _costHelp() {
  return `Cost — Session cost ESTIMATE (API-key / no-rate_limits mode)

In API-key / free usage the HUD shows a session cost estimate instead of the
Session/Weekly bars:

  $0.0123 est · 47k ctx

This is an ESTIMATE. The dollar figure is a client-side estimate of the
current session (from \`cost.total_cost_usd\`), computed locally from token
counts. It is NOT a bill and NOT an account balance, and may differ from the
real charge on the Anthropic Console. The \`est\` marker is always shown to
signal this.

When it appears:
  - API-key / free usage (Claude Code provides no rate_limits), or
  - a subscriber's very first render, before their first message.
  Once rate_limits appear (a subscriber sends a message) the cost element
  hides and the Session/Weekly bars return — subscribers stay clean.

  \`· 47k ctx\` is the current context-window occupancy (tokens currently in
  context), NOT cumulative session tokens.

LIMIT at 100%:
  When a Session or Weekly meter hits 100%, it shows a red \`LIMIT\` marker
  with its reset countdown (e.g. \`S LIMIT 3h12m\`) instead of a bar.

What it can't show:
  Usage-credit balance, monthly spend limit, current account balance, and
  auto-reload status are NOT exposed to statusline scripts by Claude Code,
  so the HUD cannot and does not display them.

Hide the cost estimate (restores the "waiting for first message" note):
  claude-status config set elements.cost false`;
}

function _ccHelp() {
  return `cc — Lightweight launcher that forwards arguments to \`claude\`

The \`cc\` bin is a thin wrapper: \`cc [args...]\` is equivalent to
\`claude [args...]\`. It exists purely for convenience — fewer keystrokes.

cs — Built-in short alias for the claude-status CLI:
  \`cs\` is a second built-in bin pointing at \`claude-status\` itself, so
  \`cs style ...\`, \`cs alias ...\`, \`cs help cc\` etc. all work identically
  to the longer form.

  You can also create your own short name for claude-status with:
    claude-status alias <name> --for self
  This writes a shell alias pointing at \`claude-status\` (not \`claude\`).

  Note: \`cs\` is also the name of the Coursier Scala build tool. If
  \`cs\` is already on your PATH, our \`cs\` bin may shadow it. In that
  case use a custom alias instead: claude-status alias <name> --for self

Name collision (macOS / Linux):
  On POSIX systems \`cc\` is the standard name for the C compiler (usually
  an alias for gcc or clang). If \`cc\` is already on your PATH, installing
  @ttigger/claude-status will shadow the system compiler, which can break
  C build toolchains.

  To avoid the collision, use a different alias name:
    claude-status alias clc
    claude-status install --alias clc

  This writes a shell function \`clc\` (or whatever name you choose) to your
  shell rc file so \`clc\` forwards to \`claude\` instead.

Check whether \`cc\` is already taken:
  which cc          # shows the current target
  type cc           # in bash/zsh shows all matches`;
}

function _troubleshootingHelp() {
  return `Troubleshooting — Common issues and fixes

HUD not showing:
  The statusline is injected into Claude Code's settings and is rendered at
  the start of each session. If you just ran \`claude-status install\`, you
  must open a NEW Claude Code session for the change to take effect.

Session / Weekly show "waiting for first message":
  Usage data is streamed by Claude Code only after the first message is sent
  in a session. Send a message and the counters will populate.

Glyphs look wrong (boxes, question marks, or missing icons):
  - The \`tech\` style uses Nerd Font glyphs. Install a Nerd Font and
    configure your terminal to use it, or switch to a different style.
  - For maximum compatibility with any terminal, use the \`ascii\` style:
      claude-status config set style ascii

Colors look flat / all the same colour:
  Your terminal may not support truecolor or 256 colours. Switch to a style
  with the traffic colour mode which degrades more gracefully:
      claude-status config set style classic
      claude-status config set style ascii

Config file location:
  ~/.claude/claude-status.json  — user config
  ~/.claude/settings.json       — Claude Code settings (statusLine hook lives here)

Reset everything to defaults:
  claude-status config reset`;
}

module.exports = { HELP, topicHelp };

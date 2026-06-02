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

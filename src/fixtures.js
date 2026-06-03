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
    seven_day: { used_percentage: 31, resets_at: 1717755680 },
  },
  cost: { total_cost_usd: 0.0123, total_duration_ms: 45000, total_api_duration_ms: 2300, total_lines_added: 0, total_lines_removed: 0 },
};
// "now" so sample resets render as 3h12m / 4d6h deterministically:
const SAMPLE_NOW = 1717400000 - (3 * 3600 + 12 * 60);
const SAMPLE_APIKEY = JSON.parse(JSON.stringify(SAMPLE));
delete SAMPLE_APIKEY.rate_limits;
module.exports = { SAMPLE, SAMPLE_NOW, SAMPLE_APIKEY };

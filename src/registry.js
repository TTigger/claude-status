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
    // Nerd Font glyphs as ES6 code-point escapes — plane-15 icons need \u{...}, not \uXXXX.
    labels: { branch: '\u{E0A0}', ctx: '\u{F015B}', sess: '\u{F0CAB}', wk: '\u{F073}', ac: '\u{267B}' },
    icons: { model: '\u{F2DB}', project: '\u{F07B}' }, colorMode: 'traffic', decimals: false,
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
  'elements.cost': { type: 'bool', default: true },
  'autoCompact.thresholdPct': { type: 'number', min: 0, max: 100, default: 83.5 },
  refreshIntervalSec: { type: 'int', min: 1, max: 3600, default: 30 },
};

function styleByName(name) { return STYLES.find(s => s.name === name) || null; }

module.exports = { STYLES, LAYOUTS, CONFIG_SCHEMA, styleByName };

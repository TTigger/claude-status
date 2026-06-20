const STYLES = [
  { name: 'claude', label: 'Clay 質感簡潔', bar: { full: '▰', empty: '▱' }, barWrap: ['', ''],
    hiresBar: true, barTrack: { from: 'tier', factor: 0.30 },
    labels: { branch: '⎇', ctx: 'Ctx', sess: 'S', wk: 'W', ac: 'compact' },
    icons: null, decimals: false, rawTokens: false, lowercase: false, requires: 'truecolor',
    decoration: { type: 'none' },
    palette: {
      dark:  { text:'#cfc6ba', dim:'#5d6370', accent:'#d97757', accent2:'#e8a07e',
               low:'#d97757', mid:'#e8a07e', high:'#e0533d' },
      light: { text:'#4a4640', dim:'#9a9080', accent:'#bf5a3c', accent2:'#c8714e',
               low:'#bf5a3c', mid:'#c8714e', high:'#a83a22' },
    } },
  { name: 'mist', label: 'Mist 柔和粉彩', bar: { full: '▰', empty: '▱' }, barWrap: ['', ''],
    hiresBar: true, barTrack: { from: 'deco', factor: 0.65 },
    labels: { branch: '⎇', ctx: 'Ctx', sess: 'S', wk: 'W', ac: 'compact' },
    icons: null, decimals: false, rawTokens: false, lowercase: false, requires: 'color256',
    decoration: { type: 'pill', assign: { project:'foam', branch:'lavender', context:'sage',
                  session:'gold', weekly:'rose', cost:'rose' } },
    palette: {
      dark:  { text:'#e0def4', dim:'#5d6370', accent:'#c4a7e7', accent2:'#9ccfd8',
               low:'#a6e3a1', mid:'#f6c177', high:'#eb6f92',
               deco: { foam:{bg:'#1f3038',fg:'#9ccfd8'}, lavender:{bg:'#2b2640',fg:'#c4a7e7'},
                       sage:{bg:'#23332b',fg:'#a6e3a1'}, gold:{bg:'#3a3220',fg:'#f6c177'},
                       rose:{bg:'#3a2630',fg:'#ebbcba'} } },
      light: { text:'#4a4640', dim:'#9a9080', accent:'#7c5bb0', accent2:'#3a7d8c',
               low:'#4a8055', mid:'#9a7b1e', high:'#b05772',
               deco: { foam:{bg:'#d7e7ec',fg:'#3a7d8c'}, lavender:{bg:'#e7e0f5',fg:'#7c5bb0'},
                       sage:{bg:'#dceadd',fg:'#4a8055'}, gold:{bg:'#f0e6cf',fg:'#9a7b1e'},
                       rose:{bg:'#f3dde3',fg:'#b05772'} } },
    } },
  { name: 'neon', label: 'Neon Deck 儀表板', bar: { full: '▰', empty: '▱' }, barWrap: ['', ''],
    hiresBar: true, barTrack: { from: 'deco', factor: 0.50 },
    labels: { branch: '⎇', ctx: 'Ctx', sess: 'S', wk: 'W', ac: 'compact' },
    icons: null, decimals: false, rawTokens: false, lowercase: false, requires: 'nerd',
    decoration: { type: 'segment', assign: { _env:'blue', _context:'purple', _limits:'green' },
                  byGroup: true },
    palette: {
      dark:  { text:'#16161e', dim:'#5d6370', accent:'#7aa2f7', accent2:'#7dcfff',
               low:'#9ece6a', mid:'#e0af68', high:'#f7768e',
               deco: { blue:{bg:'#7aa2f7',fg:'#16161e'}, cyan:{bg:'#7dcfff',fg:'#16161e'},
                       purple:{bg:'#bb9af7',fg:'#16161e'}, green:{bg:'#9ece6a',fg:'#16161e'},
                       red:{bg:'#f7768e',fg:'#16161e'} } },
      light: { text:'#16161e', dim:'#9a9080', accent:'#3760bf', accent2:'#0f4b6e',
               low:'#587539', mid:'#8c6c3e', high:'#b15c70',
               deco: { blue:{bg:'#7aa2f7',fg:'#16161e'}, cyan:{bg:'#7dcfff',fg:'#16161e'},
                       purple:{bg:'#bb9af7',fg:'#16161e'}, green:{bg:'#9ece6a',fg:'#16161e'},
                       red:{bg:'#f7768e',fg:'#16161e'} } },
    } },
  { name: 'ascii', label: 'ASCII 相容', bar: { full: '#', empty: '-' }, barWrap: ['[', ']'],
    labels: { branch: '', ctx: 'Ctx', sess: 'Ses', wk: 'Wk', ac: 'compact' },
    icons: null, decimals: false, rawTokens: false, lowercase: false, requires: 'ascii',
    decoration: { type: 'none' },
    palette: {
      dark:  { text:'', dim:'', accent:'', accent2:'', low:'#00d700', mid:'#ffd700', high:'#ff0000' },
      light: { text:'', dim:'', accent:'', accent2:'', low:'#008700', mid:'#d75f00', high:'#d70000' },
    } },
];

const STYLE_ALIASES = {
  classic: 'claude', minimal: 'claude', tech: 'neon', data: 'neon', emoji: 'mist',
};

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
  'ping.enabled': { type: 'bool', default: true },
  'ping.minSeconds': { type: 'int', min: 0, max: 3600, default: 30 },
  'ping.onWaiting': { type: 'bool', default: true },
  'ping.waitingCooldownSec': { type: 'int', min: 0, max: 3600, default: 60 },
  'ping.sound': { type: 'bool', default: false },
  refreshIntervalSec: { type: 'int', min: 1, max: 3600, default: 30 },
};

function styleByName(name) {
  const resolved = STYLE_ALIASES[name] || name;
  return STYLES.find(s => s.name === resolved) || null;
}

module.exports = { STYLES, LAYOUTS, CONFIG_SCHEMA, styleByName, STYLE_ALIASES };

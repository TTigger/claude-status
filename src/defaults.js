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

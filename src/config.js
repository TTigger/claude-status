const fs = require('node:fs');
const { DEFAULT_CONFIG, setDotted } = require('./defaults');
const { CONFIG_SCHEMA } = require('./registry');

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
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf8').replace(/^﻿/, ''));
    return deepMerge(DEFAULT_CONFIG, raw);
  } catch {
    return deepMerge(DEFAULT_CONFIG, {});
  }
}

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

module.exports = { deepMerge, loadConfig, coerceValue, getDotted, setConfig, resetConfig };

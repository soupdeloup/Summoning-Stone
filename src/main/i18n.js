const fs = require('fs');
const path = require('path');

const LOCALE_DIR = path.join(__dirname, '..', 'renderer', 'locales');
const locales = {};
let currentLocale = 'en';

try {
  for (const file of fs.readdirSync(LOCALE_DIR)) {
    if (!file.endsWith('.js')) continue;
    const code = file.slice(0, -3);
    locales[code] = require(path.join(LOCALE_DIR, file));
  }
} catch (err) {
  console.error('Failed to load locales:', err.message);
}

function setLocale(code) {
  if (locales[code]) currentLocale = code;
}

function t(key, vars) {
  const lookup = (dict) => key.split('.').reduce(
    (obj, part) => (obj && obj[part] != null ? obj[part] : null),
    dict
  );
  let str = lookup(locales[currentLocale]);
  if (str == null && currentLocale !== 'en') str = lookup(locales.en);
  if (str == null) return key;

  if (vars && typeof str === 'string') {
    return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : `{${k}}`));
  }
  return str;
}

module.exports = { t, setLocale, getLocale: () => currentLocale };

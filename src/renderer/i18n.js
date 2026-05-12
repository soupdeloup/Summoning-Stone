// HTML attributes: data-i18n (textContent), data-i18n-html (innerHTML),
// data-i18n-title (title), data-i18n-aria (aria-label)

(function () {
  const dicts = window.SS_LOCALES || {};
  let current = 'en';

  function setLocale(code) {
    if (dicts[code]) {
      current = code;
      applyToDOM();
    }
  }

  function lookup(dict, key) {
    return key.split('.').reduce(
      (obj, part) => (obj && obj[part] != null ? obj[part] : null),
      dict
    );
  }

  function t(key, vars) {
    let str = lookup(dicts[current], key);
    if (str == null && current !== 'en') str = lookup(dicts.en, key);
    if (str == null) return key;
    if (vars && typeof str === 'string') {
      return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : `{${k}}`));
    }
    return str;
  }

  function applyToDOM(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
    scope.querySelectorAll('[data-i18n-html]').forEach(el => {
      el.innerHTML = t(el.dataset.i18nHtml);
    });
    scope.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = t(el.dataset.i18nTitle);
    });
    scope.querySelectorAll('[data-i18n-aria]').forEach(el => {
      el.setAttribute('aria-label', t(el.dataset.i18nAria));
    });
  }

  window.i18n = { t, setLocale, applyToDOM, getLocale: () => current };
})();

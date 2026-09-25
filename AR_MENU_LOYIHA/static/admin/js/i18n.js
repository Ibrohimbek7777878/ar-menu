(function (w) {
  'use strict';
  w.ARMENU = w.ARMENU || {};
  const lang = (document.cookie.match(/django_language=([^;]+)/) || [])[1] || 'uz';
  let DICT = {};

  function get(path) {
    return path.split('.').reduce((o, k) => (o == null ? null : o[k]), DICT);
  }
  w.ARMENU.lang = lang;
  w.ARMENU.t = function (key, vars) {
    let s = get(key);
    if (s == null) return key;
    if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  };
  w.ARMENU.money = function (n) {
    return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'ru-RU')
      .format(Math.round(Number(n) || 0));
  };
  w.ARMENU.ready = fetch(`/static/i18n/${lang}.json`)
    .then(r => r.json()).then(d => { DICT = d; return d; })
    .catch(() => ({}));

  // CSRF + fetch yordamchilari
  const csrf = () => (document.cookie.match(/csrftoken=([^;]+)/) || [])[1] || '';
  const json = async (r) => { const d = await r.json().catch(() => ({}));
    if (!r.ok) throw d; return d; };
  w.ARMENU.api = {
    get:  (u) => fetch(u, { credentials: 'same-origin' }).then(json),
    post: (u, b) => fetch(u, { method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf() },
      body: JSON.stringify(b) }).then(json),
    patch: (u, b) => fetch(u, { method: 'PATCH', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf() },
      body: JSON.stringify(b) }).then(json),
    del: (u) => fetch(u, { method: 'DELETE', credentials: 'same-origin',
      headers: { 'X-CSRFToken': csrf() } }).then(r => r.ok)
  };
})(window);
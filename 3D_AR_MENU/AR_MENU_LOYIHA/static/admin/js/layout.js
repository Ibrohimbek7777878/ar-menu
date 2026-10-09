(function () {
  'use strict';
  // Tema
  const root = document.documentElement;
  const btn = document.getElementById('ap-theme');
  function setTheme(v) {
    root.setAttribute('data-theme', v);
    document.cookie = `theme=${v}; path=/; max-age=31536000; samesite=lax`;
  }
  if (btn) btn.addEventListener('click', () => {
    const cur = root.getAttribute('data-theme');
    const sysDark = matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme((cur || (sysDark ? 'dark' : 'light')) === 'dark' ? 'light' : 'dark');
  });

  // Til
  const lang = document.getElementById('ap-lang');
  if (lang) lang.addEventListener('change', () => {
    document.cookie = `django_language=${lang.value}; path=/; max-age=31536000; samesite=lax`;
    location.reload();
  });

  // Mobil menyu
  const burger = document.getElementById('ap-burger');
  const side = document.getElementById('ap-side');
  if (burger && side) burger.addEventListener('click', () => side.classList.toggle('open'));

  // Aktiv havola
  document.querySelectorAll('.ap-side nav a').forEach(a => {
    if (a.getAttribute('href') === location.pathname) a.classList.add('active');
  });
})();
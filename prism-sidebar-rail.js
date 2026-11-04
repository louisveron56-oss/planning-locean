/* Prism — menu latéral qui se range tout seul (ordinateur uniquement).
   - Dès qu'on ouvre une page depuis le menu, il se réduit à une colonne d'icônes : la page
     récupère toute la largeur.
   - Survoler (ou parcourir au clavier) la colonne la déplie par-dessus la page, sans la décaler.
   - Le bouton en haut du menu permet de le garder ouvert (choix mémorisé sur l'appareil).
   - Sur téléphone, rien ne change (le menu reste un tiroir). */
(function () {
  'use strict';
  if (window.__prismRail) return; window.__prismRail = true;
  var KEY = 'prism_sidebar_pinned';
  var desk = window.matchMedia('(min-width: 901px)');
  var body = document.body;
  function pinned() { try { return localStorage.getItem(KEY) === '1'; } catch (_) { return false; } }
  function setPinned(v) { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (_) {} }

  function collapse() {
    if (!desk.matches || pinned()) return;
    body.classList.add('prism-rail', 'prism-rail-hold');
    if (document.activeElement && document.getElementById('appSidebar')?.contains(document.activeElement)) document.activeElement.blur();
    sync();
  }
  function expand() { body.classList.remove('prism-rail', 'prism-rail-hold'); sync(); }
  function sync() {
    var b = document.getElementById('prism-rail-toggle'); if (!b) return;
    var rail = body.classList.contains('prism-rail');
    b.setAttribute('aria-pressed', String(!rail));
    b.setAttribute('aria-label', rail ? 'Garder le menu ouvert' : 'Réduire le menu');
    b.title = b.getAttribute('aria-label');
    b.innerHTML = rail
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>';
  }
  function mount() {
    var side = document.getElementById('appSidebar'); if (!side) return false;
    var head = side.querySelector('.app-sidebar-head'); if (!head) return false;
    if (!document.getElementById('prism-rail-toggle')) {
      var b = document.createElement('button');
      b.type = 'button'; b.id = 'prism-rail-toggle'; b.className = 'prism-rail-toggle';
      b.addEventListener('click', function () {
        if (body.classList.contains('prism-rail')) { setPinned(true); expand(); }
        else { setPinned(false); collapse(); }
      });
      head.appendChild(b);
    }
    /* Un clic sur une page du menu range le menu. */
    side.addEventListener('click', function (e) {
      var item = e.target.closest && e.target.closest('.app-nav-item');
      if (item) setTimeout(collapse, 0);
    });
    /* Le survol reprend dès que la souris est sortie puis revenue. */
    side.addEventListener('mouseleave', function () { body.classList.remove('prism-rail-hold'); });
    side.addEventListener('keydown', function (e) { if (e.key === 'Tab') body.classList.remove('prism-rail-hold'); });
    desk.addEventListener ? desk.addEventListener('change', onSize) : desk.addListener(onSize);
    if (desk.matches && !pinned()) { body.classList.add('prism-rail'); }
    sync();
    return true;
  }
  function onSize() { if (!desk.matches) body.classList.remove('prism-rail', 'prism-rail-hold'); else if (!pinned()) body.classList.add('prism-rail'); sync(); }
  function start() { if (!mount()) setTimeout(start, 300); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

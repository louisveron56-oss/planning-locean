/* Prism — navigation en barre haute (ordinateur uniquement, à partir de 901 px).
   - Remplace le menu latéral par une barre flottante : logo, 6 rubriques en pilule,
     établissement, mode clair/sombre, compte.
   - Les pages de la rubrique ouverte s'affichent en pilules juste en dessous.
   - La barre se range quand on descend dans la page et revient dès qu'on remonte.
   - Les pages s'ouvrent toujours via navigateApp() : aucun rechargement, aucune donnée touchée.
   - Sur téléphone et tablette étroite, rien ne change : le menu reste un tiroir.
   Pour revenir au menu latéral : retirer prism-topbar.js / prism-topbar.css de index.html
   et remettre prism-sidebar-rail.js. */
(function () {
  'use strict';
  if (window.__prismTopbar) return; window.__prismTopbar = true;

  var desk = window.matchMedia('(min-width: 901px)');
  var body = document.body;
  var root = document.documentElement;
  var LAST_KEY = 'prism_topbar_last';
  var SHORT = {
    'ANALYSE & PERFORMANCE': 'Analyse',
    'ACHATS & STOCKS': 'Achats',
    'ÉQUIPE & RH': 'Équipe',
    'CARTE & RECETTES': 'Carte',
    'ADMINISTRATION': 'Admin'
  };
  /* Pages retirées du menu (doublons, en préparation) : le code reste, elles sont juste cachées.
     Validé par Louis le 12/11/2026. Pour en réafficher une, la retirer de cette liste. */
  var MASQUEES = ['costs', 'foodcost', 'posimport', 'purchase-home', 'purchase-history', 'purchase-audit', 'stocks', 'delivery-notes'];
  function masquer() {
    [].forEach.call(document.querySelectorAll('#appSidebar .app-nav-item[data-page]'), function (b) {
      if (MASQUEES.indexOf(b.getAttribute('data-page')) >= 0) b.classList.add('prism-masque');
    });
  }
  var bar, mainRow, subRow, pills, subs, siteSlot, account, accountMenu;
  var sections = [];   // [{ label, pages:[{page,label,badge}] }]
  var activePage = null;

  function last() { try { return JSON.parse(sessionStorage.getItem(LAST_KEY) || '{}'); } catch (_) { return {}; } }
  function remember(i, page) { var m = last(); m[i] = page; try { sessionStorage.setItem(LAST_KEY, JSON.stringify(m)); } catch (_) {} }

  function textOf(btn) {
    var c = btn.cloneNode(true);
    [].forEach.call(c.querySelectorAll('.app-nav-icon,.app-nav-badge'), function (n) { n.remove(); });
    return c.textContent.replace(/\s+/g, ' ').trim();
  }
  function cap(s) { s = s.toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1); }

  /* Lit la structure du menu latéral existant : une seule source pour les deux menus. */
  function readSections() {
    var nav = document.querySelector('#appSidebar .prism-native-nav');
    if (!nav) return false;
    masquer();
    sections = [];
    var home = nav.querySelector(':scope > .app-nav-item[data-page]');
    if (home) sections.push({ label: 'Accueil', pages: [{ page: home.getAttribute('data-page'), label: 'Accueil' }], single: true });
    [].forEach.call(nav.querySelectorAll(':scope > details.prism-nav-section'), function (d) {
      var sum = d.querySelector('summary span:not(.prism-nav-symbol):not(.prism-nav-chevron)');
      var raw = sum ? sum.textContent.trim().toUpperCase() : '';
      var pages = [].filter.call(d.querySelectorAll('.app-nav-item[data-page]'), function (b) { return !b.classList.contains('prism-masque'); }).map(function (b) {
        var badge = b.querySelector('.app-nav-badge');
        return { page: b.getAttribute('data-page'), label: textOf(b), badge: badge ? badge.textContent.trim() : '' };
      });
      if (pages.length) sections.push({ label: SHORT[raw] || cap(raw), pages: pages });
    });
    return sections.length > 0;
  }

  function sectionOf(page) {
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].pages.some(function (p) { return p.page === page; })) return i;
    }
    return -1;
  }

  function go(page) { if (typeof window.navigateApp === 'function') window.navigateApp(page); }

  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }

  function build() {
    bar = el('header', 'prism-topbar no-print');
    bar.id = 'prism-topbar';
    bar.setAttribute('aria-label', 'Navigation principale');

    mainRow = el('div', 'ptb-row');
    var logo = el('button', 'ptb-logo');
    logo.type = 'button'; logo.setAttribute('aria-label', 'Prism — tableau de bord');
    var mark = el('img', 'ptb-mark'); mark.src = './prism-mark.svg'; mark.alt = ''; mark.width = 30; mark.height = 30;
    logo.appendChild(mark); logo.appendChild(el('span', 'ptb-word', 'Prism'));
    logo.addEventListener('click', function () { if (sections[0]) go(sections[0].pages[0].page); });

    pills = el('nav', 'ptb-pills');
    pills.setAttribute('aria-label', 'Rubriques');
    rebuildPills();

    var right = el('div', 'ptb-right');
    siteSlot = el('div', 'ptb-site');
    var themeBtn = el('button', 'ptb-icon');
    themeBtn.type = 'button'; themeBtn.id = 'ptb-theme';
    themeBtn.addEventListener('click', function () {
      if (window.PrismTheme) window.PrismTheme.set(window.PrismTheme.get() === 'dark' ? 'light' : 'dark');
      setTimeout(syncTheme, 0);
    });

    account = el('button', 'ptb-account');
    account.type = 'button'; account.setAttribute('aria-haspopup', 'true'); account.setAttribute('aria-expanded', 'false');
    account.setAttribute('aria-label', 'Mon compte');
    accountMenu = el('div', 'ptb-account-menu');
    accountMenu.hidden = true;
    accountMenu.innerHTML = '<span class="ptb-account-email"></span>';
    var out = el('button', 'ptb-account-out', 'Se déconnecter');
    out.type = 'button';
    out.addEventListener('click', function () { if (typeof window.logoutIdentity === 'function') window.logoutIdentity(); });
    accountMenu.appendChild(out);
    account.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = accountMenu.hidden;
      accountMenu.hidden = !open; account.setAttribute('aria-expanded', String(open));
      if (open) syncAccount();
    });
    document.addEventListener('click', function (e) {
      if (!accountMenu.hidden && !accountMenu.contains(e.target)) { accountMenu.hidden = true; account.setAttribute('aria-expanded', 'false'); }
    });
    var accWrap = el('div', 'ptb-account-wrap');
    accWrap.appendChild(account); accWrap.appendChild(accountMenu);

    right.appendChild(siteSlot); right.appendChild(themeBtn); right.appendChild(accWrap);
    mainRow.appendChild(logo); mainRow.appendChild(pills); mainRow.appendChild(right);

    subRow = el('div', 'ptb-row ptb-subrow');
    subs = el('nav', 'ptb-subs');
    subs.setAttribute('aria-label', 'Pages de la rubrique');
    subRow.appendChild(subs);

    bar.appendChild(mainRow); bar.appendChild(subRow);
    body.insertBefore(bar, body.firstChild);
    syncTheme(); syncAccount();
  }

 function rebuildPills() {
    if (!pills) return;
    pills.textContent = '';
    sections.forEach(function (s, i) {
      var b = el('button', 'ptb-pill');
      b.type = 'button'; b.textContent = s.label; b.setAttribute('data-section', String(i));
      b.addEventListener('click', function () {
        var target = last()[i];
        if (!s.pages.some(function (p) { return p.page === target; })) target = s.pages[0].page;
        go(target);
      });
      pills.appendChild(b);
    });
  }

  var SUN = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  var MOON = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
  var USER = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>';
  function syncTheme() {
    var b = document.getElementById('ptb-theme'); if (!b) return;
    var dark = window.PrismTheme ? window.PrismTheme.get() === 'dark' : root.getAttribute('data-theme') === 'dark';
    b.innerHTML = dark ? SUN : MOON;
    b.setAttribute('aria-label', dark ? 'Passer en mode clair' : 'Passer en mode sombre');
    b.title = b.getAttribute('aria-label');
  }
  function syncAccount() {
    var src = document.getElementById('authUserEmail');
    var email = src ? src.textContent.trim() : '';
    if (account) { if (email) account.textContent = email.charAt(0).toUpperCase(); else account.innerHTML = USER; }
    var slot = accountMenu && accountMenu.querySelector('.ptb-account-email');
    if (slot) slot.textContent = email || 'Compte connecté';
  }

  /* L'établissement : le même sélecteur que dans le menu, déplacé selon la taille d'écran. */
  function placeSite() {
    var sw = document.getElementById('prism-site-switch');
    if (!sw || !siteSlot) return;
    if (desk.matches) { if (sw.parentNode !== siteSlot) siteSlot.appendChild(sw); }
    else {
      var head = document.querySelector('#appSidebar .app-sidebar-head');
      if (head && sw.parentNode === siteSlot) head.parentNode.insertBefore(sw, head.nextSibling);
    }
  }

  function render() {
    if (!bar) return;
    var si = sectionOf(activePage);
    [].forEach.call(pills.children, function (b, i) {
      var on = i === si;
      b.classList.toggle('is-active', on);
      if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
    subs.innerHTML = '';
    var s = sections[si];
    var show = !!(s && !s.single && s.pages.length > 1);
    subRow.hidden = !show;
    if (show) {
      s.pages.forEach(function (p) {
        var b = el('button', 'ptb-sub' + (p.page === activePage ? ' is-active' : ''));
        b.type = 'button';
        b.textContent = p.label;
        if (p.badge) { var t = el('span', 'ptb-badge'); t.textContent = p.badge; b.appendChild(t); }
        if (p.page === activePage) b.setAttribute('aria-current', 'page');
        b.addEventListener('click', function () { go(p.page); });
        subs.appendChild(b);
      });
    }
    if (si >= 0) remember(si, activePage);
    measure();
  }

  /* La page active est celle que le menu latéral marque « active » (navigateApp le fait déjà). */
  function readActive() {
    var a = document.querySelector('#appSidebar .app-nav-item.active[data-page]');
    var p = a ? a.getAttribute('data-page') : null;
    if (p !== activePage) { activePage = p; render(); }
  }

  /* Hauteur réservée en haut de page. */
  function measure() {
    if (!bar) return;
    var h = desk.matches ? Math.ceil(bar.getBoundingClientRect().height) + 14 : 0;
    root.style.setProperty('--ptb-h', h + 'px');
    root.style.setProperty('--ptb-offset', (desk.matches && !bar.classList.contains('is-tucked') ? h : 0) + 'px');
  }

  /* Se range en descendant, revient en remontant. */
  var lastY = 0, ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var y = window.scrollY || 0, d = y - lastY;
      if (!desk.matches || y < 80 || bar.contains(document.activeElement) || !accountMenu.hidden) tuck(false);
      else if (d > 6) tuck(true);
      else if (d < -6) tuck(false);
      lastY = y;
    });
  }
  function tuck(v) {
    if (bar.classList.contains('is-tucked') === v) return;
    bar.classList.toggle('is-tucked', v);
    measure();
  }

  function apply() {
    body.classList.toggle('prism-topnav', desk.matches);
    if (!desk.matches) tuck(false);
    placeSite(); measure();
  }

  function mount() {
    if (!document.getElementById('appSidebar') || !readSections()) return false;
    build();
    var nav = document.querySelector('#appSidebar .prism-native-nav');
    new MutationObserver(readActive).observe(nav, { attributes: true, subtree: true, attributeFilter: ['class'] });
    /* D'autres scripts ajoutent des pages au menu après coup (Achats…) : on relit la structure. */
    var relire = null;
    new MutationObserver(function () {
      clearTimeout(relire);
      relire = setTimeout(function () { if (readSections()) { rebuildPills(); render(); } }, 120);
    }).observe(nav, { childList: true, subtree: true });
    var email = document.getElementById('authUserEmail');
    if (email) new MutationObserver(syncAccount).observe(email, { childList: true, characterData: true, subtree: true });
    new MutationObserver(syncTheme).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    if (window.ResizeObserver) new ResizeObserver(measure).observe(bar);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    bar.addEventListener('focusin', function () { tuck(false); });
    desk.addEventListener ? desk.addEventListener('change', apply) : desk.addListener(apply);
    window.addEventListener('load', function () { placeSite(); syncAccount(); measure(); });
    setTimeout(placeSite, 1500);
    apply(); readActive(); render();
    return true;
  }
  var tries = 0;
  function start() { if (!mount() && ++tries < 40) setTimeout(start, 250); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

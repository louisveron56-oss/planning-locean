/* Prism — mutualisation des lectures de données (navigateur).
   Plusieurs modules (accueil, ventes, ratio RH, qualité, tableau unifié) demandent les mêmes
   données au même moment. Ce script fait un seul appel réseau par adresse et partage la réponse
   pendant 60 secondes, uniquement pour les lectures (GET) de la liste ci-dessous.
   - Jamais pour la paie ni pour les écritures (POST).
   - Chaque compte a sa propre mémoire (clé = adresse + jeton de connexion), vidée à la déconnexion.
   - ?refresh=1 contourne la mémoire.
   Aucun changement visuel. À charger avant les modules. */
(function () {
  'use strict';
  if (!window.fetch || window.__prismFetchCache) return;
  window.__prismFetchCache = true;

  var TTL = 60 * 1000;
  var SHARED = /^\/\.netlify\/functions\/(sales|sales-details|rh-monthly|materials-monthly|purchase-sheets)(\?|$)/;
  var nativeFetch = window.fetch.bind(window);
  var memory = new Map();

  function pathOf(input) {
    try {
      var raw = typeof input === 'string' ? input : (input && input.url) || '';
      var u = new URL(raw, location.href);
      if (u.origin !== location.origin) return null;
      return u.pathname + u.search;
    } catch (_) { return null; }
  }

  function authOf(input, init) {
    try {
      var h = new Headers((init && init.headers) || (input && typeof input !== 'string' && input.headers) || undefined);
      return h.get('Authorization') || '';
    } catch (_) { return ''; }
  }

  function rebuild(entry) {
    return new Response(entry.body, { status: entry.status, statusText: entry.statusText, headers: entry.headers });
  }

  function withSignal(promise, signal) {
    if (!signal) return promise;
    if (signal.aborted) return Promise.reject(signal.reason || new DOMException('Aborted', 'AbortError'));
    return new Promise(function (resolve, reject) {
      var onAbort = function () { reject(signal.reason || new DOMException('Aborted', 'AbortError')); };
      signal.addEventListener('abort', onAbort, { once: true });
      promise.then(function (v) { signal.removeEventListener('abort', onAbort); resolve(v); },
                   function (e) { signal.removeEventListener('abort', onAbort); reject(e); });
    });
  }

  window.fetch = function (input, init) {
    var method = ((init && init.method) || (input && typeof input !== 'string' && input.method) || 'GET').toUpperCase();
    var path = method === 'GET' ? pathOf(input) : null;
    if (!path || !SHARED.test(path)) return nativeFetch(input, init);

    var key = path.replace(/([?&])refresh=1(&|$)/, '$1').replace(/[?&]$/, '') + '|' + authOf(input, init);
    var force = /[?&]refresh=1(&|$)/.test(path);
    var now = Date.now();
    var hit = memory.get(key);
    var signal = init && init.signal;

    if (!force && hit && (hit.pending || now - hit.at < TTL)) {
      return withSignal(hit.pending || Promise.resolve(hit.entry), signal).then(rebuild);
    }

    // Appel partagé, sans le signal d'annulation d'un module en particulier.
    var sharedInit = Object.assign({}, init || {});
    delete sharedInit.signal;
    var pending = nativeFetch(input, sharedInit).then(function (res) {
      return res.text().then(function (body) {
        var entry = { body: body, status: res.status, statusText: res.statusText, headers: Array.from(res.headers.entries()) };
        if (res.ok) memory.set(key, { at: Date.now(), entry: entry });
        else memory.delete(key);
        return entry;
      });
    }, function (err) { memory.delete(key); throw err; });

    memory.set(key, { at: now, pending: pending });
    return withSignal(pending, signal).then(rebuild);
  };

  function clear() { memory.clear(); }
  window.prismClearDataCache = clear;
  function hook() {
    if (window.netlifyIdentity && window.netlifyIdentity.on) {
      window.netlifyIdentity.on('logout', clear);
      window.netlifyIdentity.on('login', clear);
      return true;
    }
    return false;
  }
  if (!hook()) document.addEventListener('DOMContentLoaded', hook, { once: true });
})();

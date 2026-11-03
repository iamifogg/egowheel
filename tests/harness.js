/* Headless harness: loads the real browser scripts into a Node vm context with a
 * permissive fake DOM, so tests drive the *actual* game code paths. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function fakeElement() {
  const store = {
    style: {}, dataset: {}, hidden: false, disabled: false, value: '', textContent: '', innerHTML: '',
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }
  };
  const handler = {
    get(t, k) {
      if (k in t) return t[k];
      if (typeof k === 'symbol') return undefined;
      return function () { return fakeElement(); };
    },
    set(t, k, v) { t[k] = v; return true; }
  };
  return new Proxy(store, handler);
}

function scriptList() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const out = [];
  const re = /<script[^>]*src="\.\/([^"?]+)(?:\?[^"]*)?"[^>]*><\/script>/g;
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

function createGame(opts = {}) {
  const storage = new Map(Object.entries(opts.storage || {}));
  const elements = new Map();
  const documentBase = {
    querySelector(sel) { if (!elements.has(sel)) elements.set(sel, fakeElement()); return elements.get(sel); },
    querySelectorAll() { return []; },
    addEventListener() {},
    createElement() { return fakeElement(); },
    body: fakeElement(),
    documentElement: fakeElement()
  };
  const document = new Proxy(documentBase, { get(t, k) { if (k in t) return t[k]; return function () { return fakeElement(); }; } });
  const localStorage = {
    getItem: k => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: k => storage.delete(k),
    key: i => Array.from(storage.keys())[i] ?? null,
    get length() { return storage.size; },
    clear: () => storage.clear()
  };
  const hook = { headless: opts.headless !== false };
  const ctx = {
    console, document, localStorage, navigator: {}, location: { search: opts.search || '', hash: '' },
    setTimeout: (fn) => { fn(); return 0; }, clearTimeout() {}, setInterval() { return 0; }, clearInterval() {},
    requestAnimationFrame: (fn) => { fn(); return 0; }, confirm: () => true, alert() {},
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    Blob: function () {}, URL: { createObjectURL: () => '', revokeObjectURL() {} },
    __EGOWHEEL_TEST__: hook, Date, Math, JSON
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  vm.createContext(ctx);
  const scripts = opts.scripts || scriptList().map(file => ({ file, code: fs.readFileSync(path.join(ROOT, file), 'utf8') }));
  for (const { file, code } of scripts) {
    vm.runInContext(code, ctx, { filename: file });
    if (file === 'src/engine/rng.js' && opts.seed !== undefined) ctx.EW.rng.use(opts.seed);
  }
  return { api: hook, EW: ctx.EW, storage, ctx };
}

module.exports = { createGame, fakeElement, ROOT };

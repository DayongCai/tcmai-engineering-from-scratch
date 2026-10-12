#!/usr/bin/env node
/**
 * dom-shim.js — minimal DOM/browser shim so a client-rendered page bundle can be
 * EXECUTED and ASSERTED in Node, with no browser and no headless tooling.
 *
 * Why: file-existence checks cannot detect a white screen. If your site renders
 * client-side (an app.js that fills <div id="app">), you need to actually run it.
 *
 * Usage:
 *
 *   const { makeEnv, loadScript, boot } = require('./dom-shim');
 *
 *   const env = makeEnv({ page: 'chapter', search: '?path=a/b/c' });
 *   for (const f of ['data.js','content.js','progress.js','figures.js','app.js']) {
 *     loadScript(env, `<site-dir>/${f}`);
 *   }
 *   boot(env);                       // fires DOMContentLoaded handlers
 *   const html = env.html();         // the rendered markup
 *   assert(html.includes('…'));
 *
 * IMPORTANT — the two shim gaps that break rendering, and why the fix is correct:
 *
 *   1. querySelector must return an ELEMENT for any selector, not null.
 *      Real apps do `document.querySelector('#filter').addEventListener(...)` on the
 *      page that owns that element. Returning null makes the render itself throw, and
 *      you end up blaming the app for a shim artifact.
 *
 *   2. document.createElementNS and document.createTextNode must exist, because SVG
 *      figure code uses them.
 *
 * Also note: this shim deliberately does NOT implement layout, events, or CSS. It is for
 * asserting that markup was produced, not for asserting how it looks.
 */

'use strict';

const HTML_NS = 'http://www.w3.org/1999/xhtml';

/**
 * @param {string} tag
 * @param {string} [ns] namespaceURI —— 必须记录。
 *   真实 DOM 里 `document.createElementNS(svgNS,'div')` 造出的是「未知 SVG 元素」，
 *   浏览器**不渲染**且不报错；夹具若不区分命名空间，这类 bug 就永远测不出来。
 */
function makeEl(tag, ns) {
  return {
    tagName: String(tag).toUpperCase(),
    namespaceURI: ns || HTML_NS,
    children: [],
    dataset: {},
    attrs: {},
    style: {},
    listeners: {},
    _html: '',
    _text: '',

    get innerHTML() { return this._html; },
    // 真实浏览器给 innerHTML 赋值会**清空并替换**子节点。
    // 夹具只存字符串不清 children，会让任何「重绘」逻辑在测试里叠加出旧节点，
    // 于是「重绘后坐标变了吗」这类断言测的是一个并不存在的环境。
    set innerHTML(v) { this._html = String(v); this.children.length = 0; },
    get textContent() { return this._text; },
    set textContent(v) { this._text = String(v); },
    get firstChild() { return this.children[0] || null; },

    setAttribute(k, v) {
      this.attrs[k] = v;
      if (k.startsWith('data-')) this.dataset[k.slice(5)] = v;
    },
    getAttribute(k) { return this.attrs[k]; },
    removeAttribute(k) { delete this.attrs[k]; },
    appendChild(c) { this.children.push(c); return c; },
    addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); },
    querySelector() { return makeEl('div'); },
    querySelectorAll() { return []; },
    closest() { return null; },
    classList: {
      _set: new Set(),
      add(...c) { c.forEach((x) => this._set.add(x)); },
      remove(...c) { c.forEach((x) => this._set.delete(x)); },
      contains(c) { return this._set.has(c); },
      toggle(c) {
        if (this._set.has(c)) { this._set.delete(c); return false; }
        this._set.add(c);
        return true;
      },
    },
  };
}

/**
 * @param {object} opts
 * @param {string} opts.page    value for document.body.dataset.page
 * @param {string} [opts.search] location.search, e.g. '?path=a/b/c'
 */
function makeEnv(opts = {}) {
  const page = opts.page || 'index';
  const search = opts.search || '';
  const store = new Map();

  const app = makeEl('div');
  app.dataset.page = page;

  const body = makeEl('body');
  body.dataset.page = page;

  const document = {
    body,
    documentElement: makeEl('html'),
    listeners: {},
    getElementById: (id) => (id === 'app' ? app : makeEl('div')),
    // Return an element for ANY selector — see the header note.
    querySelector: () => makeEl('div'),
    querySelectorAll: () => [],
    createElement: (t) => makeEl(t, HTML_NS),
    createElementNS: (ns, t) => makeEl(t, ns),
    createTextNode: (s) => ({ nodeType: 3, textContent: String(s) }),
    addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); },
  };

  const window = {
    document,
    // protocol 是真实 location 必有的字段：页面会用它判断「能否 fetch 同目录文件」。
    // 夹具里少了它，任何读 location.protocol 的代码都会在测试里炸而在浏览器里正常 ——
    // 夹具与真实环境不一致时，测试就在测一个不存在的东西。
    location: { search, href: 'http://localhost/', protocol: 'http:', hostname: 'localhost' },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: (k) => { store.delete(k); },
      key: (i) => [...store.keys()][i] ?? null,
      get length() { return store.size; },
    },
    addEventListener() {},
    removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    requestAnimationFrame: () => 0,
    cancelAnimationFrame() {},
    MutationObserver: class { observe() {} disconnect() {} },
    performance: { now: () => 0 },
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    navigator: { userAgent: 'node-shim' },
  };

  return {
    window,
    document,
    app,
    store,
    page,
    /** the rendered markup produced by the app */
    html: () => app.innerHTML,
    /** raw localStorage content for a key (for asserting persistence) */
    stored: (k) => window.localStorage.getItem(k),
  };
}

/** Read and execute one browser script inside the shim environment. */
function loadScript(env, file) {
  const fs = require('node:fs');
  const src = fs.readFileSync(file, 'utf8');
  // eslint-disable-next-line no-new-func
  const fn = new Function(
    'window', 'document', 'location', 'localStorage', 'matchMedia', 'performance',
    'requestAnimationFrame', 'cancelAnimationFrame', 'MutationObserver',
    'URLSearchParams', 'URL', 'navigator',
    `${src}\n//# sourceURL=${file}`
  );
  fn(
    env.window, env.document, env.window.location, env.window.localStorage,
    env.window.matchMedia, env.window.performance,
    env.window.requestAnimationFrame, env.window.cancelAnimationFrame,
    env.window.MutationObserver, URLSearchParams, URL, env.window.navigator
  );
}

/**
 * Fire the DOMContentLoaded handlers the app registered.
 * Throws if none were registered — that means the page will never render.
 */
function boot(env) {
  const hs = env.document.listeners.DOMContentLoaded || [];
  if (!hs.length) {
    throw new Error('app never registered DOMContentLoaded — it will never render');
  }
  hs.forEach((fn) => fn());
  return env.html();
}

module.exports = { makeEl, makeEnv, loadScript, boot, HTML_NS };

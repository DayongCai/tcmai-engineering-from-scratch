#!/usr/bin/env node
/**
 * tests/test_site_render.js — 站点渲染烟雾测试
 *
 * site/app.js 是客户端渲染的：8 个 HTML 外壳里只有 <div id="app">，
 * 内容由 app.js 按 body[data-page] 生成。这意味着**光校验文件存在是不够的** ——
 * 一个 render 函数抛异常，页面就是白屏，而文件校验完全看不出来。
 *
 * 本套件用最小 DOM shim 在 Node 里真实执行 app.js，逐页渲染并断言关键内容：
 *   - 每页渲染不抛异常，且产出非空 HTML
 *   - 章节页含 MOTTO/PROBLEM/代码/小测/实验台
 *   - 图形挂载点存在，且图形名已在 figures.js 注册
 *   - 进度接线到 TCMProgress（不是各页自己写 localStorage）
 *   - 免责声明出现在该出现的地方
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SITE = path.join(ROOT, 'site');

// ── 最小 DOM / 浏览器环境 shim ──────────────────────────────
function makeEnv(page, search) {
  const store = new Map();

  class El {
    constructor(tag) {
      this.tagName = String(tag).toUpperCase();
      this.children = [];
      this.dataset = {};
      this.attrs = {};
      this._html = '';
      this.style = {};
      this.classList = { add() {}, contains: () => false };
      this.listeners = {};
    }
    get innerHTML() { return this._html; }
    set innerHTML(v) { this._html = String(v); }
    setAttribute(k, v) { this.attrs[k] = v; }
    getAttribute(k) { return this.attrs[k]; }
    appendChild(c) { this.children.push(c); return c; }
    addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); }
    querySelector() { return null; }
    querySelectorAll() { return []; }
    closest() { return null; }
    removeAttribute() {}
    get firstChild() { return this.children[0] || null; }
    get textContent() { return this._text || ''; }
    set textContent(v) { this._text = String(v); }
  }

  const app = new El('div');
  app.dataset.page = page;
  const body = new El('body');
  body.dataset.page = page;

  const doc = {
    body,
    documentElement: new El('html'),
    listeners: {},
    getElementById: (id) => (id === 'app' ? app : null),
    // 任何选择器都返回一个元素：app.js 会往控台/小测容器上挂事件监听，
    // 返回 null 会让渲染本身失败 —— 与真实浏览器行为不一致。
    querySelector: () => new El('div'),
    querySelectorAll: () => [],
    createElement: (t) => new El(t),
    createElementNS: (_ns, t) => new El(t),
    createTextNode: (s) => ({ nodeType: 3, textContent: String(s) }),
    addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); },
  };

  const win = {
    document: doc,
    location: { search: search || '', href: 'http://localhost:7788/' },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    },
    addEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    requestAnimationFrame: () => 0,
    cancelAnimationFrame() {},
    MutationObserver: class { observe() {} },
  };

  return { app, doc, win, store };
}

/** 在 shim 环境里加载并执行一个站点脚本 */
function loadScript(file, env) {
  const src = fs.readFileSync(path.join(SITE, file), 'utf8');
  const fn = new Function(
    'window', 'document', 'location', 'localStorage', 'matchMedia',
    'requestAnimationFrame', 'cancelAnimationFrame', 'MutationObserver', 'URLSearchParams', 'performance',
    `${src}\n//# sourceURL=${file}`
  );
  fn(
    env.win, env.doc, env.win.location, env.win.localStorage, env.win.matchMedia,
    env.win.requestAnimationFrame, env.win.cancelAnimationFrame,
    env.win.MutationObserver, URLSearchParams,
    { now: () => 0 }
  );
}

/** 渲染一页，返回生成的 HTML */
function renderPage(page, search) {
  const env = makeEnv(page, search);
  // 顺序与 index.html 一致：data → content → progress → figures → app
  loadScript('data.js', env);
  loadScript('content.js', env);
  loadScript('progress.js', env);
  loadScript('figures.js', env);
  loadScript('app.js', env);
  const boot = env.doc.listeners.DOMContentLoaded;
  assert.ok(Array.isArray(boot) && boot.length, 'app.js 未注册 DOMContentLoaded');
  boot.forEach((fn) => fn());
  return { html: env.app.innerHTML, env };
}

const PAGES = [
  ['index', '', '总览'],
  ['catalog', '', '课程目录'],
  ['roadmap', '', '进度'],
  ['paths', '', '学习路径'],
  ['glossary', '', '术语表'],
  ['about', '', '关于'],
];

// ── 逐页烟雾测试 ────────────────────────────────────────────

for (const [page, search, label] of PAGES) {
  test(`[${page}] 渲染不抛异常，产出非空 HTML 且含页头导航`, () => {
    const { html } = renderPage(page, search);
    assert.ok(html.length > 800, `${page} 渲染结果过短（${html.length} 字符），可能是白屏`);
    assert.ok(html.includes('site-header'), `${page} 缺少页头`);
    assert.ok(html.includes('site-nav'), `${page} 缺少导航`);
    assert.ok(html.includes('site-footer'), `${page} 缺少页脚`);
    void label;
  });
}

test('[index] 含计数条、五阶段、八院系与 6 张动画图挂载点', () => {
  const { html } = renderPage('index');
  assert.ok(html.includes('生'), '缺少五阶段');
  assert.ok(html.includes('壮') && html.includes('老') && html.includes('已'));
  for (const d of ['中医系', '中药系', '针灸系', '骨伤系', '护理系', '管理系', '智能系', '五官口腔系']) {
    assert.ok(html.includes(d), `首页缺少院系 ${d}`);
  }
  const figs = [...html.matchAll(/data-figure="([a-z0-9-]+)"/g)].map((m) => m[1]);
  assert.ok(figs.length >= 6, `首页图形挂载点只有 ${figs.length} 个，设计基线为 6 个`);
  assert.ok(/不构成临床诊疗建议/.test(html), '首页缺少临床免责声明');
});

test('[catalog] 列出全部 120 门学科，且类型标签渲染正确', () => {
  const { html } = renderPage('catalog');
  const rows = (html.match(/<tr>/g) || []).length;
  assert.ok(rows >= 120, `课程目录只有 ${rows} 行，应为 120 门学科`);
  for (const t of ['Core', 'Build', 'Reference', 'Clinic']) {
    assert.ok(html.includes(`>${t}<`), `类型标签 ${t} 未渲染`);
  }
});

test('[catalog?dept=] 院系筛选生效', () => {
  const { html } = renderPage('catalog', '?dept=03-zhenjiu');
  assert.ok(html.includes('经络学'), '针灸系筛选后应含经络学');
  assert.ok(!html.includes('中医基础理论'), '针灸系筛选后不应出现中医系的学科');
});

test('[chapter] 完整渲染：MOTTO / PROBLEM / 双根因 / 代码 / 小测 / 实验台', () => {
  const key = '01-zhongyi/01-zhongyi-jichu-lilun/01-yin-yang-er-fenlei';
  const { html } = renderPage('chapter', `?path=${encodeURIComponent(key)}`);
  assert.ok(html.includes('MOTTO'), '缺 MOTTO 卡');
  assert.ok(html.includes('PROBLEM'), '缺 PROBLEM');
  assert.ok(html.includes('双根因定位'), '缺双根因');
  assert.ok(html.includes('张仲景') === false && html.includes('阴阳者'), '缺经典引文');
  assert.ok(html.includes('class="doc"'), '缺正文容器');
  assert.ok(html.includes('chapter-head'), '缺章节头卡');
  assert.ok(html.includes('id="lab-src"'), '缺实验台');
  assert.ok(html.includes('id="quiz"'), '缺小测区');
  assert.ok(html.includes('前置自测') && html.includes('过程检查') && html.includes('课后检验'),
    '小测三档阶段标签未渲染');
  const opts = (html.match(/class="opt"/g) || []).length;
  assert.strictEqual(opts, 24, `小测选项应为 6 题 × 4 = 24 项，实得 ${opts}`);
});

test('[chapter] 图形挂载点在正文里被渲染为可挂载的 div', () => {
  const key = '01-zhongyi/01-zhongyi-jichu-lilun/02-wu-xing-duo-fenlei';
  const { html } = renderPage('chapter', `?path=${encodeURIComponent(key)}`);
  assert.ok(html.includes('data-figure="wuxing-cycle"'), '五行章的图形未渲染进正文');
});

test('[chapter] 未知路径给出提示而非白屏', () => {
  const { html } = renderPage('chapter', '?path=99-nope/99-nope/99-nope');
  assert.ok(html.includes('未找到章节'), '未找到章节时应有提示');
  assert.ok(html.includes('catalog.html'), '提示里应给出返回课程目录的链接');
});

test('[subject] 渲染学科页：章节列表与交付轨道', () => {
  const { html } = renderPage('subject', '?path=01-zhongyi/01-zhongyi-jichu-lilun');
  assert.ok(html.includes('中医基础理论'));
  assert.ok(html.includes('章节（3/10）'), '学科页章节计数错误');
  assert.ok(html.includes('[tcmP]') && html.includes('[textbooks]'), '缺两条交付轨道');
  assert.ok(html.includes('platform/courses/01-zhongyi/01-zhongyi-jichu-lilun/'), '缺平台路径');
});

test('[paths] 5 条学习路径全部渲染，且含毕业设计', () => {
  const { html } = renderPage('paths');
  for (const t of ['临床型', '工程型', '科研型', '教学型', '复合型']) {
    assert.ok(html.includes(t), `缺学习路径 ${t}`);
  }
  const caps = (html.match(/毕业设计/g) || []).length;
  assert.ok(caps >= 5, `毕业设计块只有 ${caps} 个，应为 5 条路径各一`);
});

test('[glossary] 桥梁表与双术语表都渲染出内容', () => {
  const { html } = renderPage('glossary');
  assert.ok(html.includes('中医 ↔ AI 桥梁对照'));
  assert.ok(html.includes('中医术语') && html.includes('AI / 工程术语'));
  assert.ok(html.includes('阴阳'), '术语表内容未渲染');
  assert.ok(html.includes('D 级') || html.includes('误导'), '桥梁表的 D 级误用未渲染');
});

test('[roadmap] 含学期排课与院系明细，且进度条宽度为 0..100', () => {
  const { html } = renderPage('roadmap');
  assert.ok(html.includes('学期排课'));
  assert.ok(html.includes('院系明细'));
  const widths = [...html.matchAll(/class="bar"><span style="width:(\d+)%"/g)].map((m) => Number(m[1]));
  assert.ok(widths.length >= 120, `进度条只有 ${widths.length} 个，应覆盖 120 门学科`);
  for (const w of widths) assert.ok(w >= 0 && w <= 100, `进度条宽度越界: ${w}`);
});

test('进度接线到 TCMProgress，且访问章节会记录 visit', () => {
  const key = '01-zhongyi/01-zhongyi-jichu-lilun/01-yin-yang-er-fenlei';
  const { env } = renderPage('chapter', `?path=${encodeURIComponent(key)}`);
  const raw = env.win.localStorage.getItem('tcmai:progress:v1');
  assert.ok(raw, '访问章节后未写入进度（progress.recordVisit 未接线）');
  const state = JSON.parse(raw);
  assert.ok(state.chapters[key], '进度里没有当前章节键');
  assert.ok(state.chapters[key].visitedAt > 0);
});

test('answer 记录可写入且 quizScore 能读出（不依赖 UI 事件）', () => {
  const { env } = renderPage('chapter', '?path=01-zhongyi/01-zhongyi-jichu-lilun/01-yin-yang-er-fenlei');
  const key = '01-zhongyi/01-zhongyi-jichu-lilun/01-yin-yang-er-fenlei';
  env.win.TCMProgress.recordAnswer(key, 'pre-q0', 1, true);
  env.win.TCMProgress.recordAnswer(key, 'check-q1', 2, false);
  const s = env.win.TCMProgress.quizScore(key);
  assert.strictEqual(s.answered, 2);
  assert.strictEqual(s.correct, 1);
  assert.strictEqual(env.win.TCMProgress.isComplete(key), false);
  env.win.TCMProgress.markComplete(key);
  assert.strictEqual(env.win.TCMProgress.isComplete(key), true);
});

test('markdown 渲染器：代码块/表格/引用/mermaid/公式各就各位', () => {
  const env = makeEnv('index', '');
  loadScript('data.js', env);
  loadScript('content.js', env);
  loadScript('progress.js', env);
  loadScript('figures.js', env);
  loadScript('app.js', env);
  // md.js 是构建期的，这里直接 require
  const md = require('../site/md');
  const out = md.render([
    '# 标题',
    '',
    '> 引用 `行内码`',
    '',
    '| a | b |',
    '|---|---|',
    '| 1 | 2 |',
    '',
    '```javascript',
    'const x = 1;',
    '```',
    '',
    '<div data-figure="wuxing-cycle"></div>',
    '',
    '$p = \\sigma(z)$',
  ].join('\n'));
  assert.ok(out.includes('<h1'), '标题未渲染');
  assert.ok(out.includes('<blockquote>'), '引用未渲染');
  assert.ok(out.includes('<code>行内码</code>'), '行内代码未渲染');
  assert.ok(out.includes('<table>') && out.includes('<th>a</th>'), '表格未渲染');
  assert.ok(out.includes('class="codeblock"') && out.includes('lang-javascript'), '代码块未渲染');
  assert.ok(out.includes('figure-host') && out.includes('data-figure="wuxing-cycle"'), '图形占位未渲染');
  assert.ok(out.includes('class="math"'), '行内公式未渲染');
});

test('markdown 渲染器转义原始 HTML（防注入）', () => {
  const md = require('../site/md');
  const out = md.render('<script>alert(1)</script>');
  assert.ok(!out.includes('<script>'), '原始 HTML 未被转义');
  assert.ok(out.includes('&lt;script&gt;'), '应转义为实体');
});

test('figures.js 用最小 DOM 能挂载全部 6 张图而不抛异常', () => {
  const env = makeEnv('index', '');
  loadScript('figures.js', env);
  assert.ok(env.win.TCMFigures, 'figures.js 未暴露 TCMFigures');
  const defined = Object.keys(env.win.TCMFigures.FIGURES);
  assert.ok(defined.length >= 6, `只注册了 ${defined.length} 张图`);
  for (const name of defined) {
    // 每个图形函数接受一个宿主元素并绘制 SVG
    const host = env.doc.createElement('div');
    host.dataset = { figure: name };
    const created = [];
    const origCreate = env.doc.createElementNS;
    void origCreate;
    try {
      // 用真实实现创建 SVG 元素
      env.win.__testSvgCalls = created;
      env.win.TCMFigures.FIGURES[name](host);
    } catch (e) {
      assert.fail(`图形 ${name} 挂载抛异常: ${e.message}`);
    }
  }
});

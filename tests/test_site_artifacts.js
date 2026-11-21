#!/usr/bin/env node
/**
 * tests/test_site_artifacts.js — 站点生成物形状测试
 *
 * 校验 site/data.js、site/content.js、8 个 HTML 外壳与 manifest.json。
 * 站点是 [tcmP] 的主要交付面，生成物坏掉必须在 CI 上直接暴露。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SITE = path.join(ROOT, 'site');

/** 在沙箱里执行生成的数据脚本，取出挂载到 window 的对象 */
function loadGenerated(file) {
  const src = fs.readFileSync(path.join(SITE, file), 'utf8');
  const sandbox = { window: {} };
  // 生成物只做 window.X = {...} 赋值，无副作用
  new Function('window', src)(sandbox.window);
  return sandbox.window;
}

const PAGES = ['index', 'catalog', 'subject', 'chapter', 'roadmap', 'paths', 'glossary', 'books', 'about'];

test('site/data.js 存在且可执行，挂载 TCMAI_DATA', () => {
  assert.ok(fs.existsSync(path.join(SITE, 'data.js')), '缺 site/data.js —— 先跑 node site/build.js');
  const w = loadGenerated('data.js');
  assert.ok(w.TCMAI_DATA, 'data.js 未挂载 window.TCMAI_DATA');
  // 院系数 / 学科数都从单一事实来源取：写死会在扩科后静默说谎（2026-10 扩 09-jichu，8→9 / 120→135）
  const curRaw = JSON.parse(fs.readFileSync(path.join(ROOT, 'curriculum.json'), 'utf8'));
  assert.strictEqual(w.TCMAI_DATA.departments.length, curRaw.departments.length);
  const expectedSubjects = curRaw.departments.reduce((a, d) => a + d.subjects.length, 0);
  assert.strictEqual(w.TCMAI_DATA.counts.subjects, expectedSubjects);
  assert.strictEqual(w.TCMAI_DATA.semesterPlan.length, 10);
});

test('site/content.js 挂载正文，content-index.js 挂载 INDEX / PATHS / GLOSSARY', () => {
  assert.ok(fs.existsSync(path.join(SITE, 'content.js')), '缺 site/content.js');
  assert.ok(fs.existsSync(path.join(SITE, 'content-index.js')), '缺 site/content-index.js');
  const c = loadGenerated('content.js');
  assert.ok(c.TCMAI_CONTENT, '缺 window.TCMAI_CONTENT');
  const w = loadGenerated('content-index.js');
  assert.ok(w.TCMAI_CONTENT_INDEX, '缺 window.TCMAI_CONTENT_INDEX');
  assert.ok(Array.isArray(w.TCMAI_PATHS), '缺 window.TCMAI_PATHS');
  assert.ok(w.TCMAI_GLOSSARY, '缺 window.TCMAI_GLOSSARY');
  assert.strictEqual(w.TCMAI_PATHS.length, 5, '学习路径应为 5 条');
  // 元数据必须覆盖每一章正文：否则非章节页会少卡片
  assert.strictEqual(
    Object.keys(w.TCMAI_CONTENT_INDEX).length,
    Object.keys(c.TCMAI_CONTENT).length,
    'content-index 与 content 章数不一致',
  );
  for (const k of ['tcm-terms', 'ai-terms', 'bridge-map']) {
    assert.ok(w.TCMAI_GLOSSARY[k] && w.TCMAI_GLOSSARY[k].length > 500, `术语文档 ${k} 未渲染或内容过短`);
  }
});

test('content.js 里每个章节都带齐 html / code / quiz / outputs', () => {
  const w = loadGenerated('content.js');
  const keys = Object.keys(w.TCMAI_CONTENT);
  assert.ok(keys.length > 0, '没有任何已建章节被构建进站点');
  for (const k of keys) {
    const c = w.TCMAI_CONTENT[k];
    assert.ok(c.html && c.html.length > 500, `${k} 的正文 HTML 过短`);
    assert.ok(c.quiz && Array.isArray(c.quiz.questions), `${k} 缺 quiz`);
    assert.strictEqual(c.quiz.questions.length, 6, `${k} quiz 题数不是 6`);
    assert.ok(Object.keys(c.code).length > 0, `${k} 没有代码文件`);
    assert.ok(Array.isArray(c.outputs), `${k} 缺 outputs`);
    assert.ok(c.motto && c.problem, `${k} 未抽取出 MOTTO/PROBLEM`);
    assert.ok(/^\d{2}-\S+$/.test(c.chapterSlug), `${k} 章节 slug 不规范`);
  }
});

test('content.js 的章节 key 与 catalog 的学科路径一致（无孤儿内容）', () => {
  const w = loadGenerated('content.js');
  const d = loadGenerated('data.js');
  const validPrefix = new Set(d.TCMAI_DATA.departments.flatMap((dep) => dep.subjects.map((s) => `${dep.slug}/${s.slug}/`)));
  for (const k of Object.keys(w.TCMAI_CONTENT)) {
    assert.ok(
      [...validPrefix].some((p) => k.startsWith(p)),
      `章节 ${k} 不属于任何已知学科（可能是目录改名后未重建站点）`
    );
  }
});

test('8 个 HTML 外壳齐备，且都引入四份脚本', () => {
  for (const p of PAGES) {
    const f = path.join(SITE, `${p}.html`);
    assert.ok(fs.existsSync(f), `缺 site/${p}.html`);
    const html = fs.readFileSync(f, 'utf8');
    assert.ok(html.includes(`data-page="${p}"`), `${p}.html 的 body[data-page] 不是 ${p}`);
    for (const js of ['data.js', 'content.js', 'progress.js', 'figures.js', 'app.js']) {
      assert.ok(html.includes(js), `${p}.html 未引入 ${js}`);
    }
    assert.ok(html.includes('lang="zh-CN"'), `${p}.html 缺 lang 声明`);
  }
});

test('site/manifest.json 的 hash 与当前生成物一致（防止提交了过期产物）', () => {
  const mp = path.join(SITE, 'manifest.json');
  assert.ok(fs.existsSync(mp), '缺 site/manifest.json');
  const m = JSON.parse(fs.readFileSync(mp, 'utf8'));
  const crypto = require('node:crypto');
  const h = (f) => crypto.createHash('sha256').update(fs.readFileSync(path.join(SITE, f), 'utf8')).digest('hex').slice(0, 12);
  assert.strictEqual(m.dataHash, h('data.js'), 'site/data.js 与 manifest 不一致 —— 改动源数据后忘了重建站点');
  assert.strictEqual(m.contentHash, h('content.js'), 'site/content.js 与 manifest 不一致');
});

test('app.js 与 figures.js 里注册的图形名一致（无悬空图形引用）', () => {
  const app = fs.readFileSync(path.join(SITE, 'app.js'), 'utf8');
  const figs = fs.readFileSync(path.join(SITE, 'figures.js'), 'utf8');
  const used = [...app.matchAll(/data-figure="([a-z0-9-]+)"/g)].map((m) => m[1]);
  const defined = new Set([...figs.matchAll(/FIGURES\['([a-z0-9-]+)'\]\s*=/g)].map((m) => m[1]));
  // 章节文档里也可能引用图形
  const w = loadGenerated('content.js');
  for (const c of Object.values(w.TCMAI_CONTENT)) {
    for (const m of c.html.matchAll(/data-figure="([a-z0-9-]+)"/g)) used.push(m[1]);
  }
  for (const u of used) {
    assert.ok(defined.has(u), `引用了未注册的图形 "${u}"，可用: ${[...defined].join(', ')}`);
  }
  assert.ok(defined.size >= 6, `图形库只有 ${defined.size} 张，少于设计基线 6 张`);
});

test('progress.js 暴露的 API 与 app.js 使用的一致', () => {
  const prog = fs.readFileSync(path.join(SITE, 'progress.js'), 'utf8');
  const app = fs.readFileSync(path.join(SITE, 'app.js'), 'utf8');
  for (const fn of ['recordVisit', 'recordAnswer', 'markComplete', 'isComplete', 'quizScore', 'totalCompleted', 'totalVisited']) {
    assert.ok(prog.includes(`${fn}:`), `progress.js 未暴露 ${fn}`);
    assert.ok(app.includes(`PROG.${fn}`) || app.includes(`${fn}:`), `app.js 未使用 ${fn}`);
  }
  assert.ok(/localStorage/.test(prog), 'progress.js 应只用 localStorage，不发起网络请求');
  assert.ok(!/fetch\(|XMLHttpRequest/.test(prog), 'progress.js 不得发起网络请求（进度只存本机）');
});

test('serve.js 有目录穿越防护', () => {
  const s = fs.readFileSync(path.join(SITE, 'serve.js'), 'utf8');
  assert.ok(s.includes('startsWith(base)'), 'serve.js 缺少路径穿越校验');
  assert.ok(s.includes('resolveSafe'), 'serve.js 应通过 resolveSafe 解析路径');
});

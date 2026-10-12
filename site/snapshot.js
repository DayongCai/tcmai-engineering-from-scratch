#!/usr/bin/env node
/**
 * site/snapshot.js — 把站点打成单文件 HTML 快照
 *
 *   node site/snapshot.js                  # 全部页面 → site/snapshot/<page>.html
 *   node site/snapshot.js index chapter    # 只打指定页面
 *
 * 用途:
 *   1. 离线分发：一个 .html 文件发给别人就能看，不需要服务器、不需要仓库
 *   2. CI 产物：作为可下载的站点快照存档
 *   3. 审阅：改版时对比进度
 *
 * 实现：把 style.css / data.js / content.js / progress.js / figures.js / app.js
 * 全部内联进一个 HTML。因为都用 CDN 之外的东西，所以离线可用。
 *
 * 注意：快照是**构建期生成物**，不参与交互式开发，且不入库（见 .gitignore）。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SITE = __dirname;
const OUT = path.join(SITE, 'snapshot');

const ALL_PAGES = [
  ['index', '总览'],
  ['catalog', '课程目录'],
  ['subject', '学科'],
  ['chapter', '章节'],
  ['roadmap', '进度'],
  ['paths', '学习路径'],
  ['glossary', '术语表'],
  ['about', '关于'],
];

const argv = process.argv.slice(2);
const pages = argv.length ? ALL_PAGES.filter(([p]) => argv.includes(p)) : ALL_PAGES;

if (!pages.length) {
  console.error(`✗ 未匹配到页面。可用: ${ALL_PAGES.map(([p]) => p).join(', ')}`);
  process.exit(1);
}

for (const required of ['data.js', 'content.js', 'style.css', 'app.js']) {
  if (!fs.existsSync(path.join(SITE, required))) {
    console.error(`✗ 缺 site/${required} —— 先跑: node scripts/build_catalog.js && node site/build.js`);
    process.exit(1);
  }
}

const read = (f) => fs.readFileSync(path.join(SITE, f), 'utf8');

const css = read('style.css');
const js = {
  data: read('data.js'),
  content: read('content.js'),
  progress: read('progress.js'),
  figures: read('figures.js'),
  app: read('app.js'),
};

fs.mkdirSync(OUT, { recursive: true });

const data = JSON.parse(read('content.js').match(/window\.TCMAI_CONTENT = ([\s\S]*?);\n/)[1] || '{}');
const catalogCounts = JSON.parse(read('data.js').match(/window\.TCMAI_DATA = ([\s\S]*);\n/)[1] || '{}').counts || {};

let built = 0;
const index = [];

for (const [page, label] of pages) {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${label} · 中医药 · 从零工程（单文件快照）</title>
<meta name="generator" content="site/snapshot.js"/>
<style>
${css}
.snapshot-banner{background:#fdf1dd;border-bottom:1px solid #ead6b0;color:#8a6410;
  font-size:13px;padding:8px 20px;text-align:center}
</style>
</head>
<body data-page="${page}">
<div class="snapshot-banner">
  单文件离线快照 · 由 <code>node site/snapshot.js</code> 生成 · 交互（小测 / 实验台 / 动画图 / 本机进度）在浏览器内本地运行，不联网
</div>
<div id="app"></div>
<noscript><p style="padding:40px;font-family:system-ui">本快照需要启用 JavaScript。</p></noscript>
<script>${js.data}</script>
<script>${js.content}</script>
<script>${js.progress}</script>
<script>${js.figures}</script>
<script>${js.app}</script>
</body>
</html>
`;
  const out = path.join(OUT, `${page}.html`);
  fs.writeFileSync(out, html, 'utf8');
  index.push({ page, label, bytes: Buffer.byteLength(html, 'utf8') });
  built += 1;
}

console.log('═══ [tcmP] 单文件快照 ═══');
console.log(`  章节数据: ${Object.keys(data).length} 章 · 院系 ${catalogCounts.departments || '?'} · 学科 ${catalogCounts.subjects || '?'}\n`);
for (const r of index) {
  console.log(`  ✅ ${r.page.padEnd(9)} ${(r.bytes / 1024).toFixed(0).padStart(4)} KB  →  site/snapshot/${r.page}.html`);
}
console.log(`\n完成: ${built} 个快照。可直接用浏览器打开，无需服务器。`);
console.log('分发示例: 把 site/snapshot/index.html 单独发给别人即可。');

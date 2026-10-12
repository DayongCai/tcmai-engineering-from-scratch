#!/usr/bin/env node
/**
 * site/pages.js — 生成站点 HTML 外壳
 *
 * 8 个页面共用同一套 head/脚本引入，只有 <title> 与 body[data-page] 不同。
 * 页面内容全部由 site/app.js 在客户端按 data-page 渲染。
 *
 * 由 npm run site 调用（在 build.js 之前）。
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SITE = __dirname;

const SITE_TITLE = '中医药 · 从零工程 | tcmai-engineering-from-scratch';

const PAGES = [
  ['index', '总览', '中医药 · 从零起步的工程化教育体系 — 1 领域 / 8 院系 / 120 学科'],
  ['catalog', '课程目录', '课程目录 — 120 门学科，按院系与学期筛选'],
  ['subject', '学科', '学科详情 — 章节地图与交付轨道'],
  ['chapter', '章节', '章节 — 讲解 / 代码 / 小测 / 产出物'],
  ['roadmap', '进度', '进度 — 院系、学科、章节建设状态'],
  ['paths', '学习路径', '学习路径 — 临床型 / 工程型 / 科研型 / 教学型 / 复合型'],
  ['glossary', '术语表', '双术语表 — 中医术语 / AI 术语 / 桥梁对照'],
  ['semtensor', '语义张量', '三维极坐标语义张量 — 颜色赋值公理、母子父三球与语义域分布'],
  ['about', '关于', '关于本平台 — 架构、数据管线与免责声明'],
];

/**
 * 脚本加载顺序有硬约束：
 *   semtensor-spec.js 必须在 semtensor.js **之前** ——
 *   semtensor.js 在求值时就读取 window.TCMAI_SEMTENSOR_SPEC，
 *   顺序反了会在加载期直接抛「缺少坐标与颜色常量」。
 *   sphere.js 又必须在 semtensor.js 之后（它 require 计算核心）。
 */
const SCRIPTS = [
  'data.js',
  'semtensor-spec.js',
  'content.js',
  'progress.js',
  'semtensor.js',
  'sphere.js',
  'figures.js',
  'app.js',
];

function page(id, label, desc) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${label} · ${SITE_TITLE}</title>
<meta name="description" content="${desc}"/>
<meta name="color-scheme" content="light"/>
<link rel="stylesheet" href="style.css"/>
</head>
<body data-page="${id}">
<div id="app">
  <noscript>
    <div style="max-width:780px;margin:60px auto;padding:0 20px;font-family:system-ui">
      <h1>需要启用 JavaScript</h1>
      <p>本平台的页面内容由 <code>data.js</code> + <code>content.js</code> 在客户端渲染。
      请启用 JavaScript，或直接阅读仓库里的 Markdown 原文：
      <a href="../departments/">departments/</a> · <a href="../README.md">README.md</a>。</p>
    </div>
  </noscript>
</div>
${SCRIPTS.map((s) => `<script src="${s}"></script>`).join('\n')}
</body>
</html>
`;
}

let n = 0;
for (const [id, label, desc] of PAGES) {
  fs.writeFileSync(path.join(SITE, `${id}.html`), page(id, label, desc), 'utf8');
  n += 1;
}
console.log(`═══ [tcmP] 页面外壳 ═══`);
console.log(`  生成 ${n} 个 HTML: ${PAGES.map((p) => `${p[0]}.html`).join(' · ')}`);

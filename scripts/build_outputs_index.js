#!/usr/bin/env node
/**
 * scripts/build_outputs_index.js — 根级产出物索引（[outputs]）
 *
 *   node scripts/build_outputs_index.js            生成
 *   node scripts/build_outputs_index.js --check    只校核（索引与文件系统是否一致）
 *
 * 为什么需要：契约要求每章交出 `outputs/prompt-<base>.md` + `skill-<base>.md`
 * （可复用的提示词与技能）。这些产物散在 departments/ 下各章的 outputs/ 里，
 * 现在 3 章 6 件靠人找还行，**1086 章时等于不存在** —— 写了却找不到，与没写等价。
 *
 * 产：
 *   outputs/index.json    机器可读索引（供站点/检索/统计）
 *   outputs/README.md     人可读索引（按 院系 → 学科 → 章节 分层）
 *   outputs/index.html    自包含浏览页（可离线打开，形态参考用户既有的交流页）
 *
 * 原则：
 *   - **索引是生成物，不手抄**。任何一件产出物的增删，重跑本脚本即同步。
 *   - 已建章节若缺产物，要**显式列出缺口**（`gaps`），不能让索引看起来比现实漂亮。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'outputs');
const CHECK_ONLY = process.argv.includes('--check');

const cur = JSON.parse(fs.readFileSync(path.join(ROOT, 'curriculum.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog.json'), 'utf8'));

// ── 扫描 ──────────────────────────────────────────────────────────────

const KINDS = ['prompt', 'skill', 'agent', 'mcp'];

/** 取章节标题：契约要求 docs/zh.md 有 H1 */
function chapterTitle(chapterDir) {
  for (const rel of ['docs/zh.md', 'README.md']) {
    const p = path.join(chapterDir, rel);
    if (!fs.existsSync(p)) continue;
    const m = /^#\s+(.+)$/m.exec(fs.readFileSync(p, 'utf8'));
    if (m) return m[1].trim();
  }
  return path.basename(chapterDir);
}

/** 从 skill 的 YAML frontmatter 取字段 */
function frontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  if (!m) return {};
  const o = {};
  for (const line of m[1].split('\n')) {
    const mm = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (mm) o[mm[1]] = mm[2].trim().replace(/^["']|["']$/g, '');
  }
  return o;
}

const items = [];
const gaps = [];

for (const dept of catalog.departments) {
  for (const subj of dept.subjects) {
    const subjDir = path.join(ROOT, dept.path, subj.slug);
    const chapRoot = path.join(subjDir, 'chapters');
    if (!fs.existsSync(chapRoot)) continue;

    for (const chSlug of fs.readdirSync(chapRoot).sort()) {
      const chDir = path.join(chapRoot, chSlug);
      if (!fs.statSync(chDir).isDirectory()) continue;
      const outDir = path.join(chDir, 'outputs');
      const base = chSlug.replace(/^\d+-/, '');
      const title = chapterTitle(chDir);
      const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');

      if (!fs.existsSync(outDir)) {
        gaps.push({ dept: dept.title, subject: subj.title, chapter: chSlug, title, missing: ['outputs/ 整个目录'] });
        continue;
      }

      const files = fs.readdirSync(outDir).filter((f) => f.endsWith('.md'));
      const found = {};
      for (const f of files) {
        const m = /^(prompt|skill|agent|mcp)-(.+)\.md$/.exec(f);
        if (!m) continue;
        const kind = m[1];
        const text = fs.readFileSync(path.join(outDir, f), 'utf8');
        const fm = kind === 'skill' ? frontmatter(text) : {};
        const h1 = /^#\s+(.+)$/m.exec(text);
        found[kind] = {
          kind,
          file: rel(path.join(outDir, f)),
          title: (h1 ? h1[1] : fm.name || f).trim(),
          name: fm.name || null,
          description: fm.description || null,
          version: fm.version || null,
          chars: text.replace(/\s/g, '').length,
        };
      }

      // 契约要求的两件
      const missing = [];
      if (!found.prompt) missing.push('prompt-*.md');
      if (!found.skill) missing.push('skill-*.md');
      const extra = KINDS.filter((k) => found[k] && !['prompt', 'skill'].includes(k)).map((k) => `${k}-*.md`);

      for (const k of Object.keys(found)) {
        items.push({
          dept: dept.title, deptSlug: dept.slug,
          subject: subj.title, subjectSlug: subj.slug,
          chapter: chSlug, chapterTitle: title,
          ...found[k],
        });
      }

      if (missing.length) {
        gaps.push({ dept: dept.title, subject: subj.title, chapter: chSlug, title, missing });
      }
    }
  }
}

items.sort((a, b) => a.deptSlug.localeCompare(b.deptSlug) || a.subjectSlug.localeCompare(b.subjectSlug)
  || a.chapter.localeCompare(b.chapter) || KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind));

const byKind = {};
for (const it of items) byKind[it.kind] = (byKind[it.kind] || 0) + 1;

// ── 索引数据 ──────────────────────────────────────────────────────────

const index = {
  $generated: 'node scripts/build_outputs_index.js',
  note: '可复用产出物的根级索引。契约见 CONTRIBUTING.md；每章的产物是生成物，索引是它们的生成物。',
  counts: {
    items: items.length,
    chaptersWithOutputs: new Set(items.map((i) => `${i.deptSlug}/${i.subjectSlug}/${i.chapter}`)).size,
    chaptersBuilt: catalog.counts.subjects ? undefined : undefined,
    byKind,
    gaps: gaps.length,
  },
  // 按 院系 → 学科 → 章节 分层（人读与站点的共同形状）
  tree: catalog.departments.map((d) => ({
    dept: d.title, slug: d.slug, icon: d.icon,
    subjects: d.subjects.map((s) => {
      const chs = [...new Set(items.filter((i) => i.subjectSlug === s.slug).map((i) => i.chapter))];
      return {
        subject: s.title, slug: s.slug, type: s.type, semester: s.semester,
        chapters: chs.map((c) => ({
          chapter: c,
          title: items.find((i) => i.chapter === c)?.chapterTitle || c,
          outputs: items.filter((i) => i.chapter === c).map((i) => ({
            kind: i.kind, file: i.file, title: i.title, description: i.description, chars: i.chars,
          })),
        })),
      };
    }).filter((s) => s.chapters.length),
  })).filter((d) => d.subjects.length),
  items,
  gaps,
};

// ── 人可读 README ─────────────────────────────────────────────────────

function renderReadme() {
  const L = [];
  L.push('# 产出物索引', '');
  L.push('> 本章节由 `scripts/build_outputs_index.js` **生成**，请勿手改；重跑脚本同步。', '');
  L.push(`> **${index.counts.items}** 件产出物 · 覆盖 **${index.counts.chaptersWithOutputs}** 个章节`
    + ` · ${Object.entries(byKind).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  if (gaps.length) L.push(`> ⚠ **${gaps.length}** 个已建章节缺产物 —— 见文末「缺口」`);
  L.push('');

  L.push('## 这是什么', '');
  L.push('每章的 `outputs/` 交出两件**可复用**的东西（契约见 [CONTRIBUTING.md](../CONTRIBUTING.md)）：', '');
  L.push('| 产物 | 是什么 | 拿来做什么 |');
  L.push('| --- | --- | --- |');
  L.push('| `prompt-<base>.md` | 提示词 | 让大模型按本章的判断格式输出 |');
  L.push('| `skill-<base>.md` | 技能（带 frontmatter） | 把本章的流程固化成可复用操作 |');
  L.push('');
  L.push('这两件是「工程化」与「讲课」的分界 —— 代码能跑只证明写对了，**能交出去复用**才算工程化。', '');
  L.push('浏览页：[index.html](index.html)（自包含，可离线打开）· 机器可读：[index.json](index.json)', '');

  L.push('## 按院系浏览', '');
  L.push('| 院系 | 学科 | 章节 | 产出物 |');
  L.push('| --- | --- | --- | :-: |');
  for (const d of index.tree) {
    for (const s of d.subjects) {
      L.push(`| ${d.icon} ${d.dept} | ${s.subject} | ${s.chapters.length} | ${s.chapters.reduce((a, c) => a + c.outputs.length, 0)} |`);
    }
  }
  L.push('');

  for (const d of index.tree) {
    L.push(`## ${d.icon} ${d.dept}`, '');
    for (const s of d.subjects) {
      L.push(`### ${s.subject}`, '');
      L.push(`> ${s.type} · 第 ${s.semester} 学期 · 已产出 ${s.chapters.length} 章`, '');
      for (const c of s.chapters) {
        L.push(`#### ${c.title}`, '');
        L.push(`\`${s.slug}/chapters/${c.chapter}/\``, '');
        L.push('| 类型 | 标题 | 说明 | 字数 | 文件 |');
        L.push('| --- | --- | --- | :-: | --- |');
        for (const o of c.outputs) {
          const desc = (o.description || '—').replace(/\|/g, '\\|');
          L.push(`| ${o.kind} | ${o.title.replace(/\|/g, '\\|')} | ${desc} | ${o.chars} | [\`${o.file.split('/').pop()}\`](../${o.file}) |`);
        }
        L.push('');
      }
    }
  }

  if (gaps.length) {
    L.push('## 缺口（已建章节但缺产物）', '');
    L.push('契约要求每章两件。下表是**当前不满足契约**的章节 —— 列出来，不让索引看起来比现实漂亮。', '');
    L.push('| 院系 | 学科 | 章节 | 缺什么 |');
    L.push('| --- | --- | --- | --- |');
    for (const g of gaps) L.push(`| ${g.dept} | ${g.subject} | ${g.title} \`${g.chapter}\` | ${g.missing.join('、')} |`);
    L.push('');
  } else {
    L.push('## 缺口', '', '无：所有已建章节都交齐了 prompt 与 skill。', '');
  }

  return `${L.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`;
}

// ── 自包含浏览页（形态参考用户既有的交流页：暖色深底 + 宋体 + 卡片）────

function renderHtml() {
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const data = JSON.stringify(index);

  const sections = index.tree.map((d) => `
    <section class="dept">
      <h2><span class="icon">${esc(d.icon)}</span> ${esc(d.dept)}</h2>
      ${d.subjects.map((s) => `
        <div class="subject">
          <h3>${esc(s.subject)} <small>${esc(s.type)} · 第 ${esc(s.semester)} 学期</small></h3>
          ${s.chapters.map((c) => `
            <div class="chapter">
              <div class="chapter-title">${esc(c.title)}</div>
              <div class="cards">
              ${c.outputs.map((o) => `
                <a class="card ${esc(o.kind)}" href="../${esc(o.file)}">
                  <div class="kind">${esc(o.kind)}</div>
                  <div class="ctitle">${esc(o.title)}</div>
                  <div class="cdesc">${esc(o.description || '—')}</div>
                  <div class="cmeta">${esc(o.chars)} 字</div>
                </a>`).join('')}
              </div>
            </div>`).join('')}
        </div>`).join('')}
    </section>`).join('');

  const gapBlock = index.gaps.length ? `
    <section class="gaps">
      <h2>⚠ 缺口（已建章节但缺产物）</h2>
      <table>
        <thead><tr><th>院系</th><th>学科</th><th>章节</th><th>缺什么</th></tr></thead>
        <tbody>${index.gaps.map((g) => `<tr><td>${esc(g.dept)}</td><td>${esc(g.subject)}</td><td>${esc(g.title)}</td><td>${esc(g.missing.join('、'))}</td></tr>`).join('')}</tbody>
      </table>
    </section>` : '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>产出物索引 · tcmai</title>
<style>
  :root{--bg:#0d0a07;--panel:#1a1610;--edge:#2a2218;--edge2:#5a4a3a;--muted:#5a4a3a;--dim:#8b7355;--text:#d4c9a8;--bright:#e8d5b0}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--text);
    font-family:'Noto Serif SC','Source Han Serif CN','Songti SC','SimSun',serif;line-height:1.75}
  .wrap{max-width:1080px;margin:0 auto;padding:3rem 1.25rem 6rem}
  h1{font-size:2rem;color:var(--bright);margin:0 0 .25rem}
  .sub{color:var(--dim);font-size:.9rem;margin-bottom:1.5rem}
  .stats{display:flex;gap:.6rem;flex-wrap:wrap;margin:1.5rem 0 2.5rem}
  .stat{background:var(--panel);border:1px solid var(--edge);border-radius:100px;padding:.35rem 1rem;font-size:.8rem}
  .stat b{color:var(--bright);font-size:1rem}
  section{margin-bottom:2.5rem}
  h2{font-size:1.15rem;color:var(--bright);border-bottom:1px solid var(--edge);padding-bottom:.5rem;margin:2rem 0 1rem}
  h2 .icon{font-size:1.3rem;margin-right:.35rem}
  h3{font-size:1rem;color:var(--bright);margin:1.5rem 0 .5rem;font-weight:700}
  h3 small{color:var(--muted);font-weight:400;font-size:.72rem;margin-left:.5rem}
  .chapter{border-left:2px solid var(--edge);padding-left:1rem;margin:.9rem 0 1.4rem}
  .chapter-title{font-size:.9rem;color:var(--text);margin-bottom:.6rem}
  .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:.75rem}
  .card{display:block;text-decoration:none;background:var(--panel);border:1px solid var(--edge);
    border-radius:10px;padding:.9rem 1rem;transition:border-color .15s}
  .card:hover{border-color:var(--edge2)}
  .card .kind{font-size:.62rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
  .card.prompt .kind{color:#c98a3a}.card.skill .kind{color:#4C9F70}
  .card .ctitle{color:var(--bright);font-weight:700;font-size:.92rem;margin:.15rem 0 .35rem}
  .card .cdesc{color:var(--dim);font-size:.78rem}
  .card .cmeta{color:var(--muted);font-size:.68rem;margin-top:.5rem}
  table{width:100%;border-collapse:collapse;font-size:.82rem}
  th,td{border-bottom:1px solid var(--edge);padding:.5rem .6rem;text-align:left}
  th{color:var(--muted);font-weight:400;font-size:.72rem}
  .gaps{background:#1a1210;border:1px solid #3a2018;border-radius:10px;padding:1rem 1.25rem}
  footer{color:var(--muted);font-size:.72rem;border-top:1px solid var(--edge);padding-top:1rem;margin-top:3rem}
  a{color:var(--bright)}
</style>
</head>
<body>
<div class="wrap">
  <h1>产出物索引</h1>
  <div class="sub">每章交出的<strong>可复用</strong>提示词与技能。由 <code>scripts/build_outputs_index.js</code> 生成 —— 手改会在下次重跑时丢失。</div>
  <div class="stats">
    <div class="stat"><b>${index.counts.items}</b> 件产出物</div>
    <div class="stat"><b>${index.counts.chaptersWithOutputs}</b> 个章节</div>
    ${Object.entries(byKind).map(([k, v]) => `<div class="stat">${esc(k)} <b>${v}</b></div>`).join('')}
    <div class="stat">缺口 <b>${index.gaps.length}</b></div>
  </div>
  ${sections}
  ${gapBlock}
  <footer>
    生成于构建期 · 数据源 <code>outputs/index.json</code> · 契约见 <code>CONTRIBUTING.md</code><br>
    页内数据与 <code>index.json</code> 同源同批（本页把索引内联，故可离线单文件打开）。
  </footer>
</div>
<script>window.__OUTPUTS_INDEX__ = ${data};</script>
</body>
</html>
`;
}

// ── 输出 ──────────────────────────────────────────────────────────────

const files = {
  'index.json': `${JSON.stringify(index, null, 2)}\n`,
  'README.md': renderReadme(),
  'index.html': renderHtml(),
};

if (CHECK_ONLY) {
  console.log('═══ 产出物索引校核（不写文件）═══\n');
  console.log(`  产出物       ${index.counts.items} 件 → ${Object.entries(byKind).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  console.log(`  覆盖章节     ${index.counts.chaptersWithOutputs} 个`);
  console.log(`  缺口         ${index.gaps.length} 个已建章节缺产物`);
  let drift = 0;
  for (const [name, content] of Object.entries(files)) {
    const p = path.join(OUT, name);
    const now = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
    const same = now === content;
    if (!same) drift += 1;
    console.log(`  ${same ? '✅' : '⚠ '} ${name}${now === null ? '（尚未生成）' : same ? '' : '（与现场不一致，需重跑）'}`);
  }
  process.exit(drift ? 1 : 0);
}

fs.mkdirSync(OUT, { recursive: true });
for (const [name, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(OUT, name), content, 'utf8');
}

console.log('═══ 产出物索引已生成 ═══\n');
console.log(`  产出物   ${index.counts.items} 件 → ${Object.entries(byKind).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
console.log(`  覆盖章节 ${index.counts.chaptersWithOutputs} 个`);
if (index.gaps.length) {
  console.log(`  缺口     ${index.gaps.length} 个已建章节缺产物：`);
  for (const g of index.gaps.slice(0, 5)) console.log(`    ${g.dept} / ${g.subject} / ${g.chapter} → 缺 ${g.missing.join('、')}`);
  if (index.gaps.length > 5) console.log(`    … 另有 ${index.gaps.length - 5} 个`);
} else {
  console.log('  缺口     无（所有已建章节都交齐 prompt 与 skill）');
}
console.log('  产物     outputs/{index.json, README.md, index.html}');

#!/usr/bin/env node
/**
 * scripts/build_handbook_textbooks.js —— 第 9/10 学期 18 门课的[textbooks]交付（操作型章）
 *
 * 为什么需要第二套章契约：
 *   学术型教材章（6000 字、N.1–N.5、必须写「这个翻译丢掉了什么」）适用于**讲授型**学科 ——
 *   它的任务是解释「为什么可以这样翻译」。
 *   轮转与毕设不是讲授型：学生要的是**当天能用的东西** —— 接诊流程、现场清单、可打印的复盘表、
 *   带评分权重的出科考核。把这些写成 6000 字论文体，等于把手册写成散文。
 *   所以本轮新增 **操作型章契约 handbook-v1**（H.1–H.7），与学术型并存，按课程性质选用；
 *   判定不靠猜：`meta.json` 的 `textbook.contract` 写死是哪一个，`scripts/check_handbook_contract.js` 按它校验。
 *
 * 内容来源：`data/handbook/<dept>__<slug>.json`（作者维护的结构化条目）。
 *   本脚本只做**渲染**，不生成内容 —— 内容与判断在数据文件里，改内容改数据、不改脚本。
 *
 * 用法：
 *   node scripts/build_handbook_textbooks.js           生成 18 门课的教材目录
 *   node scripts/build_handbook_textbooks.js --check    重渲染并与磁盘比对，漂移即退出码 1
 *   node scripts/build_handbook_textbooks.js --list     列出数据文件与渲染规模
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ROOT, loadCurriculum } = require('./lib');

const CHECK = process.argv.includes('--check');
const LIST = process.argv.includes('--list');
const DATA_DIR = path.join(ROOT, 'data', 'handbook');
const TODAY = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

const cur = loadCurriculum();
const byKey = new Map();
for (const d of cur.departments) for (const s of d.subjects) byKey.set(`${d.slug}/${s.slug}`, { ...s, deptSlug: d.slug, deptTitle: d.title, deptIcon: d.icon });

const hanzi = (t) => (t.match(/[\u4e00-\u9fa5]/g) || []).length;
const fmtInt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const safeName = (s) => s.replace(/[\\/:*?"<>|]/g, '·').replace(/\s+/g, '').slice(0, 30);

const CONTRACT = 'handbook-v1';
const MIN_HANZI = 400;

if (!fs.existsSync(DATA_DIR)) {
  console.error(`✗ 缺数据目录 ${path.relative(ROOT, DATA_DIR)}`);
  process.exit(1);
}

const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json')).sort();
const books = [];
for (const f of files) {
  const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
  const key = raw.key;
  const sub = byKey.get(key);
  if (!sub) {
    console.error(`✗ ${f}: key ${key} 不在 curriculum.json 里`);
    continue;
  }
  books.push({ file: f, raw, sub });
}

if (LIST) {
  for (const b of books) {
    const chars = b.raw.chapters.reduce((a, c) => a + hanzi(JSON.stringify(c)), 0);
    console.log(`  ${b.sub.deptSlug}/${b.sub.slug.padEnd(34)} ${String(b.raw.chapters.length).padStart(2)} 章 · 数据 ${fmtInt(chars)} 汉字`);
  }
  console.log(`  合计 ${books.length} 门 / ${books.reduce((a, b) => a + b.raw.chapters.length, 0)} 章`);
  process.exit(0);
}

// ── 校验数据完整性（渲染前就该失败的，不要靠人看）────────────────────
const problems = [];
for (const b of books) {
  const { raw, sub } = b;
  if (raw.chapters.length !== sub.chapters) problems.push(`${b.file}: 章数 ${raw.chapters.length} ≠ 章节目标 ${sub.chapters}`);
  raw.chapters.forEach((c, i) => {
    const where = `${b.file} 第 ${i + 1} 章`;
    if (c.n !== i + 1) problems.push(`${where}: n=${c.n} 不连续`);
    for (const k of ['slug', 'title', 'problem', 'goal', 'steps', 'checklist', 'template', 'failure', 'assessment']) {
      if (!c[k] || (Array.isArray(c[k]) && !c[k].length)) problems.push(`${where}: 缺 ${k}`);
    }
    if (!/^[a-z0-9-]+$/.test(c.slug || '')) problems.push(`${where}: slug「${c.slug}」不合规`);
    if ((c.steps || []).length < 4) problems.push(`${where}: 步骤 ${(c.steps || []).length} < 4`);
    if ((c.checklist || []).length < 6) problems.push(`${where}: 清单 ${(c.checklist || []).length} < 6`);
    if ((c.failure || []).length < 3) problems.push(`${where}: 失效条目 ${(c.failure || []).length} < 3`);
    if ((c.assessment || []).length < 3) problems.push(`${where}: 考核条目 ${(c.assessment || []).length} < 3`);
    if (c.template && (!c.template.name || !Array.isArray(c.template.fields) || c.template.fields.length < 4)) {
      problems.push(`${where}: 模板需 name + ≥4 个 fields`);
    }
  });
}
if (problems.length) {
  console.error(`✗ 手册数据校验未通过（${problems.length} 处）：`);
  for (const p of problems.slice(0, 30)) console.error(`   · ${p}`);
  process.exit(1);
}

// ── 渲染 ──────────────────────────────────────────────────────────────
function renderChapter(sub, c, total) {
  const prereqTitles = (sub.prereq || []).map((r) => {
    const full = r.includes('/') ? r : `${sub.deptSlug}/${r}`;
    return byKey.get(full) ? byKey.get(full).title : r;
  });
  const isRotation = /轮转|实践|实习|实训/.test(sub.title);
  const L = [];
  L.push(`# 第 ${c.n} 章 · ${c.title}`);
  L.push('');
  L.push(`> **课程**：${sub.title}（${sub.deptIcon} ${sub.deptTitle} · 第 ${sub.semester} 学期 · ${sub.hours} 学时 · ${isRotation ? '轮转/实践' : '毕业设计'}）`);
  L.push(`> **契约**：**操作型章（${CONTRACT}）** —— 本文件是工作手册，不是学术教材：给的是当场能执行的流程、清单与模板。`);
  L.push(`> **前置**：${prereqTitles.length ? prereqTitles.join('、') : '无（本课为链头）'}`);
  L.push(`> **本章产出物**：${c.template.name}`);
  L.push(`> 学术型教材的 N.1–N.5 契约（含 N.3「这个翻译丢掉了什么」）**不适用**本课程，理由见 \`textbooks/README.md\`「操作型章契约」。`);
  L.push('');
  L.push('---');
  L.push('');
  L.push('## H.1 本章要解决的问题');
  L.push('');
  L.push(c.problem);
  L.push('');
  L.push('## H.2 本章目标（可检验）');
  L.push('');
  for (const g of c.goal) L.push(`- ${g}`);
  L.push('');
  L.push('## H.3 操作流程');
  L.push('');
  c.steps.forEach((s, i) => L.push(`${i + 1}. ${s}`));
  L.push('');
  L.push('## H.4 现场清单（逐项打勾，缺一项不算完成）');
  L.push('');
  for (const k of c.checklist) L.push(`- [ ] ${k}`);
  L.push('');
  L.push(`## H.5 模板：${c.template.name}`);
  L.push('');
  L.push('| 字段 | 填写要求 |');
  L.push('|------|----------|');
  for (const f of c.template.fields) {
    if (Array.isArray(f)) L.push(`| ${f[0]} | ${f[1]} |`);
    else L.push(`| ${f} | — |`);
  }
  L.push('');
  L.push(`> 本表是本章的交付物：${c.template.use || '打印或导入后可直接用于当班记录'}。`);
  L.push('');
  L.push('## H.6 常见失效与处置');
  L.push('');
  for (const f of c.failure) L.push(`- ${Array.isArray(f) ? `**${f[0]}** → ${f[1]}` : f}`);
  L.push('');
  L.push(`## H.7 ${isRotation ? '出科考核' : '中期检查与答辩要点'}`);
  L.push('');
  for (const a of c.assessment) L.push(`- ${a}`);
  L.push('');
  if (isRotation) {
    L.push('> **免责声明**：本章为教学与轮转管理材料，不构成诊疗建议；临床处置须由执业医师依现行规范决定，学生操作须在带教教师监督下完成。');
    L.push('');
  } else {
    L.push('> **边界声明**：本章为教学与毕设管理材料，交付物不构成诊疗建议，不得用于真实患者决策。');
    L.push('');
  }
  return L.join('\n');
}

function renderPreface(sub, raw, chapters) {
  const isRotation = /轮转|实践|实习|实训/.test(sub.title);
  const words = chapters.reduce((a, c) => a + hanzi(c.md), 0);
  const L = [];
  L.push(`# ${sub.title} · 教学手册（操作型章）`);
  L.push('');
  L.push('> 本目录由 `node scripts/build_handbook_textbooks.js` 从 `data/handbook/` 渲染，**勿手改**；改内容改数据文件。');
  L.push('');
  L.push(`## 这本手册解决什么问题`);
  L.push('');
  L.push(raw.why);
  L.push('');
  L.push('## 与学术型教材的区别（契约不同，不是偷工）');
  L.push('');
  L.push('| 项 | 学术型教材 | 本手册 |');
  L.push('|----|------------|--------|');
  L.push('| 章契约 | N.1–N.5（概念/翻译/丢失/接口/争议） | **H.1–H.7**（问题/目标/流程/清单/模板/失效/考核） |');
  L.push('| 读者场景 | 系统阅读与查证 | 当班、当场景执行 |');
  L.push('| 每章产出物 | 论证与边界 | 可打印的表单/清单/评分表 |');
  L.push(`| 验收 | \`textbooks/README.md\` 章契约 | \`scripts/check_handbook_contract.js\`（${CONTRACT}） |`);
  L.push('');
  L.push('## 课程位置');
  L.push('');
  L.push('| 项 | 值 |');
  L.push('|---|---|');
  L.push(`| 院系 | ${sub.deptIcon} ${sub.deptTitle} |`);
  L.push(`| 学期 | 第 ${sub.semester} 学期（${isRotation ? '🍂 老·固化' : '🔄 已·转型'}） |`);
  L.push(`| 学时 / 学分 | ${sub.hours} 学时 · ${isRotation ? '6' : '4'} 学分 |`);
  L.push(`| 前置 | ${(sub.prereq || []).map((r) => (byKey.get(r.includes('/') ? r : `${sub.deptSlug}/${r}`) || {}).title || r).join('、') || '无'} |`);
  L.push(`| 章数 | ${chapters.length} 章（每章一份可执行产出物） |`);
  L.push(`| 规模 | ${fmtInt(words)} 汉字 |`);
  L.push('');
  L.push('## 使用方式');
  L.push('');
  L.push(isRotation
    ? '轮转前读 H.1–H.3 建流程；进科室第一天打印 H.4 清单与 H.5 模板；出科前按 H.7 自查并交带教教师评分。'
    : '开题前读 H.1–H.2 定命题；每阶段结束用 H.4 清单自查；H.5 模板即交付物；答辩前按 H.7 逐条对照。');
  L.push('');
  L.push('> **免责声明**：本手册为教学材料，不构成诊疗建议；临床处置与患者安全由执业医师负责，学生操作须在带教教师监督下完成。');
  L.push('');
  return L.join('\n');
}

// ── 写盘 / 校核 ───────────────────────────────────────────────────────
let bad = 0;
let wrote = 0;
for (const b of books) {
  const { sub, raw } = b;
  const dir = path.join(ROOT, 'textbooks', sub.deptSlug, sub.slug);
  const chapters = raw.chapters.map((c, i) => ({
    c,
    file: `${String(i + 1).padStart(2, '0')}-第${i + 1}章-${safeName(c.title)}.md`,
    md: renderChapter(sub, c, raw.chapters.length),
  }));
  const pre = renderPreface(sub, raw, chapters);
  const words = chapters.reduce((a, x) => a + hanzi(x.md), 0);

  if (CHECK) {
    for (const ch of chapters) {
      const p = path.join(dir, ch.file);
      if (!fs.existsSync(p)) { console.error(`✗ 缺 ${path.relative(ROOT, p)}`); bad += 1; continue; }
      if (fs.readFileSync(p, 'utf8') !== ch.md) { console.error(`✗ 漂移 ${path.relative(ROOT, p)}`); bad += 1; }
      if (hanzi(ch.md) < MIN_HANZI) { console.error(`✗ 篇幅不足 ${path.relative(ROOT, p)}（${hanzi(ch.md)} 字）`); bad += 1; }
    }
    const pp = path.join(dir, '00-前言.md');
    if (!fs.existsSync(pp)) { console.error(`✗ 缺 ${path.relative(ROOT, pp)}`); bad += 1; }
    else if (fs.readFileSync(pp, 'utf8') !== pre) { console.error(`✗ 漂移 ${path.relative(ROOT, pp)}`); bad += 1; }
    continue;
  }

  fs.mkdirSync(dir, { recursive: true });
  for (const ch of chapters) fs.writeFileSync(path.join(dir, ch.file), ch.md, 'utf8');
  fs.writeFileSync(path.join(dir, '00-前言.md'), pre, 'utf8');

  // meta.json：只改 textbook 块
  const metaPath = path.join(ROOT, 'departments', sub.deptSlug, sub.slug, 'meta.json');
  const j = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  j.textbook = {
    id: 'textbooks',
    path: `textbooks/${sub.deptSlug}/${sub.slug}`,
    chaptersWritten: chapters.length,
    words,
    status: 'wip',
    layer: 'handbook',
    contract: CONTRACT,
    origin: 'handbook',
    source: 'scripts/build_handbook_textbooks.js ← data/handbook/',
    extractedAt: TODAY,
  };
  fs.writeFileSync(metaPath, JSON.stringify(j, null, 2) + '\n');
  console.log(`✓ ${sub.deptSlug}/${sub.slug} · ${chapters.length} 章 / ${fmtInt(words)} 汉字`);
  wrote += 1;
}

if (CHECK) {
  if (bad) {
    console.error(`\n操作型手册：${bad} 处与数据/契约不一致。`);
    process.exit(1);
  }
  console.log(`✓ 操作型手册 ${books.length} 门 / ${books.reduce((a, b) => a + b.raw.chapters.length, 0)} 章：与 data/handbook 一致，且每章 ≥${MIN_HANZI} 汉字`);
  process.exit(0);
}

console.log(`\n✓ ${wrote} 门操作型手册落盘（${CONTRACT}）`);

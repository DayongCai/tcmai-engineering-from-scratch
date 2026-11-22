#!/usr/bin/env node
/**
 * scripts/build_toc_4level.js —— 全库「四级编码目录」生成器
 *
 * 由来：眼科影像检查（10）与耳鼻喉解剖生理（01）、口腔解剖生理（02）三门是手写的四级编码目录，
 *   其余教材没有目录层。本脚本把这件事工具化：
 *
 *   四级 = 课程 → 章 → 节 → 单元
 *     L1 课程码：取学科目录名的数字前缀（01-erbihou-… → 01）
 *     L2 章    ：教材章文件 `NN-第N章-标题.md` → 01.04
 *     L3 节    ：章内 `## N.k 标题`（契约节 N.1–N.5 + 可选 N.6）→ 01.04.02
 *     L4 单元  ：节内 `### 标题`；若该节没有 ### 子标题，则节自身作一个单元 → 01.04.02.01
 *
 * 两种产物：
 *   - data/toc-4level.json      机读全库目录（供站内导航/检索/对账用）
 *   - textbooks/<dept>/<subject>/00-目录-四级编码.md   人读目录（**仅给没有手写目录的科目生成**）
 *
 * 手写目录的科目登记在 AUTHORED 里：脚本**不覆盖**它们，只校验其章数与 json 一致；
 * 手写目录能与正文的单元号对账（`### 10.04.02.01` 这种），生成的目录同样写出等价单元号。
 *
 * 用法：
 *   node scripts/build_toc_4level.js           生成/更新
 *   node scripts/build_toc_4level.js --check   只对账：json 与磁盘不一致就失败
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TB = path.join(ROOT, 'textbooks');
const OUT = path.join(ROOT, 'data', 'toc-4level.json');

/** 手写目录的科目（脚本不覆盖） */
const AUTHORED = new Set([
  '08-wuguan/10-yanke-yingxiang-jiancha',
  '08-wuguan/01-erbihou-jiepou-shengli',
  '08-wuguan/02-kouqiang-jiepou-shengli',
]);

/**
 * 不生成目录的科目：这些不是「章—节—单元」结构的教材，而是体例固定的辞典/专书，
 * 目录层由它们自己的「凡例 + 门 + 附录」承担（`tests/test_zhenghou_cidian.js` 会数文件数，多一个就红）。
 */
const SKIP = new Set([
  '01-zhongyi/14-zhongyi-zhenghou-xue',
]);

const hz = (s) => (s.match(/[\u4e00-\u9fa5]/g) || []).length;

function subjectCode(dirName) {
  const m = /^(\d+)-/.exec(dirName);
  return m ? m[1] : '00';
}

/** 解析一章：节（## N.k）与单元（### …） */
function parseChapter(file, text) {
  const chNo = (/^(\d+)-第(\d+)章-/.exec(file) || [])[2];
  const titleFromFile = (/^\d+-第\d+章-(.+)\.md$/.exec(file) || [])[1] || file;
  const h1 = (/^#\s+第\s*\d+\s*章\s*[·:：]?\s*(.+)$/m.exec(text) || [])[1];
  const lines = text.split('\n');
  const sections = [];
  let cur = null;
  for (const ln of lines) {
    const m2 = /^##\s+(?:([Nn]\.\d+)|(\d+\.\d+))\s+(.+)$/.exec(ln);
    if (m2) {
      cur = { label: (m2[1] || m2[2]).toUpperCase().replace(/^N/, 'N'), title: m2[3].trim(), units: [] };
      sections.push(cur);
      continue;
    }
    const m3 = /^###\s+(?:(\d{2}\.\d{2}\.\d{2}\.\d{2})\s+)?(.+)$/.exec(ln);
    if (m3 && cur) cur.units.push({ explicit: m3[1] || null, title: m3[2].trim() });
  }
  return { no: chNo, title: (h1 || titleFromFile).trim(), sections };
}

function subjectTitle(dept, subject) {
  const p = path.join(ROOT, 'departments', dept, subject, 'meta.json');
  try { const m = JSON.parse(fs.readFileSync(p, 'utf8')); if (m.title) return m.title; } catch (_) { /* 无 meta 时退回 slug */ }
  return subject.replace(/^d+-/, '');
}

function buildSubject(dept, subject) {
  const dir = path.join(TB, dept, subject);
  const files = fs.readdirSync(dir).filter((f) => /^\d+-第\d+章-.+\.md$/.test(f)).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  if (!files.length) return null;
  const code = subjectCode(subject);
  const chapters = [];
  for (const f of files) {
    const parsed = parseChapter(f, fs.readFileSync(path.join(dir, f), 'utf8'));
    const chCode = `${code}.${String(parsed.no).padStart(2, '0')}`;
    const sections = parsed.sections.map((s, si) => {
      const sCode = `${chCode}.${String(si + 1).padStart(2, '0')}`;
      const units = s.units.length
        ? s.units.map((u, ui) => ({ code: u.explicit || `${sCode}.${String(ui + 1).padStart(2, '0')}`, title: u.title }))
        : [{ code: `${sCode}.01`, title: '（整节）' }];
      return { code: sCode, label: s.label, title: s.title, units };
    });
    chapters.push({ code: chCode, no: Number(parsed.no), file: f, title: parsed.title, sections, hz: hz(fs.readFileSync(path.join(dir, f), 'utf8')) });
  }
  return { dept, subject, code, title: subjectTitle(dept, subject), authored: AUTHORED.has(`${dept}/${subject}`), chapters };
}

function renderMd(s) {
  const chCount = s.chapters.length;
  const secCount = s.chapters.reduce((a, c) => a + c.sections.length, 0);
  const unitCount = s.chapters.reduce((a, c) => a + c.sections.reduce((b, x) => b + x.units.length, 0), 0);
  const lines = [];
  lines.push(`# ${s.title} · 四级编码目录（自动生成）`);
  lines.push('');
  lines.push(`> 编码 \`${s.code}.C.S.U\`：课程 \`${s.code}\` → 章 \`${s.code}.04\` → 节 \`${s.code}.04.02\` → 单元 \`${s.code}.04.02.01\`。`);
  lines.push(`> 由 \`node scripts/build_toc_4level.js\` 从教材章文件与正文标题生成，**勿手改**；改正文后重跑即可。`);
  lines.push(`> 规模：**${chCount} 章 / ${secCount} 节 / ${unitCount} 单元**。`);
  lines.push('');
  lines.push('| 编码 | 层级 | 标题 |');
  lines.push('|---|---|---|');
  lines.push(`| ${s.code} | L1 | ${s.title} |`);
  for (const c of s.chapters) {
    lines.push(`| ${c.code} | L2 | 第 ${c.no} 章 · ${c.title} |`);
    for (const sec of c.sections) {
      lines.push(`| ${sec.code} | L3 | ${sec.title} |`);
      for (const u of sec.units) lines.push(`| ${u.code} | L4 | ${u.title} |`);
    }
  }
  lines.push('');
  lines.push('## 说明');
  lines.push('');
  lines.push('- **单元是最小可引用位**：正文里以 `### ' + s.code + '.C.S.U 标题` 出现，图注与思考题按它回指；');
  lines.push('- 生成器不判断内容好坏，只保证「章—节—单元」与磁盘正文一致；内容质量由教材门（`build_book --check`）与图门（`render --check`、`check_provenance`）负责；');
  lines.push('- 本文件与 `data/toc-4level.json` 同源，后者供站内导航与检索使用。');
  lines.push('');
  return lines.join('\n');
}

const checkMode = process.argv.includes('--check');
const subjects = [];
for (const dept of fs.readdirSync(TB).filter((d) => fs.statSync(path.join(TB, d)).isDirectory())) {
  for (const subject of fs.readdirSync(path.join(TB, dept)).filter((d) => fs.statSync(path.join(TB, dept, d)).isDirectory())) {
    const built = buildSubject(dept, subject);
    if (built && !SKIP.has(`${dept}/${subject}`)) subjects.push(built);
  }
}

subjects.sort((a, b) => `${a.dept}/${a.subject}`.localeCompare(`${b.dept}/${b.subject}`));
const payload = {
  note: '四级编码目录（课程→章→节→单元）。由 scripts/build_toc_4level.js 生成；authored=true 的科目为手写目录，脚本不覆盖，只校验章数。',
  generatedAt: checkMode ? undefined : new Date().toISOString().slice(0, 10),
  totals: {
    subjects: subjects.length,
    chapters: subjects.reduce((a, s) => a + s.chapters.length, 0),
    sections: subjects.reduce((a, s) => a + s.chapters.reduce((b, c) => b + c.sections.length, 0), 0),
    units: subjects.reduce((a, s) => a + s.chapters.reduce((b, c) => b + c.sections.reduce((d, x) => d + x.units.length, 0), 0), 0),
    authored: subjects.filter((s) => s.authored).length,
  },
  subjects,
};

if (checkMode) {
  if (!fs.existsSync(OUT)) { console.error('✗ 缺 data/toc-4level.json，先跑 node scripts/build_toc_4level.js'); process.exit(1); }
  const old = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  const strip = (o) => JSON.stringify(o.subjects.map((s) => [s.dept, s.subject, s.chapters.map((c) => [c.no, c.title, c.sections.length, c.sections.reduce((a, x) => a + x.units.length, 0)])]));
  if (strip(old) !== strip(payload)) {
    console.error('✗ data/toc-4level.json 与磁盘教材不一致（章/节/单元数变了）——重跑 node scripts/build_toc_4level.js');
    process.exit(1);
  }
  const missing = subjects.filter((s) => s.authored && !fs.existsSync(path.join(TB, s.dept, s.subject, '00-目录-四级编码.md')));
  if (missing.length) {
    console.error('✗ 登记为手写目录但文件缺失：' + missing.map((s) => `${s.dept}/${s.subject}`).join(', '));
    process.exit(1);
  }
  console.log(`✅ 四级目录一致：${subjects.length} 门 / ${payload.totals.chapters} 章 / ${payload.totals.sections} 节 / ${payload.totals.units} 单元（手写 ${payload.totals.authored} 门）`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');

let written = 0, skipped = 0;
for (const s of subjects) {
  if (s.authored) { skipped += 1; continue; }
  const p = path.join(TB, s.dept, s.subject, '00-目录-四级编码.md');
  fs.writeFileSync(p, renderMd(s), 'utf8');
  written += 1;
}
console.log(`✓ data/toc-4level.json：${subjects.length} 门 / ${payload.totals.chapters} 章 / ${payload.totals.sections} 节 / ${payload.totals.units} 单元`);
console.log(`  目录文件：新写 ${written} 份 · 跳过手写 ${skipped} 份`);

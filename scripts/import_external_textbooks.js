#!/usr/bin/env node
/**
 * scripts/import_external_textbooks.js —— 把外源古籍留档切成 [textbooks] 学科教材（外源正文层）
 *
 * 与 import_textbooks.js 的分工：
 *   import_textbooks.js  → 桌面 100 份 qhzy-*.xlsx（**底本**）→ layer: source-body
 *   本脚本              → standards/materials/textbooks-batch/external/<id>/（**外源**）→ layer: external-source
 *   两者产物同形（NN-第N章-<标题>.md + 00-前言.md），但**分账统计**：外源不进 registry.json 的 summary，
 *   看板里也单独一列，不许把外源章数混进「底本 1622 章」。
 *
 * 切分规则：按清单里的 chapterLevel 取标题层（h1/h2/h3），一章 = 该标题到下一个同级或更高级标题；
 *   更深层标题保留在章内（降级为 ###）。
 *
 * 用法：
 *   node scripts/import_external_textbooks.js --list
 *   node scripts/import_external_textbooks.js --all
 *   node scripts/import_external_textbooks.js --only zhenggu-xinfa
 *   node scripts/import_external_textbooks.js --check   # 已落章文件 ↔ 留档重新切分逐章对账
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { loadCurriculum } = require('./lib');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST = 'standards/materials/textbooks-batch/external-sources.json';
const REGISTRY = 'standards/materials/textbooks-batch/external-registry.json';
const TB = 'textbooks';

const ARGV = process.argv.slice(2);
const has = (f) => ARGV.includes(f);
const val = (f) => {
  const i = ARGV.indexOf(f);
  return i >= 0 ? ARGV[i + 1] : null;
};
const MODE_LIST = has('--list');
const MODE_CHECK = has('--check');
const ONLY = val('--only');
const ALL = has('--all');

const TODAY = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

const abs = (p) => path.join(ROOT, p);
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const hanzi = (t) => (t.match(/[\u4e00-\u9fa5]/g) || []).length;
const fmtInt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const manifest = JSON.parse(fs.readFileSync(abs(MANIFEST), 'utf8'));
const registry = JSON.parse(fs.readFileSync(abs(REGISTRY), 'utf8'));
const cur = loadCurriculum();

const subjects = new Map();
for (const d of cur.departments) for (const s of d.subjects) subjects.set(`${d.slug}/${s.slug}`, { ...s, dept: d.slug, deptTitle: d.title });

const regOf = (id) => registry.sources.find((s) => s.id === id);

// ── 切章 ──────────────────────────────────────────────────────────────
function splitChapters(text, level) {
  const lines = text.split('\n');
  const chapters = [];
  const ctx = { 1: '', 2: '', 3: '' };
  let cur = null;
  for (const line of lines) {
    const m = line.match(/^(#{1,6})\s+(.*)$/);
    if (m) {
      const lv = m[1].length;
      const title = m[2].trim();
      ctx[lv] = title;
      if (lv < level) {
        cur = null;
        continue;
      }
      if (lv === level) {
        cur = { title, ctx: { 1: ctx[1], 2: ctx[2], 3: ctx[3] }, blocks: [] };
        chapters.push(cur);
        continue;
      }
      if (cur) cur.blocks.push(`### ${title}`);
      continue;
    }
    if (!cur) continue;
    const t = line.trim();
    if (t) cur.blocks.push(t);
    else if (cur.blocks.length && cur.blocks[cur.blocks.length - 1] !== '') cur.blocks.push('');
  }
  return chapters.filter((c) => c.blocks.join('').trim().length > 0);
}

const safeName = (s) =>
  s
    .replace(/[\\/:*?"<>|]/g, '·')
    .replace(/\s+/g, '')
    .replace(/^[·.\s]+|[·.\s]+$/g, '')
    .slice(0, 28);

function uniqueTitles(chapters) {
  const seen = new Map();
  return chapters.map((c) => {
    const base = c.title || '无题';
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}（${c.ctx[1] || n}）`;
  });
}

// ── 渲染 ──────────────────────────────────────────────────────────────
function renderChapter(sub, reg, src, n, title, ctx, blocks) {
  const vol = [ctx[1], ctx[2]].filter(Boolean).join(' › ');
  const body = blocks
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return [
    `# 第 ${n} 章 · ${title}`,
    '',
    `> **源**：外源·笈成 ·《${src.title}》${reg.author ? `（${reg.dynasty}·${reg.author}）` : ''} · sha256 \`${reg.sha256.slice(0, 16)}…\``,
    `> **底本**：${reg.baseText || '页面未标底本'}`,
    `> **位置**：${vol ? `${vol} › ` : ''}${title} · \`${reg.url}\` · 抓取 ${reg.fetchedAt}`,
    `> **层次**：本文件是**外源古籍正文层** —— 逐段搬运，未改写、未压缩、未抽样；繁→简仅做字形转换（opencc t2s）。`,
    `> **不是底本**：本学科在底本（桌面 \`qhzy-*.xlsx\`）里没有源件，本章不是从底本抽取的；统计与标注须按「外源·笈成」计。`,
    `> **改写层**（N.1–N.5，尤其 N.3「这个翻译丢掉了什么」）尚未撰写。`,
    '',
    '---',
    '',
    body,
    '',
  ].join('\n');
}

function renderPreface(sub, reg, src, chapterFiles) {
  const totalHanzi = chapterFiles.reduce((a, c) => a + c.hanzi, 0);
  return [
    `# ${sub.title} · 教材（外源古籍正文层）`,
    '',
    '> 本目录由 `node scripts/import_external_textbooks.js` 生成，**勿手改**；重跑脚本即可再生。',
    '',
    '## 为什么是外源',
    '',
    '底本（桌面 `textbooks/qhzy-*.xlsx`，100 份）**没有本学科的源件** —— 这不是抽取失败，是源里就没有。',
    `本学科因此改用公有领域古籍补源，先立约定再落正文，约定见 \`standards/materials/textbooks-batch/EXTERNAL-SOURCES.md\`。`,
    '',
    '## 源',
    '',
    '| 项 | 值 |',
    '|---|---|',
    `| 书 | 《${src.title}》 |`,
    `| 作者 / 朝代 / 年份 | ${reg.author || '—'} / ${reg.dynasty || '—'} / ${reg.year || '—'} |`,
    `| 底本 | ${reg.baseText || '页面未标底本'} |`,
    `| 提供方 | 中醫笈成（漢リポ 文字化本）· ${reg.url} |`,
    `| 抓取 | ${reg.fetchedAt} · HTTP ${reg.httpStatus} · ${fmtInt(reg.bytes)} 字节 |`,
    `| sha256 | \`${reg.sha256}\` |`,
    `| 简体版 sha256 | \`${reg.simplifiedSha256}\` |`,
    `| 入库 | ${chapterFiles.length} 章 / ${fmtInt(totalHanzi)} 汉字 |`,
    '',
    '## 覆盖边界（必须与正文一起读）',
    '',
    `- **只覆盖古籍能对上的部分**：本学科「${sub.title}」是 ${sub.semester} 学期 ${sub.hours} 学时课，章节目标 ${sub.chapters} 章；`,
    `  古籍给的是**古人对同一类病的认识与治法**，不含现代检查、手术、评定量表、器械参数等内容。`,
    '- 现代内容无古籍源，**不补、不编**：缺口留在 `EXTERNAL-SOURCES.md` 的 B/C 层，等真实源件。',
    '- 繁→简只做字形转换；遇到古籍用字（如「痎」「痄」）保留原字，不改写成现代病名。',
    '',
    '## 引用标注',
    '',
    `引用本目录内容须标「**外源·笈成·${src.title} 第N条**」，**不得**标「底本」。`,
    '',
    '## 免责声明',
    '',
    '古籍内容为历史文献整理，含古代病名与治法，不构成诊疗建议；临床用药须由执业医师依现行规范决定。',
    '',
  ].join('\n');
}

// ── 主流程 ────────────────────────────────────────────────────────────
function planFor(src) {
  const reg = regOf(src.id);
  if (!reg || reg.status !== 'fetched') return { error: `未抓取（先跑 node scripts/fetch_external_textbooks.js --only ${src.id}）` };
  const p = abs(path.join(reg.dir, 'source.simplified.txt'));
  if (!fs.existsSync(p)) return { error: `缺留档 ${reg.dir}/source.simplified.txt` };
  const text = fs.readFileSync(p, 'utf8');
  const chapters = splitChapters(text, reg.chapters.level || src.chapterLevel || 3);
  const titles = uniqueTitles(chapters);
  return { reg, text, chapters, titles };
}

if (MODE_LIST) {
  for (const src of manifest.sources) {
    const plan = planFor(src);
    if (plan.error) {
      console.log(`  ${src.id.padEnd(18)} ${src.title} — ${plan.error}`);
      continue;
    }
    console.log(`  ${src.id.padEnd(18)} ${src.title.padEnd(16)} ${String(plan.chapters.length).padStart(3)} 章 → ${src.subjects.map((x) => `${x.dept}/${x.slug}`).join(', ')}`);
  }
  process.exit(0);
}

if (MODE_CHECK) {
  let bad = 0;
  for (const src of manifest.sources) {
    const plan = planFor(src);
    if (plan.error) {
      console.error(`✗ ${src.id}: ${plan.error}`);
      bad += 1;
      continue;
    }
    for (const sub of src.subjects) {
      const dir = path.join(TB, sub.dept, sub.slug);
      const existing = fs.existsSync(abs(dir)) ? fs.readdirSync(abs(dir)).filter((f) => /^\d+-第\d+章.*\.md$/.test(f)) : [];
      if (existing.length !== plan.chapters.length) {
        console.error(`✗ ${sub.dept}/${sub.slug} 章文件 ${existing.length} ≠ 留档可切 ${plan.chapters.length}`);
        bad += 1;
        continue;
      }
      const first = plan.chapters[0];
      const f = existing.slice().sort()[0];
      const body = fs.readFileSync(abs(path.join(dir, f)), 'utf8');
      const want = plan.titles[0];
      if (!body.includes(`# 第 1 章 · ${want}`)) {
        console.error(`✗ ${sub.dept}/${sub.slug} 第 1 章标题不一致（期望「${want}」）`);
        bad += 1;
      }
      if (!body.includes(plan.reg.sha256.slice(0, 16))) {
        console.error(`✗ ${sub.dept}/${sub.slug} 章首缺 sha256 指纹`);
        bad += 1;
      }
    }
  }
  if (bad) {
    console.error(`\n外源教材：${bad} 处与留档不一致。`);
    process.exit(1);
  }
  console.log(`✓ 外源教材 ${manifest.sources.length} 部 × 学科，章数/标题/指纹与留档一致`);
  process.exit(0);
}

if (!ALL && !ONLY) {
  console.error('用法：--all | --only <id> | --list | --check');
  process.exit(2);
}

const targets = ONLY ? manifest.sources.filter((s) => s.id === ONLY) : manifest.sources;
let wrote = 0;

for (const src of targets) {
  const plan = planFor(src);
  if (plan.error) {
    console.error(`✗ ${src.id}: ${plan.error}`);
    continue;
  }
  for (const sub of src.subjects) {
    const key = `${sub.dept}/${sub.slug}`;
    const meta = subjects.get(key);
    if (!meta) {
      console.error(`✗ ${key} 不在 curriculum.json 里，拒绝落盘`);
      continue;
    }
    const dir = path.join(TB, sub.dept, sub.slug);
    fs.mkdirSync(abs(dir), { recursive: true });

    const chapterFiles = [];
    plan.chapters.forEach((c, i) => {
      const n = i + 1;
      const title = plan.titles[i];
      const md = renderChapter(meta, plan.reg, src, n, title, c.ctx, c.blocks);
      const file = `${String(n).padStart(2, '0')}-第${n}章-${safeName(title)}.md`;
      fs.writeFileSync(abs(path.join(dir, file)), md, 'utf8');
      chapterFiles.push({ file, hanzi: hanzi(md) });
    });

    fs.writeFileSync(abs(path.join(dir, '00-前言.md')), renderPreface(meta, plan.reg, src, chapterFiles), 'utf8');

    // meta.json：只改 textbook 块，别的字段原样保留
    const metaPath = abs(path.join('departments', sub.dept, sub.slug, 'meta.json'));
    const j = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    j.textbook = {
      id: 'textbooks',
      path: dir.split(path.sep).join('/'),
      chaptersWritten: chapterFiles.length,
      words: chapterFiles.reduce((a, c) => a + c.hanzi, 0),
      status: 'wip',
      layer: 'external-source',
      origin: 'external',
      source: `standards/materials/textbooks-batch/external-registry.json#${src.id}`,
      external: {
        id: src.id,
        title: src.title,
        url: plan.reg.url,
        sha256: plan.reg.sha256,
        baseText: plan.reg.baseText,
        fetchedAt: plan.reg.fetchedAt,
        coverage: '古籍可对上的部分；现代内容未覆盖',
      },
      extractedAt: TODAY,
    };
    fs.writeFileSync(metaPath, JSON.stringify(j, null, 2) + '\n');

    console.log(`✓ ${key} ← 《${src.title}》${chapterFiles.length} 章 / ${fmtInt(j.textbook.words)} 汉字`);
    wrote += 1;
  }
}

console.log(`\n✓ ${wrote} 门学科落盘（外源正文层）`);

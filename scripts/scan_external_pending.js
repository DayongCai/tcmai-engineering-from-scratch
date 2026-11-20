#!/usr/bin/env node
/**
 * scripts/scan_external_pending.js —— 扫「已有外源条文、但教材没写满」的学科并排序
 *
 * 判据与排序：
 *   - 候选：standards/<std>/ 下有 外源条文.json（有可引条文）
 *   - 已决口径：standards/口径决案.json 里登记的课不算欠账，单列一节
 *   - 补源尝试未成：补源登记.json 只有 attempts/conclusion（探源记录）而无 counts，单列一节
 *   - 排序：条文数 ÷ 剩余章数 降序（每章能挂几条 → 越省力越靠前），同分按条文数降序
 *   - 另报：教材章 > 教学计划章（写超了，属另一种异常）
 *
 * 输出：控制台表 + standards/开稿排序.md
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const p = (...x) => path.join(ROOT, ...x);
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

const catalog = readJson(p('catalog.json'));
const subjects = [];
for (const d of catalog.departments) {
  for (const s of d.subjects) {
    subjects.push({
      dept: d.slug, slug: s.slug, title: s.title,
      taught: s.chaptersTarget ?? s.chapters ?? 0,
    });
  }
}

let decided = [];
try {
  decided = (readJson(p('standards/口径决案.json')).decisions || []).map((d) => d.subject);
} catch { /* 没有决案文件也能跑 */ }

const norm = (x) => x.replace(/^\d+-/, '').toLowerCase();
function findSubject(std) {
  const n = norm(std);
  const exact = subjects.filter((s) => norm(s.slug) === n);
  if (exact.length === 1) return exact[0];
  const near = subjects.filter((s) => norm(s.slug).includes(n) || n.includes(norm(s.slug)));
  return near.length === 1 ? near[0] : null;
}

const rows = [];
const probeOnly = [];
for (const name of fs.readdirSync(p('standards'))) {
  const dir = p('standards', name);
  if (!fs.statSync(dir).isDirectory()) continue;
  const clauseFile = p('standards', name, '外源条文.json');
  const regFile = p('standards', name, '补源登记.json');
  if (!fs.existsSync(clauseFile) && !fs.existsSync(regFile)) continue;

  if (!fs.existsSync(clauseFile)) {
    // 只有补源登记：可能是「探源尝试记录」
    let r = {};
    try { r = readJson(regFile); } catch { r = {}; }
    if (!r.counts) {
      probeOnly.push({ std: name, conclusion: String(typeof r.conclusion === 'string' ? r.conclusion : JSON.stringify(r.conclusion || '')).slice(0, 120), attempts: (r.attempts || []).length });
      continue;
    }
  }

  const j = fs.existsSync(clauseFile) ? readJson(clauseFile) : { sources: {}, clauses: [] };
  const clauses = (j.clauses || []).length;
  const sources = Object.keys(j.sources || {}).length;
  let verified = 0;
  if (fs.existsSync(regFile)) {
    try { verified = readJson(regFile).counts?.verified ?? 0; } catch { verified = 0; }
  }

  const sub = findSubject(name);
  let written = 0, taught = sub ? sub.taught : 0;
  if (sub) {
    const tb = p('textbooks', sub.dept, sub.slug);
    if (fs.existsSync(tb)) written = fs.readdirSync(tb).filter((f) => /^\d+-第\d+章.*\.md$/.test(f)).length;
  }
  const subjectKey = sub ? `${sub.dept}/${sub.slug}` : null;
  rows.push({
    std: name, subject: subjectKey, title: sub ? sub.title : null,
    sources, clauses, verified, taught, written,
    remain: sub ? Math.max(0, taught - written) : null,
    over: sub ? Math.max(0, written - taught) : 0,
    decided: subjectKey ? decided.includes(subjectKey) : false,
    perChapter: sub && clauses && taught > written ? +(clauses / (taught - written)).toFixed(1) : null,
    sourceTitles: Object.values(j.sources || {}).map((s) => s.shortTitle || s.title || '').slice(0, 6),
  });
}

const pending = rows.filter((r) => r.subject && r.remain > 0 && !r.decided)
  .sort((a, b) => (b.perChapter || 0) - (a.perChapter || 0) || b.clauses - a.clauses || a.remain - b.remain);
const decidedRows = rows.filter((r) => r.decided && r.remain > 0);
const overs = rows.filter((r) => r.over > 0);
const orphans = rows.filter((r) => !r.subject && r.clauses > 0);
const done = rows.filter((r) => r.subject && r.remain === 0 && r.over === 0 && !r.decided);

console.log('=== 待开稿（有可引条文、教材未写满）===');
for (const r of pending) {
  console.log(`${String(r.perChapter).padStart(5)} 条/章 | 条文 ${String(r.clauses).padStart(3)}（可查 ${r.verified}）| 外源 ${String(r.sources).padStart(2)} 份 | 教材 ${r.written}/${r.taught} 剩 ${r.remain} | ${r.title}（standards/${r.std}）`);
}
console.log('\n=== 已决口径（不算欠账）===');
for (const r of decidedRows) console.log(`  条文 ${r.clauses} | 教材 ${r.written}/${r.taught} | ${r.title}`);
// 教材章 > 教学计划：教材更细是常态（底本逐章），不算异常；只在 口径决案 里登记换算表
let decs = [];
try { decs = (readJson(p('standards/口径决案.json')).decisions || []); } catch { decs = []; }
const overDecided = decs.filter((x) => x.textbookChapters > x.teachingChapters);
console.log('\n=== 教材章 > 教学计划：已决口径（教材更细，不算异常）===');
for (const e of overDecided) {
  const st = e.mappingStats || {};
  console.log(`  ${e.title}：教材 ${e.textbookChapters} / 教学 ${e.teachingChapters}` +
    `（映射 ${st.planCount ?? '?'} 行 · 一对多 ${st.oneToManyPlans ?? '?'} 处 · 吸收 ${st.chaptersAbsorbed ?? '?'} 章 · 无教学章位 ${st.textbookChaptersWithoutPlan ?? 0} 章）`);
}
if (!overDecided.length) console.log('  （无）');
console.log('\n=== 补源尝试未成（只有探源记录，无可引条文）===');
for (const r of probeOnly) console.log(`  standards/${r.std}：attempts ${r.attempts}｜${r.conclusion || '无结论字段'}`);
console.log('\n=== 未匹配到学科（需登记别名）===');
for (const r of orphans) console.log(`  条文 ${r.clauses} | standards/${r.std}`);
console.log('\n=== 已写满 ===');
for (const r of done) console.log(`  条文 ${String(r.clauses).padStart(3)} | 教材 ${r.written}/${r.taught} | ${r.title}`);

// ── 落盘
const L = [];
L.push('# 开稿排序：已有外源条文、教材未写满的学科\n');
L.push('> 复算：`node scripts/scan_external_pending.js`（只读扫描，不改数据）');
L.push('> 排序依据：**条文数 ÷ 剩余章数**（每章能挂几条），降序；同分按条文数降序、剩余章数升序。');
L.push('> 「可查」= `补源登记.json` 的 verified；`standards/口径决案.json` 登记过的课不计入待开稿。\n');
L.push('> **表里的「序」是机械序（条文密度），不等于推荐序**——条文多但讲方法学的，未必覆盖得了教学章；推荐序见文末「覆盖评估」。\n');

L.push('## 待开稿（按「条文 ÷ 剩余章数」排序）\n');
if (!pending.length) L.push('（无）');
else {
  L.push('| 序 | 学科 | 外源 | 条文 | 可查 | 教材/教学 | 剩余 | 条/章 | 建议 |');
  L.push('|--:|---|---|--:|--:|--:|--:|--:|---|');
  pending.forEach((r, i) => {
    const verdict = r.perChapter >= 5 ? '**优先**（密度高，可一次写满）'
      : r.perChapter >= 2 ? '可开稿（密度中等，需补 1–2 条背景）'
        : '条文偏薄，建议先补源';
    L.push(`| ${i + 1} | ${r.title}（\`${r.subject}\`） | ${r.sources} | ${r.clauses} | ${r.verified} | ${r.written}/${r.taught} | ${r.remain} | ${r.perChapter} | ${verdict} |`);
  });
  L.push('');
  for (const r of pending) {
    L.push(`### ${r.title}（standards/${r.std}）`);
    L.push(`- 教材进度：${r.written}/${r.taught}，剩 ${r.remain} 章；条文 ${r.clauses} 条（可查 ${r.verified}）`);
    L.push(`- 外源（共 ${r.sources} 份，列前 ${r.sourceTitles.length}）：${r.sourceTitles.join('；') || '（未取短名）'}`);
    L.push('');
  }
}

if (decidedRows.length) {
  L.push('## 已决口径（两套切分轴，不算欠账）\n');
  for (const r of decidedRows) L.push(`- ${r.title}：教材 ${r.written}/${r.teached ?? r.taught}；决案见 \`standards/口径决案.json\``.replace('r.teached ?? ', ''));
  L.push('');
}
{
  if (overDecided.length) {
    L.push('## 教材章 > 教学计划章：已决口径（教材更细，不算异常）\n');
    L.push('| 课 | 教材 | 教学 | 映射行 | 一对多 | 吸收章数 | 无教学章位 |');
    L.push('|---|--:|--:|--:|--:|--:|--:|');
    for (const e of overDecided) {
      const st = e.mappingStats || {};
      L.push(`| ${e.title} | ${e.textbookChapters} | ${e.teachingChapters} | ${st.planCount ?? ''} | ${st.oneToManyPlans ?? ''} | ${st.chaptersAbsorbed ?? ''} | ${st.textbookChaptersWithoutPlan ?? 0} |`);
    }
    L.push('');
    L.push('每门都有 `附录B-教学章与教材章对照.md`（换算表 + 反向索引），决案在 `standards/口径决案.json`。');
    L.push('');
  }
}
if (probeOnly.length) {
  L.push('## 补源尝试未成（只有探源记录）\n');
  for (const r of probeOnly) L.push(`- \`standards/${r.std}\`：尝试 ${r.attempts} 次；${r.conclusion || '无结论字段'}`);
  L.push('');
}
if (orphans.length) {
  L.push('## 未匹配到学科（需登记别名）\n');
  for (const r of orphans) L.push(`- \`standards/${r.std}\`：条文 ${r.clauses}`);
  L.push('');
}
if (done.length) {
  L.push('## 已写满\n');
  for (const r of done) L.push(`- ${r.title}：教材 ${r.written}/${r.taught} · 条文 ${r.clauses}`);
  L.push('');
}
// 人工覆盖评估段：重算时原样保留（机器只负责数条文，判断在人）
const OUT = p('standards/开稿排序.md');
const MARK = '## 覆盖评估（人工判断，重算时保留本段）';
let manual = '';
if (fs.existsSync(OUT)) {
  const old = fs.readFileSync(OUT, 'utf8');
  const i = old.indexOf(MARK);
  if (i >= 0) manual = old.slice(i).trimEnd();
}
if (manual) { L.push(''); L.push(manual); L.push(''); }
fs.writeFileSync(OUT, L.join('\n') + '\n', 'utf8');
console.log('\n已写 standards/开稿排序.md' + (manual ? '（已保留人工覆盖评估段）' : ''));

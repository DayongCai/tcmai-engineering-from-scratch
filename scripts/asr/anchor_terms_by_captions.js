#!/usr/bin/env node
/**
 * scripts/asr/anchor_terms_by_captions.js —— 用「人读字幕」给术语纠错表补硬依据
 *
 * 先说清这层能做什么、不能做什么（这一条是踩过坑才写的）：
 *   ✗ 不能用来**盲找**错形。曾试过「字幕术语 ↔ ASR 同时段滑窗比等长片段、差 1–2 字就算错形」，
 *     结果 727 条「采纳」全是垃圾：「是个道理→是个方子」「是不是→你不要」——汉语常用词两字之差
 *     的巧合太多，滑窗没有对齐信息，等于随机配对。
 *   ✓ 能做的是**佐证**：现有 corrections.json 的每条规则，都声称「错形 X 其实是正名 Y」。
 *     那就去人读字幕里查 Y 有没有字面出现过、在哪一讲哪一刻——字幕是画面上的真文本（逐图读出），
 *     Y 在字幕里出现，才说明「他确实这么讲」，这条替换才不是拼音推断的孤证。
 *
 * 判定三档：
 *   字幕直证  正名出现在**同一讲**的字幕里（最强，可直接引用）
 *   字幕旁证  正名只出现在其他讲的字幕里（说明词存在、读音对，但本讲无原文）
 *   仅拼音    正名在任何一条字幕里都没出现 → 只有拼音依据，须人工核（列出来，不当成已证）
 *
 * 输出（不改动任何原件）：
 *   sources/transcripts/corrections-by-captions.json
 *   sources/transcripts/corrections-by-captions.md   人核表
 *
 * 用法：node scripts/asr/anchor_terms_by_captions.js [--check]
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'standards', 'materials', 'chenruchun-lectures', 'sources');
const OUT_JSON = path.join(SRC, 'transcripts', 'corrections-by-captions.json');
const OUT_MD = path.join(SRC, 'transcripts', 'corrections-by-captions.md');
const CORR = path.join(SRC, 'transcripts', 'corrections.json');
const CHECK = process.argv.includes('--check');
const pad = (n) => String(n).padStart(2, '0');

// ── 语料 ────────────────────────────────────────────────────────────
const asrDoc = JSON.parse(fs.readFileSync(path.join(SRC, 'asr-transcripts.json'), 'utf8'));
const asrText = asrDoc.segments.map((s) => s.text);
const asrByLec = new Map();
asrDoc.segments.forEach((s) => {
  if (!asrByLec.has(s.lecture)) asrByLec.set(s.lecture, []);
  asrByLec.get(s.lecture).push(s);
});

const captions = [];
const s19 = JSON.parse(fs.readFileSync(path.join(SRC, 'subtitle-samples.json'), 'utf8'));
s19.samples.forEach((s) => { if (s.line) captions.push({ lecture: 19, sec: s.sec, mmss: s.mmss, line: s.line, ref: `#${s.idx}` }); });
const courses = JSON.parse(fs.readFileSync(path.join(SRC, 'subtitle-samples-courses.json'), 'utf8'));
courses.samples.forEach((s) => captions.push({ lecture: s.lecture, sec: s.sec, mmss: s.mmss, line: s.line, ref: s.idx }));
// 补采帧样本（gap-frames）：也是人读原文，一视同仁参与「正名是否出现过」的判定
const gapPath = path.join(SRC, 'subtitle-samples-gap.json');
if (fs.existsSync(gapPath)) {
  JSON.parse(fs.readFileSync(gapPath, 'utf8')).samples.forEach((s) => {
    captions.push({ lecture: s.lecture, sec: s.sec, mmss: s.mmss, line: s.line, ref: s.ref });
  });
}

const corrDoc = JSON.parse(fs.readFileSync(CORR, 'utf8'));
const RULES = [
  ...(corrDoc.phrases || []).map((r) => ({ ...r, kind: '短语' })),
  ...corrDoc.rules.map((r) => ({ ...r, kind: '方名' })),
  ...(corrDoc.terms || []).map((r) => ({ ...r, kind: '术语' })),
];

// ── 字幕里查正名（同一讲优先）──────────────────────────────────────
/** 某正名在字幕里的出现：同讲直证 + 其他讲旁证 */
function captionEvidence(right, lecture) {
  const hits = captions.filter((c) => c.line.includes(right));
  const same = hits.filter((c) => c.lecture === lecture);
  const other = hits.filter((c) => c.lecture !== lecture);
  return { same, other, total: hits.length };
}

const rows = RULES.map((r) => {
  const ev = captionEvidence(r.right, r.lecture ?? null);
  // 这条规则出现在哪些讲（按 ASR 原文统计），用来判断「同讲」是哪一讲
  const wrongLecs = [];
  asrByLec.forEach((list, no) => {
    if (list.some((s) => s.text.includes(r.wrong))) wrongLecs.push(no);
  });
  const sameLecHits = ev.same.length
    ? ev.same
    : captions.filter((c) => wrongLecs.includes(c.lecture) && c.line.includes(r.right)).slice(0, 2);
  const level = ev.same.length ? '字幕直证' : (sameLecHits.length ? '字幕直证' : (ev.total ? '字幕旁证' : '仅拼音'));
  const cite = (level === '字幕旁证' ? ev.other[0] : (sameLecHits[0] || ev.same[0] || null));
  const asrCount = asrText.reduce((a, t) => a + (t.split(r.wrong).length - 1), 0);
  return {
    kind: r.kind, wrong: r.wrong, right: r.right, level: r.level || 'unknown',
    evidence: level, asrCount, wrongLectures: wrongLecs.sort((a, b) => a - b),
    cite: cite ? { lecture: cite.lecture, mmss: cite.mmss, ref: cite.ref, line: cite.line } : null,
    otherCites: (level === '字幕旁证' ? ev.other.slice(1, 3) : sameLecHits.slice(1, 3))
      .map((c) => ({ lecture: c.lecture, mmss: c.mmss, ref: c.ref, line: c.line })),
  };
});

const byLevel = { 字幕直证: [], 字幕旁证: [], 仅拼音: [] };
rows.forEach((r) => byLevel[r.evidence].push(r));
const order = { 字幕直证: 0, 字幕旁证: 1, 仅拼音: 2 };
const sorted = rows.slice().sort((a, b) => order[a.evidence] - order[b.evidence]
  || b.asrCount - a.asrCount || a.wrong.localeCompare(b.wrong));

const doc = {
  $generated: 'node scripts/asr/anchor_terms_by_captions.js（字幕依据可逐条回图核对）',
  what: '把 corrections.json 里每条替换拿去人读字幕里查正名：字幕是画面上的真文本（sources/grids/*.jpg 逐图读出），'
    + '正名在字幕里字面出现，才说明「他确实这么讲」。本表不产生新规则，只给现有规则分档：直证 / 旁证 / 仅拼音。',
  whyNotDiscovery: '试过用字幕盲找错形（滑窗等长比对差 1–2 字），727 条「采纳」全是巧合配对（是不是→你不要、个道理→个方子）：'
    + '汉语常用词两字之差的碰撞率极高，没有对齐信息就是在随机配对。所以这一层只做佐证。',
  policy: {
    原件: 'sources/asr/lec-NN.json 永不改写',
    识别稿: 'sources/transcripts/lec-NN.md 与原件逐段一致',
    校正稿: 'sources/transcripts/corrected/lec-NN.md 只做替换并在段末留原形',
    分档: '字幕直证=正名出现在同讲字幕；字幕旁证=只出现在别讲字幕；仅拼音=任何字幕都没有 → 须人工核',
  },
  stats: {
    captions: captions.length,
    rules: rows.length,
    direct: byLevel['字幕直证'].length,
    indirect: byLevel['字幕旁证'].length,
    pinyinOnly: byLevel['仅拼音'].length,
    directPhrase: byLevel['字幕直证'].filter((r) => r.kind === '短语').length,
    directFormula: byLevel['字幕直证'].filter((r) => r.kind === '方名').length,
    directTerm: byLevel['字幕直证'].filter((r) => r.kind === '术语').length,
    asrHitsCovered: byLevel['字幕直证'].reduce((a, r) => a + r.asrCount, 0),
    asrHitsTotal: rows.reduce((a, r) => a + r.asrCount, 0),
  },
  rows: sorted,
};

// ── 人核表 ──────────────────────────────────────────────────────────
const md = [];
md.push('# 术语纠错表 · 以人读字幕为依据');
md.push('');
md.push(`> ${doc.what}`);
md.push('>');
md.push(`> 反例留档：${doc.whyNotDiscovery}`);
md.push('');
md.push('| 统计 | 数 |');
md.push('|---|---|');
md.push(`| 读屏字幕 | ${doc.stats.captions} 条 |`);
md.push(`| 待核规则 | ${doc.stats.rules} 条（短语 ${RULES.filter((r) => r.kind === '短语').length} / 方名 ${RULES.filter((r) => r.kind === '方名').length} / 术语 ${RULES.filter((r) => r.kind === '术语').length}） |`);
md.push(`| **字幕直证** | **${doc.stats.direct}**（短语 ${doc.stats.directPhrase} / 方名 ${doc.stats.directFormula} / 术语 ${doc.stats.directTerm}） |`);
md.push(`| 字幕旁证 | ${doc.stats.indirect} |`);
md.push(`| 仅拼音（须人工核） | ${doc.stats.pinyinOnly} |`);
md.push(`| 直证覆盖的 ASR 替换量 | ${doc.stats.asrHitsCovered} / ${doc.stats.asrHitsTotal} 处 |`);
md.push('');
for (const lv of ['字幕直证', '字幕旁证', '仅拼音']) {
  const list = byLevel[lv];
  if (!list.length) continue;
  md.push(`## ${lv}（${list.length}）`);
  md.push('');
  md.push('| 类 | 错形 | 正名 | ASR 出现 | 字幕依据 | 置信 |');
  md.push('|---|---|---|:-:|---|---|');
  list.slice().sort((a, b) => b.asrCount - a.asrCount).forEach((r) => {
    const c = r.cite;
    const citeText = c ? `第${c.lecture}讲 ${c.mmss}（读屏 ${c.ref}）「${c.line}」` : '—（任何字幕都没有这个正名）';
    md.push(`| ${r.kind} | ${r.wrong} | ${r.right} | ${r.asrCount} | ${citeText} | ${r.level} |`);
  });
  md.push('');
}
const body = `${md.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`;

if (CHECK) {
  const oldJ = fs.existsSync(OUT_JSON) ? fs.readFileSync(OUT_JSON, 'utf8') : '';
  const oldM = fs.existsSync(OUT_MD) ? fs.readFileSync(OUT_MD, 'utf8') : '';
  if (oldJ !== `${JSON.stringify(doc, null, 1)}\n` || oldM !== body) {
    console.error('✗ corrections-by-captions.json / .md 与重算结果不一致（漂移）');
    process.exit(1);
  }
  console.log(`✅ 字幕依据表与重算一致：直证 ${doc.stats.direct} / 旁证 ${doc.stats.indirect} / 仅拼音 ${doc.stats.pinyinOnly}`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.writeFileSync(OUT_JSON, `${JSON.stringify(doc, null, 1)}\n`, 'utf8');
fs.writeFileSync(OUT_MD, body, 'utf8');
console.log('═══ 术语纠错表（字幕为据）═══');
console.log(`  待核规则 ${doc.stats.rules} 条 → 字幕直证 ${doc.stats.direct} · 旁证 ${doc.stats.indirect} · 仅拼音 ${doc.stats.pinyinOnly}`);
console.log(`  直证覆盖 ASR 替换 ${doc.stats.asrHitsCovered}/${doc.stats.asrHitsTotal} 处`);
console.log(`  → ${path.relative(ROOT, OUT_JSON)} / ${path.relative(ROOT, OUT_MD)}`);

#!/usr/bin/env node
'use strict';
/**
 * 方剂学 · 第 8 章 理气剂与理血剂
 * 课程: departments/02-zhongyao/03-fangjixue/chapters/08-liqi-lixue/docs/zh.md
 * 出处: 教材·第15章 理气剂（14,870 字 / 2 节 / 7 方）
 *       教材·第16章 理血剂（19,214 字 / 2 节 / 9 方）
 * 依赖: 仅 Node.js 标准库 + standards/fangji/ 的章节层与方剂层 JSON
 *
 * 本章量四件事，全部现算：
 *   1. 规模：34,084 字 / 16 方，为什么「理血」比「理气」重 4,344 字；
 *   2. 结构：六段/方 恒定，每段 347–374 字；
 *   3. 药：122 药位 / 72 味 / 方均 7.6，甘草出现在 9 首方里；
 *   4. 角色：有君 16/16、四角色齐仅 1 首，抽不到的是谁。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const BASE = path.join(ROOT, 'standards', 'fangji', '底本.json');
const FORM = path.join(ROOT, 'standards', 'fangji', 'formulas.json');

const base = JSON.parse(fs.readFileSync(BASE, 'utf8'));
const form = JSON.parse(fs.readFileSync(FORM, 'utf8'));

/** 本课程章覆盖的教材章号：第15章理气 + 第16章理血 */
const CHS = ['15', '16'];
const ROLES = ['君', '臣', '佐', '使'];

const han = (s) => (s.match(/[\u4e00-\u9fa5]/g) || []).length;
const fold = (s) => s.replace(/\s/g, '').replace(/[，,。．；;：:、（）()「」『』""'']/g, '');
const fmt = (n) => n.toLocaleString('en-US');

const chapterOf = (no) => base.chapters.find((c) => c.no === no);
const parasOf = (s) => [...(s.paras || []), ...(s.subs || []).flatMap((u) => u.paras || [])];
const nodeOf = (no) => {
  for (const c of base.chapters) {
    for (const s of c.secs || []) {
      if (s.no === no) return s;
      for (const u of s.subs || []) if (u.no === no) return u;
    }
  }
  return undefined;
};

/** 本章 16 首方。 */
function roster() {
  return form.formulas
    .filter((f) => CHS.includes(f.chapter))
    .map((f) => {
      const herbs = f.composition.herbs.map((h) => h.name);
      const fj = f.parts['方解与配伍'] || '';
      return {
        name: f.name,
        chapter: f.chapter,
        sec: f.sec,
        sub: f.sub,
        locator: f.locator,
        herbs,
        slots: herbs.length,
        traced: herbs.filter((h) => fj.includes(h)),
        roles: Object.fromEntries(ROLES.map((r) => [r, f.roles[r] || []])),
        roleCount: ROLES.filter((r) => (f.roles[r] || []).length).length,
        chars: Object.values(f.parts || {}).reduce((n, p) => n + han(p), 0),
      };
    });
}

/** 规模：两章字数、节段数、占全书比例、每方摊到的教材字数。 */
function scale() {
  const rows = CHS.map((no) => {
    const c = chapterOf(no);
    const n = form.formulas.filter((f) => f.chapter === no).length;
    return {
      no, title: c.title, hanzi: c.counts.hanzi, secs: c.counts.secs, subs: c.counts.subs,
      paras: c.counts.paras, formulas: n, perFormula: +(c.counts.hanzi / n).toFixed(0),
    };
  });
  const hanzi = rows.reduce((n, r) => n + r.hanzi, 0);
  const paras = rows.reduce((n, r) => n + r.paras, 0);
  const formulas = rows.reduce((n, r) => n + r.formulas, 0);
  return {
    rows,
    hanzi,
    secs: rows.reduce((n, r) => n + r.secs, 0),
    subs: rows.reduce((n, r) => n + r.subs, 0),
    paras,
    formulas,
    share: hanzi / base.counts.hanzi,
    perFormula: +(hanzi / formulas).toFixed(0),
    perPara: +(hanzi / paras).toFixed(1),
    /** 理血比理气多出的字数 */
    gap: rows[1].hanzi - rows[0].hanzi,
  };
}

/** 结构：逐节 段数 / 字数 / 每段 / 每方，以及「6 段/方」是否恒定。 */
function structure() {
  const rows = CHS.flatMap((no) =>
    chapterOf(no).secs.map((s) => {
      const ps = parasOf(s);
      const chars = ps.reduce((n, p) => n + han(p.text || ''), 0);
      const fs_ = form.formulas.filter((f) => f.sub.startsWith(s.no + '.'));
      return {
        no: s.no, title: s.title, chapter: no,
        paras: ps.length, chars, formulas: fs_.length,
        perPara: +(chars / ps.length).toFixed(1),
        perFormula: fs_.length ? +(chars / fs_.length).toFixed(0) : null,
        names: fs_.map((f) => f.name),
      };
    }),
  );
  const per = roster().map((f) => Object.keys(form.formulas.find((x) => x.name === f.name).parts || {}).length);
  return { rows, sixParts: per.every((n) => n === 6), partsPerFormula: per };
}

/** 药：药位、去重、方均、高频、两章共用药、单味跨方数。 */
function herbs() {
  const rs = roster();
  const slots = rs.flatMap((r) => r.herbs);
  const uniq = [...new Set(slots)];
  const freq = new Map();
  for (const h of slots) freq.set(h, (freq.get(h) || 0) + 1);
  const top = [...freq].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const setOf = (no) => new Set(rs.filter((r) => r.chapter === no).flatMap((r) => r.herbs));
  const a = setOf('15');
  const b = setOf('16');
  return {
    slots: slots.length,
    unique: uniq.length,
    avg: +(slots.length / rs.length).toFixed(1),
    top: top.slice(0, 8),
    cross: [...a].filter((h) => b.has(h)),
    perChapter: CHS.map((no) => ({ no, slots: rs.filter((r) => r.chapter === no).reduce((n, r) => n + r.slots, 0) })),
    /** 出现 ≥3 次的药（跨方「通用件」） */
    staples: top.filter((x) => x[1] >= 3),
  };
}

/** 组成抽取的可回查率。 */
function tracing() {
  const rs = roster();
  const slots = rs.flatMap((r) => r.herbs);
  const traced = rs.flatMap((r) => r.traced);
  return {
    rs,
    slots: slots.length,
    traced: traced.length,
    rate: traced.length / slots.length,
    stray: rs
      .filter((r) => r.slots > r.traced.length)
      .map((r) => ({ name: r.name, items: r.herbs.filter((h) => !r.traced.includes(h)) })),
  };
}

/** 角色重复判定：同一味药被同时判为两个角色。 */
function roleAudit() {
  const rs = roster();
  return {
    dup: rs
      .map((r) => ({ name: r.name, all: ROLES.flatMap((x) => r.roles[x]) }))
      .filter((x) => new Set(x.all).size !== x.all.length)
      .map((x) => `${x.name}（${x.all.join('/')}）`),
  };
}

/** 君臣佐使覆盖。 */
function roles() {
  const rs = roster();
  const withJun = rs.filter((r) => r.roles['君'].length).length;
  const full = rs.filter((r) => r.roleCount === 4).length;
  const three = rs.filter((r) => r.roleCount >= 3).length;
  return {
    withJun, full, three, total: rs.length,
    fullNames: rs.filter((r) => r.roleCount === 4).map((r) => r.name),
    missingJun: rs.filter((r) => !r.roles['君'].length).map((r) => r.name),
  };
}

function cite(no) {
  return `教材·第${String(no).split('.')[0]}章·${no}`;
}

/** 从指定小节里取一句含关键词的教材原文（运行时取，避免抄错字）。 */
function anchor(no, kw) {
  const node = nodeOf(no);
  if (!node) throw new Error(`教材里没有 ${no}`);
  const p = (node.paras || []).find((x) => (x.text || '').includes(kw));
  if (!p) throw new Error(`${no} 里找不到含「${kw}」的段落`);
  const sents = p.text.split(/(?<=。)/).map((s) => s.trim()).filter(Boolean);
  return { locator: cite(no), sentence: sents.find((s) => s.includes(kw)) || p.text };
}

/** 引文逐字回查（与门禁同口径）。 */
function verify(quote, no) {
  const node = nodeOf(no);
  if (!node) return false;
  const q = fold(quote);
  return (node.paras || []).some((p) => fold(p.text || '').includes(q));
}

function main() {
  const s = scale();
  const st = structure();
  const h = herbs();
  const t = tracing();
  const r = roles();
  const a = roleAudit();

  console.log('═══ 理气剂与理血剂：两章 / 十六方（教材·第15章 + 教材·第16章）═══');
  for (const row of s.rows) {
    console.log(`  ${row.title}：${row.secs} 节 ${row.subs} 小节 ${row.paras} 段 ${fmt(row.hanzi)} 字 ${row.formulas} 方 · 每方 ${fmt(row.perFormula)} 字`);
  }
  console.log(`  合计 ${s.secs} 节 ${s.subs} 小节 ${s.paras} 段 ${fmt(s.hanzi)} 字（${s.formulas} 首方），占全书 ${fmt(base.counts.hanzi)} 字的 ${(s.share * 100).toFixed(2)}%`);
  console.log(`  每方摊到 ${fmt(s.perFormula)} 字教材；理血比理气多 ${fmt(s.gap)} 字（多 2 首方）`);
  console.log('');

  console.log('═══ 六段/方：十六方同一模板 ═══');
  for (const row of st.rows) {
    console.log(`  ${row.title}：${row.formulas} 方 · ${row.paras} 段 · ${row.chars} 字 · 每段 ${row.perPara} 字 · 每方 ${row.perFormula} 字`);
  }
  console.log(`  十六方全部为六段：${st.sixParts ? '是' : '否'}`);
  console.log('');

  console.log(`═══ 组成：${t.slots} 个药位，${t.traced} 个可在方解段逐字回查（${(t.rate * 100).toFixed(1)}%）═══`);
  console.log(`  去重 ${h.unique} 味 · 方均 ${h.avg} 味 · 分章药位 ${h.perChapter.map((x) => `第${x.no}章 ${x.slots}`).join(' / ')}`);
  console.log('  高频：' + h.top.map(([k, v]) => `${k}${v}`).join(' '));
  console.log(`  出现 ≥3 次的通用药 ${h.staples.length} 味：${h.staples.map((x) => x[0] + x[1]).join(' ')}`);
  console.log(`  两章共用药 ${h.cross.length} 味：${h.cross.join('、')}`);
  for (const x of t.stray) console.log(`  ⚠ ${x.name}：组成字段里 ${x.items.join('、')} 在方解段找不到`);
  console.log('');

  console.log(`═══ 君臣佐使：有君 ${r.withJun}/${r.total} · 四角色齐 ${r.full}/${r.total}（${r.fullNames.join('、') || '无'}） · 三角色以上 ${r.three}/${r.total} ═══`);
  console.log(`  无君药抽取：${r.missingJun.length ? r.missingJun.join('、') : '无'}`);
  console.log(`  角色重复判定的方：${a.dup.length ? a.dup.join('、') : '无'}`);
  console.log('');

  console.log('═══ 引文锚点（逐字，可回查）═══');
  const anchors = [
    ['15.1.1', '气、血、湿、火、食、痰六者可单独为病'],
    ['15.1.2', '咽中如有炙脔'],
    ['15.2.3', '心下痞硬，噫气不除者，旋覆代赭汤主之'],
    ['16.1.2', '治胸中血瘀之代表方'],
    ['16.1.3', '中风之气虚血瘀证'],
    ['16.2.3', '脾阳不足、脾不统血证'],
    ['16.2.3', '大便下血，先便后血'],
  ];
  for (const [no, kw] of anchors) {
    const an = anchor(no, kw);
    console.log(`  ${an.locator}  「${kw}」 → ${an.sentence.slice(0, 46)}…`);
  }
  console.log('教学边界：本章只清点教材第15、16章的篇幅、组成抽取与角色覆盖，不据此辨证、不给方、不代剂量；不构成诊断/用药依据');
}

if (require.main === module) main();

module.exports = {
  base, form, CHS, ROLES,
  han, fold, fmt, chapterOf, parasOf, nodeOf,
  roster, scale, structure, herbs, tracing, roles, roleAudit, cite, anchor, verify,
};

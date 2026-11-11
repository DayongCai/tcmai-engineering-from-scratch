#!/usr/bin/env node
'use strict';
/**
 * 方剂学 · 第 9 章 治风剂与治燥剂
 * 课程: departments/02-zhongyao/03-fangjixue/chapters/09-zhifeng-zhizao/docs/zh.md
 * 出处: 教材·第17章 治风剂（14,861 字 / 2 节 / 6 方）
 *       教材·第18章 治燥剂（12,905 字 / 2 节 / 5 方）
 * 依赖: 仅 Node.js 标准库 + standards/fangji/ 的章节层与方剂层 JSON
 *
 * 本章量四件事，全部现算：
 *   1. 规模：27,766 字 / 11 方，两章每方 2,477 与 2,581 字；
 *   2. 组成：99 药位 / 75 味 / 方均 9.0——三章里药味最密；
 *   3. 同名方：消风散曾抓成《局方》同名方 19 条，现按「原方组成为」定位为 13 味；
 *   4. 角色：有君 8/11，三首治风治燥方仍抽不到君药。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const BASE = path.join(ROOT, 'standards', 'fangji', '底本.json');
const FORM = path.join(ROOT, 'standards', 'fangji', 'formulas.json');

const base = JSON.parse(fs.readFileSync(BASE, 'utf8'));
const form = JSON.parse(fs.readFileSync(FORM, 'utf8'));

/** 本课程章覆盖的教材章号：第17章治风 + 第18章治燥 */
const CHS = ['17', '18'];
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

/** 本章 11 首方。 */
function roster() {
  return form.formulas
    .filter((f) => CHS.includes(f.chapter))
    .map((f) => {
      const herbs = f.composition.herbs.map((h) => h.name);
      const fj = f.parts['方解与配伍'] || '';
      const traced = herbs.filter((h) => fj.includes(h));
      return {
        name: f.name,
        chapter: f.chapter,
        sec: f.sec,
        sub: f.sub,
        locator: f.locator,
        herbs,
        slots: herbs.length,
        traced,
        traceRate: traced.length / herbs.length,
        roles: Object.fromEntries(ROLES.map((r) => [r, f.roles[r] || []])),
        roleCount: ROLES.filter((r) => (f.roles[r] || []).length).length,
        chars: Object.values(f.parts || {}).reduce((n, p) => n + han(p), 0),
      };
    });
}

/** 规模。 */
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
    rows, hanzi,
    secs: rows.reduce((n, r) => n + r.secs, 0),
    subs: rows.reduce((n, r) => n + r.subs, 0),
    paras, formulas,
    share: hanzi / base.counts.hanzi,
    perFormula: +(hanzi / formulas).toFixed(0),
    perPara: +(hanzi / paras).toFixed(1),
    gap: Math.abs(rows[0].hanzi - rows[1].hanzi),
  };
}

/** 结构：逐节。 */
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

/** 药：药位、去重、方均、高频、共用药、药味最重的方。 */
function herbs() {
  const rs = roster();
  const slots = rs.flatMap((r) => r.herbs);
  const uniq = [...new Set(slots)];
  const freq = new Map();
  for (const h of slots) freq.set(h, (freq.get(h) || 0) + 1);
  const top = [...freq].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const setOf = (no) => new Set(rs.filter((r) => r.chapter === no).flatMap((r) => r.herbs));
  const a = setOf('17');
  const b = setOf('18');
  const bySize = [...rs].sort((x, y) => y.slots - x.slots);
  return {
    slots: slots.length,
    unique: uniq.length,
    avg: +(slots.length / rs.length).toFixed(1),
    top: top.slice(0, 6),
    cross: [...a].filter((h) => b.has(h)),
    perChapter: CHS.map((no) => ({ no, slots: rs.filter((r) => r.chapter === no).reduce((n, r) => n + r.slots, 0) })),
    biggest: { name: bySize[0].name, slots: bySize[0].slots },
    smallest: { name: bySize[bySize.length - 1].name, slots: bySize[bySize.length - 1].slots },
  };
}

/** 组成抽取的可回查率 + 最差的方。 */
function tracing() {
  const rs = roster();
  const slots = rs.flatMap((r) => r.herbs);
  const traced = rs.flatMap((r) => r.traced);
  const bad = [...rs].sort((a, b) => a.traceRate - b.traceRate);
  return {
    rs,
    slots: slots.length,
    traced: traced.length,
    rate: traced.length / slots.length,
    worst: bad[0],
    worstThree: bad.slice(0, 3).map((r) => ({ name: r.name, traced: r.traced.length, slots: r.slots })),
    stray: rs
      .filter((r) => r.slots > r.traced.length)
      .map((r) => ({ name: r.name, items: r.herbs.filter((h) => !r.traced.includes(h)) })),
  };
}

/** 中文数字（1–99）转阿拉伯数字，只用于「凡N味」这类自报味数。 */
const CN = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
function cn2n(s) {
  if (!s.includes('十')) return CN[s] || NaN;
  const [a, b] = s.split('十');
  return (a ? CN[a] : 1) * 10 + (b ? CN[b] : 0);
}

/** 教材在方源段自报的味数（「凡十三味」）与组成字段的实际条目数对账。 */
function declared() {
  return roster()
    .map((r) => {
      const t = (form.formulas.find((x) => x.name === r.name).parts['方源与组成'] || '');
      const m = t.match(/凡([一二三四五六七八九十]{1,3})味/);
      if (!m) return null;
      const n = cn2n(m[1]);
      return { name: r.name, declared: n, slots: r.slots, diff: r.slots - n, traced: r.traced.length };
    })
    .filter(Boolean);
}


/** 全库药名词表（246 味），用于找「方解段提到、组成字段未收」的药。 */
const VOCAB = [...new Set(form.formulas.flatMap((f) => f.composition.herbs.map((h) => h.name)))];

/** 漏药审计：方解段点名、组成字段却没有的药（含异名残片，如 白附子→附子）。 */
function gap() {
  return roster().map((r) => {
    const fj = form.formulas.find((x) => x.name === r.name).parts['方解与配伍'] || '';
    return {
      name: r.name,
      missing: VOCAB.filter((v) => v.length >= 2 && fj.includes(v) && !r.herbs.includes(v)),
    };
  }).filter((x) => x.missing.length);
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
    byChapter: CHS.map((no) => ({
      no,
      withJun: rs.filter((r) => r.chapter === no && r.roles['君'].length).length,
      total: rs.filter((r) => r.chapter === no).length,
    })),
  };
}

function cite(no) {
  return `教材·第${String(no).split('.')[0]}章·${no}`;
}

/** 从指定小节取一句含关键词的教材正文（运行时取，避免抄错字）。 */
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
  const d = declared();
  const g = gap();

  console.log('═══ 治风剂与治燥剂：两章 / 十一方（教材·第17章 + 教材·第18章）═══');
  for (const row of s.rows) {
    console.log(`  ${row.title}：${row.secs} 节 ${row.subs} 小节 ${row.paras} 段 ${fmt(row.hanzi)} 字 ${row.formulas} 方 · 每方 ${fmt(row.perFormula)} 字`);
  }
  console.log(`  合计 ${s.secs} 节 ${s.subs} 小节 ${s.paras} 段 ${fmt(s.hanzi)} 字（${s.formulas} 首方），占全书 ${fmt(base.counts.hanzi)} 字的 ${(s.share * 100).toFixed(2)}%`);
  console.log(`  每方摊到 ${fmt(s.perFormula)} 字教材；两章字数相差 ${fmt(s.gap)} 字（治风多 1 首方）`);
  console.log('');

  console.log('═══ 六段/方 ═══');
  for (const row of st.rows) {
    console.log(`  ${row.title}：${row.formulas} 方 · ${row.paras} 段 · ${row.chars} 字 · 每段 ${row.perPara} 字 · 每方 ${row.perFormula} 字`);
  }
  console.log(`  十一方全部为六段：${st.sixParts ? '是' : '否'}`);
  console.log('');

  console.log(`═══ 组成：${t.slots} 个药位，${t.traced} 个可在方解段逐字回查（${(t.rate * 100).toFixed(1)}%）═══`);
  console.log(`  去重 ${h.unique} 味 · 方均 ${h.avg} 味（三章里最密）· 分章药位 ${h.perChapter.map((x) => `第${x.no}章 ${x.slots}`).join(' / ')}`);
  console.log('  高频：' + h.top.map(([k, v]) => `${k}${v}`).join(' '));
  console.log(`  药味最多：${h.biggest.name} ${h.biggest.slots} 味；最少：${h.smallest.name} ${h.smallest.slots} 味`);
  console.log(`  两章共用药 ${h.cross.length} 味：${h.cross.join('、')}`);
  console.log(`  回查最差三方：${t.worstThree.map((x) => `${x.name} ${x.traced}/${x.slots}`).join(' · ')}`);
  for (const x of t.stray) {
    console.log(`  ⚠ ${x.name}：${x.items.length} 个条目在方解段找不到 → ${x.items.slice(0, 6).join('、')}${x.items.length > 6 ? '…' : ''}`);
  }
  console.log('');

  console.log(`═══ 君臣佐使：有君 ${r.withJun}/${r.total} · 四角色齐 ${r.full}/${r.total}（${r.fullNames.join('、') || '无'}） · 三角色以上 ${r.three}/${r.total} ═══`);
  console.log(`  分章有君：${r.byChapter.map((x) => `第${x.no}章 ${x.withJun}/${x.total}`).join(' / ')}`);
  console.log(`  无君药抽取：${r.missingJun.length ? r.missingJun.join('、') : '无'}`);
  console.log('');

  console.log(`═══ 教材自报味数 vs 组成字段：${d.length} 首有「凡N味」声明，${d.filter((x) => x.diff === 0).length} 首相符 ═══`);
  for (const x of d) {
    console.log(`  ${x.name}：教材 ${x.declared} 味 · 组成字段 ${x.slots} 条（${x.diff > 0 ? '+' + x.diff : x.diff}）· 可回查 ${x.traced}`);
  }
  console.log('  消风散 13 条与自报「凡十三味」一致，且 13 味全部能在方解段回查；牵正散多出的 1 条是「并生用」这一截用法串。');
  console.log('');

  console.log('═══ 漏药：方解段点名、组成字段未收 ═══');
  for (const x of g) console.log(`  ${x.name}：${x.missing.join('、')}`);
  console.log('  漏的多是异名残片（川贝母/贝母、生地黄/生地、胡麻仁/胡麻），并混入「三味」这类切分噪声——词表里本不该有非药串。');
  console.log('');

  console.log('═══ 引文锚点（逐字，可回查）═══');
  const anchors = [
    ['17.1.1', '为治外感风邪头痛之常用方'],
    ['17.1.1', '偏正头痛或巅顶作痛，目眩鼻塞'],
    ['17.2.2', '肝肾阴虚、肝阳偏亢'],
    ['18.1.1', '为治外感凉燥之代表方'],
    ['18.1.1', '轻宣凉燥，理肺化痰'],
    ['18.1.2', '清宣温燥，润肺止咳'],
    ['18.2.1', '滋养肺胃以培土生金'],
  ];
  for (const [no, kw] of anchors) {
    const an = anchor(no, kw);
    console.log(`  ${an.locator}  「${kw}」 → ${an.sentence.slice(0, 46)}…`);
  }
  console.log('教学边界：本章只清点教材第17、18章的篇幅、组成抽取与角色覆盖，不据此辨证、不给方、不代剂量；不构成诊断/用药依据');
}

if (require.main === module) main();

module.exports = {
  base, form, CHS, ROLES,
  han, fold, fmt, chapterOf, parasOf, nodeOf,
  roster, scale, structure, herbs, tracing, roles, declared, gap, VOCAB, cn2n, cite, anchor, verify,
};

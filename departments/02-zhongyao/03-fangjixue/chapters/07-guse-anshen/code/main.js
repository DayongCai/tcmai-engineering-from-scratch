#!/usr/bin/env node
'use strict';
/**
 * 方剂学 · 第 7 章 固涩剂与安神剂
 * 课程: departments/02-zhongyao/03-fangjixue/chapters/07-guse-anshen/docs/zh.md
 * 出处: 教材·第13章 固涩剂（12,028 字 / 3 节 / 4 方）
 *       教材·第14章 安神剂与开窍剂（15,072 字 / 4 节 / 5 方）
 * 依赖: 仅 Node.js 标准库 + standards/fangji/ 的 底本.json 与 formulas.json
 *
 * 本章量四件事，全部现算，不手打：
 *   1. 规模：两章字数按方数摊开，为什么 27,100 字只装了 9 首方；
 *   2. 结构：六段/方 是恒定模板，每段字数在两章之间几乎相同；
 *   3. 组成：75 个药位里有多少能在「方解与配伍」段逐字回查（抽错的会被抓出来）；
 *   4. 角色：君臣佐使抽到的覆盖率，以及「抽不到 ≠ 教材没写」。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const BASE = path.join(ROOT, 'standards', 'fangji', '底本.json');
const FORM = path.join(ROOT, 'standards', 'fangji', 'formulas.json');

const base = JSON.parse(fs.readFileSync(BASE, 'utf8'));
const form = JSON.parse(fs.readFileSync(FORM, 'utf8'));

/** 本课程章覆盖的教材章号：第13章固涩 + 第14章安神开窍 */
const CHS = ['13', '14'];
const ROLES = ['君', '臣', '佐', '使'];

const han = (s) => (s.match(/[\u4e00-\u9fa5]/g) || []).length;
/** 折叠空白与标点：与门禁同一口径，用于「引文能否逐字回查」。 */
const fold = (s) => s.replace(/\s/g, '').replace(/[，,。．；;：:、（）()「」『』""'']/g, '');
const fmt = (n) => n.toLocaleString('en-US');

const chapterOf = (no) => base.chapters.find((c) => c.no === no);
/** 一节/一小节下的全部段（段标题与正文同条目，字数只算正文汉字）。 */
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

/** 本章 9 首方：方名 / 章节位置 / 药位 / 君臣佐使 / 组成可回查数。 */
function roster() {
  return form.formulas
    .filter((f) => CHS.includes(f.chapter))
    .map((f) => {
      const herbs = f.composition.herbs.map((h) => h.name);
      const fj = f.parts['方解与配伍'] || '';
      return {
        name: f.name,
        chapter: f.chapter,
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
    return { no, title: c.title, hanzi: c.counts.hanzi, secs: c.counts.secs, subs: c.counts.subs, paras: c.counts.paras };
  });
  const hanzi = rows.reduce((n, r) => n + r.hanzi, 0);
  const secs = rows.reduce((n, r) => n + r.secs, 0);
  const subs = rows.reduce((n, r) => n + r.subs, 0);
  const paras = rows.reduce((n, r) => n + r.paras, 0);
  const n = roster().length;
  return {
    rows,
    hanzi,
    secs,
    subs,
    paras,
    formulas: n,
    share: hanzi / base.counts.hanzi,
    perFormula: +(hanzi / n).toFixed(0),
    perPara: +(hanzi / paras).toFixed(1),
  };
}

/** 结构：逐节 段数 / 字数 / 每段均字，以及「6 段/方」是否恒定。 */
function structure() {
  const rows = CHS.flatMap((no) =>
    chapterOf(no).secs.map((s) => {
      const ps = parasOf(s);
      const chars = ps.reduce((n, p) => n + han(p.text || ''), 0);
      const formulas = form.formulas.filter((f) => f.sub.startsWith(s.no + '.')).length;
      return {
        no: s.no,
        title: s.title,
        chapter: no,
        paras: ps.length,
        chars,
        formulas,
        perPara: +(chars / ps.length).toFixed(1),
        perFormula: formulas ? +(chars / formulas).toFixed(0) : null,
      };
    }),
  );
  const per = roster().map((f) => Object.keys(form.formulas.find((x) => x.name === f.name).parts || {}).length);
  return {
    rows,
    /** 每首方是否都是六段（方源/用法/功用主治/方解/运用/现代研究） */
    sixParts: per.every((n) => n === 6),
    partsPerFormula: per,
  };
}

/** 药：药位、去重、方均药味、高频药、两章共用药。 */
function herbs() {
  const rs = roster();
  const slots = rs.flatMap((r) => r.herbs);
  const uniq = [...new Set(slots)];
  const freq = new Map();
  for (const h of slots) freq.set(h, (freq.get(h) || 0) + 1);
  const top = [...freq].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const setOf = (no) => new Set(rs.filter((r) => r.chapter === no).flatMap((r) => r.herbs));
  const a = setOf('13');
  const b = setOf('14');
  return {
    slots: slots.length,
    unique: uniq.length,
    avg: +(slots.length / rs.length).toFixed(1),
    top: top.slice(0, 5),
    cross: [...a].filter((h) => b.has(h)),
    perChapter: CHS.map((no) => ({ no, slots: rs.filter((r) => r.chapter === no).reduce((n, r) => n + r.slots, 0) })),
  };
}

/** 组成抽取的可回查率：药名能否在「方解与配伍」段逐字找到（抓噪声与漏药）。 */
function tracing() {
  const rs = roster();
  const slots = rs.flatMap((r) => r.herbs);
  const traced = rs.flatMap((r) => r.traced);
  return {
    rs,
    slots: slots.length,
    traced: traced.length,
    rate: traced.length / slots.length,
    /** 只在组成字段出现、方解段找不到的条目：多为用法句或方名被误切成药 */
    stray: rs.filter((r) => r.slots > r.traced.length).map((r) => ({ name: r.name, items: r.herbs.filter((h) => !r.traced.includes(h)) })),
  };
}

/** 角色抽取自查：同一味药被同时判为两个角色，是 60 字窗口重叠造成的典型误抽。 */
function roleAudit() {
  const rs = roster();
  return {
    dup: rs
      .map((r) => ({ name: r.name, all: ROLES.flatMap((x) => r.roles[x]) }))
      .filter((x) => new Set(x.all).size !== x.all.length)
      .map((x) => `${x.name}（${x.all.join('/')}）`),
  };
}

/** 君臣佐使：抽到的角色覆盖（教材有写、抽取层可能抽不到，见 README §5）。 */
function roles() {
  const rs = roster();
  const withJun = rs.filter((r) => r.roles['君'].length).length;
  const full = rs.filter((r) => r.roleCount === 4).length;
  const three = rs.filter((r) => r.roleCount >= 3).length;
  return { withJun, full, three, total: rs.length, missingJun: rs.filter((r) => !r.roles['君'].length).map((r) => r.name) };
}

function cite(no) {
  return `教材·第${String(no).split('.')[0]}章·${no}`;
}

/** 从指定小节里取一句含关键词的原文（不写死，避免抄错字）。 */
function anchor(no, kw) {
  const node = nodeOf(no);
  if (!node) throw new Error(`教材里没有 ${no}`);
  const p = (node.paras || []).find((x) => (x.text || '').includes(kw));
  if (!p) throw new Error(`${no} 里找不到含「${kw}」的段落`);
  const sents = p.text.split(/(?<=。)/).map((s) => s.trim()).filter(Boolean);
  return { locator: cite(no), sentence: sents.find((s) => s.includes(kw)) || p.text };
}

/** 引文逐字回查（与门禁同口径）：必须落在该引文标注的那个小节里。 */
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

  console.log('═══ 固涩剂与安神剂：两章 / 九方（教材·第13章 + 教材·第14章）═══');
  for (const row of s.rows) {
    console.log(`  ${row.title}：${row.secs} 节 ${row.subs} 小节 ${row.paras} 段 ${fmt(row.hanzi)} 字`);
  }
  console.log(`  合计 ${s.secs} 节 ${s.subs} 小节 ${s.paras} 段 ${fmt(s.hanzi)} 字（${s.formulas} 首方），占全书 ${fmt(base.counts.hanzi)} 字的 ${(s.share * 100).toFixed(2)}%`);
  console.log(`  每方摊到 ${fmt(s.perFormula)} 字教材；每段均字 ${s.perPara}`);
  console.log('');

  console.log('═══ 六段/方：模板比内容更整齐 ═══');
  for (const row of st.rows) {
    console.log(`  ${row.title}：${row.formulas} 方 · ${row.paras} 段 · ${row.chars} 字 · 每段 ${row.perPara} 字 · 每方 ${row.perFormula} 字`);
  }
  console.log(`  九首方全部为六段（方源/用法/功用主治/方解/运用/现代研究）：${st.sixParts ? '是' : '否'}`);
  console.log('');

  console.log(`═══ 组成：${t.slots} 个药位，${t.traced} 个可在方解段逐字回查（${(t.rate * 100).toFixed(1)}%）═══`);
  console.log(`  去重 ${h.unique} 味 · 方均 ${h.avg} 味 · 分章药位 ${h.perChapter.map((x) => `第${x.no}章 ${x.slots}`).join(' / ')}`);
  console.log('  高频：' + h.top.map(([k, v]) => `${k}${v}`).join(' '));
  console.log(`  两章共用药 ${h.cross.length} 味：${h.cross.join('、')}`);
  for (const x of t.stray) console.log(`  ⚠ ${x.name}：组成字段里 ${x.items.join('、')} 在方解段找不到（方解用异名，或用法句被误切成药）`);
  console.log('');

  console.log(`═══ 君臣佐使：有君 ${r.withJun}/${r.total} · 四角色齐 ${r.full}/${r.total} · 三角色以上 ${r.three}/${r.total} ═══`);
  console.log(`  无君药抽取：${r.missingJun.length ? r.missingJun.join('、') : '无'}`);
  console.log(`  角色重复判定的方：${a.dup.length ? a.dup.join('、') : '无'}（60 字窗口重叠导致，见 roleEvidence）`);
  console.log('  抽不到不等于教材没写：四角色齐 0 首，是抽取层按三级信号每角色只取第一条所致。');
  console.log('');

  console.log('═══ 引文锚点（逐字，可回查）═══');
  const anchors = [
    ['13.1.1', '敛阴止汗，益气固表'],
    ['13.2.1', '五更作泻、泻后则安'],
    ['13.3.1', '遗精滑泄，日久不愈，腰酸耳鸣'],
    ['14.1.1', '镇固浮越之心神'],
    ['14.2.2', '虚劳虚烦不得眠，酸枣仁汤主之'],
    ['14.3.1', '凉开剂之第一要方'],
    ['14.4.1', '只宜于寒闭'],
  ];
  for (const [no, kw] of anchors) {
    const a = anchor(no, kw);
    console.log(`  ${a.locator}  「${kw}」 → ${a.sentence.slice(0, 46)}…`);
  }
  console.log('教学边界：本章只清点教材第13、14章的篇幅、组成抽取与角色覆盖，不据此辨证、不给方、不代剂量；不构成诊断/用药依据');
}

if (require.main === module) main();

module.exports = {
  base, form, CHS, ROLES,
  han, fold, fmt, chapterOf, parasOf, nodeOf,
  roster, scale, structure, herbs, tracing, roles, roleAudit, cite, anchor, verify,
};

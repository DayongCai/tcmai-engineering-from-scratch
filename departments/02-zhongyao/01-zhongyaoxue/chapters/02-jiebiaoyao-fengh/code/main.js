#!/usr/bin/env node
'use strict';
/**
 * 中药学 · 第 2 章 解表药：发散风寒与风热
 * 课程: departments/02-zhongyao/01-zhongyaoxue/chapters/02-jiebiaoyao-fengh/docs/zh.md
 * 出处: 教材·第9章 解表药（2 节 21 小节 63 段 3,965 字 / 21 味药）
 * 依赖: 仅 Node.js 标准库 + 读 standards/zhongyao/ 的两份 JSON
 *
 * 本章量一个判据问题：教材把 21 味解表药分成「发散风寒 / 发散风热」两节，
 * 到底哪个字段能分开这两节？
 *   1. 四气：9.1 全为温/微温（12 味），9.2 全为凉/寒/微寒（9 味）→ 错分 0；
 *   2. 五味：辛 19/21 横跨两节（9.1 12/12、9.2 7/9）→ 区分力 0；
 *   3. 归经：肺 17/21 是共性，肝 8 味里 6 味落在 9.2 → 风热的弱指纹。
 * 所有分布、字数、剂量区间都在运行时从教材现算，不写死。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const BASE = path.join(ROOT, 'standards', 'zhongyao', '底本.json');
const DRUGS = path.join(ROOT, 'standards', 'zhongyao', 'drugs.json');

const book = JSON.parse(fs.readFileSync(BASE, 'utf8'));
const drugBook = JSON.parse(fs.readFileSync(DRUGS, 'utf8'));

const CH_NO = '9';
const ch = book.chapters.find((c) => String(c.no) === CH_NO);
const drugs = drugBook.drugs.filter((d) => String(d.chapter) === CH_NO);

const paras = (s) => (s.paras || []).concat(...s.subs.map((u) => u.paras));
const secChars = (s) => paras(s).join('').length;
const secParas = (s) => (s.paras || []).length + s.subs.reduce((n, u) => n + u.paras.length, 0);
const fmt = (n) => n.toLocaleString('en-US');
const pct = (a, b) => +((a / b) * 100).toFixed(1);

function sec(no) {
  return ch.secs.find((s) => s.no === no);
}

function sub(no) {
  for (const s of ch.secs) {
    const hit = (s.subs || []).find((x) => x.no === no);
    if (hit) return hit;
  }
  return undefined;
}

function para(no, i) {
  const s = sub(no);
  if (!s || !s.paras[i]) throw new Error(`教材里没有 ${no} 的第 ${i + 1} 段`);
  return s.paras[i];
}

function drug(name) {
  const d = drugs.find((x) => x.name === name);
  if (!d) throw new Error(`教材·第${CH_NO}章 没有这味药: ${name}`);
  return d;
}

const fold = (s) => s.replace(/\s/g, '').replace(/[，,。．；;：:、（）()「」『』]/g, '');

/** 结构：逐节药数/段数/字数/每味均字。 */
function shape() {
  const rows = ch.secs.map((s) => {
    const p = secParas(s);
    const c = secChars(s);
    const n = s.subs.length;
    return {
      no: s.no,
      title: s.title,
      drugs: n,
      paras: p,
      items: s.subs.reduce((acc, u) => acc + (u.items || []).length, 0),
      chars: c,
      perDrug: +(c / n).toFixed(1),
    };
  });
  const total = rows.reduce((n, r) => n + r.chars, 0);
  return {
    rows,
    total,
    share: total / book.counts.chars,
    secs: ch.counts.secs,
    subs: ch.counts.subs,
    paras: ch.counts.paras,
    items: ch.counts.items,
    perDrug: +(total / ch.counts.subs).toFixed(1),
    /** 药目体量（drugs 层每味 chars 之和）与教材字数应相等 */
    drugChars: drugs.reduce((n, d) => n + (d.chars || 0), 0),
  };
}

const QI_ORDER = ['温', '微温', '凉', '寒', '微寒', '平', '热', '大寒'];

/** 四气分布 + 「四气能否分开两节」的判定。 */
function qi() {
  const dist = {};
  for (const d of drugs) dist[d.nature.qi || '(空)'] = (dist[d.nature.qi || '(空)'] || 0) + 1;
  const bySec = ch.secs.map((s) => {
    const dd = {};
    for (const u of s.subs) {
      const q = drug(u.title).nature.qi || '(空)';
      dd[q] = (dd[q] || 0) + 1;
    }
    return { no: s.no, title: s.title, n: s.subs.length, dist: dd };
  });
  // 判据：风寒节 ⊂ {温, 微温}，风热节 ⊂ {凉, 寒, 微寒}
  const RULE = { '9.1': ['温', '微温'], '9.2': ['凉', '寒', '微寒'] };
  const wrong = [];
  for (const s of ch.secs) {
    for (const u of s.subs) {
      const q = drug(u.title).nature.qi;
      if (!RULE[s.no].includes(q)) wrong.push({ name: u.title, sec: s.no, qi: q });
    }
  }
  return {
    order: QI_ORDER,
    dist,
    bySec,
    rule: RULE,
    wrong,
    separated: wrong.length === 0,
    distinct: Object.keys(dist).length,
  };
}

const WEI_ORDER = ['辛', '甘', '苦', '微苦', '酸', '咸', '淡', '涩'];

/** 五味分布 + 「辛」在两节的占比（判据检验用）。 */
function wei() {
  const dist = {};
  for (const d of drugs) for (const w of d.nature.wei) dist[w] = (dist[w] || 0) + 1;
  const bySec = ch.secs.map((s) => {
    const dd = {};
    let xin = 0;
    for (const u of s.subs) {
      const w = drug(u.title).nature.wei;
      if (w.includes('辛')) xin += 1;
      for (const x of w) dd[x] = (dd[x] || 0) + 1;
    }
    return { no: s.no, title: s.title, n: s.subs.length, dist: dd, xin, rate: pct(xin, s.subs.length) };
  });
  const xin = drugs.filter((d) => d.nature.wei.includes('辛')).length;
  return {
    order: WEI_ORDER,
    dist,
    bySec,
    xin,
    xinRate: pct(xin, drugs.length),
    /** 辛在两个节都过半数 → 不能当分节判据 */
    xinSpansBoth: bySec.every((r) => r.xin > r.n / 2),
    noXin: drugs.filter((d) => !d.nature.wei.includes('辛')).map((d) => `${d.name}(${d.sec})`),
  };
}

/** 归经分布，按出现次数降序。 */
function gui() {
  const dist = {};
  for (const d of drugs) for (const g of d.nature.guijing) dist[g] = (dist[g] || 0) + 1;
  const rows = Object.entries(dist)
    .map(([jing, n]) => ({ jing, n, rate: pct(n, drugs.length) }))
    .sort((a, b) => b.n - a.n);
  const bySec = ch.secs.map((s) => {
    const dd = {};
    for (const u of s.subs) for (const g of drug(u.title).nature.guijing) dd[g] = (dd[g] || 0) + 1;
    return { no: s.no, title: s.title, dist: dd, top: Object.entries(dd).sort((a, b) => b[1] - a[1])[0] };
  });
  return { rows, bySec, total: drugs.reduce((n, d) => n + d.nature.guijing.length, 0) };
}

const TAGS = ['先煎', '后下', '包煎', '另煎', '冲服', '烊化'];

/** 用法用量：抽「煎服 a-b g」区间与特殊煎法标签。 */
function dose() {
  const rows = drugs.map((d) => {
    const t = d.fields['用法用量与使用注意'] || '';
    const m = t.match(/([\d.]+)-([\d.]+)\s*g/);
    const tags = TAGS.filter((x) => t.includes(x));
    return {
      name: d.name,
      sec: d.sec,
      lo: m ? +m[1] : null,
      hi: m ? +m[2] : null,
      span: m ? +(+m[2] - +m[1]).toFixed(1) : null,
      tags,
    };
  });
  const withDose = rows.filter((r) => r.hi !== null);
  const bySpan = [...withDose].sort((a, b) => a.span - b.span);
  const byHi = [...withDose].sort((a, b) => a.hi - b.hi);
  const tagsAgg = {};
  for (const r of rows) for (const t of r.tags) tagsAgg[t] = (tagsAgg[t] || 0) + 1;
  return {
    rows,
    withDose: withDose.length,
    narrowest: bySpan[0],
    widest: [...withDose].sort((a, b) => b.span - a.span)[0],
    lowestHi: byHi[0],
    highestHi: byHi[byHi.length - 1],
    tags: tagsAgg,
    tagged: rows.filter((r) => r.tags.length).map((r) => `${r.name}:${r.tags.join('/')}`),
  };
}

function citation(no) {
  return `教材·第${CH_NO}章·${no}`;
}

function resolve(no) {
  const parts = String(no).split('.');
  if (parts.length === 2) return ch.secs.some((s) => s.no === no);
  if (parts.length === 3) return Boolean(sub(no));
  const parent = sub(parts.slice(0, 3).join('.'));
  return Boolean(parent && (parent.items || []).some((i) => i.no === no));
}

function main() {
  const s = shape();
  const q = qi();
  const w = wei();
  const g = gui();
  const dz = dose();

  console.log(`═══ 解表药（教材·第${CH_NO}章）═══`);
  for (const r of s.rows) {
    console.log(`  ${r.no} ${r.title}：${r.drugs} 味 · ${r.paras} 段 · ${r.chars} 字 · 每味 ${r.perDrug} 字`);
  }
  console.log(`  合计 ${s.secs} 节 ${s.subs} 味 ${s.paras} 段 ${fmt(s.total)} 字，占全书 ${fmt(book.counts.chars)} 字的 ${(s.share * 100).toFixed(2)}%；每味均字 ${s.perDrug}`);
  console.log(`  drugs 层字数和 ${fmt(s.drugChars)} 字，与教材字数${s.drugChars === s.total ? '一致' : '不一致（需核对）'}`);
  console.log('');

  console.log('═══ 判据一：四气 ═══');
  console.log('  ' + q.order.filter((k) => q.dist[k]).map((k) => `${k} ${q.dist[k]}`).join(' · '));
  for (const r of q.bySec) console.log(`  ${citation(r.no)}：${r.n} 味 → ` + Object.entries(r.dist).map(([k, v]) => `${k}${v}`).join(' '));
  console.log(`  规则：9.1 ⊂ {温,微温}；9.2 ⊂ {凉,寒,微寒} → 错分 ${q.wrong.length} 味 ${q.separated ? '（两节被四气完全分开）' : '（' + q.wrong.map((x) => x.name).join('、') + '）'}`);
  console.log('');

  console.log('═══ 判据二：五味 ═══');
  console.log('  ' + w.order.filter((k) => w.dist[k]).map((k) => `${k} ${w.dist[k]}`).join(' · '));
  for (const r of w.bySec) console.log(`  ${citation(r.no)}：辛 ${r.xin}/${r.n}（${r.rate}%）· ` + Object.entries(r.dist).map(([k, v]) => `${k}${v}`).join(' '));
  console.log(`  辛 ${w.xin}/${drugs.length}（${w.xinRate}%），两节都过半：${w.xinSpansBoth ? '是' : '否'} → 辛不能当分节判据`);
  console.log(`  不标辛的：${w.noXin.join('、')}`);
  console.log('');

  console.log('═══ 判据三：归经 ═══');
  console.log('  ' + g.rows.map((r) => `${r.jing} ${r.n}(${r.rate}%)`).join(' · '));
  for (const r of g.bySec) {
    const top = Object.entries(r.dist).sort((a, b) => b[1] - a[1]).slice(0, 4);
    console.log(`  ${citation(r.no)}：` + top.map(([k, v]) => `${k}${v}`).join(' '));
  }
  console.log('');

  console.log('═══ 用法用量（逐药现算）═══');
  console.log(`  抽出煎服区间的：${dz.withDose}/${dz.rows.length} 味`);
  console.log(`  区间最窄：${dz.narrowest.name} ${dz.narrowest.lo}-${dz.narrowest.hi}g；最宽：${dz.widest.name} ${dz.widest.lo}-${dz.widest.hi}g`);
  console.log(`  上限最低：${dz.lowestHi.name} ${dz.lowestHi.hi}g；上限最高：${dz.highestHi.name} ${dz.highestHi.hi}g`);
  console.log(`  特殊煎法：${Object.entries(dz.tags).map(([k, v]) => `${k}${v}`).join(' · ')} → ${dz.tagged.join('、')}`);
  console.log('教学边界：本章只做解表药 21 味的性味归经与用量区间的教材清点，不据此选药、不做剂量折算、不给方剂；不构成用药依据。');
}

if (require.main === module) main();

module.exports = {
  book, drugBook, ch, drugs, CH_NO,
  sec, sub, para, drug, paras, secChars, secParas, fold,
  shape, qi, wei, gui, dose, citation, resolve,
};

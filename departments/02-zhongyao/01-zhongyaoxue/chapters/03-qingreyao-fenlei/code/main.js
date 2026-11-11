#!/usr/bin/env node
'use strict';
/**
 * 中药学 · 第 3 章 清热药：泻火、解毒与凉血
 * 课程: departments/02-zhongyao/01-zhongyaoxue/chapters/03-qingreyao-fenlei/docs/zh.md
 * 出处: 教材·第10章 清热药（5 节 36 小节 108 段 6,193 字 / 36 味药）
 * 依赖: 仅 Node.js 标准库 + 读 standards/zhongyao/ 的两份 JSON
 *
 * 本章的判据问题与解表药正好相反：
 *   1. 四气在这一章**零区分力**——36 味全在寒侧（大寒 1 / 寒 26 / 微寒 9），无一味温、热、凉、平；
 *   2. 真正能分开五节的是「功效首词」：节名就是功效，36 味里 34 味含本节关键词（例外 2 味）；
 *   3. 归经给的是「部位」不是「类别」：大肠 10 味里 5 味在清热燥湿一节。
 * 所有分布、字数、剂量区间都在运行时从教材现算，不写死。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const BASE = path.join(ROOT, 'standards', 'zhongyao', '底本.json');
const DRUGS = path.join(ROOT, 'standards', 'zhongyao', 'drugs.json');

const book = JSON.parse(fs.readFileSync(BASE, 'utf8'));
const drugBook = JSON.parse(fs.readFileSync(DRUGS, 'utf8'));

const CH_NO = '10';
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
    drugChars: drugs.reduce((n, d) => n + (d.chars || 0), 0),
  };
}

const QI_ORDER = ['大寒', '寒', '微寒', '凉', '平', '微温', '温', '热', '大热'];
const COLD_SIDE = ['大寒', '寒', '微寒', '凉'];

/** 四气分布 + 「四气能否分开五节」的判定（本章预期：不能）。 */
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
  const offSide = drugs.filter((d) => !COLD_SIDE.includes(d.nature.qi)).map((d) => `${d.name}:${d.nature.qi}`);
  return {
    order: QI_ORDER,
    dist,
    bySec,
    offSide,
    allCold: offSide.length === 0,
    /** 只有一档（或两档近义）时，四气在两节间不可能产生区分 */
    coldest: drugs.filter((d) => d.nature.qi === '大寒').map((d) => d.name),
    gradations: Object.keys(dist).length,
  };
}

const WEI_ORDER = ['苦', '微苦', '甘', '辛', '咸', '酸', '涩', '淡'];

/** 五味分布 + 逐节的「苦」占比（苦是本节的弱判据）。 */
function wei() {
  const dist = {};
  for (const d of drugs) for (const w of d.nature.wei) dist[w] = (dist[w] || 0) + 1;
  const bySec = ch.secs.map((s) => {
    const dd = {};
    let bitter = 0;
    for (const u of s.subs) {
      const w = drug(u.title).nature.wei;
      if (w.includes('苦') || w.includes('微苦')) bitter += 1;
      for (const x of w) dd[x] = (dd[x] || 0) + 1;
    }
    return { no: s.no, title: s.title, n: s.subs.length, dist: dd, bitter, rate: pct(bitter, s.subs.length) };
  });
  const bitter = drugs.filter((d) => d.nature.wei.some((w) => w === '苦' || w === '微苦')).length;
  return {
    order: WEI_ORDER,
    dist,
    bySec,
    bitter,
    bitterRate: pct(bitter, drugs.length),
    /** 逐节都是苦占多数 → 苦是共性；只有 10.2 达到 100% */
    fullBitter: bySec.filter((r) => r.bitter === r.n).map((r) => r.no),
  };
}

/** 归经分布：按出现次数降序 + 逐节前三位。 */
function gui() {
  const dist = {};
  for (const d of drugs) for (const g of d.nature.guijing) dist[g] = (dist[g] || 0) + 1;
  const rows = Object.entries(dist)
    .map(([jing, n]) => ({ jing, n, rate: pct(n, drugs.length) }))
    .sort((a, b) => b.n - a.n);
  const bySec = ch.secs.map((s) => {
    const dd = {};
    for (const u of s.subs) for (const g of drug(u.title).nature.guijing) dd[g] = (dd[g] || 0) + 1;
    return { no: s.no, title: s.title, dist: dd, top: Object.entries(dd).sort((a, b) => b[1] - a[1]).slice(0, 3) };
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
  const maxHi = byHi[byHi.length - 1].hi;
  const tagsAgg = {};
  for (const r of rows) for (const t of r.tags) tagsAgg[t] = (tagsAgg[t] || 0) + 1;
  return {
    rows,
    withDose: withDose.length,
    narrowest: bySpan[0],
    widest: [...withDose].sort((a, b) => b.span - a.span)[0],
    lowest: byHi[0],
    highest: byHi.filter((r) => r.hi === maxHi).map((r) => r.name),
    maxHi,
    tags: tagsAgg,
    tagged: rows.filter((r) => r.tags.length).map((r) => `${r.name}:${r.tags.join('/')}`),
  };
}

/** 节名就是功效：把节名去掉开头的「清」/「清热」与末尾「药」当关键词，看逐药功效句是否命中。 */
function eff() {
  const keyOf = (title) => title.replace(/^清(热)?/, '').replace(/药$/, '');
  const rows = ch.secs.map((s) => {
    const key = keyOf(s.title);
    const hit = [];
    const miss = [];
    for (const u of s.subs) {
      const f = drug(u.title).fields['功效与主治'];
      (f.includes(key) ? hit : miss).push(u.title);
    }
    return { no: s.no, title: s.title, key, n: s.subs.length, hit: hit.length, miss, rate: pct(hit.length, s.subs.length) };
  });
  const totalHit = rows.reduce((n, r) => n + r.hit, 0);
  return {
    rows,
    totalHit,
    totalMiss: drugs.length - totalHit,
    rate: pct(totalHit, drugs.length),
    /** 全章最常出现的功效词 */
    top: Object.entries(
      drugs.reduce((acc, d) => {
        const first = d.fields['功效与主治'].split('。')[0].replace(/^.*?功效/, '');
        for (const k of first.split(/[、，]/)) {
          const kk = k.trim();
          if (kk.length >= 2) acc[kk] = (acc[kk] || 0) + 1;
        }
        return acc;
      }, {}),
    ).sort((a, b) => b[1] - a[1]).slice(0, 5),
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
  const e = eff();

  console.log(`═══ 清热药（教材·第${CH_NO}章）═══`);
  for (const r of s.rows) {
    console.log(`  ${r.no} ${r.title}：${r.drugs} 味 · ${r.paras} 段 · ${r.chars} 字 · 每味 ${r.perDrug} 字`);
  }
  console.log(`  合计 ${s.secs} 节 ${s.subs} 味 ${s.paras} 段 ${fmt(s.total)} 字，占全书 ${fmt(book.counts.chars)} 字的 ${(s.share * 100).toFixed(2)}%；每味均字 ${s.perDrug}`);
  console.log(`  drugs 层字数和 ${fmt(s.drugChars)} 字，与教材字数${s.drugChars === s.total ? '一致' : '不一致（需核对）'}`);
  console.log('');

  console.log('═══ 四气：全章无温无热，零区分力 ═══');
  console.log('  ' + q.order.filter((k) => q.dist[k]).map((k) => `${k} ${q.dist[k]}`).join(' · '));
  for (const r of q.bySec) console.log(`  ${citation(r.no)}：${r.n} 味 → ` + Object.entries(r.dist).map(([k, v]) => `${k}${v}`).join(' '));
  console.log(`  寒侧以外的药：${q.offSide.length ? q.offSide.join('、') : '无（36/36 全在寒侧）'}`);
  console.log(`  唯一大寒：${q.coldest.join('、')}；全章只有 ${q.gradations} 档气 → 无法用四气分节`);
  console.log('');

  console.log('═══ 五味：苦 25/36 是共性，10.2 才是 6/6 ═══');
  console.log('  ' + w.order.filter((k) => w.dist[k]).map((k) => `${k} ${w.dist[k]}`).join(' · '));
  for (const r of w.bySec) console.log(`  ${citation(r.no)}：苦 ${r.bitter}/${r.n}（${r.rate}%）· ` + Object.entries(r.dist).map(([k, v]) => `${k}${v}`).join(' '));
  console.log(`  苦（含微苦）${w.bitter}/${drugs.length}（${w.bitterRate}%）；苦达 100% 的节：${w.fullBitter.join('、') || '无'}`);
  console.log('');

  console.log('═══ 归经：部位而非类别 ═══');
  console.log('  ' + g.rows.map((r) => `${r.jing} ${r.n}(${r.rate}%)`).join(' · '));
  for (const r of g.bySec) console.log(`  ${citation(r.no)}：` + r.top.map(([k, v]) => `${k}${v}`).join(' '));
  console.log('');

  console.log('═══ 节名 = 功效首词 ═══');
  for (const r of e.rows) {
    console.log(`  ${citation(r.no)} 「${r.title}」→ 含「${r.key}」${r.hit}/${r.n}（${r.rate}%）${r.miss.length ? ' 例外：' + r.miss.join('、') : ''}`);
  }
  console.log(`  合计命中 ${e.totalHit}/${drugs.length}（${e.rate}%），例外 ${e.totalMiss} 味`);
  console.log('  功效高频词：' + e.top.map(([k, v]) => `${k}${v}`).join(' · '));
  console.log('');

  console.log('═══ 用法用量（逐药现算）═══');
  console.log(`  抽出煎服区间的：${dz.withDose}/${dz.rows.length} 味`);
  console.log(`  区间最窄：${dz.narrowest.name} ${dz.narrowest.lo}-${dz.narrowest.hi}g；最宽：${dz.widest.name} ${dz.widest.lo}-${dz.widest.hi}g`);
  console.log(`  下限最低：${dz.lowest.name} ${dz.lowest.lo}g；上限最高：${dz.highest.join('、')} ${dz.maxHi}g`);
  console.log(`  特殊煎法：${Object.entries(dz.tags).map(([k, v]) => `${k}${v}`).join(' · ')} → ${dz.tagged.join('、')}`);
  console.log('教学边界：本章只做清热药 36 味的字段分布与教材用法区间清点，不据此辨证用药、不做剂量折算、不给方剂；不构成用药依据。');
}

if (require.main === module) main();

module.exports = {
  book, drugBook, ch, drugs, CH_NO,
  sec, sub, para, drug, paras, secChars, secParas, fold,
  shape, qi, wei, gui, dose, eff, citation, resolve,
};

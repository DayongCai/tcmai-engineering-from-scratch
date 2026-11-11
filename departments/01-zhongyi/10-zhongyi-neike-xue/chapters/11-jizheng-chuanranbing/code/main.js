'use strict';
/**
 * 第 11 章 · 常见急症与传染病 —— 前半章写「先做什么」，后半章写「怎么不传出去」
 *
 *   node code/main.js
 *
 * 数据：standards/neike/底本.json 第 11 章（qhzy-中医内科学.xlsx · 表「11 常见急症与传染病」）
 * 唯一来源，全部现算；docs/zh.md 里的每个数都是这里打印出来的。
 *
 * 口径：
 *   · 八节五格同构（概述 / 病因病机 / 辨证论治 / 预防调护 / 按语），与第 10 章同形。
 *   · 证—方对仍以「代表方：」为锚；证名以「X证。」句首回取。
 *   · 这一章的特殊之处在「预防调护」这一格：前三个病证（高热·神昏·脱证）写的是护理时序，
 *     后五个病证（时行感冒·风温肺热·湿温·疫毒痢·霍乱）写的是报告—隔离—消毒的公共卫生流程。
 *     同一个槽位名，两种语义。这里用关键词计数把差别量出来，不做语义推断。
 *   · 底本量值 20 处，集中在护理操作（体温、体位角度、频次），不在证治正文。
 *     本文件只定位、不解读；正文引用时必须连小节号一起给。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const BASE = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/neike/底本.json'), 'utf8'));
const NO = 11;

const FANG = /代表方[：:]([^（(]{1,24})/;
const ZHENG = /([\u4e00-\u9fa5]{2,8}证)。/g;
const SRC = /《([^》]{2,20})》/;
/** 与 scripts/build_neike_diben.py 的 VALUE 同口径（复算量值要对上 counts.valueLike） */
const VALUE = /\d+(?:\.\d+)?\s*(?:mg|μg|g|kg|ml|mL|L|克|钱|两|枚|片|粒|丸|剂|次|日|天|周|个月|年|小时|分钟)/g;
/** 体温与体位角度：底本口径不含，但它们是本章护理段的主体，单列一栏 */
const CLIN = /\d+(?:\.\d+)?\s*(?:℃|度|%)/g;
/**
 * 兜底：霍乱的三证不叫「X证」，直接以病名当证名（寒霍乱 / 热霍乱 / 干霍乱）。
 * 全章只有这一处如此，所以兜底范围就限定在「霍乱」二字上，不做通用模糊匹配。
 */
const HUOLUAN = /(寒霍乱|热霍乱|干霍乱)。/g;
const SLOT = ['概述', '病因病机', '辨证论治', '预防调护', '按语'];

/** 急症三病证 vs 传染病五病证：按节序切，不按标题猜 */
const ACUTE = ['11.1', '11.2', '11.3'];

const CARE_WORDS = ['隔离', '消毒', '报告', '监测', '体位', '通道', '疫苗', '洗手', '通风'];

function chap() {
  const c = BASE.chapters.find((x) => x.no === NO);
  if (!c) throw new Error(`底本里没有第 ${NO} 章`);
  return c;
}
const subs = () => chap().secs.flatMap((s) => s.subs.map((u) => ({ ...u, sec: s.no, secTitle: s.title })));

function shape() {
  const c = chap();
  return {
    no: c.no,
    title: c.title,
    secs: c.secs.length,
    subs: c.secs.reduce((n, s) => n + s.subs.length, 0),
    hanzi: c.counts.hanzi,
    valueLike: c.counts.valueLike,
    acute: ACUTE,
    infectious: c.secs.map((s) => s.no).filter((no) => !ACUTE.includes(no)),
  };
}

function skeleton() {
  return chap().secs.map((s) => ({
    no: s.no,
    title: s.title,
    titles: s.subs.map((u) => u.title),
    regular: s.subs.length === SLOT.length && s.subs.every((u, i) => u.title === SLOT[i]),
    kind: ACUTE.includes(s.no) ? '急症' : '传染病',
  }));
}

function pairs() {
  const out = [];
  for (const u of subs()) {
    if (u.title !== '辨证论治') continue;
    const body = u.items[0].body;
    const marks = [...body.matchAll(/代表方[：:]/g)];
    let prev = 0;
    for (const m of marks) {
      const before = body.slice(prev, m.index);
      const zs = [...before.matchAll(ZHENG)];
      const hu = [...before.matchAll(HUOLUAN)];
      const zheng = zs.length ? zs[zs.length - 1][1] : hu.length ? hu[hu.length - 1][1] : '（未取到证名）';
      const tail = body.slice(m.index);
      const fang = ((FANG.exec(tail) || [])[1] || '（未取到方名）').trim();
      const srcm = SRC.exec(tail.slice(0, 60));
      out.push({ sub: u.no, sec: u.sec, disease: u.secTitle, zheng, fang, src: srcm ? srcm[1] : '', fallback: !zs.length && !!hu.length });
      prev = m.index;
    }
  }
  return out;
}

function zhengPerDisease() {
  const p = pairs();
  return chap().secs.map((s) => ({
    no: s.no,
    title: s.title,
    kind: ACUTE.includes(s.no) ? '急症' : '传染病',
    subs: s.subs.length,
    zheng: p.filter((x) => x.sec === s.no).length,
  }));
}

/** 「预防调护」槽位的语义分裂：关键词计数 */
function careProfile() {
  return chap().secs.map((s) => {
    const u = s.subs.find((x) => x.title === '预防调护');
    const text = u.items[0].body;
    const hits = Object.fromEntries(CARE_WORDS.map((w) => [w, (text.match(new RegExp(w, 'g')) || []).length]));
    return {
      no: s.no,
      title: s.title,
      kind: ACUTE.includes(s.no) ? '急症' : '传染病',
      chars: text.length,
      hits,
      total: Object.values(hits).reduce((a, b) => a + b, 0),
    };
  });
}

/** 急症护理关键词 vs 公卫流程关键词，两类各自合计 */
function careSplit() {
  const rows = careProfile();
  const sum = (list, words) => list.reduce((n, r) => n + words.reduce((m, w) => m + r.hits[w], 0), 0);
  const acuteRows = rows.filter((r) => r.kind === '急症');
  const infRows = rows.filter((r) => r.kind === '传染病');
  return {
    acute: { rows: acuteRows.length, care: sum(acuteRows, ['监测', '体位', '通道']), public: sum(acuteRows, ['隔离', '消毒', '报告']) },
    infectious: { rows: infRows.length, care: sum(infRows, ['监测', '体位', '通道']), public: sum(infRows, ['隔离', '消毒', '报告']) },
  };
}

/** 底本量值：只定位，带前后文，便于正文连小节号一起引 */
function valueSpots() {
  const rows = [];
  for (const u of subs()) {
    const body = u.items[0].body;
    const hits = [...body.matchAll(VALUE)];
    const clin = [...body.matchAll(CLIN)];
    if (!hits.length && !clin.length) continue;
    rows.push({
      sub: u.no,
      title: u.title,
      hits: hits.map((h) => body.slice(Math.max(0, h.index - 8), h.index + h[0].length + 6).replace(/\s+/g, '')),
      clin: clin.map((h) => h[0]),
    });
  }
  return rows;
}

/** 量值复算：与底本 counts.valueLike 对齐 */
function valueTotal() {
  return subs().reduce((n, u) => n + (u.items[0].body.match(VALUE) || []).length, 0);
}
function clinTotal() {
  return subs().reduce((n, u) => n + (u.items[0].body.match(CLIN) || []).length, 0);
}

/** 证名跨病重现 / 方名跨病复用 */
function formulaSpread() {
  const by = new Map();
  for (const p of pairs()) {
    const key = p.fang.replace(/加减$/, '');
    if (!by.has(key)) by.set(key, { fang: key, hits: [], diseases: new Set() });
    by.get(key).hits.push(p.sub);
    by.get(key).diseases.add(p.disease);
  }
  return [...by.values()]
    .map((e) => ({ fang: e.fang, n: e.hits.length, diseases: [...e.diseases], diseaseCount: e.diseases.size }))
    .sort((a, b) => b.diseaseCount - a.diseaseCount || b.n - a.n);
}

function totals() {
  const p = pairs();
  return {
    ...shape(),
    pairs: p.length,
    distinctZheng: new Set(p.map((x) => x.zheng)).size,
    distinctFang: new Set(p.map((x) => x.fang)).size,
    regular: skeleton().filter((s) => s.regular).length,
  };
}

if (require.main === module) {
  const t = totals();
  console.log('');
  console.log('═══ 中医内科学 · 第 11 章 常见急症与传染病 ═══');
  console.log(`  底本：${t.title} · 节 ${t.secs} · 小节 ${t.subs} · ${t.hanzi} 汉字 · 量值 ${t.valueLike}`);
  console.log(`  骨架规整：${t.regular}/${t.secs} 节同构 · 急症 ${t.acute.length} 节 / 传染病 ${t.infectious.length} 节`);
  console.log(`  证—方对 ${t.pairs} 个 · 证名去重 ${t.distinctZheng} · 方名去重 ${t.distinctFang}`);

  console.log('\n── 八节骨架 ──');
  for (const s of skeleton()) console.log(`  ${s.no} ${s.title}（${s.kind}）：${s.titles.join(' / ')}${s.regular ? '' : '（不规整）'}`);

  console.log('\n── 每病证的证数 ──');
  for (const r of zhengPerDisease()) console.log(`  ${r.no} ${r.title}（${r.kind}）：小节 ${r.subs} · 证 ${r.zheng}`);

  console.log('\n── 预防调护槽位的语义分裂（关键词计数）──');
  for (const r of careProfile()) {
    const s = Object.entries(r.hits).filter(([, n]) => n).map(([w, n]) => `${w}${n}`).join(' ');
    console.log(`  ${r.no} ${r.title}（${r.kind}，${r.chars} 字）：${s || '—'}`);
  }
  const cs = careSplit();
  console.log(`  急症：护理词 ${cs.acute.care} · 公卫词 ${cs.acute.public}`);
  console.log(`  传染病：护理词 ${cs.infectious.care} · 公卫词 ${cs.infectious.public}`);

  console.log('\n── 证—方对 ──');
  for (const p of pairs()) console.log(`  ${p.sub} ${p.disease} · ${p.zheng} → ${p.fang}（${p.src || '出处未标'}）`);

  const sp = formulaSpread();
  console.log('\n── 方：跨病复用 ──');
  console.log(`  去重 ${sp.length}，跨病 ${sp.filter((x) => x.diseaseCount > 1).length}`);
  for (const x of sp.filter((y) => y.diseaseCount > 1)) console.log(`   ${x.fang}：${x.n} 处 / ${x.diseaseCount} 病（${x.diseases.join('、')}）`);

  console.log('\n── 底本量值落点（只定位）──');
  const vs = valueSpots();
  console.log(`  量值（与底本同口径）${valueTotal()} 处 / 体温与角度另计 ${clinTotal()} 处 · 涉及小节 ${vs.length} 个`);
  for (const v of vs) {
    console.log(`  ${v.sub} ${v.title}：${v.hits.length ? v.hits.join(' ｜ ') : '（仅体温/角度）'}${v.clin.length ? `　℃/度 ${v.clin.join('、')}` : ''}`);
  }
  console.log(`  兜底取到的证名：${pairs().filter((p) => p.fallback).map((p) => `${p.sub}${p.zheng}`).join('、') || '无'}`);
  console.log('');
  console.log('  教学边界：本章输出为教材文本结构与证—方归属统计，逐条可回查底本.json；剂量照底本、不构成诊断与急救处置依据。');
}

module.exports = {
  BASE, NO, ACUTE, chap, subs, shape, skeleton, pairs, zhengPerDisease,
  careProfile, careSplit, valueSpots, valueTotal, clinTotal, formulaSpread, totals,
};

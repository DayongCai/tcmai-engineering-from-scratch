#!/usr/bin/env node
/**
 * 中医内科学 · 第 4 章 肺系病证
 * 课程: departments/01-zhongyi/10-zhongyi-neike-xue/chapters/04-feixi-bingzheng/docs/zh.md
 * 出处: 教材·中医内科学·第4章（4.1–4.8，共 8 节 40 小节）
 * 数据: standards/neike/底本.json（chapters[no=4]，secs[].subs[].items[] 带 body 正文）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章的命题是「八个病证共用一个五小节模板，
 * 但辨证论治格的组织法并不相同」。这条命题可以落到三件可核的事上：
 * 八节是不是都齐五格、每节最厚的是不是辨证论治、辨证论治里能数出几个证名
 * （肺痈数出 0 个，因为它按「期」不按「证」）。手打的数字会静默过期，现算的不会。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DIBEN = path.join('standards', 'neike', '底本.json');

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, DIBEN))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/neike/底本.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const FILE = path.join(ROOT, DIBEN);
const CHAPTER = 4;

const load = () => JSON.parse(fs.readFileSync(FILE, 'utf8'));

function chapter(base, no = CHAPTER) {
  const c = base.chapters.find((x) => x.no === no);
  if (!c) throw new Error(`底本里没有第 ${no} 章`);
  return c;
}

const bodyOf = (u) => (u.items || []).map((i) => i.body || '').join('\n');

function subsOf(chap) {
  return chap.secs.flatMap((s) => s.subs).sort((a, b) => a.no.localeCompare(b.no, 'en'));
}

const hanzi = (s) => (s.match(/[\u4e00-\u9fff]/g) || []).length;

function shape(chap) {
  const subs = subsOf(chap);
  return {
    secs: chap.secs.length,
    subs: subs.length,
    hanzi: subs.reduce((n, u) => n + hanzi(bodyOf(u)), 0),
  };
}

function sectionStats(chap) {
  return chap.secs.map((s) => {
    const h = s.subs.reduce((n, u) => n + hanzi(bodyOf(u)), 0);
    return {
      no: s.no,
      title: s.title.replace(/^\d+\.\d+\s*/, ''),
      subs: s.subs.length,
      hanzi: h,
      avg: Math.round(h / s.subs.length),
    };
  });
}

function keywordHits(chap, word) {
  const per = [];
  let total = 0;
  for (const u of subsOf(chap)) {
    const n = (bodyOf(u).match(new RegExp(word, 'g')) || []).length;
    if (n) per.push({ sub: u.no, hits: n });
    total += n;
  }
  return { word, total, per };
}

/** 五小节模板：概述 → 病因病机 → 辨证论治 → 预防调护 → 按语 */
const KINDS = ['概述', '病因病机', '辨证论治', '预防调护', '按语'];

function kindOf(u) {
  const t = u.title.replace(/^\d+\.\d+\.\d+\s*/, '');
  return KINDS.includes(t) ? t : '?';
}

function templateAudit(chap) {
  return chap.secs.map((s) => {
    const kinds = s.subs.map(kindOf);
    return { no: s.no, kinds, ok: kinds.join(',') === KINDS.join(',') };
  });
}

/**
 * 证名抽取：底本把证名写了两遍（「风寒束表证风寒束表证。」——小标题与首句重复），
 * 因此用「同名重复」这一形状抽证名，比按「××证」硬切干净得多。
 * 抽不出来的一种情形本身就是信息：肺痈按「期」分，不按「证」分，所以数出 0。
 */
function syndromeAudit(chap) {
  return chap.secs.map((s) => {
    const u = s.subs.find((x) => kindOf(x) === '辨证论治');
    const body = bodyOf(u).replace(/\s+/g, '');
    const names = new Set();
    for (const m of body.matchAll(/([\u4e00-\u9fff]{2,8}证)\1/g)) names.add(m[1]);
    const stages = new Set();
    for (const m of body.matchAll(/(初期|成痈期|溃脓期|恢复期)/g)) stages.add(m[1]);
    return { no: s.no, count: names.size, names: [...names], stages: [...stages] };
  });
}

/** 八个病名在全章的互相引用：自己的节里出现多少次、别的节里出现多少次 */
const DISEASES = ['感冒', '咳嗽', '哮病', '喘证', '肺痈', '肺痨', '肺胀', '肺痿'];

function crossRef(chap) {
  const subs = subsOf(chap);
  return DISEASES.map((d, i) => {
    const own = `4.${i + 1}.`;
    let ownHits = 0;
    let otherHits = 0;
    const others = new Set();
    for (const u of subs) {
      const n = (bodyOf(u).match(new RegExp(d, 'g')) || []).length;
      if (!n) continue;
      if (u.no.startsWith(own)) ownHits += n;
      else { otherHits += n; others.add(u.no.slice(0, 3)); }
    }
    return { disease: d, ownHits, otherHits, sections: [...others].sort() };
  });
}

/** 病机因素词表：痰 / 虚 / 热 / 瘀 / 饮 / 风 / 火 */
const FACTORS = ['痰', '虚', '热', '瘀', '饮', '风', '火'];

function factorCounts(chap) {
  return FACTORS.map((w) => keywordHits(chap, w))
    .map((h) => ({ key: h.word, total: h.total, per: h.per }))
    .sort((a, b) => b.total - a.total);
}

/** 每节最厚的一格 */
function thickestPerSection(chap) {
  return chap.secs.map((s) => {
    const rows = s.subs.map((u) => ({ sub: u.no, kind: kindOf(u), hanzi: hanzi(bodyOf(u)) }));
    const top = [...rows].sort((a, b) => b.hanzi - a.hanzi)[0];
    return { no: s.no, top };
  });
}

/**
 * 量值核验：本章底本含 4 处数字＋单位（两节末尾「现代认识」段的现代医学时限与比例）。
 * 本函数如实数出来报出来——不是宣称本章没有，而是把「有，且都在哪」写清楚。
 */
const VALUE_RE = /\d+(?:\.\d+)?\s*(?:mmHg|kPa|℃|°C|‰|%|mmol|mOsm|mol|mV|Hz|次\/分|个\/L|g\/L|mg\/ml|mg|ml|mL|kg|cm|mm|μm|um|ms|min|小时|秒钟|升|毫升|倍|周|天|年)/g;

function valueAudit(chap) {
  const subs = subsOf(chap);
  const offenders = [];
  let hits = 0;
  for (const u of subs) {
    const m = bodyOf(u).match(VALUE_RE) || [];
    if (m.length) offenders.push({ sub: u.no, hits: m });
    hits += m.length;
  }
  return { subs: subs.length, hits, offenders };
}

function extremes(chap) {
  const rows = subsOf(chap).map((u) => ({ sub: u.no, hanzi: hanzi(bodyOf(u)) }));
  const sorted = [...rows].sort((a, b) => a.hanzi - b.hanzi);
  return { thinnest: sorted[0], thickest: sorted[sorted.length - 1] };
}

function main() {
  const base = load();
  const chap = chapter(base);
  const subs = subsOf(chap);
  const s = shape(chap);
  const secs = sectionStats(chap);
  const tpl = templateAudit(chap);
  const syn = syndromeAudit(chap);
  const cross = crossRef(chap);
  const factors = factorCounts(chap);
  const thick = thickestPerSection(chap);
  const values = valueAudit(chap);
  const ext = extremes(chap);

  console.log('═══ 肺系病证：八个病证、一套模板、一张鉴别网（中医内科学 第4章）═══');
  console.log(`教材规模: 第4章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / s.subs)} 字`);
  console.log(`量值核验: ${values.subs} 小节正文的数字＋单位命中 ${values.hits} 处，分布在 ${values.offenders.map((x) => x.sub).join('、')} 的「现代认识」段（本课程正文一律不引其值）`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log('');
  console.log('五小节模板核验（概述 → 病因病机 → 辨证论治 → 预防调护 → 按语）：');
  for (const t of tpl) console.log(`  ${t.no} ${t.kinds.join(' / ')}${t.ok ? '' : '  ← 模板不齐'}`);
  console.log(`  → 齐五格的节 ${tpl.filter((t) => t.ok).length} / ${tpl.length}，${tpl[0].kinds.length} × ${tpl.length} = ${tpl[0].kinds.length * tpl.length}`);
  console.log('');
  console.log('每节最厚的一格：');
  for (const t of thick) console.log(`  ${t.no} ${t.top.sub}（${t.top.kind} · ${t.top.hanzi} 字）`);
  console.log(`  → 「辨证论治」最厚的节 ${thick.filter((t) => t.top.kind === '辨证论治').length} / ${thick.length}`);
  console.log('');
  console.log('辨证论治格里数出的证名（底本把证名写两遍，按同名重复抽取）：');
  for (const x of syn) {
    const extra = x.stages.length ? ` · 期名 ${x.stages.join('/')}` : '';
    console.log(`  ${x.no} ${x.count} 个${extra}${x.count ? `：${x.names.join('、')}` : '：不以「证」分型'}`);
  }
  console.log(`  → 合计 ${syn.reduce((n, x) => n + x.count, 0)} 个证名；肺痈 0 个，因为它按四期走。`);
  console.log('');
  console.log('八个病名的互相引用（本节 / 别节）：');
  for (const c of cross) {
    console.log(`  ${c.disease} 本节 ${c.ownHits} · 别节 ${c.otherHits}${c.sections.length ? `（${c.sections.join(' ')}）` : ''}`);
  }
  console.log('');
  console.log(`病机因素词频: ${factors.map((x) => `${x.key} ${x.total}`).join(' · ')}`);
  console.log('');
  console.log(`40 个小节与正文汉字（最薄 ${ext.thinnest.sub} · ${ext.thinnest.hanzi} 字；最厚 ${ext.thickest.sub} · ${ext.thickest.hanzi} 字）：`);
  for (const u of subs) console.log(`  ${u.no} ${u.title.replace(/^\d+\.\d+\.\d+\s*/, '')} · ${hanzi(bodyOf(u))} 字`);
  console.log('');
  console.log('教学边界：本章只说明肺系八个病证的界定、病机主线、分型组织法与鉴别眼目，不写剂量与用法量值（剂量与用法照底本），不作诊断与证候判定，不作疗效断言，不构成诊断与用药依据');

  return { chap, subs, shape: s, secs, template: tpl, syndromes: syn, cross, factors, thickest: thick, values, extremes: ext };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  FILE,
  CHAPTER,
  KINDS,
  DISEASES,
  FACTORS,
  VALUE_RE,
  load,
  chapter,
  bodyOf,
  subsOf,
  hanzi,
  shape,
  sectionStats,
  keywordHits,
  kindOf,
  templateAudit,
  syndromeAudit,
  crossRef,
  factorCounts,
  thickestPerSection,
  valueAudit,
  extremes,
  main,
};

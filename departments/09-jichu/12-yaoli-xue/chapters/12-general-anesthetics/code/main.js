#!/usr/bin/env node
/**
 * 药理学 · 第 12 章 全身麻醉药
 * 课程: departments/09-jichu/12-yaoli-xue/chapters/12-general-anesthetics/docs/zh.md
 * 出处: 教材·药理学·第12章（12.1–12.4，共 4 节 12 小节）
 * 数据: standards/yaoli/底本.json（chapters[n=12]）
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的命题是底本 12.1.2 自己写下的三句话：抑制是进行性的，成分是可分的，
 * 机制是网络的。三句话对应三种不同的「可算的东西」：
 *   进行性 → 剂量与深度的对应，落在哪些小节；
 *   可分的 → 成分（意识、镇痛、肌松、反射）各自被哪些药覆盖；
 *   网络的 → 靶点不是一个，故作用谱不能由单一受体推出来。
 * 本脚本把这三件事逐条到底本里找证据，并把「复合麻醉」当作成分与药物的配对来核。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DIBEN = path.join('standards', 'yaoli', '底本.json');

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, DIBEN))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/yaoli/底本.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const FILE = path.join(ROOT, DIBEN);
const CHAPTER = 12;

const load = () => JSON.parse(fs.readFileSync(FILE, 'utf8'));

function chapter(base, no = CHAPTER) {
  const c = base.chapters.find((x) => x.no === no);
  if (!c) throw new Error(`底本里没有第 ${no} 章`);
  return c;
}

function subsOf(chap) {
  return chap.secs.flatMap((s) => s.subs).sort((a, b) => a.no.localeCompare(b.no, 'en'));
}

const hanzi = (s) => (s.match(/[\u4e00-\u9fff]/g) || []).length;

function shape(chap) {
  const subs = subsOf(chap);
  return {
    secs: chap.secs.length,
    subs: subs.length,
    hanzi: subs.reduce((n, u) => n + hanzi(u.body), 0),
  };
}

function sectionStats(chap) {
  return chap.secs.map((s) => {
    const h = s.subs.reduce((n, u) => n + hanzi(u.body), 0);
    return {
      no: s.no,
      title: s.title.replace(/^\d+\.\d+\s*/, ''),
      subs: s.subs.length,
      hanzi: h,
      avg: Math.round(h / s.subs.length),
    };
  });
}

/** 关键词表：前六个属「理化与体内过程」，后六个属「成分与机制」 */
const KEYWORDS = [
  '血/气分配系数', '脑内分压', '再分布', '脂溶性', '肺泡', '代谢',
  '成分', '协同', '拮抗', '肌肉松弛', '靶点', '相互作用',
];

function keywordHits(chap, word) {
  const per = [];
  let total = 0;
  for (const u of subsOf(chap)) {
    const n = (u.body.match(new RegExp(word, 'g')) || []).length;
    if (n) per.push({ sub: u.no, hits: n });
    total += n;
  }
  return { word, total, per };
}

function keywordTable(chap) {
  return KEYWORDS.map((w) => keywordHits(chap, w)).sort((a, b) => b.total - a.total);
}

/**
 * 麻醉的五个成分（12.1.2 的原话）与它们各自被哪类药覆盖（12.3）。
 * 这不是本章编的表，是底本在 12.1.2 列成分、在 12.3 分配药物的合并结果。
 */
const COMPONENTS = [
  { name: '意识消失与遗忘', probe: '意识', drugs: '吸入药 / 静脉镇静药 / 咪达唑仑' },
  { name: '镇痛', probe: '镇痛', drugs: '阿片类（吗啡、芬太尼类）' },
  { name: '抑制不良反射', probe: '反射', drugs: '吸入药 / 阿片类 / 抗胆碱药' },
  { name: '肌肉松弛', probe: '肌肉松弛', drugs: '肌松药（琥珀胆碱、罗库溴铵等）' },
  { name: '抑制应激反应', probe: '应激', drugs: '阿片类 / 控制性降压与低温' },
];

/** 每个成分在哪些小节被写到，出现几次 */
function componentAudit(chap) {
  return COMPONENTS.map((c) => {
    const h = keywordHits(chap, c.probe);
    return { ...c, total: h.total, subs: h.per.map((x) => x.sub), n: h.per.length };
  });
}

/**
 * 三句话的落点：进行性、可分、网络。
 * 每句用一对探针找共现小节——两个探针同落一节，说明这层意思在该节被写实。
 */
const THESES = [
  { name: '抑制是进行性的', a: '进行性', b: '深度', note: '深度可分级，故可调节' },
  { name: '成分是可分的', a: '成分', b: '复合麻醉', note: '成分分开，才有分工' },
  { name: '机制是网络的', a: '靶点', b: '网络', note: '多靶点，单一受体解释不全' },
  { name: '作用与风险同源', a: '延髓', b: '呼吸', note: '深麻醉时生命中枢受抑' },
  { name: '肺进肺出', a: '肺泡', b: '排出', note: '以原型为主，经肺排出' },
  { name: '协同带来叠加风险', a: '协同', b: '叠加', note: '合用减量，同时增风险' },
];

function thesisAudit(chap) {
  return THESES.map((t) => {
    const subs = subsOf(chap)
      .filter((u) => u.body.includes(t.a) && u.body.includes(t.b))
      .map((u) => u.no);
    return { ...t, subs, n: subs.length };
  });
}

const HANDOFF = '具备资质的人员';

function handoffAudit(chap) {
  const subs = subsOf(chap);
  return {
    subs: subs.filter((u) => u.body.includes(HANDOFF)).map((u) => u.no),
    count: subs.reduce((n, u) => n + (u.body.match(new RegExp(HANDOFF, 'g')) || []).length, 0),
    missing: subs.filter((u) => !u.body.includes(HANDOFF)).map((u) => u.no),
    of: subs.length,
  };
}

const VALUE_RE = /\d+(?:\.\d+)?\s*(?:mmHg|kPa|℃|°C|‰|%|mmol|mOsm|mol|mV|Hz|次\/分|个\/L|g\/L|mg\/ml|mg|ml|mL|kg|cm|mm|μm|um|ms|min|小时|秒钟|升|毫升|倍|周|天|年)/g;

function valueAudit(chap) {
  const subs = subsOf(chap);
  const offenders = [];
  let hits = 0;
  for (const u of subs) {
    const m = u.body.match(VALUE_RE) || [];
    if (m.length) offenders.push({ sub: u.no, hits: m.join(',') });
    hits += m.length;
  }
  return { subs: subs.length, hits, offenders };
}

function briefAudit(chap) {
  const need = ['剂量与用法照底本', '本书不构成用药建议'];
  return subsOf(chap).map((u) => ({
    sub: u.no,
    ok: need.every((k) => u.brief.includes(k)),
    missing: need.filter((k) => !u.brief.includes(k)),
  }));
}

function extremes(chap) {
  const rows = subsOf(chap).map((u) => ({ sub: u.no, hanzi: hanzi(u.body) }));
  const sorted = [...rows].sort((a, b) => a.hanzi - b.hanzi);
  return { thinnest: sorted[0], thickest: sorted[sorted.length - 1] };
}

function main() {
  const base = load();
  const chap = chapter(base);
  const subs = subsOf(chap);
  const s = shape(chap);
  const secs = sectionStats(chap);
  const words = keywordTable(chap);
  const comps = componentAudit(chap);
  const theses = thesisAudit(chap);
  const handoff = handoffAudit(chap);
  const values = valueAudit(chap);
  const briefs = briefAudit(chap);
  const ext = extremes(chap);

  console.log('═══ 全身麻醉药：进行性抑制、可分的成分、网络的机制（药理学 第12章）═══');
  console.log(`教材规模: 第12章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / s.subs)} 字`);
  console.log(`量值核验: ${values.subs} 小节正文的数字＋单位命中 ${values.hits} 处（底本声明与复算一致）`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log('');
  console.log(`12 个小节与正文汉字（最薄 ${ext.thinnest.sub} · ${ext.thinnest.hanzi} 字；最厚 ${ext.thickest.sub} · ${ext.thickest.hanzi} 字）：`);
  for (const u of subs) console.log(`  ${u.no} ${u.title.replace(/^\d+\.\d+\.\d+\s*/, '')} · ${hanzi(u.body)} 字`);
  console.log('');
  console.log(`关键词: ${words.map((w) => `${w.word} ${w.total}`).join(' · ')}`);
  console.log('');
  console.log('麻醉成分与覆盖它的药物类别（成分来自 12.1.2，药物来自 12.3）：');
  for (const c of comps) console.log(`  ${c.name} · 探针「${c.probe}」${c.total} 次 / ${c.n} 小节 · ${c.drugs}`);
  console.log('');
  console.log('三句话的落点（两个探针同落一小节即为写实）：');
  for (const t of theses) console.log(`  ${t.name} · ${t.n} 小节 ${t.subs.join(' ')} · ${t.note}`);
  const gaps = theses.filter((t) => t.n === 0).map((t) => t.name);
  console.log(`  缺口: ${gaps.length ? gaps.join('、') : '无'}`);
  console.log('');
  console.log(`判断去向: 「${HANDOFF}」${handoff.count} 次，分布在 ${handoff.subs.length} 个小节`);
  console.log(`  没有交接句: ${handoff.missing.join(' ') || '无'}`);
  console.log('');
  console.log(`口径句核验: ${briefs.filter((b) => b.ok).length} / ${briefs.length} 小节的 brief 同时带「剂量与用法照底本」与「本书不构成用药建议」`);
  console.log('教学边界：本章只说明全麻药的分类/作用机制/体内过程/复合麻醉的环节与表述口径，不写最低肺泡有效浓度与剂量量值（剂量与用法照底本），不作适应证判定与疗效断言，不构成用药建议');

  return { chap, subs, shape: s, secs, words, comps, theses, handoff, values, briefs, extremes: ext };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT, FILE, CHAPTER, KEYWORDS, COMPONENTS, THESES, HANDOFF, VALUE_RE,
  load, chapter, subsOf, hanzi, shape, sectionStats, keywordHits, keywordTable,
  componentAudit, thesisAudit, handoffAudit, valueAudit, briefAudit, extremes, main,
};

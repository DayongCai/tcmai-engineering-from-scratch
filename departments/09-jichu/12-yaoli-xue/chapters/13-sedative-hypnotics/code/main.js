#!/usr/bin/env node
/**
 * 药理学 · 第 13 章 镇静催眠药
 * 课程: departments/09-jichu/12-yaoli-xue/chapters/13-sedative-hypnotics/docs/zh.md
 * 出处: 教材·药理学·第13章（13.1–13.4，共 4 节 12 小节）
 * 数据: standards/yaoli/底本.json（chapters[n=13]）
 * 依赖: 仅 Node.js 标准库
 *
 * 本章有两个可算的骨架，都不是本章编的：
 *   一是剂量谱：镇静 → 催眠 → 抗惊厥 → 麻醉 → 呼吸抑制，底本 13.1.1 明写「同一作用在不同剂量下的表现」；
 *   二是两类别位调节的分工：苯二氮䓬类增加氯通道开放频率，巴比妥类延长开放时间。
 * 第三个可算的东西是本章的特殊性：底本是全书少数带量值的章之一（苯二氮䓬类与巴比妥类的
 * 教材剂量表在 13.2.1 与 13.3.1），而课程章一个量值都不写。所以本脚本要同时核两件事：
 * 底本里有多少处「数字＋单位」，以及课程正文里是不是一处都没有。
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
const CHAPTER = 13;

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

/** 关键词表：前六个是机制词，后六个是效应与风险词 */
const KEYWORDS = [
  'γ-氨基丁酸', '氯离子通道', '别位调节', '开放频率', '开放时间', '受体亚型',
  '剂量', '耐受', '依赖', '睡眠结构', '反跳', '酶诱导',
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

/** 剂量谱五档：同一机制在不同剂量下的展开（13.1.1 的原话） */
const LADDER = [
  { step: '镇静', probe: '镇静', effect: '躁动与紧张减轻，意识清醒' },
  { step: '催眠', probe: '催眠', effect: '入睡加快，夜醒减少，睡眠时间延长' },
  { step: '抗惊厥', probe: '抗惊厥', effect: '惊厥阈值提高，异常放电扩散受限' },
  { step: '麻醉', probe: '麻醉', effect: '意识消失，反射减弱' },
  { step: '呼吸抑制', probe: '呼吸抑制', effect: '延髓呼吸中枢受抑，血压下降' },
];

function ladderAudit(chap) {
  return LADDER.map((s) => {
    const h = keywordHits(chap, s.probe);
    return { ...s, total: h.total, n: h.per.length, subs: h.per.map((x) => x.sub) };
  });
}

/** 三个靶点层面：抑制性递质、昼夜节律、觉醒驱动、组胺能觉醒 */
const LAYERS = [
  { layer: '抑制性递质', probe: 'γ-氨基丁酸', drugs: '苯二氮䓬类、巴比妥类、非苯二氮䓬类受体激动药' },
  { layer: '昼夜节律', probe: '褪黑素', drugs: '雷美替胺' },
  { layer: '觉醒驱动', probe: '食欲素', drugs: '苏沃雷生、莱博雷生' },
  { layer: '觉醒维持（组胺）', probe: '组胺', drugs: '苯海拉明、异丙嗪' },
];

function layerAudit(chap) {
  return LAYERS.map((l) => {
    const h = keywordHits(chap, l.probe);
    return { ...l, total: h.total, n: h.per.length, subs: h.per.map((x) => x.sub) };
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

/**
 * 量值核验（B 支）。
 * 本章底本带量值（教材的剂量表原样保留在 13.2.1 与 13.3.1），
 * 所以这里要分开数：底本命中多少处、落在哪几个小节；课程正文命中多少处。
 * 课程正文必须是 0 —— 正文一律写「剂量与用法照底本」。
 */
const VALUE_RE = /\d+(?:\.\d+)?\s*(?:mmHg|kPa|℃|°C|‰|%|mmol|mOsm|mol|mV|Hz|次\/分|个\/L|g\/L|mg\/ml|mg|ml|mL|kg|cm|mm|μm|um|ms|min|小时|秒钟|升|毫升|倍|周|天|年)/g;

function valueAudit(chap) {
  const subs = subsOf(chap);
  const offenders = [];
  let hits = 0;
  for (const u of subs) {
    const m = u.body.match(VALUE_RE) || [];
    if (m.length) offenders.push({ sub: u.no, hits: m.length, sample: m.slice(0, 3).join(',') });
    hits += m.length;
  }
  return { subs: subs.length, hits, offenders, branch: hits > 0 ? 'B' : 'A' };
}

/** 课程正文的量值核验：读 docs/zh.md，数非引文行的「数字＋单位」 */
function docValueAudit(chap) {
  const p = path.join(__dirname, '..', 'docs', 'zh.md');
  if (!fs.existsSync(p)) return { exists: false, hits: 0, lines: [] };
  const lines = fs.readFileSync(p, 'utf8').split('\n');
  const bad = [];
  lines.forEach((l, i) => {
    const m = l.match(VALUE_RE);
    if (m) bad.push({ line: i + 1, sample: m.slice(0, 3).join(',') });
  });
  return { exists: true, hits: bad.length, lines: bad };
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
  const ladder = ladderAudit(chap);
  const layers = layerAudit(chap);
  const handoff = handoffAudit(chap);
  const values = valueAudit(chap);
  const docValues = docValueAudit(chap);
  const briefs = briefAudit(chap);
  const ext = extremes(chap);

  console.log('═══ 镇静催眠药：剂量谱、两类别位调节、三个靶点层面（药理学 第13章）═══');
  console.log(`教材规模: 第13章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / s.subs)} 字`);
  console.log(`量值核验: 底本 ${values.hits} 处（B 支），落在 ${values.offenders.map((o) => `${o.sub}(${o.hits})`).join(' ')}`);
  console.log(`          课程正文 ${docValues.hits} 处（须为 0；正文一律写「剂量与用法照底本」）`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log('');
  console.log(`12 个小节与正文汉字（最薄 ${ext.thinnest.sub} · ${ext.thinnest.hanzi} 字；最厚 ${ext.thickest.sub} · ${ext.thickest.hanzi} 字）：`);
  for (const u of subs) console.log(`  ${u.no} ${u.title.replace(/^\d+\.\d+\.\d+\s*/, '')} · ${hanzi(u.body)} 字`);
  console.log('');
  console.log(`关键词: ${words.map((w) => `${w.word} ${w.total}`).join(' · ')}`);
  console.log('');
  console.log('剂量谱五档（同一机制在不同剂量下的展开）：');
  for (const s2 of ladder) console.log(`  ${s2.step} · ${s2.total} 次 / ${s2.n} 小节 · ${s2.effect}`);
  console.log('');
  console.log('靶点层面（层面差别决定作用谱与观察重点的差别）：');
  for (const l of layers) console.log(`  ${l.layer} · 探针「${l.probe}」${l.total} 次 / ${l.n} 小节 · ${l.drugs}`);
  console.log('');
  console.log(`判断去向: 「${HANDOFF}」${handoff.count} 次，分布在 ${handoff.subs.length} 个小节`);
  console.log(`  没有交接句: ${handoff.missing.join(' ') || '无'}`);
  console.log('');
  console.log(`口径句核验: ${briefs.filter((b) => b.ok).length} / ${briefs.length} 小节的 brief 同时带「剂量与用法照底本」与「本书不构成用药建议」`);
  console.log('教学边界：本章只说明镇静催眠药的分类/作用机制/体内过程与表述口径，不写剂量与浓度与用法量值（剂量与用法照底本），不作适应证判定与疗效断言，不构成用药建议');

  return { chap, subs, shape: s, secs, words, ladder, layers, handoff, values, docValues, briefs, extremes: ext };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT, FILE, CHAPTER, KEYWORDS, LADDER, LAYERS, HANDOFF, VALUE_RE,
  load, chapter, subsOf, hanzi, shape, sectionStats, keywordHits, keywordTable,
  ladderAudit, layerAudit, handoffAudit, valueAudit, docValueAudit, briefAudit, extremes, main,
};

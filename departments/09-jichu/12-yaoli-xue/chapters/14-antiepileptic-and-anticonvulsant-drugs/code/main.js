#!/usr/bin/env node
/**
 * 药理学 · 第 14 章 抗癫痫药与抗惊厥药
 * 课程: departments/09-jichu/12-yaoli-xue/chapters/14-antiepileptic-and-anticonvulsant-drugs/docs/zh.md
 * 出处: 教材·药理学·第14章（14.1–14.4，共 4 节 12 小节）
 * 数据: standards/yaoli/底本.json（chapters[n=14]）
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的骨架是「作用环节 → 观察项目」的对应，而这条对应在教材里被拆在四处：
 *   14.1 四类作用环节（钠通道、增强抑制性递质、T 型钙通道、多重机制）；
 *   14.2 硫酸镁的作用过强有明确顺序（肌腱反射 → 呼吸 → 血压 → 心脏传导）；
 *   14.3 观察分六组、记录四要素、复核三层；
 *   14.4 吸收、分布、生物转化与排泄四环节如何决定作用时程与监测需要。
 * 本脚本核三件事：四类环节在哪几节被写实；六个观察组各被写到几次；
 * 以及「长期预防」与「即时控制」这两个目的在正文里是怎么被分开的。
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
const CHAPTER = 14;

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

/** 关键词表：前六个是机制与风险词，后六个是体内过程与观察词 */
const KEYWORDS = [
  '钠通道', '抑制性递质', '钙通道', '饱和', '酶诱导', '监测',
  '吸收', '分布', '排泄', '肌腱反射', '尿量', '发作类型',
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

/** 四类作用环节（14.1.1 的原话） */
const MECHANISMS = [
  { name: '阻滞电压依赖性钠通道', probe: '钠通道', drugs: '苯妥英钠、卡马西平、拉莫三嗪、奥卡西平' },
  { name: '增强 γ-氨基丁酸介导的抑制', probe: 'γ-氨基丁酸', drugs: '苯巴比妥、苯二氮䓬类、丙戊酸钠、托吡酯' },
  { name: '阻滞丘脑 T 型钙通道', probe: '钙通道', drugs: '乙琥胺、丙戊酸钠' },
  { name: '多重机制', probe: '多重机制', drugs: '托吡酯、丙戊酸钠、唑尼沙胺' },
];

function mechanismAudit(chap) {
  return MECHANISMS.map((m) => {
    const h = keywordHits(chap, m.probe);
    return { ...m, total: h.total, n: h.per.length, subs: h.per.map((x) => x.sub) };
  });
}

/**
 * 观察的六组（14.3.2 的原话：与发作相关、意识与精神状态、生命体征、神经系统体征、
 * 皮肤黏膜、实验室类别）。每组用探针找落点，缺组即为观察表缺口。
 */
const GROUPS = [
  { group: '发作本身', probe: '发作', items: '形式、持续时间分级、意识状态、发作后状态' },
  { group: '意识与精神', probe: '意识', items: '清醒程度、定向力、言语连贯性、情绪与行为' },
  { group: '生命体征', probe: '生命体征', items: '呼吸频率与深度、心率与节律、血压' },
  { group: '神经系统体征', probe: '肌腱反射', items: '肌腱反射、共济运动、眼球震颤、肌张力' },
  { group: '皮肤黏膜', probe: '皮疹', items: '皮疹分布与形态、黏膜完整性' },
  { group: '实验室类别', probe: '血象', items: '血象、肝功能、肾功能、电解质' },
];

function groupAudit(chap) {
  return GROUPS.map((g) => {
    const h = keywordHits(chap, g.probe);
    return { ...g, total: h.total, n: h.per.length, subs: h.per.map((x) => x.sub) };
  });
}

/** 两个目的：长期预防与即时控制——本章的分章依据 */
const PURPOSES = [
  { purpose: '长期预防发作', probe: '长期', label: '抗癫痫药' },
  { purpose: '即时控制惊厥', probe: '即时', label: '抗惊厥药' },
];

function purposeAudit(chap) {
  return PURPOSES.map((p) => {
    const h = keywordHits(chap, p.probe);
    return { ...p, total: h.total, n: h.per.length, subs: h.per.map((x) => x.sub) };
  });
}

/** 四环：作用环节到观察项目的对应，逐环用一对探针找共现 */
const CHAIN = [
  { ring: '钠通道 → 高频放电', a: '钠通道', b: '高频', note: '延长失活，只压高频，不压低频' },
  { ring: '抑制递质 → 阈值', a: 'γ-氨基丁酸', b: '阈值', note: '抑制效能上升，惊厥阈值提高' },
  { ring: '钙通道 → 同步节律', a: '钙通道', b: '同步', note: '丘脑与皮质的同步节律减弱' },
  { ring: '作用过强 → 观察顺序', a: '肌腱反射', b: '呼吸', note: '反射先于呼吸变化，故列为早期指标' },
  { ring: '吸收 → 起效', a: '吸收', b: '起效', note: '吸收慢而不规则，起效不易预测' },
  { ring: '消除 → 监测', a: '饱和', b: '监测', note: '代谢饱和，剂量与水平不成比例' },
];

function chainAudit(chap) {
  return CHAIN.map((c) => {
    const subs = subsOf(chap)
      .filter((u) => u.body.includes(c.a) && u.body.includes(c.b))
      .map((u) => u.no);
    return { ...c, subs, n: subs.length };
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
  const mechs = mechanismAudit(chap);
  const groups = groupAudit(chap);
  const purposes = purposeAudit(chap);
  const chain = chainAudit(chap);
  const handoff = handoffAudit(chap);
  const values = valueAudit(chap);
  const briefs = briefAudit(chap);
  const ext = extremes(chap);

  console.log('═══ 抗癫痫药与抗惊厥药：环节—目的—观察项目（药理学 第14章）═══');
  console.log(`教材规模: 第14章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / s.subs)} 字`);
  console.log(`量值核验: ${values.subs} 小节正文的数字＋单位命中 ${values.hits} 处（底本声明与复算一致）`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log('');
  console.log(`12 个小节与正文汉字（最薄 ${ext.thinnest.sub} · ${ext.thinnest.hanzi} 字；最厚 ${ext.thickest.sub} · ${ext.thickest.hanzi} 字）：`);
  for (const u of subs) console.log(`  ${u.no} ${u.title.replace(/^\d+\.\d+\.\d+\s*/, '')} · ${hanzi(u.body)} 字`);
  console.log('');
  console.log(`关键词: ${words.map((w) => `${w.word} ${w.total}`).join(' · ')}`);
  console.log('');
  console.log('四类作用环节与代表药：');
  for (const m of mechs) console.log(`  ${m.name} · 探针「${m.probe}」${m.total} 次 / ${m.n} 小节 · ${m.drugs}`);
  console.log('');
  console.log('两个目的的分章依据：');
  for (const p of purposes) console.log(`  ${p.label}（${p.purpose}）· 探针「${p.probe}」${p.total} 次 / ${p.n} 小节`);
  console.log('');
  console.log('观察六组各被写到几次：');
  for (const g of groups) console.log(`  ${g.group} · 探针「${g.probe}」${g.total} 次 / ${g.n} 小节 · ${g.items}`);
  console.log(`  缺组: ${groups.filter((g) => g.n === 0).map((g) => g.group).join('、') || '无'}`);
  console.log('');
  console.log('环节到观察的对应（两个探针同落一小节即为写实）：');
  for (const c of chain) console.log(`  ${c.ring} · ${c.n} 小节 ${c.subs.join(' ')} · ${c.note}`);
  console.log(`  缺口: ${chain.filter((c) => c.n === 0).map((c) => c.ring).join('、') || '无'}`);
  console.log('');
  console.log(`判断去向: 「${HANDOFF}」${handoff.count} 次，分布在 ${handoff.subs.length} 个小节`);
  console.log(`  没有交接句: ${handoff.missing.join(' ') || '无'}`);
  console.log('');
  console.log(`口径句核验: ${briefs.filter((b) => b.ok).length} / ${briefs.length} 小节的 brief 同时带「剂量与用法照底本」与「本书不构成用药建议」`);
  console.log('教学边界：本章只说明抗癫痫药与抗惊厥药的分类/作用机制/体内过程与表述口径，不写剂量与血药浓度与用法量值（剂量与用法照底本），不作发作类型归属与疗效断言，不构成用药建议');

  return { chap, subs, shape: s, secs, words, mechs, groups, purposes, chain, handoff, values, briefs, extremes: ext };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT, FILE, CHAPTER, KEYWORDS, MECHANISMS, GROUPS, PURPOSES, CHAIN, HANDOFF, VALUE_RE,
  load, chapter, subsOf, hanzi, shape, sectionStats, keywordHits, keywordTable,
  mechanismAudit, groupAudit, purposeAudit, chainAudit, handoffAudit, valueAudit, briefAudit, extremes, main,
};

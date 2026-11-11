#!/usr/bin/env node
/**
 * 药理学 · 第 4 章 影响药物效应的因素：三组因素、两端框架与表述口径
 * 课程: departments/09-jichu/12-yaoli-xue/chapters/04-factors-affecting-drug-response/docs/zh.md
 * 出处: 教材·药理学·第4章（4.1–4.4，共 4 节 12 小节）
 * 数据: standards/yaoli/底本.json（chapters[n=4]，secs[].subs[] 带 brief 口径句与 body 正文）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章的命题是「效应不是药物的固定属性，而是特定机体状态下的结果」。
 * 这条主张能落在哪几个数上——三组因素各占多少笔墨、药物端与机体端如何分账、
 * 「反应性」被提了几次、判断交给谁、量值有没有漏进来——都能在底本正文里数出来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// __dirname = .../chapters/04-factors-affecting-drug-response/code
// 不硬数 ../ 的层数（数错一次就 ENOENT），向上找带 standards/yaoli/底本.json 的那一级
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
const CHAPTER = 4;

const load = () => JSON.parse(fs.readFileSync(FILE, 'utf8'));

/** 本章（默认第 4 章）的结构对象 */
function chapter(base, no = CHAPTER) {
  const c = base.chapters.find((x) => x.no === no);
  if (!c) throw new Error(`底本里没有第 ${no} 章`);
  return c;
}

/** 摊平成 12 个小节，按 no 排序 */
function subsOf(chap) {
  return chap.secs.flatMap((s) => s.subs).sort((a, b) => a.no.localeCompare(b.no, 'en'));
}

/** 汉字数：只数 CJK 统一表意文字 */
const hanzi = (s) => (s.match(/[\u4e00-\u9fff]/g) || []).length;

/** 规模：节数 / 小节数 / 汉字数 */
function shape(chap) {
  const subs = subsOf(chap);
  return {
    secs: chap.secs.length,
    subs: subs.length,
    hanzi: subs.reduce((n, u) => n + hanzi(u.body), 0),
  };
}

/** 逐节统计 */
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

/** 关键词计数：全章次数 + 每个小节的次数 */
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

/**
 * 三组因素：教材开篇就把影响因素归成三组。
 * 三组的字数与词频，说明教材把「药物端」「机体端」「其他」分账的方式。
 */
const GROUPS = ['药物因素', '机体因素', '其他因素'];

function groupAudit(chap) {
  return GROUPS.map((w) => {
    const h = keywordHits(chap, w);
    return { word: w, total: h.total, subs: h.per.length };
  });
}

/** 药物端五件事：剂量、剂型、生物利用度、给药途径、给药时间 */
const DRUG_SIDE = ['剂量', '剂型', '生物利用度', '给药途径', '给药时间'];

/** 机体端五件事：生理状态、病理状态、年龄、性别、遗传 */
const BODY_SIDE = ['生理状态', '病理状态', '年龄', '性别', '遗传'];

function sideAudit(chap, words) {
  return words.map((w) => {
    const h = keywordHits(chap, w);
    const top = [...h.per].sort((a, b) => b.hits - a.hits)[0] || { sub: '', hits: 0 };
    return { word: w, total: h.total, subs: h.per.length, top: top.sub, topHits: top.hits };
  });
}

/**
 * 两端框架：病理因素与诸因素最终只经两条路起作用——
 * 改变体内过程，或改变靶器官的反应性。两端的词频比，是本章的核心比例。
 */
const ENDS = ['体内过程', '反应性'];

function endsAudit(chap) {
  return ENDS.map((w) => {
    const h = keywordHits(chap, w);
    return { word: w, total: h.total, subs: h.per.length };
  });
}

/** 量效三件套：量效关系、效能、效价强度（4.1.1 的主干） */
const DOSE_CURVE = ['量效关系', '效能', '效价强度', '量效曲线'];

function curveAudit(chap) {
  return DOSE_CURVE.map((w) => {
    const h = keywordHits(chap, w);
    const top = [...h.per].sort((a, b) => b.hits - a.hits)[0] || { sub: '', hits: 0 };
    return { word: w, total: h.total, top: top.sub, topHits: top.hits };
  });
}

/** 判断的去向 */
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

/** 量值核验：本章声明不写含量与浓度的量值，这里当断言复算 */
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

/** 口径句核验 */
function briefAudit(chap) {
  const need = ['剂量与用法照底本', '本书不构成用药建议'];
  return subsOf(chap).map((u) => ({
    sub: u.no,
    ok: need.every((k) => u.brief.includes(k)),
    missing: need.filter((k) => !u.brief.includes(k)),
  }));
}

/** 最薄与最厚的小节 */
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
  const groups = groupAudit(chap);
  const drug = sideAudit(chap, DRUG_SIDE);
  const body = sideAudit(chap, BODY_SIDE);
  const ends = endsAudit(chap);
  const curve = curveAudit(chap);
  const handoff = handoffAudit(chap);
  const values = valueAudit(chap);
  const briefs = briefAudit(chap);
  const ext = extremes(chap);

  console.log('═══ 影响药物效应的因素：三组因素、两端框架与表述口径（药理学 第4章）═══');
  console.log(`教材规模: 第4章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / s.subs)} 字`);
  console.log(`量值核验: ${values.subs} 小节正文的数字＋单位命中 ${values.hits} 处（底本声明与复算一致）`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log('');
  console.log(`12 个小节与正文汉字（最薄 ${ext.thinnest.sub} · ${ext.thinnest.hanzi} 字；最厚 ${ext.thickest.sub} · ${ext.thickest.hanzi} 字）：`);
  for (const u of subs) console.log(`  ${u.no} ${u.title.replace(/^\d+\.\d+\.\d+\s*/, '')} · ${hanzi(u.body)} 字`);
  console.log('');
  console.log(`三组因素: ${groups.map((g) => `${g.word} ${g.total} 次 / ${g.subs} 小节`).join(' · ')}`);
  console.log('');
  console.log('药物端五件事（次数 / 小节数 / 最密小节）：');
  for (const d of drug) console.log(`  ${d.word} ${d.total} · ${d.subs} · ${d.top}（${d.topHits}）`);
  console.log('机体端五件事（次数 / 小节数 / 最密小节）：');
  for (const b of body) console.log(`  ${b.word} ${b.total} · ${b.subs} · ${b.top}（${b.topHits}）`);
  console.log('');
  console.log(`两端框架: ${ends.map((e) => `${e.word} ${e.total} 次 / ${e.subs} 小节`).join(' · ')}`);
  console.log('  → 效应变化总能落到「过程」或「反应性」其中之一，这是本章反复用的判别器。');
  console.log('');
  console.log(`量效三件套: ${curve.map((c) => `${c.word} ${c.total}`).join(' · ')}`);
  console.log(`  最密: ${curve[0].top}（${curve[0].topHits} 次）——位置、高度、斜率三个读数都在这里被交代。`);
  console.log('');
  console.log(`判断去向: 「${HANDOFF}」${handoff.count} 次，分布在 ${handoff.subs.length} 个小节`);
  console.log(`  有交接句: ${handoff.subs.join(' ')}`);
  console.log(`  没有交接句: ${handoff.missing.join(' ') || '（无）'}`);
  console.log('');
  console.log(`口径句核验: ${briefs.filter((b) => b.ok).length} / ${briefs.length} 小节的 brief 同时带「剂量与用法照底本」与「本书不构成用药建议」`);
  console.log('');
  console.log('教学边界：本章只说明影响药物效应的药物因素与机体因素与其他因素的类别与作用方向，不写剂量与浓度与用法量值（剂量与用法照底本），不作适应证判定与疗效断言，不构成用药建议');

  return { chap, subs, shape: s, secs, groups, drug, body, ends, curve, handoff, values, briefs, extremes: ext };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  FILE,
  CHAPTER,
  GROUPS,
  DRUG_SIDE,
  BODY_SIDE,
  ENDS,
  DOSE_CURVE,
  HANDOFF,
  VALUE_RE,
  load,
  chapter,
  subsOf,
  hanzi,
  shape,
  sectionStats,
  keywordHits,
  groupAudit,
  sideAudit,
  endsAudit,
  curveAudit,
  handoffAudit,
  valueAudit,
  briefAudit,
  extremes,
  main,
};

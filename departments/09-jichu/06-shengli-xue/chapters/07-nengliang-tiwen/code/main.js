#!/usr/bin/env node
/**
 * 生理学 · 第 7 章 能量代谢与体温：产与散的两本账
 * 课程正文: departments/09-jichu/06-shengli-xue/chapters/07-nengliang-tiwen/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章是全书唯一一章「代谢」压过「机能」，也是「推不出」写得最明确的一章。
 * 程序只读本章正文，现算规模与关键词，并把三处关系写成判别：
 * 散热主力的换位、基础状态的可比条件、以及由代谢方向推不出体温状态。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

const read = () => fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
const hanzi = (s) => (String(s || '').match(CJK) || []).length;

function shape(md) {
  const body = md.replace(/```[\s\S]*?```/g, '');
  const lines = body.split('\n');
  const count = (re) => lines.filter((l) => re.test(l)).length;
  return {
    hanzi: hanzi(body),
    h1: count(/^# /),
    h2: count(/^## /),
    h3: count(/^### /),
    h4: count(/^#### /),
    tables: count(/^\|/),
    paras: body.split(/\n{2,}/).filter((p) => hanzi(p) >= 40).length,
  };
}

function citations(md) {
  const prose = md.replace(/```[\s\S]*?```/g, '');
  const out = [];
  for (const m of prose.matchAll(/《([^》·]{2,12})·([^》]{2,20})》/g)) out.push({ book: m[1], part: m[2] });
  return out;
}

function judgments(md) {
  const prose = md.replace(/```[\s\S]*?```/g, '');
  const seen = new Set();
  for (const line of prose.split('\n')) {
    if (/^\s*[|#>]/.test(line)) continue;
    for (const m of line.matchAll(/\*\*([^*]{4,40})\*\*/g)) {
      const s = m[1].trim().replace(/[：:，,。；;]$/, '');
      if (hanzi(s) < 4) continue;
      if (/^(MOTTO|PROBLEM|双根因定位|免责声明|边界声明|教材出处)$/.test(s)) continue;
      seen.add(s);
    }
  }
  return [...seen];
}

const KEYWORDS = ['产热', '散热', '调定点', '基础代谢', '蒸发'];
function keywords(md) {
  const prose = md.replace(/```[\s\S]*?```/g, '');
  const out = {};
  for (const k of KEYWORDS) out[k] = prose.split(k).length - 1;
  return out;
}

function boundaryHits(md) {
  return (md.match(/本书不给值|不写数值|不给正常值|不给单位|不提供数值/g) || []).length;
}

/**
 * 判别一：散热的主力随环境换位。
 * 环境温度接近或高于皮肤温度时，辐射与对流不再有效，蒸发成为主要甚至唯一途径。
 * @param {'低于皮肤温度'|'接近或高于皮肤温度'} env
 */
function heatLossRoute(env) {
  if (env === '接近或高于皮肤温度') return { main: '蒸发', why: '辐射与传导对流依赖温度差，温差消失后只剩蒸发有效' };
  if (env === '低于皮肤温度') return { main: '辐射与传导对流', why: '温差存在，皮肤血流量改变即可调节散热量' };
  throw new Error('未知环境条件：' + env);
}

/**
 * 判别二：基础状态是「排除四个条件之后的底值」，条件不一致就不能比较。
 * @param {{awake:boolean, fasting:boolean, thermoneutral:boolean, relaxed:boolean}} p
 */
function basalComparable(p) {
  const problems = [];
  if (!p.awake) problems.push('非清醒');
  if (!p.fasting) problems.push('非空腹');
  if (!p.thermoneutral) problems.push('环境温度不适宜');
  if (!p.relaxed) problems.push('精神未放松');
  return { comparable: problems.length === 0, problems };
}

/**
 * 判别三：代谢与体温是闭环，只能写方向。
 * 由「产热增加、散热减少」推不出体温状态——这是本章写进程序的那个「推不出」。
 * @param {{shivering?:boolean, vasoconstriction?:boolean}} obs
 */
function inferTemperature(obs) {
  const dirs = [];
  if (obs.shivering) dirs.push('产热增加');
  if (obs.vasoconstriction) dirs.push('散热减少');
  if (!dirs.length) throw new Error('没有可用的观察项');
  return { dirs, conclusion: '推不出体温状态：两者同向只能说明方向，不能给出体温是升是降还是不变' };
}

/** 产热器官随状态换位：安静时以内脏为主，活动时骨骼肌成为主要来源 */
const HEAT_PRODUCTION = { 安静时: '以内脏器官为主，肝的代谢水平较高', 活动时: '骨骼肌代谢明显增强，成为主要来源' };

/** 四条散热方式：分工取决于环境条件，不是并列清单 */
const HEAT_LOSS_WAYS = ['辐射', '传导', '对流', '蒸发'];

function main() {
  const md = read();
  const s = shape(md);
  const cites = citations(md);
  const judges = judgments(md);
  const kw = keywords(md);
  const ranked = Object.entries(kw).sort((a, b) => b[1] - a[1]);

  console.log('═══ 能量代谢与体温：产与散的两本账（生理学 第 7 章）═══');
  console.log(`正文（不含代码块）：${s.hanzi} 汉字 · ${s.h2} 个二级小节 · ${s.h3} 个三级 · ${s.h4} 个四级 · ${s.tables} 行表格 · ${s.paras} 个成段段落`);
  console.log(`引文：《书名·篇名》级 ${cites.length} 条 · 加粗判断句 ${judges.length} 条`);
  console.log('');
  console.log('关键词命中：');
  for (const [k, v] of ranked) console.log(`  ${k.padEnd(5)} ${String(v).padStart(3)} 次`);
  console.log('');
  for (const [k, v] of Object.entries(HEAT_PRODUCTION)) console.log(`  ${k}：${v}`);
  console.log(`  四条散热方式：${HEAT_LOSS_WAYS.join('、')}——主力随环境换位`);
  console.log('');
  for (const env of ['低于皮肤温度', '接近或高于皮肤温度']) {
    const r = heatLossRoute(env);
    console.log(`  环境${env} → 主力是${r.main}（${r.why}）`);
  }
  const ok = basalComparable({ awake: true, fasting: true, thermoneutral: true, relaxed: true });
  const bad = basalComparable({ awake: true, fasting: false, thermoneutral: true, relaxed: true });
  console.log(`  基础状态条件齐 → 可比：${ok.comparable}；空腹条件不满足 → 可比：${bad.comparable}（${bad.problems.join('、')}）`);
  const inf = inferTemperature({ shivering: true, vasoconstriction: true });
  console.log(`  寒战 + 缩血管 → ${inf.dirs.join('、')}；${inf.conclusion}`);
  console.log(`「不给值」类边界句 ${boundaryHits(md)} 处。`);
  console.log('教学边界：本章只解释类别、关系与方向，不写数值与单位，不构成诊断、治疗或健康判定依据。');

  return { shape: s, cites, judges, kw, ways: HEAT_LOSS_WAYS.length, boundary: boundaryHits(md) };
}

if (require.main === module) main();

module.exports = {
  DOC,
  KEYWORDS,
  HEAT_PRODUCTION,
  HEAT_LOSS_WAYS,
  read,
  hanzi,
  shape,
  citations,
  judgments,
  keywords,
  boundaryHits,
  heatLossRoute,
  basalComparable,
  inferTemperature,
  main,
};

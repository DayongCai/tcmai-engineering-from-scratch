#!/usr/bin/env node
/**
 * 生理学 · 第 4 章 血液循环：泵血·血管·调节·器官循环
 * 课程正文: departments/09-jichu/06-shengli-xue/chapters/04-xueye-xunhuan/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的主线只有一句：泵造压差，管把压差耗成流量。
 * 程序只读本章正文，现算规模与关键词，并把三处方向题写成判别：
 * 瓣膜状态定时相、口径与阻力的关系、同一因素在两个器官里方向相反的机制。
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

/** 关键词命中：本章以机能为轴，压差与阻力是两根柱子 */
const KEYWORDS = ['压差', '阻力', '瓣膜', '不应期', '调节'];
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
 * 判别一：四个时相由两个瓣膜的状态唯一决定。
 * 两个都关＝等容段（容积不变而压力剧变，这正是判断时相的依据）。
 * @param {{av:'开'|'关', sl:'开'|'关'}} p
 */
function cardiacPhase(p) {
  const k = `${p.av}${p.sl}`;
  const T = {
    关关: { phase: '等容期', note: '两瓣皆关，容积基本不变而室内压剧变；处于收缩还是舒张，看压力方向' },
    关开: { phase: '射血期', note: '室内压超过动脉压，动脉瓣开放，血液由心室射入动脉' },
    开关: { phase: '充盈期', note: '室内压低于房压，房室瓣开放，血液由心房流入心室' },
    开开: { phase: '不可能', note: '两个瓣膜同时开放会让血同时进出，与结构不符' },
  };
  if (!T[k]) throw new Error('未知瓣膜状态：' + k);
  return { ...T[k], k };
}

/**
 * 判别二：阻力由口径主导，且与半径的高次幂反变。
 * 所以血压调节的主要把手是小动脉口径，而不是长度或黏滞度。
 * @param {'减小'|'增大'} caliber
 */
function resistanceBy(caliber) {
  if (caliber === '减小') return { change: '阻力增大', why: '阻力与半径的高次幂反变，口径是最显著的把手' };
  if (caliber === '增大') return { change: '阻力减小', why: '同样的高次幂关系反向成立' };
  throw new Error('未知口径变化：' + caliber);
}

/**
 * 判别三：同一个调节因素在不同器官里方向可以相反。
 * 缺氧使体循环血管舒张、肺血管收缩——因为两个器官要解决的问题不是同一个。
 * @param {'体循环'|'肺循环'} bed
 */
function hypoxiaEffect(bed) {
  if (bed === '肺循环') return { dir: '收缩', why: '通气不足的区域减少灌注，使血流转向通气较好的区域' };
  if (bed === '体循环') return { dir: '舒张', why: '代谢产物的局部作用使供血增加' };
  throw new Error('未知循环：' + bed);
}

/** 三条调节的时间尺度（只写类别，不写数值） */
const REGULATION_SCALES = {
  神经调节: '起效快、作用部位局限，适合及时应答',
  体液调节: '起效慢、影响持久而广泛，适合长期调整',
  自身调节: '局部即时，在整体调节作出反应之前先提供一层缓冲',
};

function main() {
  const md = read();
  const s = shape(md);
  const cites = citations(md);
  const judges = judgments(md);
  const kw = keywords(md);
  const ranked = Object.entries(kw).sort((a, b) => b[1] - a[1]);

  console.log('═══ 血液循环：泵血·血管·调节·器官循环（生理学 第 4 章）═══');
  console.log(`正文（不含代码块）：${s.hanzi} 汉字 · ${s.h2} 个二级小节 · ${s.h3} 个三级 · ${s.h4} 个四级 · ${s.tables} 行表格 · ${s.paras} 个成段段落`);
  console.log(`引文：《书名·篇名》级 ${cites.length} 条 · 加粗判断句 ${judges.length} 条`);
  console.log('');
  console.log('关键词命中：');
  for (const [k, v] of ranked) console.log(`  ${k.padEnd(3)} ${String(v).padStart(3)} 次`);
  console.log('');
  console.log('时相判别（两瓣状态唯一决定四个时相）：');
  for (const p of [
    { av: '关', sl: '关' }, { av: '关', sl: '开' }, { av: '开', sl: '关' }, { av: '开', sl: '开' },
  ]) {
    const r = cardiacPhase(p);
    console.log(`  房室瓣${p.av} / 动脉瓣${p.sl} → ${r.phase}`);
  }
  console.log('');
  console.log(`口径${resistanceBy('减小').change}：${resistanceBy('减小').why}`);
  console.log(`缺氧对肺循环 → ${hypoxiaEffect('肺循环').dir}（${hypoxiaEffect('肺循环').why}）`);
  console.log(`缺氧对体循环 → ${hypoxiaEffect('体循环').dir}`);
  console.log('');
  for (const [k, v] of Object.entries(REGULATION_SCALES)) console.log(`  ${k}：${v}`);
  console.log(`「不给值」类边界句 ${boundaryHits(md)} 处。`);
  console.log('教学边界：本章只说明循环的类别、关系与机制，不写数值与单位，不构成诊断或治疗依据。');

  return { shape: s, cites, judges, kw, phases: 4, boundary: boundaryHits(md) };
}

if (require.main === module) main();

module.exports = {
  DOC,
  KEYWORDS,
  REGULATION_SCALES,
  read,
  hanzi,
  shape,
  citations,
  judgments,
  keywords,
  boundaryHits,
  cardiacPhase,
  resistanceBy,
  hypoxiaEffect,
  main,
};

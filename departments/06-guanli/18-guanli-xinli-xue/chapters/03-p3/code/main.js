#!/usr/bin/env node
/**
 * 管理心理学 · 第 3 章 每一种人性假设，都是一份事先写好的免责声明
 * 课程: departments/06-guanli/18-guanli-xinli-xue/chapters/03-p3/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章把「人性假设」从口号变成可核对的制度前提。脚本做三件事：
 *   1. 四条判准与六种假设（三种经典 + 三种补丁）逐条从正文核对，缺一条就报；
 *   2. 用「监督／自主／归属」三轴给场景与假设打分，算匹配距离，选最不坏的一种
 *      ——「先诊断，再开方」在这里是可算的；
 *   3. 把自我实现预言的循环跑三轮，看监控如何一点点吃掉判断空间。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 3;
const TITLE = '每一种人性假设，都是一份事先写好的免责声明';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function sections(text) {
  return String(text || '')
    .split('\n')
    .filter((l) => /^##\s+/.test(l))
    .map((l) => l.replace(/^##\s+/, '').trim());
}

/** 加粗领起的判断句，本章的概念名都在这里 */
function boldLeads(text) {
  return [...String(text || '').matchAll(/\*\*([^*\n]{2,12})\*\*/g)].map((m) => m[1]);
}

const CRITERIA = ['经验可检验', '逻辑自洽', '实践有效', '伦理可接受'];
const CLASSIC = ['经济人', '社会人', '自我实现人'];
const PATCHES = ['复杂人', '文化人', '道德人'];

function concepts(text) {
  const t = String(text || '');
  return {
    criteria: CRITERIA.filter((c) => t.includes(c)),
    classic: CLASSIC.filter((c) => t.includes(c)),
    patches: PATCHES.filter((c) => t.includes(c)),
    hasX: t.includes('X 理论'),
    hasY: t.includes('Y 理论'),
  };
}

/**
 * 三种假设在三根轴上的取值（0—1）：要求监督的强度、留给自主的宽度、提供归属的分量。
 * 这些不是教材数字，是把正文描述转成可比较的刻度，用于「先诊断，再开方」。
 */
const PROFILES = {
  经济人: { supervise: 0.9, autonomy: 0.1, belong: 0.2 },
  社会人: { supervise: 0.3, autonomy: 0.35, belong: 0.9 },
  自我实现人: { supervise: 0.2, autonomy: 0.9, belong: 0.4 },
};

/** 四类场景对三轴的需求（正文点名：急诊抢救、流水线分装、科研攻关、师承带教） */
const SCENES = {
  急诊抢救: { supervise: 0.85, autonomy: 0.45, belong: 0.25 },
  流水线分装: { supervise: 0.9, autonomy: 0.1, belong: 0.4 },
  科研攻关: { supervise: 0.15, autonomy: 0.95, belong: 0.3 },
  师承带教: { supervise: 0.25, autonomy: 0.55, belong: 0.85 },
};

const AXES = ['supervise', 'autonomy', 'belong'];

function distance(a, b) {
  return Number(Math.sqrt(AXES.reduce((s, k) => s + (a[k] - b[k]) ** 2, 0)).toFixed(4));
}

/** 每个场景选距离最小的假设；距离最小不代表适配，只代表最不坏 */
function fit(scenes = SCENES, profiles = PROFILES) {
  const out = {};
  for (const [scene, need] of Object.entries(scenes)) {
    const ranked = Object.keys(profiles)
      .map((k) => ({ assumption: k, d: distance(need, profiles[k]) }))
      .sort((a, b) => a.d - b.d);
    out[scene] = { best: ranked[0].assumption, d: ranked[0].d, gap: Number((ranked[1].d - ranked[0].d).toFixed(4)) };
  }
  return out;
}

/**
 * 自我实现预言：相信偷懒 → 监控 +，判断空间 −，职责外的动作 −，证据 +1。
 * 三轮之后，「果然如此」的把握上升，而那个把握是制度自己生产的。
 */
function loop(rounds = 3, start = { supervise: 0.3, space: 1, extra: 1 }) {
  const trace = [];
  let s = start.supervise;
  let space = start.space;
  let extra = start.extra;
  for (let i = 1; i <= rounds; i += 1) {
    s = Math.min(1, s + 0.2);
    space = Number(Math.max(0, space - 0.25).toFixed(4));
    extra = Number(Math.max(0, extra - space * 0.3).toFixed(4));
    trace.push({ round: i, supervise: Number(s.toFixed(4)), space, extra });
  }
  return trace;
}

/** 四条判准的打分：每条 0/1，用来判断一份制度预设「能不能用」 */
function audit(hits) {
  const got = CRITERIA.map((c) => ({ c, ok: Boolean(hits[c]) }));
  return {
    got,
    score: got.filter((x) => x.ok).length,
    verdict: got.every((x) => x.ok) ? '四条齐，可用' : '缺 ' + got.filter((x) => !x.ok).map((x) => x.c).join('、'),
  };
}

function main() {
  const text = read();
  const c = concepts(text);
  const f = fit();
  const hanzi = (text.match(HANZI) || []).length;

  console.log(`管理心理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi} 字 · 节 ${sections(text).length} 节 · 加粗判断 ${boldLeads(text).length} 处`);
  console.log('');
  console.log(`四条判准 ${c.criteria.length}/4：${c.criteria.join(' · ')}`);
  console.log(`经典假设 ${c.classic.length}/3：${c.classic.join(' · ')}（X 理论：${c.hasX ? '有' : '缺'}；Y 理论：${c.hasY ? '有' : '缺'}）`);
  console.log(`补丁假设 ${c.patches.length}/3：${c.patches.join(' · ')}`);
  console.log('');
  console.log('先诊断再开方：四类场景最近的假设（距离越小越不坏）：');
  for (const [scene, r] of Object.entries(f)) {
    console.log(`  ${scene} → ${r.best}（距离 ${r.d}，与次优相差 ${r.gap}）`);
  }
  console.log('  → 没有一个假设通吃四类场景；把 Y 搬到零容错岗位、把 X 搬到科研岗位，都会出事。');
  console.log('');
  console.log('自证循环三轮（起始监控 0.3）：');
  for (const t of loop()) console.log(`  第 ${t.round} 轮：监控 ${t.supervise}｜判断空间 ${t.space}｜职责外动作 ${t.extra}`);
  console.log('  → 监控越紧，判断空间越小，职责外的动作越少，而管理者看到的「果然如此」正是自己加的那层监控造出来的。');
  console.log('');
  const a = audit({ 经验可检验: true, 逻辑自洽: true, 实践有效: false, 伦理可接受: true });
  console.log(`计件制预设的判准体检：${a.score}/4，${a.verdict}`);
  console.log('');
  console.log('边界：本章的机构、产量与比例均为演算设定；人性假设的取舍不构成人事处理或绩效分配意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, sections, boldLeads, concepts, fit, loop, audit, PROFILES, SCENES, CRITERIA, distance };

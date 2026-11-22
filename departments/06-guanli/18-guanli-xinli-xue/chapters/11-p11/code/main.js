#!/usr/bin/env node
/**
 * 管理心理学 · 第 11 章 话没有传丢，是一层层被筛掉了
 * 课程: departments/06-guanli/18-guanli-xinli-xue/chapters/11-p11/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的核心是一条指数衰减，本脚本把它算全：
 *   1. 每层保留 0.7，四层剩 24%；每层 0.8，四层剩 41%——延长讲话补不回层数；
 *   2. 两层直达剩 49%，所以「减层」比「加压」有效；
 *   3. 方向性：坏消息向上按衰减走，好消息向下按膨胀走，院长看到的总量差多少；
 *   4. 抽查 9/42 = 21.4% 与主任自评 90% 的缺口，正是这条链的读数。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 11;
const TITLE = '话没有传丢，是一层层被筛掉了';
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

/** 逐层保留：r^layers，四舍五入到 4 位 */
function decay(layers, retention) {
  const left = Math.pow(retention, layers);
  return { layers, retention, left: Number(left.toFixed(4)), pct: Number((left * 100).toFixed(2)) };
}

/** 两个方案的对照：延长讲话 vs 减少层数 */
function compareChannels() {
  const longer = decay(4, 0.8);
  const shorter = decay(2, 0.7);
  const flat = decay(4, 0.7);
  return {
    base4: flat,
    longer4: longer,
    shorter2: shorter,
    // 层数减半带来的提升远大于单层保留率的提升
    gainByTalking: Number((longer.left - flat.left).toFixed(4)),
    gainByCutting: Number((shorter.left - flat.left).toFixed(4)),
  };
}

/**
 * 方向性：坏消息每往上一层按 badUp 保留（还要扣掉自保），
 * 好消息每往下一层按 goodDown 放大。基层实况 1.0 为基准。
 */
function directionality(layers, badUp = 0.8, goodDown = 1.15) {
  const up = Math.pow(badUp, layers);
  const down = Math.pow(goodDown, layers);
  return {
    layers,
    badNewsSeen: Number(up.toFixed(4)),
    goodNewsSeen: Number(down.toFixed(4)),
    gap: Number((down - up).toFixed(4)),
    note: '院长听到的比实际好，看到的数据比实际漂亮：每一层都在做对自己最安全的选择',
  };
}

/** 抽查结果：能准确说出关键内容者占比 */
function spotCheck(total, correct) {
  const pct = Number(((correct / total) * 100).toFixed(2));
  return {
    total,
    correct,
    pct,
    verdict: pct < 30 ? '与逐层衰减的算术吻合：问题在链不在人' : '落地尚可，仍需抽查复核',
  };
}

const LISTEN = ['不打断', '先复述再表态', '问具体'];
const FEEDBACK = ['具体行为', '影响', '期待'];
const MEETING = ['会前发一页纸', '分开标注', '会后当天发一条结论'];
const CHANNELS = ['下行沟通', '上行沟通', '横向沟通'];

function concepts(text) {
  const t = String(text || '');
  return {
    listen: LISTEN.filter((x) => t.includes(x)),
    feedback: FEEDBACK.filter((x) => t.includes(x)),
    meeting: MEETING.filter((x) => t.includes(x)),
    channels: CHANNELS.filter((x) => t.includes(x)),
    hasReadback: t.includes('回述法'),
  };
}

function main() {
  const text = read();
  const c = concepts(text);
  const hanzi = (text.match(HANZI) || []).length;
  const cmp = compareChannels();
  const dir = directionality(2);
  const s = spotCheck(42, 9);

  console.log(`管理心理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi} 字 · 节 ${sections(text).length} 节`);
  console.log(`倾听动作 ${c.listen.length}/3｜反馈三要素 ${c.feedback.length}/3｜会议改进 ${c.meeting.length}/3`);
  console.log(`三条通道 ${c.channels.length}/3：${c.channels.join(' · ')}`);
  console.log('');
  console.log('逐层衰减：');
  console.log(`  每层 0.7 × 四层 → ${cmp.base4.pct}%`);
  console.log(`  讲话延长到 40 分钟，每层 0.8 × 四层 → ${cmp.longer4.pct}%（比原来多 ${(cmp.gainByTalking * 100).toFixed(1)} 个点）`);
  console.log(`  减到两层、每层 0.7 → ${cmp.shorter2.pct}%（比原来多 ${(cmp.gainByCutting * 100).toFixed(1)} 个点）`);
  console.log('  → 减层比加压有效：层数是指数，讲话水平只是底数。');
  console.log('');
  console.log(`方向性（两层）：坏消息上行剩 ${dir.badNewsSeen}，好消息下行放大到 ${dir.goodNewsSeen}，差 ${dir.gap}`);
  console.log(`  → ${dir.note}`);
  console.log('');
  console.log(`抽查：${s.correct}/${s.total} = ${s.pct}% → ${s.verdict}`);
  console.log('');
  console.log('边界：0.7 的保留率与四层衰减是演示性算术，不是实测参数；真实衰减随信息类型、通道与关系质量变化。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, sections, decay, compareChannels, directionality, spotCheck, concepts, LISTEN, FEEDBACK, MEETING, CHANNELS };

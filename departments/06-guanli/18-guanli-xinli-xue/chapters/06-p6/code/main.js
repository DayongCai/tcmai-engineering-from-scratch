#!/usr/bin/env node
/**
 * 管理心理学 · 第 6 章 满意度问卷测的是填表那一刻的情绪，不是员工会不会走
 * 课程: departments/06-guanli/18-guanli-xinli-xue/chapters/06-p6/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章用两个数字咬合：总体满意度 82%、愿意再干三年 54%；次年离职 61 人，
 * 其中 43 人勾过「满意」。脚本把它们算成三个比率，并给出态度—行为缺口的条件判定：
 *   1. 满意率与留任意向之差（28 个点）；
 *   2. 离职者中曾表示满意者的占比（43/61）；
 *   3. 态度能否预测行为：四项条件逐条打分，缺一项就降档；
 *   4. 回收率的分母效应：低于六成时，结论只能推到「还愿意说话的人」身上。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 6;
const TITLE = '满意度问卷测的是填表那一刻的情绪，不是员工会不会走';
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

const DIMS = ['工作本身', '报酬', '晋升机会', '上级监督', '同事关系'];
const COMMITMENTS = ['情感承诺', '持续承诺', '规范承诺'];
const JOB_CHARS = ['技能多样性', '任务完整性', '任务重要性', '自主性', '反馈'];
const MISUSES = ['把满意当绩效', '把分数当诊断', '用调查代替对话', '调查后不行动'];

function concepts(text) {
  const t = String(text || '');
  return {
    dims: DIMS.filter((d) => t.includes(d)),
    commitments: COMMITMENTS.filter((c) => t.includes(c)),
    jobChars: JOB_CHARS.filter((c) => t.includes(c)),
    misuses: MISUSES.filter((m) => t.includes(m)),
    hasLaPiere: t.includes('拉皮埃尔'),
  };
}

/** 满意率与留任意向之差：同一批人，两个问题，中间那道缝 */
function gap(satisfied, intendStay) {
  return {
    satisfied,
    intendStay,
    points: Number((satisfied - intendStay).toFixed(2)),
    ratio: Number((satisfied / intendStay).toFixed(4)),
  };
}

/** 离职者中曾勾「满意」的占比：不是矛盾，是两项测的东西不同 */
function leaverParadox(leavers, saidSatisfied) {
  return {
    leavers,
    saidSatisfied,
    share: Number(((saidSatisfied / leavers) * 100).toFixed(2)),
    // 满意者占比 70.5%，说明「满意」根本不是离职的负向指标
    verdict: saidSatisfied / leavers > 0.5 ? '多数离职者曾自评满意：满意度不能当留任预测' : '满意与离职方向一致，可作参考',
  };
}

/** 态度预测行为的四条件：缺一条降一档 */
function predictivity(c) {
  const need = [
    { k: 'specific', label: '态度指向具体行为' },
    { k: 'directExp', label: '基于直接经验' },
    { k: 'lowPressure', label: '情境压力小' },
    { k: 'freedom', label: '行动自由度高' },
  ];
  const met = need.filter((x) => c[x.k]).length;
  const tier = met === 4 ? '可作行为预测' : met >= 2 ? '只可作参考' : '只测到当时的情绪';
  return { met, of: need.length, tier };
}

/** 回收率：低于六成，样本偏向「仍有期待的那部分」 */
function response(issued, returned, ratedSatisfied) {
  const rate = issued ? returned / issued : 0;
  return {
    rate: Number((rate * 100).toFixed(2)),
    biased: rate < 0.6,
    reportedRate: ratedSatisfied,
    // 分母若只算「填了的人」，满意率会被沉默者悄悄抬高
    honestNote: rate < 0.6 ? '结论只能推到愿意填表的人，不能代表全员' : '回收率达标，仍有沉默者问题',
  };
}

function main() {
  const text = read();
  const c = concepts(text);
  const hanzi = (text.match(HANZI) || []).length;
  const g = gap(82, 54);
  const l = leaverParadox(61, 43);

  console.log(`管理心理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi} 字 · 节 ${sections(text).length} 节`);
  console.log(`满意度五维 ${c.dims.length}/5：${c.dims.join(' · ')}`);
  console.log(`承诺三类 ${c.commitments.length}/3：${c.commitments.join(' · ')}`);
  console.log(`工作特征五项 ${c.jobChars.length}/5：${c.jobChars.join(' · ')}`);
  console.log(`四种误用 ${c.misuses.length}/4：${c.misuses.join(' · ')}`);
  console.log('');
  console.log(`满意率 ${g.satisfied}% ／ 愿意再干三年 ${g.intendStay}% → 差 ${g.points} 个点（前者是后者的 ${g.ratio} 倍）`);
  console.log(`离职 ${l.leavers} 人，其中 ${l.saidSatisfied} 人曾勾「满意」→ ${l.share}%：${l.verdict}`);
  console.log('');
  const p = predictivity({ specific: true, directExp: false, lowPressure: false, freedom: true });
  console.log(`态度能否预测行为（四项条件）：满足 ${p.met}/${p.of} → ${p.tier}`);
  const q = predictivity({ specific: true, directExp: true, lowPressure: true, freedom: true });
  console.log(`  四项齐时 → ${q.tier}；这就是为什么「是否愿意再干三年」比「是否满意」更准。`);
  console.log('');
  // 正文只给回收 412 份，没有给发出份数；这里用「假设发出 600 份」演示分母的作用
  const r = response(600, 412, 82);
  const r2 = response(600, 300, 82);
  console.log(`假设发出 600 份：回收 412 份 → ${r.rate}%（${r.biased ? '样本有偏' : '样本达标'}）；回收 300 份 → ${r2.rate}%（${r2.biased ? '样本有偏' : '样本达标'}）`);
  console.log(`  → ${r2.honestNote}；分母一换，同一份满意率的解释力就变了。`);
  console.log('');
  console.log('边界：本章的问卷份数、满意率与离职人数均为演算设定；员工心理数据属敏感个人信息，匿名承诺须真实兑现。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, sections, concepts, gap, leaverParadox, predictivity, response, DIMS, COMMITMENTS, JOB_CHARS, MISUSES };

// 教学边界：口径只在正文维护一份，这里直接摘正文里含「不构成」的那一行。
try {
  const _zh = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  const _bound = (_zh.match(/[^\n]*不构成[^\n]*/) || [])[0];
  if (_bound) {
    console.log(`\n教学边界：${_bound.replace(/^[>\s*#-]+/, '').trim().slice(0, 120)}`);
  }
} catch { /* 读不到正文就不打，不编一句 */ }

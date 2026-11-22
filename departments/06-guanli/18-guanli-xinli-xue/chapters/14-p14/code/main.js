#!/usr/bin/env node
/**
 * 管理心理学 · 第 14 章 文化不是墙上的标语，是没人监督时默认的那套做法
 * 课程: departments/06-guanli/18-guanli-xinli-xue/chapters/14-p14/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章把「文化」拆成可核对的三层与四个可算的量：
 *   1. 沙因三层与三个诊断问题（答案都在第三层）；
 *   2. 心理契约违约的不对称：一次违约要几次履约才补平；
 *   3. 留任率不能独看：95% 的留任里情感与持续各占多少，含义完全不同；
 *   4. OCB 的判定：不做会不会被扣分。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 14;
const TITLE = '文化不是墙上的标语，是没人监督时默认的那套做法';
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

const LAYERS = ['人工制品', '信奉的价值观', '基本假设'];
const QUESTIONS = ['出了差错，第一反应是解决还是追责', '坏消息多久能传到能决策的人那里', '这里谁被真正尊重'];
const COMMIT = ['情感承诺', '持续承诺', '规范承诺'];

function concepts(text) {
  const t = String(text || '');
  return {
    layers: LAYERS.filter((x) => t.includes(x)),
    questions: QUESTIONS.filter((q) => t.includes(q)),
    commit: COMMIT.filter((x) => t.includes(x)),
    hasOCB: t.includes('组织公民行为'),
    hasContract: t.includes('心理契约'),
  };
}

/** 一家 30 例暗访里 11 例做到：覆盖率与行为率的差 */
function adoption({
  trainedRate, passRate, observed, didIt,
}) {
  const behavior = (didIt / observed) * 100;
  return {
    trainedRate,
    passRate,
    behavior: Number(behavior.toFixed(2)),
    gap: Number((trainedRate - behavior).toFixed(2)),
    verdict: trainedRate - behavior > 40 ? '宣称层与行为层脱节：培训测的是第二层' : '两层差距不大，可继续观察',
  };
}

/**
 * 心理契约违约的不对称：信任按「履约 +gain、违约 −loss」记账，
 * 返回补平一次违约需要几次履约。
 */
function contract(breaches, fulfillments, gain = 0.12, loss = 0.4) {
  const net = Number((fulfillments * gain - breaches * loss).toFixed(4));
  const recover = Math.ceil(loss / gain);
  return {
    breaches,
    fulfillments,
    net,
    // 一次违约要 4 次履约才抵平——这就是「不对称」
    recoverNeeded: recover,
    verdict: net < 0 ? '账仍为负：此人只会做分内之事' : '账已转正，但记忆里的坏事权重更高',
  };
}

/** 留任率拆解：同样的 95%，情感与持续的比例决定组织性质 */
function retention({ rate, emotionalShare }) {
  const emotional = Number((rate * emotionalShare).toFixed(2));
  const continuance = Number((rate * (1 - emotionalShare)).toFixed(2));
  return {
    rate,
    emotional,
    continuance,
    verdict: emotionalShare >= 0.6 ? '以认同为主：留任是自愿的' : '以走不了为主：人还在，心不在',
    checks: ['主动离职意愿的分布', '内部推荐率'],
  };
}

/** OCB 判定：不做会不会被扣分 */
function ocb({ voluntary, penalizedIfAbsent }) {
  const isOcb = voluntary && !penalizedIfAbsent;
  return {
    voluntary,
    penalizedIfAbsent,
    kind: isOcb ? '组织公民行为' : '没写进岗位说明的岗位职责',
    advice: isOcb ? '可提倡，不作考核依据' : '要么写进岗位与编制，要么承认它不可考',
  };
}

/** 上报量对比：36 件 vs 同规模 200 件以上 */
function reporting(events, benchmark) {
  const share = Number(((events / benchmark) * 100).toFixed(2));
  return {
    events,
    benchmark,
    share,
    read: share < 50 ? '上报量偏低：通道贵，不是安全好' : '上报量接近常态',
  };
}

function main() {
  const text = read();
  const c = concepts(text);
  const hanzi = (text.match(HANZI) || []).length;
  const a = adoption({ trainedRate: 100, passRate: 98, observed: 30, didIt: 11 });
  const k = contract(1, 4);
  const r1 = retention({ rate: 95, emotionalShare: 0.7 });
  const r2 = retention({ rate: 95, emotionalShare: 0.25 });
  const rep = reporting(36, 200);

  console.log(`管理心理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi} 字 · 节 ${sections(text).length} 节`);
  console.log(`沙因三层 ${c.layers.length}/3：${c.layers.join(' · ')}｜承诺三成分 ${c.commit.length}/3`);
  console.log(`诊断三问 ${c.questions.length}/3：${c.questions.join('｜')}`);
  console.log('');
  console.log(`培训 ${a.trainedRate}%／考核 ${a.passRate}% vs 暗访行为 ${a.behavior}% → 差 ${a.gap} 个点：${a.verdict}`);
  console.log(`上报 ${rep.events} 件 vs 同类 ${rep.benchmark} 件 = ${rep.share}%：${rep.read}`);
  console.log('');
  console.log(`心理契约：1 次违约、4 次履约 → 净 ${k.net}；补平一次违约需 ${k.recoverNeeded} 次履约（不对称）`);
  console.log('');
  console.log(`留任 95%（情感 70%）：情感 ${r1.emotional}｜持续 ${r1.continuance} → ${r1.verdict}`);
  console.log(`留任 95%（情感 25%）：情感 ${r2.emotional}｜持续 ${r2.continuance} → ${r2.verdict}`);
  console.log(`  → 同样的数字，两种组织；补看：${r1.checks.join('、')}。`);
  console.log('');
  const o1 = ocb({ voluntary: true, penalizedIfAbsent: false });
  const o2 = ocb({ voluntary: false, penalizedIfAbsent: true });
  console.log(`OCB 判定：自愿且不做不扣分 → ${o1.kind}；不做会被记一笔 → ${o2.kind}`);
  console.log('');
  console.log('边界：本章的培训覆盖率、暗访例数与上报件数均为演算设定；文化变革是慢变量，能被设计的只有结构。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, sections, concepts, adoption, contract, retention, ocb, reporting, LAYERS, QUESTIONS, COMMIT };

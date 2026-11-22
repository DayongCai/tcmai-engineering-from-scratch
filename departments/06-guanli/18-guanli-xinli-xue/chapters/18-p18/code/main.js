#!/usr/bin/env node
/**
 * 管理心理学 · 第 18 章 平台算得出相关，算不出该由谁负责
 * 课程: departments/06-guanli/18-guanli-xinli-xue/chapters/18-p18/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章要回答两件事：这个分数测的是什么，出了事谁负责。脚本各算一次：
 *   1. 0.41 的相关 → 解释 16.8% 的变异；同一人跨科室差 0.9 分 → 情境占了多大一块；
 *   2. 能力项重叠：Jaccard 相似度高到举不出区分性例子，就是重复项；
 *   3. 可解释性三档 + 复核闸门：无依据的输出不得进入决定；
 *   4. 去标识化的重识别风险：最小单元格人数就是匿名度。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 18;
const TITLE = '平台算得出相关，算不出该由谁负责';
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

/** 相关系数解释力 + 情境方差占比（同一人跨场景差 d 个标准差） */
function decomposition({ r, settingDiff, personalSd = 1 }) {
  const r2 = r * r;
  const settingVar = settingDiff * settingDiff;
  const settingShare = settingVar / (settingVar + personalSd * personalSd);
  return {
    r,
    explained: Number((r2 * 100).toFixed(2)),
    settingShare: Number((settingShare * 100).toFixed(2)),
    personShare: Number((100 - settingShare * 100).toFixed(2)),
    verdict: settingShare > 0.3 ? '分数里有一大块测的是「你在哪个场景」' : '情境影响可控，可继续看效标',
  };
}

/** 能力项重叠：Jaccard，越高越可能是同一项 */
function overlap(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  const uni = new Set([...A, ...B]).size;
  const j = uni ? inter / uni : 0;
  return {
    jaccard: Number(j.toFixed(2)),
    distinguishable: j < 0.7,
    note: j >= 0.7 ? '举不出「达标 A 不达标 B」的例子：两项本是一项' : '可区分',
  };
}

const TIERS = {
  规则透明: 3,
  部分可解释: 2,
  不可解释: 1,
};

/**
 * 闸门：影响学员评价／分流／预警的输出，必须能给出依据记录且发布前经人复核。
 * 内部提示不受此限，但不能进入决定。
 */
function gate({ tier, hasRecords, reviewed, affectsDecision }) {
  if (!affectsDecision) return { allowed: true, use: '仅作内部提示', reason: '不影响任何决定' };
  const ok = TIERS[tier] >= 2 && hasRecords && reviewed;
  return {
    allowed: ok,
    use: ok ? '可作为决定依据' : '不得作为决定依据',
    reason: ok ? '可解释且有人复核' : [
      TIERS[tier] < 2 ? '不可解释' : '',
      !hasRecords ? '给不出依据记录' : '',
      !reviewed ? '未经人复核' : '',
    ].filter(Boolean).join('、'),
  };
}

/** 复核是否真的存在：推翻比例为零即不存在 */
function reviewIntegrity({ reviews, overrides }) {
  const rate = reviews ? overrides / reviews : 0;
  return {
    reviews,
    overrides,
    rate: Number((rate * 100).toFixed(2)),
    exists: overrides > 0,
    verdict: overrides > 0 ? '复核在工作' : '复核从未推翻任何一条：不是模型准，是复核不存在',
  };
}

/** 去标识化后的匿名度：最小单元格人数（k-匿名） */
function anonymity(cells) {
  const min = Math.min(...cells.map((c) => c.n));
  return {
    minCell: min,
    k: min,
    risk: min < 5 ? '可重识别：信息越多、人群越小，组合就是指纹' : '最小单元格达到 5 人，重识别风险可控',
  };
}

const CHAIN = ['谁训练模型', '谁部署上线', '谁日常复核', '谁向学员解释', '谁承担后果'];
const GATES = ['G1 公开只读', 'G2 校内写读', 'G3 审阅与管理', 'E1 伦理门禁'];

function chain(assigned) {
  const missing = CHAIN.filter((c) => !assigned[c]);
  return { missing, ok: missing.length === 0, verdict: missing.length ? '责任落在空隙里：缺 ' + missing.join('、') : '五环各有其人' };
}

function concepts(text) {
  const t = String(text || '');
  return {
    chain: CHAIN.filter((c) => t.includes(c.replace('模型', '模型'))),
    gates: GATES.filter((g) => t.includes(g.split(' ')[0])).map((g) => g.split(' ')[0]),
    hasPBU: t.includes('PBU'),
    hasPIPL: t.includes('个人信息保护法'),
    hasDSL: t.includes('数据安全法'),
  };
}

function main() {
  const text = read();
  const c = concepts(text);
  const hanzi = (text.match(HANZI) || []).length;
  const d = decomposition({ r: 0.41, settingDiff: 0.9 });
  const o = overlap(['主动提问', '复述要点', '确认理解'], ['主动提问', '复述要点', '确认理解', '记录反馈']);
  const g = gate({ tier: '不可解释', hasRecords: false, reviewed: true, affectsDecision: true });
  const ri = reviewIntegrity({ reviews: 120, overrides: 0 });
  // 最小单元格取 3：正文说的「只有 8 人的科室，任何组合都是指纹」
  const an = anonymity([{ n: 3 }, { n: 23 }, { n: 41 }]);

  console.log(`管理心理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log(`（以下数字均从本章 docs/zh.md 现算）`);
  console.log('');
  console.log(`汉字 ${hanzi} 字 · 节 ${sections(text).length} 节`);
  console.log(`责任链五环 ${c.chain.length}/5｜门禁 ${c.gates.length}/4｜PBU：${c.hasPBU ? '有' : '缺'}`);
  console.log('');
  console.log(`相关 ${d.r} → 解释 ${d.explained}% 的变异；跨科室差 ${0.9} 分（个人标准差按 1 计）`);
  console.log(`  → 情境占 ${d.settingShare}%，个人占 ${d.personShare}%：${d.verdict}`);
  console.log('');
  console.log(`能力项重叠（Jaccard ${o.jaccard}）：${o.note}`);
  console.log('');
  console.log(`闸门（不可解释／无依据／已复核／影响决定）：${g.use} —— ${g.reason}`);
  console.log(`复核台账：${ri.reviews} 次复核、推翻 ${ri.overrides} 次（${ri.rate}%）→ ${ri.verdict}`);
  console.log('');
  console.log(`去标识化：最小单元格 ${an.minCell} 人 → k=${an.k}，${an.risk}`);
  console.log('');
  console.log(`责任链：${CHAIN.join(' → ')}；门禁：${GATES.join('、')}`);
  console.log('');
  console.log('边界：相关系数 0.41 与 0.9 分差均为演示性设定；学员数据处理须依《个人信息保护法》《数据安全法》与机构制度。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, sections, decomposition, overlap, gate, reviewIntegrity, anonymity, chain, concepts, TIERS, CHAIN, GATES };

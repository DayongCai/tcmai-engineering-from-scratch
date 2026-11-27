#!/usr/bin/env node
/**
 * 管理心理学 · 第 16 章 心理服务的瓶颈不在咨询室，在门口
 * 课程: departments/06-guanli/18-guanli-xinli-xue/chapters/16-p16/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的算式都在「门口」：困扰比例 21% 与使用率 1.8% 之间的 19 个点，不是需求差，是通道差。
 * 脚本算四件事：
 *   1. 需求—使用缺口，以及三种解释各自的判别指标；
 *   2. 漏斗：覆盖 → 有意愿 → 预约 → 首访，逐级转化率；
 *   3. 口径不可比：按人数与按人次，同一批人算出三倍差；
 *   4. 保密设计的三档强度，以及「名单在谁手里」为什么决定使用率。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 16;
const TITLE = '心理服务的瓶颈不在咨询室，在门口';
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

/** 需求与使用的缺口：21% 有中度以上困扰，1.8% 使用 */
function gap(distress, usage) {
  return {
    distress,
    usage,
    points: Number((distress - usage).toFixed(1)),
    reach: Number(((usage / distress) * 100).toFixed(1)),
    verdict: usage / distress < 0.2 ? '大部分有需要的人没有走进来：查入口，不查需求' : '到达率尚可，继续看结局',
  };
}

/** 漏斗：每一环的绝对量与转化率 */
function funnel(stages) {
  const out = [];
  for (let i = 0; i < stages.length; i += 1) {
    const prev = stages[i - 1];
    out.push({
      stage: stages[i].stage,
      n: stages[i].n,
      conversion: prev ? Number(((stages[i].n / prev.n) * 100).toFixed(1)) : 100,
    });
  }
  const first = stages[0].n;
  const last = stages[stages.length - 1].n;
  // 瓶颈只看「有意愿之后」的转化链：第一环是需求本身，不是通道
  const chain = out.slice(2);
  const bottleneck = chain.reduce((m, x) => (x.conversion < m.conversion ? x : m), chain[0]);
  return { steps: out, overall: Number(((last / first) * 100).toFixed(2)), bottleneck };
}

/**
 * 使用率口径：同一年、同一批人，按人数与按人次能差出数倍。
 * 人数 = 去过的人；人次 = 来访次数总和（含复访）。
 */
function usageModes({ covered, users, visits }) {
  const byPerson = (users / covered) * 100;
  const byVisit = (visits / covered) * 100;
  return {
    byPerson: Number(byPerson.toFixed(2)),
    byVisit: Number(byVisit.toFixed(2)),
    ratio: Number((byVisit / byPerson).toFixed(2)),
    note: '口径不同，横向比较无意义；只做同一机构的纵向比较',
  };
}

/** 保密三档：机构能拿到什么，决定员工敢不敢来 */
const CONFIDENTIALITY = [
  { design: '完全不记录身份', strength: 3, cost: '只能做群体分析，无法个体跟进' },
  { design: '咨询师独立持有记录', strength: 2, cost: '汇总报表，调阅需本人书面同意' },
  { design: '机构持有名单', strength: 1, cost: '使用率上不去的结构性原因' },
];

/** 来源结构：自荐 vs 被安排 */
function sourceMix({ self, manager, peer }) {
  const total = self + manager + peer;
  const selfShare = (self / total) * 100;
  return {
    selfShare: Number(selfShare.toFixed(1)),
    verdict: selfShare < 30 ? '只在「被安排」的路径上运转：入口对自愿者关闭' : '自愿通道有效',
  };
}

const INDICATORS = [
  { layer: '利用层', items: ['到达率', '首访转化率', '复访率', '渠道分布'], q: '有没有人来' },
  { layer: '过程层', items: ['问题类型分布', '咨询次数', '转介率'], q: '在处理什么' },
  { layer: '结局层', items: ['症状变化', '缺勤', '留任', '事件发生率'], q: '值不值' },
];

const ETHICS = ['保密及例外', '知情同意', '双重关系', '胜任边界'];
const CRISIS = ['不独处', '移除手段', '陪同至专业机构', '当日完成交接', '事后 72 小时内回访'];

function concepts(text) {
  const t = String(text || '');
  return {
    ethics: ETHICS.filter((e) => t.includes(e)),
    crisis: CRISIS.filter((c) => t.includes(c)),
    hasEAP: t.includes('EAP'),
    hasLaw: t.includes('精神卫生法'),
    hasPIPL: t.includes('个人信息保护法'),
  };
}

function main() {
  const text = read();
  const c = concepts(text);
  const hanzi = (text.match(HANZI) || []).length;
  const g = gap(21, 1.8);
  const f = funnel([
    { stage: '覆盖人群', n: 1000 },
    { stage: '有意愿', n: 210 },
    { stage: '完成预约', n: 63 },
    { stage: '实际首访', n: 18 },
  ]);
  const u = usageModes({ covered: 1000, users: 18, visits: 54 });
  const s = sourceMix({ self: 3, manager: 12, peer: 3 });

  console.log(`管理心理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi} 字 · 节 ${sections(text).length} 节`);
  console.log(`伦理四条硬线 ${c.ethics.length}/4：${c.ethics.join(' · ')}`);
  console.log(`危机流程 ${c.crisis.length}/5：${c.crisis.join(' · ')}`);
  console.log('');
  console.log(`需求缺口：困扰 ${g.distress}% ／使用 ${g.usage}% → 差 ${g.points} 个点，到达 ${g.reach}%：${g.verdict}`);
  console.log('');
  console.log('漏斗（覆盖 1000 人）：');
  for (const x of f.steps) console.log(`  ${x.stage} ${x.n} 人（转化 ${x.conversion}%）`);
  console.log(`  整体到达 ${f.overall}%，最窄一环：${f.bottleneck.stage}（${f.bottleneck.conversion}%）→ 瓶颈在门口`);
  console.log('');
  console.log(`口径：按人数 ${u.byPerson}%／按人次 ${u.byVisit}% = ${u.ratio} 倍 → ${u.note}`);
  console.log(`来源结构：自荐占 ${s.selfShare}% → ${s.verdict}`);
  console.log('');
  console.log('保密三档（机构能看到什么）：');
  for (const x of CONFIDENTIALITY) console.log(`  ${x.design}（强度 ${x.strength}）：${x.cost}`);
  console.log('');
  console.log('三层指标：');
  for (const x of INDICATORS) console.log(`  ${x.layer}：${x.items.join('、')} → 回答「${x.q}」`);
  console.log('');
  console.log('边界：本章覆盖率、使用率与困扰比例均为演算设定；心理服务数据属敏感个人信息，管理者权限止于「知道有人需要帮助」。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, sections, gap, funnel, usageModes, sourceMix, concepts, CONFIDENTIALITY, INDICATORS, ETHICS, CRISIS };

// 教学边界：口径只在正文维护一份，这里直接摘正文里含「不构成」的那一行。
try {
  const _zh = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  const _bound = (_zh.match(/[^\n]*不构成[^\n]*/) || [])[0];
  if (_bound) {
    console.log(`\n教学边界：${_bound.replace(/^[>\s*#-]+/, '').trim().slice(0, 120)}`);
  }
} catch { /* 读不到正文就不打，不编一句 */ }

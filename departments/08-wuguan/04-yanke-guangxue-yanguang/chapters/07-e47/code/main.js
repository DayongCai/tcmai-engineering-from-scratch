#!/usr/bin/env node
/**
 * 眼科光学验光 · 第 7 章 屈光手术与边界：这一章教的是什么时候不做
 * 正文: departments/08-wuguan/04-yanke-guangxue-yanguang/chapters/07-e47/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 做法：把正文的三张清单（绝对禁忌、可等条件、转诊方向）与三条腿解析成结构，
 * 再写成一个只输出「做 / 等 / 不做」的判定器——判定顺序就是本章的判据顺序：
 * 先看有没有一条绝对禁忌，再看有没有可以等掉的条件，最后才看三条腿是否同时立住。
 * 另外核算正文那笔「时间账」：二十几岁做，四十几岁承担。
 * 解析出来的清单条目数还要与正文自己说的「七条」「四句话」「三类」对照。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 7;
const TITLE = '屈光手术与边界：这一章教的是什么时候不做';
const CN = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function grab(text, re, label) {
  const m = String(text).match(re);
  if (!m) throw new Error(`正文里找不到${label}：${re}`);
  return Number(String(m[1]).replace(/[−–—]/g, '-').replace(/[^\d.\-]/g, ''));
}

function cnToNum(raw) {
  const s = String(raw).replace(/几/g, '');
  if (/^\d+(?:\.\d+)?$/.test(s)) return Number(s);
  if (CN[s] !== undefined) return CN[s];
  const i = s.indexOf('十');
  if (i === -1) throw new Error('不认识的汉字数字：' + raw);
  const tens = i === 0 ? 1 : CN[s.slice(0, i)];
  const ones = i === s.length - 1 ? 0 : CN[s.slice(i + 1)];
  return tens * 10 + ones;
}

function grabCn(text, re, label) {
  const m = String(text).match(re);
  if (!m) throw new Error(`正文里找不到${label}：${re}`);
  return cnToNum(m[1]);
}

/** 把「甲、乙、丙。」这样一句切成条目。 */
function splitList(sentence) {
  return String(sentence)
    .split(/[、，]/)
    .map((s) => s.replace(/[。；]$/, '').trim())
    .filter(Boolean);
}

/**
 * 判定器：顺序固定——绝对禁忌 → 可等条件 → 三条腿。
 * legs = { stable, bcvaGood, needClear }，都取 true 才算立住。
 */
function decide({ age, abs = [], wait = [], legs }) {
  if (age < 18 || abs.includes('未成年')) return { verdict: '不做', why: '未成年：眼轴仍在变化，第一条腿不成立' };
  if (abs.length) return { verdict: '不做', why: `绝对禁忌：${abs.join('、')}` };
  if (wait.length) return { verdict: '等', why: `现在不能做：${wait.join('、')}` };
  const missing = ['stable', 'bcvaGood', 'needClear'].filter((k) => !legs[k]);
  if (missing.length) return { verdict: '不做', why: `三条腿缺 ${missing.join('、')}` };
  return { verdict: '做', why: '三条腿同时立住' };
}

function compute(text) {
  const absBlock = (text.match(/不做。\*\*\s*([^。]+)。七条中/) || [])[1] || '';
  const waitBlock = (text.match(/等。\*\*\s*([^。]+)。这些不是/) || [])[1] || '';
  const transferBlock = (text.match(/转。\*\*\s*([^。]+)。转诊不是/) || [])[1] || '';
  const absolute = splitList(absBlock);
  const waiting = splitList(waitBlock);
  const transfers = String(transferBlock).split('；').map((s) => s.replace(/。$/, '').trim()).filter(Boolean);
  const legs = (text.match(/\*\*第[一二三]条腿/g) || []).length;
  const riskClasses = (text.match(/\*\*第[一二三]类/g) || []).length;
  const sentences = (text.match(/\*\*[一二三四]、/g) || []).length;
  const surgeryAge = grabCn(text, /一台(二十)几岁做的手术/, '手术年龄区间（汉字）');
  const decadesAfter = grabCn(text, /账单在(二十)年后/, '账单年数（汉字）');

  return { absolute, waiting, transfers, legs, riskClasses, sentences, surgeryAge, decadesAfter };
}

function verify(r) {
  const bad = [];
  if (r.absolute.length !== 7) bad.push(`绝对禁忌解析出 ${r.absolute.length} 条，正文称七条：${r.absolute.join('、')}`);
  if (r.waiting.length !== 5) bad.push(`可等条件解析出 ${r.waiting.length} 条，正文列五项：${r.waiting.join('、')}`);
  if (r.transfers.length !== 5) bad.push(`转诊方向解析出 ${r.transfers.length} 条：${r.transfers.join('；')}`);
  if (r.legs !== 3) bad.push(`三条腿解析出 ${r.legs} 条`);
  if (r.riskClasses !== 3) bad.push(`风险分类解析出 ${r.riskClasses} 类`);
  if (r.sentences !== 4) bad.push(`术前谈话解析出 ${r.sentences} 句`);
  // 判定器：顺序不可颠倒
  const ok = { age: 28, legs: { stable: true, bcvaGood: true, needClear: true } };
  const d1 = decide(ok);
  if (d1.verdict !== '做') bad.push('全条件满足却判成不做');
  const d2 = decide(Object.assign({}, ok, { wait: ['干眼未控制'] }));
  if (d2.verdict !== '等') bad.push('有可等条件却未判「等」');
  const d3 = decide(Object.assign({}, ok, { wait: ['干眼未控制'], abs: ['角膜地形图异常'] }));
  if (d3.verdict !== '不做') bad.push('绝对禁忌应压过可等条件');
  const d4 = decide(Object.assign({}, ok, { age: 17 }));
  if (d4.verdict !== '不做') bad.push('未成年应判不做');
  const d5 = decide(Object.assign({}, ok, { legs: { stable: false, bcvaGood: true, needClear: true } }));
  if (d5.verdict !== '不做') bad.push('三条腿缺一条应判不做');
  if (bad.length) throw new Error('正文与解析不自洽：\n  - ' + bad.join('\n  - '));
  return true;
}

function main() {
  const r = compute(read());
  verify(r);
  const cost = r.surgeryAge + r.decadesAfter;
  console.log(`眼科光学验光 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（清单与条文从正文解析；判定顺序即本章的判据顺序）');
  console.log('');
  console.log(`时间账  二十几岁（按 ${r.surgeryAge} 岁计）做的手术，${r.decadesAfter} 年后 ${cost} 岁——四十几岁，光学后果由同一个人承担`);
  console.log('');
  console.log(`三条腿 ${r.legs} 条：稳定 · 最佳矫正视力良好 · 需求明确（缺一条就站不住）`);
  console.log(`绝对禁忌 ${r.absolute.length} 条：${r.absolute.join('、')}`);
  console.log(`可等条件 ${r.waiting.length} 条：${r.waiting.join('、')}`);
  console.log(`转诊方向 ${r.transfers.length} 条：${r.transfers.join('；')}`);
  console.log(`风险按性质 ${r.riskClasses} 类；术前谈话 ${r.sentences} 句，每句都要患者复述`);
  console.log('');
  const cases = [
    { name: '条件齐备的成人', q: { age: 28, legs: { stable: true, bcvaGood: true, needClear: true } } },
    { name: '干眼未控制', q: { age: 28, wait: ['干眼未控制'], legs: { stable: true, bcvaGood: true, needClear: true } } },
    { name: '地形图可疑', q: { age: 28, abs: ['角膜地形图异常'], legs: { stable: true, bcvaGood: true, needClear: true } } },
    { name: '未成年', q: { age: 17, legs: { stable: true, bcvaGood: true, needClear: true } } },
    { name: '只有一次验光记录', q: { age: 28, legs: { stable: false, bcvaGood: true, needClear: true } } }
  ];
  console.log('判定器跑五个合成个例：');
  for (const c of cases) {
    const v = decide(c.q);
    console.log(`  ${c.name.padEnd(12, '　')} → ${v.verdict}（${v.why}）`);
  }
  console.log('');
  console.log('※ 清单、条文与时间账均取自本章 docs/zh.md；本章不给手术参数、角膜厚度阈值与停药时长。');
  console.log('※ 个例均为合成说明，不构成手术建议；适应证与术式选择须由具备资质的眼科医师决定。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE,
  read, grab, splitList, decide, compute, verify
};

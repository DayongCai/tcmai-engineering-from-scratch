#!/usr/bin/env node
/**
 * 中医健康管理 · 第 8 章 这一个领域，红线要比方法先讲
 * 课程: departments/06-guanli/24-zhongyi-jiankang-guanli/chapters/08-j8/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的清单——五志的气机方向、移情四类动作、社会支持三件事、转介触发条件、
 * 睡眠卫生方向、隐私三条底线——全部从正文读出；开头那组数字也现算：5 例延误分两类，
 * 3 + 2 必须回到 5，占全年人次的比例由脚本算，不手打。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 8;
const TITLE = '这一个领域，红线要比方法先讲';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function hanzi(text) {
  return (String(text || '').match(HANZI) || []).length;
}

function sections(body) {
  const out = [];
  let cur = { title: '', lines: [], hanzi: 0 };
  for (const line of body.split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      cur = { title: h[1], lines: [], hanzi: 0 };
      out.push(cur);
      continue;
    }
    cur.lines.push(line);
    cur.hanzi += hanzi(line);
  }
  return out;
}

function sectionText(body, prefix) {
  const s = sections(body).find((x) => x.title.startsWith(prefix));
  if (!s) throw new Error('正文里没有以「' + prefix + '」开头的一节');
  return s.lines.join('\n');
}

function splitTop(str, sep = '、') {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of String(str)) {
    if (ch === '（' || ch === '(') depth += 1;
    if (ch === '）' || ch === ')') depth = Math.max(0, depth - 1);
    if (ch === sep && depth === 0) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter(Boolean);
}

/** 五志的气机表述（六句，含「惊」）。 */
function qiMoves(body) {
  return [...new Set([...body.matchAll(/([怒喜悲恐惊思])则气([上缓消下乱结])/g)].map((m) => m[0]))];
}

/** 第二节：移情易性的四类动作。 */
function shiftActs(body) {
  return [...sectionText(body, '二、').matchAll(/^\*\*(转移|节律|表达|呼吸)。\*\*/gm)].map((m) => m[1]);
}

/** 第三节：社会支持三件事。 */
function supportActs(body) {
  return [...sectionText(body, '三、').matchAll(/^\*\*([^*\n]{4,8})。\*\*/gm)].map((m) => m[1].trim());
}

/** 第四节：转介触发条件（条目式）。 */
function referralTriggers(body) {
  return sectionText(body, '四、')
    .split('\n')
    .filter((l) => /^-\s+/.test(l.trim()))
    .map((l) => l.replace(/^-\s+/, '').replace(/\*\*/g, '').replace(/[；。].*$/, '').trim());
}

/** 第四节：睡眠卫生方向。 */
function sleepDirections(body) {
  const m = sectionText(body, '四、').match(/可讲的方向有几个：([^。]+)。/);
  if (!m) throw new Error('正文里没有「可讲的方向有几个：」这句');
  return splitTop(m[1]);
}

/** 第五节：隐私三条底线。 */
function privacyLines(body) {
  return [...sectionText(body, '五、').matchAll(/^\*\*([^*\n]{2,6})。\*\*/gm)].map((m) => m[1].trim());
}

/** 开头数字现算：延误例数按两类相加，占比对全年人次。 */
function delayMath(body) {
  const visits = Number((body.match(/一年服务\s*(\d+)\s*人次/) || [])[1]);
  const total = Number((body.match(/发现有\s*(\d+)\s*例本应更早/) || [])[1]);
  const mood = Number((body.match(/(\d+)\s*例持续两周以上情绪显著低落/) || [])[1]);
  const apnea = Number((body.match(/(\d+)\s*例夜间打鼾伴憋醒/) || [])[1]);
  const months = Number((body.match(/平均延误约([一二三四五六\d]+)个月/) || [])[1].replace(/[一二三四五六]/g, (c) => '一二三四五六'.indexOf(c) + 1));
  if (!visits || !total || !mood || !apnea) throw new Error('正文里没有完整的例数与人次');
  return { visits, total, mood, apnea, months, share: Number(((total / visits) * 100).toFixed(2)) };
}

function audit(body) {
  const qi = qiMoves(body);
  const shift = shiftActs(body);
  const support = supportActs(body);
  const triggers = referralTriggers(body);
  const sleep = sleepDirections(body);
  const privacy = privacyLines(body);
  const math = delayMath(body);

  const claims = [
    { label: '五志六句', want: 6, got: qi.length },
    { label: '移情四类', want: 4, got: shift.length },
    { label: '支持三件事', want: 3, got: support.length },
    { label: '转介触发六条', want: 6, got: triggers.length },
    { label: '睡眠卫生七向', want: 7, got: sleep.length },
    { label: '隐私三条底线', want: 3, got: privacy.length },
    { label: '两类例数相加', want: math.total, got: math.mood + math.apnea },
  ];
  const mismatched = claims.filter((c) => c.want !== c.got).map((c) => c.label);
  return { qi, shift, support, triggers, sleep, privacy, math, claims, mismatched };
}

function main() {
  const body = read();
  const a = audit(body);
  const secs = sections(body).filter((s) => s.title);
  const cites = [...new Set([...body.matchAll(/《([^》\n]+)》/g)].map((m) => m[1]))];

  console.log(`中医健康管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下条数、例数与汉字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi(body)} 字 · 节 ${secs.length} 节 · 引书 ${cites.length} 部`);
  console.log('');
  console.log(`五志的气机方向（${a.qi.length} 句，读作方向而非标签）：${a.qi.join('、')}`);
  console.log(`移情易性 ${a.shift.length} 类动作：${a.shift.join('／')}（共同点：不要求改变想法）`);
  console.log(`社会支持 ${a.support.length} 件事：${a.support.join('／')}`);
  console.log('');
  console.log(`转介触发条件 ${a.triggers.length} 条：`);
  for (const t of a.triggers) console.log(`  - ${t}`);
  console.log(`睡眠卫生方向 ${a.sleep.length} 项：${a.sleep.map((s) => s.split('（')[0]).join('／')}`);
  console.log(`隐私底线 ${a.privacy.length} 条：${a.privacy.join('／')}`);
  console.log('');
  const m = a.math;
  console.log(`延误复算：${m.mood} 例情志 + ${m.apnea} 例睡眠呼吸 = ${m.mood + m.apnea} 例（文中 ${m.total} 例），` +
    `占全年 ${m.visits} 人次的 ${m.share}%，平均延误 ${m.months} 个月。`);
  console.log(`  按比例看是少数，按后果看是红线：这几例本该更早进入医疗路径。`);
  console.log('');
  console.log(`条数对账：${a.mismatched.length ? '不一致，须改稿 —— ' + a.mismatched.join('、') : '一致'}`);
  console.log('');
  console.log('→ 判据：方法用错最多无效，红线漏掉可能致命；先立转介条件，再谈调摄。');
  console.log('※ 条数、例数与汉字均从本章 docs/zh.md 现算，正文一改即随之变化；本输出仅用于教学演示，不构成诊疗意见或心理治疗建议。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, read, hanzi, sections, sectionText, splitTop,
  qiMoves, shiftActs, supportActs, referralTriggers, sleepDirections, privacyLines, delayMath, audit,
};

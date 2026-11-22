#!/usr/bin/env node
/**
 * 健康服务管理 · 第 1 章 供给主体的分界，在能承担什么责任，不在挂了什么牌子
 * 课程: departments/06-guanli/08-jiankang-fuwu-guanli/chapters/01-z81/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 输出全部从本章正文现算：汉字、节、加粗判断、引文，以及正文里那几处「几个东西」的
 * 清单——五类服务、四个硬指标、四样越界形态、三问。清单的条数由正文自己数出来，
 * 再与句子里写的中文数字对账；正文改了条数而没改数字，脚本会报不一致。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 1;
const TITLE = '供给主体的分界，在能承担什么责任，不在挂了什么牌子';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const NUM = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function hanzi(text) {
  return (String(text || '').match(HANZI) || []).length;
}

/** 一级节（## 开头）与其下的汉字数。 */
function sections(body) {
  const out = [];
  let cur = null;
  for (const line of body.split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      cur = { title: h[1], hanzi: 0 };
      out.push(cur);
      continue;
    }
    if (cur) cur.hanzi += hanzi(line);
  }
  return out;
}

/** 取「标签：……」这一段，到第一个句号为止。 */
function clauseAfter(body, label) {
  const i = body.indexOf(label + '：');
  if (i < 0) throw new Error('正文里没找到「' + label + '：」');
  const rest = body.slice(i + label.length + 1);
  const j = rest.indexOf('。');
  return (j < 0 ? rest : rest.slice(0, j)).trim();
}

function splitList(str, re = /[、，]/) {
  return String(str)
    .replace(/以及/g, '、')
    .split(re)
    .map((s) => s.trim())
    .filter(Boolean);
}

function cn2num(w) {
  if (w === '十二') return 12;
  if (w.length === 2 && w[0] === '十') return 10 + NUM[w[1]];
  const n = NUM[w];
  return n === undefined ? NaN : n;
}

function audit(body) {
  const services = splitList(clauseAfter(body, '它至少包含五类服务'));
  const criteria = splitList(clauseAfter(body, '四个硬指标'));
  const questions = clauseAfter(body, '最快的办法是问三个问题')
    .split('？')
    .filter(Boolean)
    .slice(0, 3);
  const overreach = splitList(clauseAfter(body, '越界的形态很固定'), /，/);

  const counts = {
    services: services.length,
    criteria: criteria.length,
    questions: questions.length,
    overreach: overreach.length,
  };

  // 条数与句子里写的数字对账
  const claims = [
    { label: '五类服务', want: cn2num('五'), got: counts.services },
    { label: '四个硬指标', want: cn2num('四'), got: counts.criteria },
    { label: '三个问题', want: cn2num('三'), got: counts.questions },
    { label: '四种越界形态', want: 4, got: counts.overreach },
  ];
  const mismatched = claims.filter((c) => c.want !== c.got).map((c) => c.label);

  return { services, criteria, questions, overreach, counts, claims, mismatched };
}

function main() {
  const body = read();
  const a = audit(body);
  const secs = sections(body);
  const cites = [...new Set([...body.matchAll(/《([^》\n]+)》/g)].map((m) => m[1]))];
  const claims = (body.match(/\*\*[^*\n]+\*\*/g) || []).length;

  console.log(`健康服务管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi(body)} 字 · 节 ${secs.length} 节 · 加粗判断 ${claims} 处 · 引书 ${cites.length} 部`);
  console.log('');
  console.log('分界清单（条数由正文数出，与句中的中文数字对账）：');
  console.log(`  五类服务 ${a.counts.services} 条：${a.services.join('／')}`);
  console.log(`  四个硬指标 ${a.counts.criteria} 条：${a.criteria.join('；')}`);
  console.log(`  四样越界形态 ${a.counts.overreach} 条：${a.overreach.join('；')}`);
  console.log(`  三问 ${a.counts.questions} 条：${a.questions.join('？')}？`);
  console.log(`  → 对账${a.mismatched.length ? '不一致，须改稿：' + a.mismatched.join('、') : '一致'}`);
  console.log('');
  console.log('逐节字数：');
  for (const s of secs) {
    const share = hanzi(body) ? ((s.hanzi / hanzi(body)) * 100).toFixed(1) : '0.0';
    console.log(`  ${s.title.padEnd(24, '　')} ${String(s.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log('→ 判据：一个主体属于哪一类，决定它受哪部规章约束、能不能进医保、出事按什么责任赔。');
  console.log('※ 数字均从本章 docs/zh.md 现算，正文一改即随之变化；本输出仅用于教学演示，不构成对具体业态的合法性判断，也不构成医疗、法律或投资意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, hanzi, sections, clauseAfter, splitList, cn2num, audit };

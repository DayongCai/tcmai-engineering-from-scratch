#!/usr/bin/env node
/**
 * 中医健康管理 · 第 11 章 流程的价值不在每步留痕，在下一步不必重新问一遍
 * 课程: departments/06-guanli/24-zhongyi-jiankang-guanli/chapters/11-j11/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 六个节点、初筛三问、评估三层、确认三件事、记录五项、退化四形态，全部从正文读出；
 * 开头的表单数与节点数现算：十一张表单对六个节点，多出来的那几张就是「同一信息采集三次」的位置。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 11;
const TITLE = '流程的价值不在每步留痕，在下一步不必重新问一遍';
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

const CN = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

/** 中文数字：十一 → 11，二十 → 20，单字按表。 */
function cn2num(w) {
  const t = String(w).trim();
  if (t.length === 1) return CN[t];
  if (t[0] === '十') return 10 + (CN[t[1]] || 0);
  if (t[1] === '十') return CN[t[0]] * 10 + (CN[t[2]] || 0);
  return NaN;
}

function cells(line) {
  return line.split('|').map((c) => c.trim()).filter(Boolean);
}
const isSep = (line) => /^\|[\s|:-]+\|?$/.test(line.trim());

/** 第一节：六节点与其交付物、判别标准。 */
function nodes(body) {
  const lines = sectionText(body, '一、')
    .split('\n')
    .filter((l) => l.trim().startsWith('|') && !isSep(l));
  return lines.slice(1).map((l) => {
    const c = cells(l);
    return { node: c[0], deliverable: c[1], test: c[2] };
  });
}

/** 第二节：初筛三问。 */
function screening(body) {
  return [...sectionText(body, '二、').matchAll(/\*\*([^*\n]+？)\*\*/g)].map((m) => m[1].trim());
}

/** 第三节：评估产出三层。 */
function evalLayers(body) {
  return [...sectionText(body, '三、').matchAll(/\*\*(状态描述|分层结论|可复评的锚点)\*\*/g)].map((m) => m[1]);
}

/** 第三节：确认要做三件事。 */
function confirmSteps(body) {
  return [...sectionText(body, '三、').matchAll(/第[一二三]，([^：，。]{2,6})：/g)].map((m) => m[1].trim());
}

/** 第四节：执行记录最小集五项。 */
function recordSet(body) {
  return [...sectionText(body, '四、').matchAll(/\*\*(做了什么|没做成什么|对象的反馈|异常与处置|下一轮的调整方向)\*\*/g)].map((m) => m[1]);
}

/** 第五节：流程退化的四形态。 */
function degradations(body) {
  return [...sectionText(body, '五、').matchAll(/^\*\*(表单化|空心化|越界化|断点化)。\*\*/gm)].map((m) => m[1]);
}

/** 开头现算：表单数对节点数，多出的张数即重复采集的位置。 */
function formMath(body) {
  const forms = cn2num((body.match(/拆成\s*([一二三四五六七八九十\d]+)\s*张表单/) || [])[1]);
  const complete = Number((body.match(/表单完整率\s*(\d+)%/) || [])[1]);
  const lost = Number((body.match(/(\d+)%\s*在三个月后说不出自己的方案改了哪一条/) || [])[1]);
  if (!forms || !complete || !lost) throw new Error('正文里没有完整的表单数与比例');
  return { forms, complete, lost };
}

function audit(body) {
  const nd = nodes(body);
  const scr = screening(body);
  const evals = evalLayers(body);
  const conf = confirmSteps(body);
  const rec = recordSet(body);
  const degr = degradations(body);
  const math = formMath(body);

  const claims = [
    { label: '六节点', want: 6, got: nd.length },
    { label: '初筛三问', want: 3, got: scr.length },
    { label: '评估三层', want: 3, got: evals.length },
    { label: '确认三事', want: 3, got: conf.length },
    { label: '记录五项', want: 5, got: rec.length },
    { label: '退化四形态', want: 4, got: degr.length },
    { label: '表单比节点多五张', want: 5, got: math.forms - nd.length },
  ];
  const mismatched = claims.filter((c) => c.want !== c.got).map((c) => c.label);
  return { nd, scr, evals, conf, rec, degr, math, claims, mismatched };
}

function main() {
  const body = read();
  const a = audit(body);
  const secs = sections(body).filter((s) => s.title);
  const cites = [...new Set([...body.matchAll(/《([^》\n]+)》/g)].map((m) => m[1]))];

  console.log(`中医健康管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下条数、张数与汉字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi(body)} 字 · 节 ${secs.length} 节 · 引书 ${cites.length} 部`);
  console.log('');
  console.log(`六节点与各自交付物：`);
  a.nd.forEach((n, i) => console.log(`  ${i + 1}. ${n.node} → ${n.deliverable}（判据：${n.test}）`));
  console.log(`初筛三问：${a.scr.join(' ')}`);
  console.log(`评估三层：${a.evals.join('／')}（第三层最常被漏）`);
  console.log(`确认三件事：${a.conf.join('／')}`);
  console.log(`执行记录最小集：${a.rec.join('／')}`);
  console.log(`退化四形态：${a.degr.join('／')}`);
  console.log('');
  const m = a.math;
  console.log(`表单复算：${m.forms} 张表单对 ${a.nd.length} 个节点，多出 ${m.forms - a.nd.length} 张；` +
    `完整率 ${m.complete}%，而 ${m.lost}% 说不出方案改过哪一条。`);
  console.log(`  表填满了，信息没走通——多出的那几张正是同一信息被采集多次的位置。`);
  console.log('');
  console.log(`条数对账：${a.mismatched.length ? '不一致，须改稿 —— ' + a.mismatched.join('、') : '一致'}`);
  console.log('');
  console.log('→ 判据：每一环都要交出一样东西；交不出来，下一环只能重问，流程就退化成表。');
  console.log('※ 条数、张数与汉字均从本章 docs/zh.md 现算，正文一改即随之变化；本输出仅用于教学演示，不构成诊疗意见或管理认证依据。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, read, hanzi, sections, sectionText,
  cn2num, nodes, screening, evalLayers, confirmSteps, recordSet, degradations, formMath, audit,
};

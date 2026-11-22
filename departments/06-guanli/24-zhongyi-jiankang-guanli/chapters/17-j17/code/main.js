#!/usr/bin/env node
/**
 * 中医健康管理 · 第 17 章 数据能告诉你发生了什么，不能告诉你是不是你干的
 * 课程: departments/06-guanli/24-zhongyi-jiankang-guanli/chapters/17-j17/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 四个问题、四种偏差、四道门、案例五段、三层报法、伦理三让，全部从正文读出；
 * 开头那组对照现算：71 对 38 的差距、分层后 71 对 58 的残差，以及被基线解释掉的比例，
 * 都由脚本算，不手打。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 17;
const TITLE = '数据能告诉你发生了什么，不能告诉你是不是你干的';
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

/** 第一节：四个问题。 */
function questions(body) {
  return [...sectionText(body, '一、').matchAll(/^\*\*([^*\n]+？)\*\*/gm)].map((m) => m[1].trim());
}

/** 第二节：四种偏差。 */
function biases(body) {
  return [...sectionText(body, '二、').matchAll(/^\*\*(选择偏差|失访偏差|时间偏差|测量偏差)。\*\*/gm)].map((m) => m[1]);
}

/** 第三节：三层报法。 */
function reportLayers(body) {
  const m = sectionText(body, '三、').match(/三层分开报：(.+)/);
  if (!m) throw new Error('正文里没有「三层分开报：」这句');
  return [...m[1].matchAll(/\*\*([^*]+)\*\*/g)].map((x) => x[1]).slice(0, 3);
}

/** 第四节：四道门。 */
function gates(body) {
  return [...sectionText(body, '四、').matchAll(/^\*\*(可复制|可承受|可嵌入|可维持)。\*\*/gm)].map((m) => m[1]);
}

/** 第四节：案例记录五段。 */
function caseParts(body) {
  const m = sectionText(body, '四、').match(/应当包含五段：(.+)/);
  if (!m) throw new Error('正文里没有「应当包含五段：」这句');
  return [...m[1].matchAll(/\*\*([^*]+)\*\*/g)].map((x) => x[1]).slice(0, 5);
}

/** 第五节：伦理三条实质要求。 */
function ethics(body) {
  return [...sectionText(body, '五、').matchAll(/^\*\*(知情同意要真的知情|数据使用要限定目的|结论要不夸大)。\*\*/gm)].map((m) => m[1]);
}

/** 开头对照复算：差距有多少被基线解释掉。 */
function gapMath(body) {
  const files = Number((body.match(/三年\s*([\d,]+)\s*份档案/) || [])[1].replace(/,/g, ''));
  const a = Number((body.match(/状态改善率\s*(\d+)%/) || [])[1]);
  const b = Number((body.match(/未完成的人，(\d+)%/) || [])[1]);
  const better = Number((body.match(/基线本就较好者占\s*(\d+)%/) || [])[1]);
  const post = body.match(/收窄到\s*(\d+)%\s*对\s*(\d+)%/);
  if (!files || !a || !b || !better || !post) throw new Error('正文里没有完整的对照数字');
  const crude = a - b;
  const adjusted = Number(post[1]) - Number(post[2]);
  return {
    files, a, b, better, crude, adjusted,
    explained: Number((((crude - adjusted) / crude) * 100).toFixed(1)),
  };
}

function audit(body) {
  const qs = questions(body);
  const bs = biases(body);
  const rl = reportLayers(body);
  const gt = gates(body);
  const cp = caseParts(body);
  const eth = ethics(body);
  const math = gapMath(body);

  const claims = [
    { label: '四个问题', want: 4, got: qs.length },
    { label: '四种偏差', want: 4, got: bs.length },
    { label: '三层报法', want: 3, got: rl.length },
    { label: '四道门', want: 4, got: gt.length },
    { label: '案例五段', want: 5, got: cp.length },
    { label: '伦理三条', want: 3, got: eth.length },
  ];
  const mismatched = claims.filter((c) => c.want !== c.got).map((c) => c.label);
  return { qs, bs, rl, gt, cp, eth, math, claims, mismatched };
}

function main() {
  const body = read();
  const a = audit(body);
  const secs = sections(body).filter((s) => s.title);
  const cites = [...new Set([...body.matchAll(/《([^》\n]+)》/g)].map((m) => m[1]))];

  console.log(`中医健康管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下条数、差距与汉字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi(body)} 字 · 节 ${secs.length} 节 · 引书 ${cites.length} 部`);
  console.log('');
  console.log(`四个问题与各自的证据：${a.qs.join(' ')}`);
  console.log(`四种偏差：${a.bs.join('／')}（共同解法：把基线说清楚）`);
  console.log(`三层分开报：${a.rl.join('／')}；终点指标若有则单列，并说明不能归因于本服务。`);
  console.log(`四道门：${a.gt.join(' → ')}（顺序不能颠倒）`);
  console.log(`案例五段：${a.cp.join('／')}`);
  console.log(`伦理三让：${a.eth.join('／')}`);
  console.log('');
  const m = a.math;
  console.log(`归因复算：${m.files} 份档案，粗差距 ${m.a}% − ${m.b}% = ${m.crude} 个百分点；` +
    `按基线分层后收窄到 ${m.a}% 对 ${m.a - m.adjusted}%（残差 ${m.adjusted} 点）。`);
  console.log(`  即 ${m.explained}% 的差距由「谁更可能来」解释（完成者中基线较好者占 ${m.better}%）。`);
  console.log(`  剩下的 ${m.adjusted} 点才是随访可能带来的部分——它仍然只是相关，不是因果。`);
  console.log('');
  console.log(`条数对账：${a.mismatched.length ? '不一致，须改稿 —— ' + a.mismatched.join('、') : '一致'}`);
  console.log('');
  console.log('→ 判据：没有基线、没有对照、没有过程数据的「有效」，只是一句无法被检验的话。');
  console.log('※ 条数、差距与汉字均从本章 docs/zh.md 现算，正文一改即随之变化；本输出仅用于教学演示，不构成科研方法学指南或诊疗意见。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, read, hanzi, sections, sectionText,
  questions, biases, reportLayers, gates, caseParts, ethics, gapMath, audit,
};

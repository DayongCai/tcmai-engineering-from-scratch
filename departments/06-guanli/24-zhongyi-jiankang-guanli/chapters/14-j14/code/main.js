#!/usr/bin/env node
/**
 * 中医健康管理 · 第 14 章 协作的难点不是请不到专家，是没人对整个的人负责
 * 课程: departments/06-guanli/24-zhongyi-jiankang-guanli/chapters/14-j14/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 主责三职责、转介三形态、四类接口、三种角色、三样最小配置、质量两件事，全部从正文读出；
 * 开头的转介与回传数字现算：380 人次里回传 41 份、23 人回流，比例由脚本算，不手打。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 14;
const TITLE = '协作的难点不是请不到专家，是没人对整个的人负责';
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

/** 第一节：主责的三条职责。 */
function duties(body) {
  const m = sectionText(body, '一、').match(/主责的职责有三条：([^。]+)。/);
  if (!m) throw new Error('正文里没有「主责的职责有三条」这句');
  return m[1].split('；').map((s) => s.trim()).filter(Boolean);
}

/** 第二节：双向转介的三种失败形态。 */
function failures(body) {
  return [...sectionText(body, '二、').matchAll(/^\*\*(送出去不回来|回来了不接|转过去没人接)。\*\*/gm)].map((m) => m[1]);
}

/** 第三节：四类服务接口。 */
function interfaces(body) {
  return [...sectionText(body, '三、').matchAll(/^\*\*与([^*\n]+?)。\*\*/gm)].map((m) => m[1]);
}

/** 第四节：三种角色。 */
function roles(body) {
  return [...sectionText(body, '四、').matchAll(/^\*\*(主责|专业提供者|执行与接触者)。\*\*/gm)].map((m) => m[1]);
}

/** 第四节：协作机制的三样最小配置。 */
function configs(body) {
  return [...sectionText(body, '四、').matchAll(/^\*\*(一个共同目标|一份共享记录|一个固定节奏)。\*\*/gm)].map((m) => m[1]);
}

/** 第五节：协作质量的两件事。 */
function quality(body) {
  return [...sectionText(body, '五、').matchAll(/^\*\*(一致|不冲突)。\*\*/gm)].map((m) => m[1]);
}

/** 开头数字现算。 */
function handoffMath(body) {
  const referrals = Number((body.match(/一年转介\s*(\d+)\s*人次/) || [])[1]);
  const back = Number((body.match(/回传给社区的有\s*(\d+)\s*份/) || [])[1]);
  const returned = Number((body.match(/有\s*(\d+)\s*人在三个月内又回到社区/) || [])[1]);
  if (!referrals || !back || !returned) throw new Error('正文里没有完整的转介数字');
  return {
    referrals, back, returned,
    backPct: Number(((back / referrals) * 100).toFixed(1)),
    returnPct: Number(((returned / referrals) * 100).toFixed(1)),
  };
}

function audit(body) {
  const duty = duties(body);
  const fails = failures(body);
  const ifs = interfaces(body);
  const rl = roles(body);
  const cfg = configs(body);
  const q = quality(body);
  const math = handoffMath(body);

  const claims = [
    { label: '主责三职责', want: 3, got: duty.length },
    { label: '转介三形态', want: 3, got: fails.length },
    { label: '四类接口', want: 4, got: ifs.length },
    { label: '三种角色', want: 3, got: rl.length },
    { label: '三样配置', want: 3, got: cfg.length },
    { label: '质量两件事', want: 2, got: q.length },
  ];
  const mismatched = claims.filter((c) => c.want !== c.got).map((c) => c.label);
  return { duty, fails, ifs, rl, cfg, q, math, claims, mismatched };
}

function main() {
  const body = read();
  const a = audit(body);
  const secs = sections(body).filter((s) => s.title);
  const cites = [...new Set([...body.matchAll(/《([^》\n]+)》/g)].map((m) => m[1]))];

  console.log(`中医健康管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下条数、比例与汉字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi(body)} 字 · 节 ${secs.length} 节 · 引书 ${cites.length} 部`);
  console.log('');
  console.log(`主责三职责：${a.duty.join('；')}`);
  console.log(`转介三形态：${a.fails.join('／')}（根源：把交接当成了告知）`);
  console.log(`四类接口：${a.ifs.join('／')}`);
  console.log(`三种角色：${a.rl.join('／')}（不是三种头衔）`);
  console.log(`三样最小配置：${a.cfg.join('／')}`);
  console.log(`质量两件事：${a.q.join('／')}`);
  console.log('');
  const m = a.math;
  console.log(`交接复算：转介 ${m.referrals} 人次，回传 ${m.back} 份（${m.backPct}%），` +
    `${m.returned} 人三个月内回流（占转介 ${m.returnPct}%）。`);
  console.log(`  回传率低的直接后果是：人回来了，记录没回来，社区只能从头问一遍。`);
  console.log('');
  console.log(`条数对账：${a.mismatched.length ? '不一致，须改稿 —— ' + a.mismatched.join('、') : '一致'}`);
  console.log('');
  console.log('→ 判据：协作的第一件事不是组队，是让一个人对整条路径签字。');
  console.log('※ 条数、比例与汉字均从本章 docs/zh.md 现算，正文一改即随之变化；本输出仅用于教学演示，不构成诊疗意见或机构管理规范。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, read, hanzi, sections, sectionText,
  duties, failures, interfaces, roles, configs, quality, handoffMath, audit,
};

#!/usr/bin/env node
/**
 * 中医健康管理 · 第 9 章 起居是最便宜的干预，也是最难维持的干预
 * 课程: departments/06-guanli/24-zhongyi-jiankang-guanli/chapters/09-j9/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 三个变量、季节三通道、环境四层面、组织三方式、观察项、轮班五条规则，全部从正文读出；
 * 开头那组比例现算：120 人里的 38% 是多少人、执行率不到 5% 是多少人，都由脚本算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 9;
const TITLE = '起居是最便宜的干预，也是最难维持的干预';
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

function cells(line) {
  return line.split('|').map((c) => c.trim()).filter(Boolean);
}
const isSep = (line) => /^\|[\s|:-]+\|?$/.test(line.trim());

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

function table(secText) {
  const lines = secText.split('\n').filter((l) => l.trim().startsWith('|') && !isSep(l));
  return { head: cells(lines[0]), rows: lines.slice(1).map(cells) };
}

/** 第一节：时相、时长、稳定性。 */
function variables(body) {
  return [...sectionText(body, '一、').matchAll(/^\*\*(时相|时长|稳定性)。\*\*/gm)].map((m) => m[1]);
}

/** 第二节：光照、温度、活动量。 */
function seasonChannels(body) {
  const m = body.match(/\*\*光照、温度、活动量\*\*/);
  if (!m) throw new Error('正文里没有「光照、温度、活动量」这串');
  return m[0].replace(/\*/g, '').split('、');
}

/** 第三节：环境四层面（可改／不可改／减损方向）。 */
function envLevels(body) {
  return table(sectionText(body, '三、')).rows.map((c) => ({ level: c[0], changeable: c[1], fixed: c[2], mitigate: c[3] }));
}

/** 第五节：三种组织方式。 */
function orgForms(body) {
  return [...sectionText(body, '五、').matchAll(/^\*\*(个体指导|小组活动|单位与社区层面的安排)\*\*/gm)].map((m) => m[1]);
}

/** 第五节：可记录的效果观察项。 */
function observeItems(body) {
  const m = sectionText(body, '五、').match(/可用的有：([^。]+)。/);
  if (!m) throw new Error('正文里没有「可用的有：」这句');
  return splitTop(m[1]);
}

/** 第四节：轮班五条规则。 */
function shiftRules(body) {
  const m = sectionText(body, '四、').match(/通用建议要改写：([^。]+。)/);
  if (!m) throw new Error('正文里没有「通用建议要改写：」这句');
  return splitTop(m[1], '；');
}

/** 开头数字现算：120 人里的 38%，执行率 5%。 */
function shareMath(body) {
  const people = Number((body.match(/第一批\s*(\d+)\s*人里/) || [])[1]);
  const pct = Number((body.match(/(\d+)%\s*是轮班作业/) || [])[1]);
  const exec = Number((body.match(/执行率不到\s*(\d+)%/) || [])[1]);
  if (!people || !pct || !exec) throw new Error('正文里没有完整的人数与比例');
  return {
    people,
    pct,
    exec,
    shiftWorkers: Number(((people * pct) / 100).toFixed(1)),
    keepers: Number(((people * exec) / 100).toFixed(1)),
  };
}

function audit(body) {
  const vars = variables(body);
  const channels = seasonChannels(body);
  const env = envLevels(body);
  const orgs = orgForms(body);
  const observe = observeItems(body);
  const shift = shiftRules(body);
  const share = shareMath(body);

  const claims = [
    { label: '三个变量', want: 3, got: vars.length },
    { label: '季节三通道', want: 3, got: channels.length },
    { label: '环境四层面', want: 4, got: env.length },
    { label: '组织三方式', want: 3, got: orgs.length },
    { label: '观察七项', want: 7, got: observe.length },
    { label: '轮班五规则', want: 5, got: shift.length },
  ];
  const mismatched = claims.filter((c) => c.want !== c.got).map((c) => c.label);
  return { vars, channels, env, orgs, observe, shift, share, claims, mismatched };
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
  console.log(`起居三个变量：${a.vars.join('／')}（时相乱改锚点，时长不足查原因，稳定性差减变量）`);
  console.log(`四时落到三通道：${a.channels.join('／')}`);
  console.log(`环境四层面：${a.env.map((e) => e.level).join('／')}`);
  console.log(`  卧室不可改时：${a.env[0].mitigate}`);
  console.log(`组织三方式：${a.orgs.join('／')}`);
  console.log(`轮班五条：${a.shift.join('；')}`);
  console.log(`观察 ${a.observe.length} 项：${a.observe.join('／')}`);
  console.log('');
  const s = a.share;
  console.log(`比例复算：${s.people} 人 × ${s.pct}% = ${s.shiftWorkers} 人轮班；` +
    `执行率不到 ${s.exec}%，即不足 ${s.keepers} 人。`);
  console.log(`  标准作息建议落在非标准作息人群身上，失效是结构性的，不是态度问题。`);
  console.log('');
  console.log(`条数对账：${a.mismatched.length ? '不一致，须改稿 —— ' + a.mismatched.join('、') : '一致'}`);
  console.log('');
  console.log('→ 判据：起居干预的成本几乎为零，难点全在「改的是一天二十四小时的结构」；先改最小的、最有把握的一项。');
  console.log('※ 条数、比例与汉字均从本章 docs/zh.md 现算，正文一改即随之变化；本输出仅用于教学演示，不构成诊疗意见，也不构成职业健康结论。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, read, hanzi, sections, sectionText, table, splitTop,
  variables, seasonChannels, envLevels, orgForms, observeItems, shiftRules, shareMath, audit,
};

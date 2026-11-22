#!/usr/bin/env node
/**
 * 中医健康管理 · 第 10 章 常见健康问题管理的难点不在病种多，在分段
 * 课程: departments/06-guanli/24-zhongyi-jiankang-guanli/chapters/10-j10/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 四个段落、三问、合并四规则、重点人群三条操作规则、三层服务，全部从正文读出；
 * 开头那组人数与完成率现算：1600 人里的 62% 与 38% 是多少人，完成率掉了几点、
 * 相对掉了多少，都由脚本算，不手打。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 10;
const TITLE = '常见健康问题管理的难点不在病种多，在分段';
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

/** 第一段：四个段落（条目式），以及段落表的两列。 */
function stages(body) {
  const bullets = sectionText(body, '一、')
    .split('\n')
    .filter((l) => /^-\s+/.test(l.trim()))
    .map((l) => l.replace(/^-\s+/, '').replace(/\*\*/g, '').trim());
  return bullets;
}

function stageTable(body) {
  const lines = sectionText(body, '一、')
    .split('\n')
    .filter((l) => l.trim().startsWith('|') && !isSep(l));
  return lines.slice(1).map((l) => {
    const c = cells(l);
    return { stage: c[0], canDo: c[1], stop: c[2] };
  });
}

/** 第一节的三问。 */
function threeQuestions(body) {
  const m = body.match(/靠三个问题，不靠病名：\*\*([^*\n]+)\*\*/);
  if (!m) throw new Error('正文里没有「靠三个问题，不靠病名」这句');
  return m[1].split('？').map((s) => s.replace(/^\*\*|\*\*$/g, '').trim()).filter(Boolean).map((s) => s + '？');
}

/** 第二节：合并四规则（加粗小标题）。 */
function mergeRules(body) {
  return [...sectionText(body, '二、').matchAll(/^\*\*([^*\n]{2,8})。\*\*/gm)].map((m) => m[1].trim());
}

/** 第四节：重点人群共有的三条操作规则。 */
function crowdRules(body) {
  const m = sectionText(body, '四、').match(/三类人群共有的三条操作规则：([^。]+)。/);
  if (!m) throw new Error('正文里没有「三类人群共有的三条操作规则」这句');
  return m[1].split('；').map((s) => s.trim()).filter(Boolean);
}

/** 第五节：三层服务（层／谁／内容／频次／退出条件）。 */
function layers(body) {
  const lines = sectionText(body, '五、')
    .split('\n')
    .filter((l) => l.trim().startsWith('|') && !isSep(l));
  return lines.slice(1).map((l) => {
    const c = cells(l);
    return { layer: c[0], who: c[1], content: c[2], freq: c[3], exit: c[4] };
  });
}

/** 开头数字现算。 */
function loadMath(body) {
  const people = Number((body.match(/一年服务\s*([\d,]+)\s*人/) || [])[1].replace(/,/g, ''));
  const two = Number((body.match(/(\d+)%\s*的人有两项以上健康问题/) || [])[1]);
  const three = Number((body.match(/(\d+)%\s*有三项以上/) || [])[1]);
  const rateA = Number((body.match(/随访完成率却从\s*(\d+)%/) || [])[1]);
  const rateB = Number((body.match(/掉到\s*(\d+)%/) || [])[1]);
  if (!people || !two || !three || !rateA || !rateB) throw new Error('正文里没有完整的人数与比例');
  return {
    people,
    two: Math.round((people * two) / 100),
    three: Math.round((people * three) / 100),
    rateA,
    rateB,
    dropPoints: rateA - rateB,
    dropPct: Number((((rateA - rateB) / rateA) * 100).toFixed(1)),
  };
}

function audit(body) {
  const st = stages(body);
  const sTable = stageTable(body);
  const qs = threeQuestions(body);
  const merge = mergeRules(body);
  const crowd = crowdRules(body);
  const ls = layers(body);
  const load = loadMath(body);

  const claims = [
    { label: '四个段落', want: 4, got: st.length },
    { label: '段落表四行', want: 4, got: sTable.length },
    { label: '三问', want: 3, got: qs.length },
    { label: '合并四规则', want: 4, got: merge.length },
    { label: '重点人群三规则', want: 3, got: crowd.length },
    { label: '三层服务', want: 3, got: ls.length },
  ];
  const mismatched = claims.filter((c) => c.want !== c.got).map((c) => c.label);
  return { st, sTable, qs, merge, crowd, ls, load, claims, mismatched };
}

function main() {
  const body = read();
  const a = audit(body);
  const secs = sections(body).filter((s) => s.title);
  const cites = [...new Set([...body.matchAll(/《([^》\n]+)》/g)].map((m) => m[1]))];

  console.log(`中医健康管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下条数、人数与汉字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi(body)} 字 · 节 ${secs.length} 节 · 引书 ${cites.length} 部`);
  console.log('');
  console.log(`四个段落：${a.sTable.map((s) => s.stage).join('／')}`);
  console.log(`  待查段能做的事：${a.sTable[3].canDo}`);
  console.log(`  待查段必须停手：${a.sTable[3].stop}`);
  console.log(`判断靠三问：${a.qs.join(' ')}`);
  console.log(`共病合并 ${a.merge.length} 条规则：${a.merge.join('／')}`);
  console.log(`重点人群 ${a.crowd.length} 条操作规则：${a.crowd.join('；')}`);
  console.log(`服务三层：${a.ls.map((l) => `${l.layer}（${l.freq}）`).join(' → ')}`);
  console.log('');
  const m = a.load;
  console.log(`负荷复算：${m.people} 人中 ${m.two} 人两项以上、${m.three} 人三项以上；` +
    `随访完成率 ${m.rateA}% → ${m.rateB}%，掉 ${m.dropPoints} 个百分点（相对 −${m.dropPct}%）。`);
  console.log(`  三包同购不是卖得更多，是把同一段稀缺时间卖了三次。`);
  console.log('');
  console.log(`条数对账：${a.mismatched.length ? '不一致，须改稿 —— ' + a.mismatched.join('、') : '一致'}`);
  console.log('');
  console.log('→ 判据：管理的单位是人，不是病；先判段落，再合并冲突，最后才谈专业内容。');
  console.log('※ 条数、人数与汉字均从本章 docs/zh.md 现算，正文一改即随之变化；本输出仅用于教学演示，不构成诊疗意见。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, read, hanzi, sections, sectionText,
  stages, stageTable, threeQuestions, mergeRules, crowdRules, layers, loadMath, audit,
};

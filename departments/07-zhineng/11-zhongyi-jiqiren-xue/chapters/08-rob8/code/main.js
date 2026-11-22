#!/usr/bin/env node
/**
 * 中医机器人学 · 第 8 章 能交给机器的是「可参数化的部分」，不是「手法」
 * 课程: departments/07-zhineng/11-zhongyi-jiqiren-xue/chapters/08-rob8/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 三处判据全部现算：手法表逐行读出三列并按「判定」分类计数（可自动化／受限／
 * 不可自动化／禁止自动化）；压强由力除以接触面积算（20 N 在 4 cm² 与 1 cm²）；
 * 灸疗温升按平方反比 (d0/d)² 复算表中四档。参数一律取自正文的演算设定。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 8;
const TITLE = '能交给机器的是「可参数化的部分」，不是「手法」';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function detex(s) {
  return String(s || '')
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\approx/g, '≈')
    .replace(/\\pi/g, 'π')
    .replace(/\\mu/g, 'μ')
    .replace(/\\max/g, 'max')
    .replace(/\\min/g, 'min')
    .replace(/\\le/g, '≤')
    .replace(/\\ge/g, '≥')
    .replace(/\\left|\\right|\\,|\\;|\\!/g, ' ')
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/\\\s/g, ' ')
    .replace(/\\/g, '')
    .replace(/[${}]/g, '');
}

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((s) => s.trim());
}

function parseTables(md) {
  const lines = String(md).split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^\s*\|/.test(lines[i])) continue;
    if (i + 1 >= lines.length || !/^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) continue;
    const header = splitRow(lines[i]);
    const rows = [];
    let j = i + 2;
    while (j < lines.length && /^\s*\|/.test(lines[j])) { rows.push(splitRow(lines[j])); j += 1; }
    out.push({ header, rows });
    i = j - 1;
  }
  return out;
}

function num(s) {
  const m = String(s == null ? '' : s).replace(/[,\s]/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

/** 压强：N / cm² → kPa。 */
function pressureKpa(forceN, areaCm2) {
  return forceN / (areaCm2 * 1e-4) / 1000;
}

/** 点源近似的相对热流：热流与距离平方成反比。 */
function relativeFlux(d, d0) {
  return (d0 / d) ** 2;
}

/** 把「判定」一栏归一成四个档位。 */
function verdict(raw) {
  const s = String(raw || '').replace(/[*`]/g, '');
  if (/禁止自动化/.test(s)) return '禁止自动化';
  if (/不可自动化/.test(s)) return '不可自动化';
  if (/受限/.test(s)) return '受限';
  if (/可自动化/.test(s)) return '可自动化';
  return '未判定';
}

function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const flat = detex(body).replace(/\u00a0/g, ' ');
  const tables = parseTables(body);

  // 三条判据表
  const critTable = tables.find((t) => t.header.join('').includes('若为否'));
  const criteria = critTable ? critTable.rows.map((r) => ({ name: r[0], ask: r[1], otherwise: r[2] })) : [];

  // 手法表：手法 / 可参数化 / 可测量 / 可逆 / 判定
  const techTable = tables.find((t) => t.header.join('').includes('手法') && t.header.join('').includes('判定'));
  if (!techTable) throw new Error('正文里没有手法判定表');
  const techniques = techTable.rows.map((r) => ({
    name: r[0],
    parametrizable: r[1],
    measurable: r[2],
    reversible: r[3],
    verdictRaw: r[4],
    verdict: verdict(r[4]),
  }));
  const counts = { 可自动化: 0, 受限: 0, 不可自动化: 0, 禁止自动化: 0 };
  for (const t of techniques) counts[t.verdict] += 1;

  // 压强：力与两个接触面积
  const p = flat.match(/(\d+)\s*N 分布在\s*(\d+)\s*cm(?:\^2|²)\s*上是\s*(\d+)\s*kPa，分布在\s*(\d+)\s*cm(?:\^2|²)\s*上是\s*(\d+)\s*kPa/);
  if (!p) throw new Error('正文里没有压强的演算设定');
  const force = Number(p[1]);
  const areaBig = Number(p[2]);
  const kPaBigDoc = Number(p[3]);
  const areaSmall = Number(p[4]);
  const kPaSmallDoc = Number(p[5]);
  const kPaBig = pressureKpa(force, areaBig);
  const kPaSmall = pressureKpa(force, areaSmall);

  // 灸疗：d0 与基准温升，以及平方反比表
  const m0 = flat.match(/d_0\s*=\s*(\d+)\s*cm\s*时皮肤温升\s*(\d+(?:\.\d+)?)\s*°C/);
  if (!m0) throw new Error('正文里没有灸疗距离与温升的演算设定');
  const d0 = Number(m0[1]);
  const rise0 = Number(m0[2]);

  const moxaTable = tables.find((t) => t.header.join('').includes('相对热流'));
  if (!moxaTable) throw new Error('正文里没有灸距表');
  const moxa = moxaTable.rows.map((r) => {
    const d = num(r[0]);
    const fluxDoc = num(r[1]);
    const riseDoc = num(r[2]);
    const flux = relativeFlux(d, d0);
    const rise = rise0 * flux;
    return {
      d,
      doc: { flux: fluxDoc, rise: riseDoc },
      model: { flux, rise },
      fluxResidual: Math.abs(flux - fluxDoc),
      riseResidual: Math.abs(rise - riseDoc),
    };
  });

  // 两张清单：能做的 / 不能做的
  const canIdx = body.indexOf('**能做的：**');
  const cannotIdx = body.indexOf('**不能做的：**');
  const section = (from, to) => (from >= 0 ? body.slice(from, to >= 0 ? to : body.length) : '');
  const bullets = (s) => [...s.matchAll(/^- (.+)$/gm)].map((m) => m[1]);
  const canDo = bullets(section(canIdx, cannotIdx));
  const cannotDo = bullets(section(cannotIdx, body.indexOf('## 六、')));

  return {
    body,
    hanzi: (body.match(HANZI) || []).length,
    criteria,
    techniques,
    counts,
    force,
    areaBig,
    areaSmall,
    kPaBig,
    kPaSmall,
    kPaBigDoc,
    kPaSmallDoc,
    d0,
    rise0,
    moxa,
    canDo,
    cannotDo,
    hasTitle: body.startsWith('# 第 ' + CHAPTER + ' 章 · ' + TITLE),
  };
}

function main() {
  const x = analyze(read());
  const f = (n, d = 1) => n.toFixed(d);

  console.log(`中医机器人学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`正文 ${x.hanzi} 汉字 · 判据 ${x.criteria.length} 条 · 手法 ${x.techniques.length} 种`);
  console.log('');
  console.log('一、三条判据（问的不是「难不难」）：');
  for (const c of x.criteria) console.log(`  ${c.name}：${c.ask} ｜ 若为否：${c.otherwise}`);
  console.log('');
  console.log('二、手法逐项判定：');
  for (const t of x.techniques) {
    console.log(`  ${t.name}：可参数化 ${t.parametrizable} ｜ 可测量 ${t.measurable} ｜ 可逆 ${t.reversible.replace(/\*\*/g, '')} ｜ ⇒ ${t.verdict}`);
  }
  console.log(`  → 统计：${Object.entries(x.counts).map(([k, v]) => `${k} ${v}`).join(' ｜ ')}`);
  const banned = x.techniques.filter((t) => t.verdict === '禁止自动化').map((t) => t.name);
  const irreversible = x.techniques.filter((t) => /否/.test(t.reversible)).map((t) => t.name);
  console.log(`  → 硬边界：${banned.join('、')} 禁止自动化；不可逆的手法共 ${irreversible.length} 种（${irreversible.join('、')}）。`);
  console.log('');
  console.log('三、压强与接触面积（同样的力，压强差数倍）：');
  console.log(`  ${x.force} N / ${x.areaBig} cm² = ${f(x.kPaBig, 0)} kPa（正文写 ${x.kPaBigDoc}）`);
  console.log(`  ${x.force} N / ${x.areaSmall} cm² = ${f(x.kPaSmall, 0)} kPa（正文写 ${x.kPaSmallDoc}）`);
  console.log(`  → 面积缩到 1/${x.areaBig}，压强涨到 ${f(x.kPaSmall / x.kPaBig, 0)} 倍；所以点按要配「压强限幅」而不是「力限幅」。`);
  console.log('');
  console.log(`四、灸距与温升（d_0 = ${x.d0} cm 时温升 ${x.rise0} °C，平方反比）：`);
  for (const m of x.moxa) {
    console.log(`  d=${m.d} cm：相对热流 ${f(m.model.flux, 2)}（表内 ${m.doc.flux}）⇒ 温升 ${f(m.model.rise, 1)} °C（表内 ${m.doc.rise}）`);
  }
  const near = x.moxa.find((m) => m.d === 2);
  if (near) console.log(`  → 距离从 ${x.d0} cm 收到 2 cm，温升变成 ${f(near.model.rise, 1)} °C：核心指标是距离保持精度，不是温度控制精度。`);
  console.log('');
  console.log(`五、能做的 ${x.canDo.length} 条 / 不能做的 ${x.cannotDo.length} 条（说明书里应当逐条出现）；首行章题一致：${x.hasTitle ? '是' : '否'}`);
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本章为手法与机器人边界的工程讨论，不构成诊疗建议或疗效声明。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, detex, parseTables, num, pressureKpa, relativeFlux, verdict, analyze };

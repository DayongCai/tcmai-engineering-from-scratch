#!/usr/bin/env node
/**
 * 眼科光学验光 · 第 5 章 镜片与矫正：改的是入射光，不是眼
 * 正文: departments/08-wuguan/04-yanke-guangxue-yanguang/chapters/05-e45/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 做法：把正文陈述的三条规则变成可执行的检验——
 *   1) 球柱镜转换是记账，不是处方调整：转换前后每一条子午线上的屈光力必须逐度相等；
 *   2) 镜眼距 F′ = F/(1 − d·F)：换架子换了距离，有效度数就变（正文那句 0.3 D 的来源）；
 *   3) 棱镜只改方向：一度棱镜在百米处偏一米。
 * 输入数与规则文字从正文读，结论由本文件算出并对照。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 5;
const TITLE = '镜片与矫正：改的是入射光，不是眼';

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function grab(text, re, label) {
  const m = String(text).match(re);
  if (!m) throw new Error(`正文里找不到${label}：${re}`);
  return Number(String(m[1]).replace(/[−–—]/g, '-').replace(/[^\d.\-]/g, ''));
}

const CN_DIGIT = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

/** 正文里的「一米」写成汉字，这里单独取一次。 */
function grabCnOrNum(text, re, label) {
  const m = String(text).match(re);
  if (!m) throw new Error(`正文里找不到${label}：${re}`);
  const raw = m[1];
  return CN_DIGIT[raw] !== undefined ? CN_DIGIT[raw] : Number(raw);
}

/* ---------- 球柱镜：子午线屈光力与转换 ---------- */

/** 某一条子午线上的屈光力：P(θ) = S + C·sin²(θ − A)，θ 与 A 都用度。 */
function meridionalPower(S, C, axisDeg, meridianDeg) {
  const d = ((meridianDeg - axisDeg) * Math.PI) / 180;
  return S + C * Math.sin(d) ** 2;
}

/** 球柱镜转换：球加柱、柱变号、轴 ±90。 */
function transpose(S, C, axis) {
  const a = ((axis % 180) + 180) % 180;
  return { S: S + C, C: -C, axis: a <= 90 ? a + 90 : a - 90 };
}

/** 转换前后逐度比对，返回最大偏差（D）。记账正确时应当接近 0。 */
function transpositionError(S, C, axis, step = 5) {
  const t = transpose(S, C, axis);
  let worst = 0;
  for (let m = 0; m <= 180; m += step) {
    worst = Math.max(worst, Math.abs(meridionalPower(S, C, axis, m) - meridionalPower(t.S, t.C, t.axis, m)));
  }
  return worst;
}

/* ---------- 镜眼距与棱镜 ---------- */

function effectivePower(F1, dMm) {
  return F1 / (1 - (dMm / 1000) * F1);
}

function powerShift(F1, d1Mm, d2Mm) {
  return Math.abs(effectivePower(F1, d1Mm) - effectivePower(F1, d2Mm));
}

/** 棱镜度对应的偏移：1Δ 在 1 米处偏 1 厘米；返回给定距离上的偏移（米）。 */
function prismDeviation(prismDiopters, distanceM) {
  return prismDiopters * 0.01 * distanceM;
}

function compute(text) {
  const focalDocs = [
    grab(text, /焦距一米为\s*\+([\d.]+)\s*D/, '一米焦距的屈光力'),
    grab(text, /半米为\s*\+([\d.]+)\s*D/, '半米焦距的屈光力'),
    grab(text, /负一米为\s*[−-]([\d.]+)\s*D/, '负一米焦距的屈光力')
  ];
  const dFrom = grab(text, /镜眼距从\s*(\d+)\s*毫米挪到\s*\d+\s*毫米/, '原镜眼距');
  const dTo = grab(text, /镜眼距从\s*\d+\s*毫米挪到\s*(\d+)\s*毫米/, '新镜眼距');
  const highPower = grab(text, /一片\s*[−-]([\d.]+)\s*D 的镜片/, '例子里的高度近视度数');
  const shiftDoc = grab(text, /有效度数差约\s*([\d.]+)\s*D/, '换距离造成的有效度数差');
  const prismMetersDoc = grabCnOrNum(text, /百米处使光线偏移约\s*([一二两三四五六七八九十]|\d+(?:\.\d+)?)\s*米/, '一度棱镜在百米处的偏移');
  const paramSentence = (text.match(/四项参数：([^。]+)。/) || [])[1] || '';
  const params = paramSentence.split('、').map((s) => s.trim()).filter(Boolean);

  const F1 = -highPower;
  return {
    focalDocs, F1, dFrom, dTo, shiftDoc, shift: powerShift(F1, dFrom, dTo),
    prismMetersDoc, prism100: prismDeviation(1, 100), params,
    sample: { S: -2, C: -1, axis: 180 }
  };
}

function verify(r, tol = { shift: 0.03 }) {
  const bad = [];
  const near = (a, b, t, label) => {
    if (!(Math.abs(a - b) <= t)) bad.push(`${label}：现算 ${a.toFixed(3)}，正文 ${b}`);
  };
  // F = 1/f 的三个例子
  near(1 / 1, r.focalDocs[0], 1e-9, '一米焦距');
  near(1 / 0.5, r.focalDocs[1], 1e-9, '半米焦距');
  near(1 / -1, -r.focalDocs[2], 1e-9, '负一米焦距');
  // 镜眼距
  near(r.shift, r.shiftDoc, tol.shift, '换镜眼距的有效度数差');
  // 棱镜：1Δ 在百米偏一米
  near(r.prism100, r.prismMetersDoc, 1e-9, '一度棱镜百米偏移');
  // 转换必须逐度等价
  for (const [S, C, A] of [[-2, -1, 180], [-3.5, 1.25, 20], [1.75, -2.5, 95], [0, -1.5, 0]]) {
    const err = transpositionError(S, C, A);
    if (!(err < 1e-9)) bad.push(`球柱转换不自洽：${S}/${C}×${A} 最大偏差 ${err}`);
  }
  // 四项参数应恰好四项，且都写进正文
  if (r.params.length !== 4) bad.push(`渐进四项参数解析出 ${r.params.length} 项：${r.params.join('、')}`);
  for (const p of ['单眼瞳距', '瞳高', '前倾角', '镜眼距']) {
    if (!r.params.some((x) => x.includes(p))) bad.push(`四项参数缺 ${p}`);
  }
  if (bad.length) throw new Error('正文与计算不自洽：\n  - ' + bad.join('\n  - '));
  return true;
}

function fmtS(x) {
  const s = Math.abs(x).toFixed(2);
  return (x < 0 ? '−' : '+') + s;
}

function main() {
  const r = compute(read());
  verify(r);
  const t = transpose(r.sample.S, r.sample.C, r.sample.axis);
  const p0 = meridionalPower(r.sample.S, r.sample.C, r.sample.axis, 90);
  const p1 = meridionalPower(t.S, t.C, t.axis, 90);

  console.log(`眼科光学验光 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（左为现算，右为正文所写；规则文字与输入数从正文读出）');
  console.log('');
  console.log(`球镜 F = 1/f：一米 +${r.focalDocs[0].toFixed(2)} D · 半米 +${r.focalDocs[1].toFixed(2)} D · 负一米 −${r.focalDocs[2].toFixed(2)} D`);
  console.log('');
  console.log(`球柱镜转换（记账，不改作用）：${fmtS(r.sample.S)} DS / ${fmtS(r.sample.C)} DC × ${r.sample.axis}`);
  console.log(`  → ${fmtS(t.S)} DS / ${fmtS(t.C)} DC × ${t.axis}`);
  console.log(`  90° 子午线：转换前 ${fmtS(p0)} D，转换后 ${fmtS(p1)} D；逐度最大偏差 ${transpositionError(r.sample.S, r.sample.C, r.sample.axis).toExponential(1)} D`);
  console.log('');
  console.log(`镜眼距 F′ = F/(1 − d·F)：${fmtS(r.F1)} D 在 ${r.dFrom} mm 处 ${fmtS(effectivePower(r.F1, r.dFrom))} D，`);
  console.log(`  在 ${r.dTo} mm 处 ${fmtS(effectivePower(r.F1, r.dTo))} D，差 ${r.shift.toFixed(2)} D   正文约 ${r.shiftDoc} D`);
  console.log('  （同一副处方装进两副镜架，可以是两副不同的眼镜）');
  console.log('');
  console.log(`棱镜：1Δ 在 100 米处偏 ${r.prism100.toFixed(2)} 米   正文约 ${r.prismMetersDoc} 米；越远越偏，清晰度不变`);
  console.log(`渐进四项参数：${r.params.join('、')}（任一项错，通道偏离瞳孔）`);
  console.log('');
  console.log('※ 规则与输入数均取自本章 docs/zh.md；本章不给成品处方模板，参数须由执业人员依现行规范决定。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE,
  read, grab, meridionalPower, transpose, transpositionError, effectivePower, powerShift, prismDeviation,
  compute, verify
};

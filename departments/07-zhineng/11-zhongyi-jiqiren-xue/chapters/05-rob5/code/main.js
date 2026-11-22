#!/usr/bin/env node
/**
 * 中医机器人学 · 第 5 章 控制的好坏不看增益多高，看超调落在人体上是多少牛
 * 课程: departments/07-zhineng/11-zhongyi-jiqiren-xue/chapters/05-rob5/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 三行式子全部现算并与正文逐格核对：
 *   Mp = exp(−πζ/√(1−ζ²))  → 表里的百分比与峰值牛数
 *   tr ≈ 1.8/ω_n            → 上升时间与控制周期的对价
 *   φ = −ωT                 → 延迟吃掉的相位与剩余裕度
 * 再把「峰值 ≤ 25 N」反解成 ζ 的下界，与正文写的 0.41 对账（正文取的是保守的进位值）。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 5;
const TITLE = '控制的好坏不看增益多高，看超调落在人体上是多少牛';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function detex(s) {
  return String(s || '')
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\omega_n/g, 'ω_n')
    .replace(/\\omega/g, 'ω')
    .replace(/\\zeta/g, 'ζ')
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

/** 二阶系统最大超调：exp(−πζ/√(1−ζ²))。ζ=1 时取 0（临界/过阻尼）。 */
function overshoot(zeta) {
  if (zeta >= 1) return 0;
  return Math.exp((-Math.PI * zeta) / Math.sqrt(1 - zeta * zeta));
}

/** 由「允许超调」反解 ζ 的下界：闭式 ζ = |ln Mp| / √(π² + ln²Mp)。 */
function zetaForOvershoot(mp) {
  const l = Math.abs(Math.log(mp));
  return l / Math.sqrt(Math.PI * Math.PI + l * l);
}

/** 二阶系统上升时间近似。 */
function riseTime(wn) {
  return 1.8 / wn;
}

/** 纯延迟在频率 f 处的相位滞后（度）与剩余裕度。 */
function phaseLag(f, tMs, marginDeg) {
  const lag = (2 * Math.PI * f * (tMs / 1000) * 180) / Math.PI;
  return { lag, remaining: marginDeg - lag };
}

function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const flat = detex(body).replace(/\u00a0/g, ' ');
  const tables = parseTables(body);

  const cmd = num((flat.match(/指令\s*(\d+(?:\.\d+)?)\s*N/) || [])[1]);
  if (cmd == null) throw new Error('正文里没有「指令 20 N」的演算设定');
  const limit = num((flat.match(/安全限幅[^0-9]{0,8}(\d+)\s*N/) || [])[1]);

  const wn = num((flat.match(/ω_n\s*=\s*(\d+(?:\.\d+)?)\s*rad\/s/) || [])[1]);
  const tHit = flat.match(/T\s*=\s*(\d+(?:\.\d+)?)\s*ms（传感\s*(\d+)\s*\+\s*总线\s*(\d+)\s*\+\s*计算\s*(\d+)\s*\+\s*驱动\s*(\d+)）/);
  if (wn == null || !tHit) throw new Error('正文里没有 ω_n / T 的演算设定');
  const tDelay = Number(tHit[1]);
  const segments = [Number(tHit[2]), Number(tHit[3]), Number(tHit[4]), Number(tHit[5])];
  const segSum = segments.reduce((a, b) => a + b, 0);

  const margin = num((flat.match(/相位裕度[^0-9]{0,4}(\d+)°/ ) || [])[1]) || 45;

  // 阻尼比表：ζ / 超调 / 峰值 / 观感
  const zTable = tables.find((t) => t.header.join('').includes('超调'));
  if (!zTable) throw new Error('正文里没有阻尼比与超调的表');
  const rows = zTable.rows.map((r) => {
    const z = num(r[0]);
    const mpDoc = num(r[1]);
    const peakDoc = num(r[2]);
    const mp = overshoot(z) * 100;
    const peak = cmd * (1 + mp / 100);
    return {
      zeta: z,
      note: r[3] || '',
      doc: { mp: mpDoc, peak: peakDoc },
      model: { mp, peak },
      mpResidual: Math.abs(mp - mpDoc),
      peakResidual: Math.abs(peak - peakDoc),
    };
  });

  // 从安全限幅反解 ζ 下界
  const allowed = limit / cmd;            // 允许的倍数，如 25/20 = 1.25
  const mpAllowed = allowed - 1;          // 允许超调
  const zMin = zetaForOvershoot(mpAllowed);
  const zDoc = num((flat.match(/ζ\s*≥\s*(0\.\d+)/) || [])[1]);

  // 相位表：1 / 5 / 10 Hz
  const phases = [1, 5, 10].map((f) => ({ f, ...phaseLag(f, tDelay, margin) }));

  // 四种控制模式
  const modeTable = tables.find((t) => t.header.join('').includes('控制量'));
  const modes = modeTable ? modeTable.rows.map((r) => ({ name: r[0], quantity: r[1], fits: r[2], failure: r[3] })) : [];

  const tr = riseTime(wn);

  return {
    body,
    hanzi: (body.match(HANZI) || []).length,
    cmd,
    limit,
    wn,
    tr,
    tDelay,
    segments,
    segSum,
    margin,
    rows,
    allowed,
    mpAllowed,
    zMin,
    zDoc,
    phases,
    modes,
    hasTitle: body.startsWith('# 第 ' + CHAPTER + ' 章 · ' + TITLE),
  };
}

function main() {
  const x = analyze(read());
  const f = (n, d = 2) => n.toFixed(d);

  console.log(`中医机器人学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`正文 ${x.hanzi} 汉字 · 控制模式 ${x.modes.length} 种 · 指令 ${x.cmd} N，安全限幅 ${x.limit} N`);
  console.log('');
  console.log('一、把阻尼比翻译成牛（Mp = exp(−πζ/√(1−ζ²))）：');
  for (const r of x.rows) {
    console.log(
      `  ζ=${String(r.zeta).padEnd(4)} 超调 ${f(r.model.mp, 1).padStart(5)}%（表内 ${r.doc.mp}%）` +
      ` 峰值 ${f(r.model.peak, 1).padStart(5)} N（表内 ${r.doc.peak}） ｜ ${r.note}`,
    );
  }
  const peakWorst = x.rows.reduce((a, b) => (b.peakResidual > a.peakResidual ? b : a));
  console.log(`  → 最大峰值核对偏差 ${f(peakWorst.peakResidual, 2)} N（ζ=${peakWorst.zeta}），表内按一位小数取整。`);
  const over = x.rows.filter((r) => r.model.peak > x.limit);
  console.log(`  → 越过 ${x.limit} N 限幅的档位：${over.map((r) => `ζ=${r.zeta}（${f(r.model.peak, 1)} N）`).join('、') || '无'}。`);
  console.log('');
  console.log('二、从安全限幅反解 ζ 下界：');
  console.log(`  峰值 ≤ ${x.limit} N ⇒ 允许超调 ≤ ${f(x.mpAllowed * 100, 0)}% ⇒ ζ ≥ ${f(x.zMin, 3)}（正文取 ${x.zDoc}，向上取整）`);
  console.log(`  校验：Mp(${x.zDoc}) = ${f(overshoot(x.zDoc) * 100, 1)}%，峰值 ${f(x.cmd * (1 + overshoot(x.zDoc)), 1)} N ≤ ${x.limit} N ⇒ ${x.cmd * (1 + overshoot(x.zDoc)) <= x.limit ? '成立' : '不成立'}`);
  console.log('');
  console.log('三、上升时间与控制周期：');
  console.log(`  t_r ≈ 1.8 / ω_n = 1.8 / ${x.wn} ≈ ${f(x.tr, 3)} s；ω_n=${x.wn} rad/s ≈ ${f(x.wn / (2 * Math.PI), 1)} Hz 带宽 ⇒ 控制周期应 ≤ 10 ms 量级。`);
  console.log('');
  console.log(`四、延迟 ${x.tDelay} ms（${x.segments.join(' + ')} = ${x.segSum} ms）吃掉的相位，相位裕度 ${x.margin}°：`);
  for (const p of x.phases) {
    console.log(`  ${String(p.f).padStart(2)} Hz：滞后 −${f(p.lag, 1)}°，剩余裕度 ${f(p.remaining, 1)}°${p.remaining <= 0 ? '（已失稳）' : ''}`);
  }
  console.log('');
  console.log(`五、控制模式 ${x.modes.length} 种：${x.modes.map((m) => m.name).join(' / ')}；首行章题一致：${x.hasTitle ? '是' : '否'}`);
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本章为线性控制与力控的教学讨论，不构成设备调试规范或安全标准。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, detex, parseTables, num, overshoot, zetaForOvershoot, riseTime, phaseLag, analyze };

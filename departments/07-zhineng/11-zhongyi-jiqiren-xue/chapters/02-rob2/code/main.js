#!/usr/bin/env node
/**
 * 中医机器人学 · 第 2 章 感知的瓶颈不在传感器，在「信号到语义」的那一跳
 * 课程: departments/07-zhineng/11-zhongyi-jiqiren-xue/chapters/02-rob2/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 两个下限都从正文的演算设定现算：采样率下限 2·f_max、量化台阶 V_FS/(2ⁿ−1)，
 * 再把噪声折成有效位数 ENOB。六条通道表逐行读出，用来数「想知道的量」与
 * 「传感器实际测的」之间的代理关系；特征层表用来数不可逆的层数。
 * 手打的数字会在改稿后静默过期，这里一个都不写。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 2;
const TITLE = '感知的瓶颈不在传感器，在「信号到语义」的那一跳';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function detex(s) {
  return String(s || '')
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\max/g, 'max')
    .replace(/\\min/g, 'min')
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

/** 量化台阶：输入满量程（V），返回 mV 与等效 mN。 */
function quantStep(vfsVolt, bits, mvPerMn) {
  const deltaMv = (vfsVolt * 1000) / (2 ** bits - 1);
  return { deltaMv, deltaMn: deltaMv / mvPerMn };
}

/** 有效位数：标称位数扣掉「噪声相对台阶的倍数」的 log2。 */
function enob(bits, noiseMn, deltaMn) {
  return bits - Math.log2(noiseMn / deltaMn);
}

function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const flat = detex(body).replace(/\u00a0/g, ' ');
  const tables = parseTables(body);

  // 采样：f_max 与实取采样率
  const fmax = num((flat.match(/f_max\s*=\s*(\d+(?:\.\d+)?)\s*Hz/) || [])[1]);
  const fs = num((flat.match(/取\s*(\d+)\s*Hz（\s*\d+\s*倍）/) || [])[1]);
  if (fmax == null || fs == null) throw new Error('正文里没有 f_max / 实取采样率的演算设定');
  const fsMin = 2 * fmax;

  // 量化：位数、满量程、灵敏度、噪声
  const bits = num((flat.match(/(\d+)\s*位、双极性满量程/) || [])[1]);
  const vfs = num((flat.match(/V_FS\s*=\s*(\d+(?:\.\d+)?)\s*V/) || [])[1]);
  const mvPerMn = num((flat.match(/(\d+(?:\.\d+)?)\s*mV\/mN/) || [])[1]);
  const noiseMn = num((flat.match(/噪声均方根是\s*(\d+(?:\.\d+)?)\s*mN/) || [])[1]);
  if ([bits, vfs, mvPerMn, noiseMn].some((n) => n == null)) {
    throw new Error('正文里没有 位数/满量程/灵敏度/噪声 的演算设定');
  }
  const q = quantStep(vfs, bits, mvPerMn);
  const effective = enob(bits, noiseMn, q.deltaMn);

  // 六条通道：想知道的量 vs 传感器实际测的
  const chTable = tables.find((t) => t.header.join('').includes('通道'));
  if (!chTable) throw new Error('正文里没有六条通道表');
  const channels = chTable.rows.map((r) => ({ name: r[0], want: r[1], measure: r[2], error: r[3] }));

  // 特征层：丢弃了什么、丢失后能否补回
  const fTable = tables.find((t) => t.header.join('').includes('丢弃了什么'));
  if (!fTable) throw new Error('正文里没有特征层表');
  const layers = fTable.rows.map((r) => ({ layer: r[0], output: r[1], dropped: r[2], recoverable: r[3] }));
  const irreversible = layers.filter((l) => /不能/.test(l.recoverable)).length;

  // 失效模式表
  const failTable = tables.find((t) => t.header.join('').includes('失效') && t.header.join('').includes('对策'));
  const failures = failTable ? failTable.rows.map((r) => r[0]) : [];

  // 采集后的可用性判据
  const gate = /饱和样本占比\s*<\s*1%/.test(body) && /有效搏动数\s*≥\s*20/.test(body);

  return {
    body,
    hanzi: (body.match(HANZI) || []).length,
    fmax,
    fs,
    fsMin,
    fsRatio: fs / fmax,
    bits,
    vfs,
    mvPerMn,
    noiseMn,
    deltaMv: q.deltaMv,
    deltaMn: q.deltaMn,
    enob: effective,
    channels,
    layers,
    irreversible,
    failures,
    gate,
    hasTitle: body.startsWith('# 第 ' + CHAPTER + ' 章 · ' + TITLE),
  };
}

function main() {
  const x = analyze(read());

  console.log(`中医机器人学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`正文 ${x.hanzi} 汉字 · 通道 ${x.channels.length} 条 · 特征层 ${x.layers.length} 层（不可逆 ${x.irreversible} 层）`);
  console.log('');
  console.log('一、采样下限：');
  console.log(`  f_max = ${x.fmax} Hz → 定理下限 f_s > 2 f_max = ${x.fsMin} Hz`);
  console.log(`  实取 ${x.fs} Hz = f_max 的 ${x.fsRatio.toFixed(0)} 倍，= 定理下限的 ${(x.fs / x.fsMin).toFixed(0)} 倍（余量留给抗混叠滤波器过渡带与峰值检测）`);
  console.log('');
  console.log('二、量化台阶与有效位数：');
  console.log(`  Δ = ${x.vfs} V / (2^${x.bits} − 1) = ${x.deltaMv.toFixed(2)} mV ⇒ ${x.deltaMn.toFixed(2)} mN/级（灵敏度 ${x.mvPerMn} mV/mN）`);
  console.log(`  ENOB ≈ ${x.bits} − log₂(${x.noiseMn} / ${x.deltaMn.toFixed(2)}) = ${x.enob.toFixed(2)} 位`);
  console.log(`  → 标称 ${x.bits} 位，噪声吃掉了 ${(x.bits - x.enob).toFixed(2)} 位；没有噪声指标的位数是营销数字。`);
  console.log('');
  console.log('三、六条通道的代理关系（想知道 ≠ 实测）：');
  for (const c of x.channels) {
    console.log(`  ${String(c.name).padEnd(4, '　')} 想知道：${String(c.want).replace(/\$/g, '')} ｜ 实测：${c.measure}`);
  }
  console.log('');
  console.log('四、特征层不可逆性：');
  for (const l of x.layers) console.log(`  ${l.layer}：丢弃 ${l.dropped} ｜ 能否补回：${l.recoverable}`);
  console.log(`  → ${x.irreversible} 层标注为「不能」，故存储策略必须是存最底层。`);
  console.log('');
  console.log(`五、失效模式 ${x.failures.length} 条：${x.failures.join('、')}`);
  console.log(`   采集后判据（饱和占比 < 1%、有效搏动数 ≥ 20）在正文中：${x.gate ? '是' : '否'}；首行章题一致：${x.hasTitle ? '是' : '否'}`);
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本章为传感器与信号处理的教学讨论，不构成诊断标准或设备校准规范。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, detex, parseTables, num, quantStep, enob, analyze };

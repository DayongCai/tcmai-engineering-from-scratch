#!/usr/bin/env node
/**
 * 生理学 · 第 5 章 呼吸：通气·换气·气体运输·呼吸调节
 * 课程正文: departments/09-jichu/06-shengli-xue/chapters/05-huxi/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的方向题特别多，方向答错比记不住更贵。程序只读本章正文，现算规模与关键词，
 * 并把三处最容易答反的地方写成判别：通气血流比值失调的两种效应、
 * 呼吸肌在三种状态下的主被动、气体交换的唯一动力来源。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

const read = () => fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
const hanzi = (s) => (String(s || '').match(CJK) || []).length;

function shape(md) {
  const body = md.replace(/```[\s\S]*?```/g, '');
  const lines = body.split('\n');
  const count = (re) => lines.filter((l) => re.test(l)).length;
  return {
    hanzi: hanzi(body),
    h1: count(/^# /),
    h2: count(/^## /),
    h3: count(/^### /),
    h4: count(/^#### /),
    tables: count(/^\|/),
    paras: body.split(/\n{2,}/).filter((p) => hanzi(p) >= 40).length,
  };
}

function citations(md) {
  const prose = md.replace(/```[\s\S]*?```/g, '');
  const out = [];
  for (const m of prose.matchAll(/《([^》·]{2,12})·([^》]{2,20})》/g)) out.push({ book: m[1], part: m[2] });
  return out;
}

function judgments(md) {
  const prose = md.replace(/```[\s\S]*?```/g, '');
  const seen = new Set();
  for (const line of prose.split('\n')) {
    if (/^\s*[|#>]/.test(line)) continue;
    for (const m of line.matchAll(/\*\*([^*]{4,40})\*\*/g)) {
      const s = m[1].trim().replace(/[：:，,。；;]$/, '');
      if (hanzi(s) < 4) continue;
      if (/^(MOTTO|PROBLEM|双根因定位|免责声明|边界声明|教材出处)$/.test(s)) continue;
      seen.add(s);
    }
  }
  return [...seen];
}

/** 关键词命中：本章三个环节加一个分母 */
const KEYWORDS = ['分压差', '通气', '换气', '无效腔', '肺泡'];
function keywords(md) {
  const prose = md.replace(/```[\s\S]*?```/g, '');
  const out = {};
  for (const k of KEYWORDS) out[k] = prose.split(k).length - 1;
  return out;
}

function boundaryHits(md) {
  return (md.match(/本书不给值|不写数值|不给正常值|不给单位|不提供数值/g) || []).length;
}

/**
 * 判别一：通气与血流不匹配的两种方向。
 * 比值增大＝通气相对过剩、血流相对不足 → 无效腔样效应；
 * 比值减小＝血流相对过剩、通气相对不足 → 分流样效应。
 * @param {{ventilation:'过剩'|'不足', perfusion:'过剩'|'不足'}} p
 */
function vaqMismatch(p) {
  const { ventilation, perfusion } = p;
  if (ventilation === '过剩' && perfusion === '不足') return { effect: '无效腔样效应', why: '部分通气未参与交换，等于把气吸进了不换气的地方' };
  if (ventilation === '不足' && perfusion === '过剩') return { effect: '分流样效应', why: '部分血流未充分氧合，等于血从旁边流过去了' };
  if (ventilation === '过剩' && perfusion === '过剩') return { effect: '匹配（同时增大）', why: '比值不变，交换效率不因此改变' };
  if (ventilation === '不足' && perfusion === '不足') return { effect: '匹配（同时减少）', why: '比值不变，总量同时下降' };
  throw new Error('未知组合：' + JSON.stringify(p));
}

/**
 * 判别二：呼吸肌的主被动。
 * 平静吸气靠膈肌与肋间外肌收缩，平静呼气靠弹性回缩，用力呼气才转为主动。
 * @param {'平静吸气'|'平静呼气'|'用力呼气'} phase
 */
function breathWork(phase) {
  const T = {
    平静吸气: { active: true, who: '膈肌与肋间外肌收缩，胸廓增大、肺内压下降' },
    平静呼气: { active: false, who: '呼吸肌舒张，胸廓与肺依自身弹性回缩' },
    用力呼气: { active: true, who: '腹壁肌与肋间内肌参与，呼气转为主动' },
  };
  if (!T[phase]) throw new Error('未知呼吸状态：' + phase);
  return { phase, ...T[phase] };
}

/**
 * 判别三：交换只由分压差驱动，重要性不参与运算。
 * 二氧化碳的分压差较小却能顺利扩散，靠的是溶解度，而不是「它更重要」。
 * @param {'氧'|'二氧化碳'} gas
 */
function diffusionBasis(gas) {
  if (gas === '氧') return { driven: '肺泡侧向血液侧', factor: '分压差 + 溶解度 + 面积与厚度' };
  if (gas === '二氧化碳') return { driven: '血液侧向肺泡侧', factor: '分压差较小，但溶解度高，所以扩散仍顺利' };
  throw new Error('未知气体：' + gas);
}

/** 三个环节：外呼吸（通气 + 换气）→ 运输 → 内呼吸 */
const CHAIN = ['肺通气', '肺换气', '气体在血液中的运输', '组织换气'];

function main() {
  const md = read();
  const s = shape(md);
  const cites = citations(md);
  const judges = judgments(md);
  const kw = keywords(md);
  const ranked = Object.entries(kw).sort((a, b) => b[1] - a[1]);

  console.log('═══ 呼吸：通气·换气·气体运输·调节（生理学 第 5 章）═══');
  console.log(`正文（不含代码块）：${s.hanzi} 汉字 · ${s.h2} 个二级小节 · ${s.h3} 个三级 · ${s.h4} 个四级 · ${s.tables} 行表格 · ${s.paras} 个成段段落`);
  console.log(`引文：《书名·篇名》级 ${cites.length} 条 · 加粗判断句 ${judges.length} 条`);
  console.log('');
  console.log('关键词命中：');
  for (const [k, v] of ranked) console.log(`  ${k.padEnd(4)} ${String(v).padStart(3)} 次`);
  console.log('');
  console.log(`四个环节一条链：${CHAIN.join(' → ')}`);
  console.log('');
  console.log('比值失调的两种方向（这是本章最容易答反的一处）：');
  for (const p of [{ ventilation: '过剩', perfusion: '不足' }, { ventilation: '不足', perfusion: '过剩' }]) {
    const r = vaqMismatch(p);
    console.log(`  通气${p.ventilation} / 血流${p.perfusion} → ${r.effect}`);
  }
  for (const ph of ['平静吸气', '平静呼气', '用力呼气']) {
    const r = breathWork(ph);
    console.log(`  ${ph}：${r.active ? '主动' : '被动'}——${r.who}`);
  }
  console.log('');
  console.log(`氧：由${diffusionBasis('氧').driven}扩散`);
  console.log(`二氧化碳：由${diffusionBasis('二氧化碳').driven}扩散，${diffusionBasis('二氧化碳').factor}`);
  console.log(`「不给值」类边界句 ${boundaryHits(md)} 处。`);
  console.log('教学边界：本章只说明呼吸的类别、关系与机制，不写数值与单位，不构成诊断或治疗依据。');

  return { shape: s, cites, judges, kw, chain: CHAIN.length, boundary: boundaryHits(md) };
}

if (require.main === module) main();

module.exports = {
  DOC,
  KEYWORDS,
  CHAIN,
  read,
  hanzi,
  shape,
  citations,
  judgments,
  keywords,
  boundaryHits,
  vaqMismatch,
  breathWork,
  diffusionBasis,
  main,
};

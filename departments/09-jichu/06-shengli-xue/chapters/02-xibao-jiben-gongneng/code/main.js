#!/usr/bin/env node
/**
 * 生理学 · 第 2 章 细胞的基本功能：一条从膜到肌丝的链
 * 课程正文: departments/09-jichu/06-shengli-xue/chapters/02-xibao-jiben-gongneng/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的命题是「一条链」：膜 → 跨膜转运 → 信号转导 → 电活动 → 收缩。
 * 程序只读本章正文，现算规模与关键词，并把三处最容易记反的分类写成可调用的判别：
 * 转运类别（方向 + 耗能 + 是否需膜蛋白）、受体类别（穿膜几次）、
 * 以及「钙在哪一步」的耦联环节。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

const read = () => fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
const hanzi = (s) => (String(s || '').match(CJK) || []).length;

/** 规模（标题与表格只在围栏代码块之外计数） */
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

/** 引文：到《书名·篇名》级 */
function citations(md) {
  const prose = md.replace(/```[\s\S]*?```/g, '');
  const out = [];
  for (const m of prose.matchAll(/《([^》·]{2,12})·([^》]{2,20})》/g)) out.push({ book: m[1], part: m[2] });
  return out;
}

/** 加粗判断句（结构句不计） */
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

/** 关键词命中：本章的链环各占多少笔墨 */
const KEYWORDS = ['动作电位', '受体', '钙', '通道', '收缩'];
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
 * 判别一：跨膜转运的类别。
 * 教材只用两点划线——方向是否顺梯度、是否耗能；膜蛋白的有无再细分。
 * @param {{gradient:'顺'|'逆', energy:boolean, protein:'无'|'通道'|'载体'}} p
 */
function transportKind(p) {
  const { gradient, energy, protein } = p;
  if (!['顺', '逆'].includes(gradient)) throw new Error('未知方向：' + gradient);
  if (!['无', '通道', '载体'].includes(protein)) throw new Error('未知介导：' + protein);
  if (gradient === '逆') {
    if (!energy) throw new Error('逆梯度必须耗能，否则不成立');
    return { kind: '主动转运', note: '逆电化学梯度、耗能；原发性直接水解供能，继发性借原发梯度供能' };
  }
  if (protein === '无') {
    if (energy) throw new Error('顺梯度且不耗能，与耗能无关');
    return { kind: '单纯扩散', note: '脂溶性物质与小分子气体借脂双层溶解扩散' };
  }
  return { kind: `易化扩散（${protein}介导）`, note: protein === '载体' ? '构象改变搬底物，故有结构特异性、饱和现象与竞争性抑制' : '形成水相孔道并带门控特性' };
}

/**
 * 判别二：受体的类别由结构定。
 * 单次穿膜的自带酶活或招募胞内酶；多次穿膜的必须经 G 蛋白与第二信使递进来。
 * @param {'单次'|'多次'} spans
 */
function receptorClass(spans) {
  if (spans === '单次') return { kind: '酶耦联受体', route: '胞内段自带酶活性或招募胞内酶，不经 G 蛋白', speed: '级联磷酸化，作用较持久' };
  if (spans === '多次') return { kind: 'G蛋白耦联受体', route: '受体—G蛋白—效应器—第二信使，逐级放大', speed: '开关式、可逆、有放大' };
  throw new Error('未知穿膜次数：' + spans);
}

/**
 * 判别三：兴奋收缩耦联的三步，缺一步就没有张力。
 * @param {'横管去极化'|'肌质网释钙'|'钙与肌钙蛋白结合'} step
 */
const COUPLING = {
  横管去极化: '动作电位沿肌膜入横管，电变化到达终池附近',
  肌质网释钙: '横管与终池结构相邻、功能相连，钙释放入肌质',
  钙与肌钙蛋白结合: '调节蛋白构象改变，横桥得以形成',
};
function couplingStep(step) {
  if (!COUPLING[step]) throw new Error('未知环节：' + step);
  return { step, what: COUPLING[step], order: Object.keys(COUPLING).indexOf(step) + 1 };
}

/** 载体的三个性质：教材拿它当「载体与通道的分水岭」 */
const CARRIER_TRAITS = ['结构特异性', '饱和现象', '竞争性抑制'];

function main() {
  const md = read();
  const s = shape(md);
  const cites = citations(md);
  const judges = judgments(md);
  const kw = keywords(md);
  const ranked = Object.entries(kw).sort((a, b) => b[1] - a[1]);

  console.log('═══ 细胞的基本功能：一条从膜到肌丝的链（生理学 第 2 章）═══');
  console.log(`正文（不含代码块）：${s.hanzi} 汉字 · ${s.h2} 个二级小节 · ${s.h3} 个三级 · ${s.h4} 个四级 · ${s.tables} 行表格 · ${s.paras} 个成段段落`);
  console.log(`引文：《书名·篇名》级 ${cites.length} 条 → ${[...new Set(cites.map((c) => `《${c.book}·${c.part}》`))].join(' ')}`);
  console.log(`加粗判断句 ${judges.length} 条`);
  console.log('');
  console.log('关键词命中：');
  for (const [k, v] of ranked) console.log(`  ${k.padEnd(4)} ${String(v).padStart(3)} 次`);
  console.log(`  → 「${ranked[0][0]}」居首：本章讲的是链，不是清单。`);
  console.log('');
  console.log('三处最容易记反的分类（按结构判别，不按快慢判别）：');
  for (const p of [
    { gradient: '顺', energy: false, protein: '无' },
    { gradient: '顺', energy: false, protein: '载体' },
    { gradient: '逆', energy: true, protein: '载体' },
  ]) {
    const r = transportKind(p);
    console.log(`  ${p.gradient}梯度 / ${p.energy ? '耗能' : '不耗能'} / ${p.protein}介导 → ${r.kind}`);
  }
  for (const spans of ['单次', '多次']) {
    const r = receptorClass(spans);
    console.log(`  穿膜${spans} → ${r.kind}：${r.route}`);
  }
  console.log('');
  console.log('兴奋收缩耦联三步（缺一步即无张力）：');
  for (const k of Object.keys(COUPLING)) console.log(`  ${couplingStep(k).order}. ${k}：${COUPLING[k]}`);
  console.log(`载体的三个性质（通道没有）：${CARRIER_TRAITS.join('、')}`);
  console.log(`「不给值」类边界句 ${boundaryHits(md)} 处。`);
  console.log('教学边界：本章只说明细胞层的类别、关系与机制，不写数值与单位，不构成诊断或用药依据。');

  return { shape: s, cites, judges, kw, coupling: Object.keys(COUPLING).length, boundary: boundaryHits(md) };
}

if (require.main === module) main();

module.exports = {
  DOC,
  KEYWORDS,
  CARRIER_TRAITS,
  read,
  hanzi,
  shape,
  citations,
  judgments,
  keywords,
  boundaryHits,
  transportKind,
  receptorClass,
  couplingStep,
  main,
};

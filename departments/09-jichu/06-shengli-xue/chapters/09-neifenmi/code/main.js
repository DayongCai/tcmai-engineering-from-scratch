#!/usr/bin/env node
/**
 * 生理学 · 第 9 章 内分泌：谁作用于谁，而不是多少
 * 课程正文: departments/09-jichu/06-shengli-xue/chapters/09-neifenmi/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章把问题统一成四问：这条激素在哪一层、作用于谁、走哪条反馈、受体在膜上还是核里。
 * 程序只读本章正文，现算规模与关键词，并把三处机制岔口写成判别：
 * 溶解性定受体位置、反馈按「谁反馈给谁」分类、三种相互作用的区别。
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

const KEYWORDS = ['受体', '溶解性', '反馈', '靶', '激素'];
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
 * 判别一：溶解性决定受体位置，位置决定中介，中介决定时程。
 * 所以「快与慢」不是激素本身的性质，而是机制类别的结果。
 * @param {'水溶性'|'脂溶性'} solubility
 */
function receptorSite(solubility) {
  if (solubility === '水溶性') return { site: '膜受体', route: '经胞内信使或离子通道把信号递进细胞', onset: '相对迅速', duration: '相对短暂' };
  if (solubility === '脂溶性') return { site: '胞内受体', route: '穿膜进入细胞，与胞质或核内受体结合，多经基因表达调节', onset: '相对缓慢', duration: '持续较长' };
  throw new Error('未知溶解性：' + solubility);
}

/**
 * 判别二：反馈按「谁反馈给谁」分三类，不看强弱。
 * @param {'长反馈'|'短反馈'|'超短反馈'} kind
 */
function feedbackClass(kind) {
  const T = {
    长反馈: '靶腺激素反馈作用于腺垂体与下丘脑',
    短反馈: '腺垂体促激素反馈作用于下丘脑',
    超短反馈: '下丘脑释放激素反馈作用于自身',
  };
  if (!T[kind]) throw new Error('未知反馈类别：' + kind);
  return { kind, what: T[kind] };
}

/**
 * 判别三：三种相互作用，允许作用最容易被漏掉。
 * @param {'协同'|'拮抗'|'允许作用'} kind
 */
function interaction(kind) {
  const T = {
    协同: '两种激素对同一效应方向一致，效果叠加',
    拮抗: '两种激素对同一效应方向相反，效果相抵',
    允许作用: '一种激素不直接产生该效应，但为另一种激素发挥作用创造条件',
  };
  if (!T[kind]) throw new Error('未知相互作用：' + kind);
  return { kind, what: T[kind] };
}

/** 下丘脑的两类神经分泌细胞对应两条通路：走神经垂体 / 走腺垂体 */
const HYPOTHALAMIC_ROUTES = {
  大细胞性神经分泌细胞: '轴突投射至神经垂体，末梢在神经垂体释放激素',
  小细胞性神经分泌细胞: '轴突终止于正中隆起，释放的调节肽进入血管再作用于腺垂体',
};

/** 神经垂体不含腺上皮细胞：它不能合成激素，只承担储存与释放 */
const NEUROHYPOPHYSIS = { 能合成激素: false, 职能: '储存与释放下丘脑合成、经轴突运输下来的激素' };

function main() {
  const md = read();
  const s = shape(md);
  const cites = citations(md);
  const judges = judgments(md);
  const kw = keywords(md);
  const ranked = Object.entries(kw).sort((a, b) => b[1] - a[1]);

  console.log('═══ 内分泌：谁作用于谁，而不是多少（生理学 第 9 章）═══');
  console.log(`正文（不含代码块）：${s.hanzi} 汉字 · ${s.h2} 个二级小节 · ${s.h3} 个三级 · ${s.h4} 个四级 · ${s.tables} 行表格 · ${s.paras} 个成段段落`);
  console.log(`引文：《书名·篇名》级 ${cites.length} 条 · 加粗判断句 ${judges.length} 条`);
  console.log('');
  console.log('关键词命中：');
  for (const [k, v] of ranked) console.log(`  ${k.padEnd(3)} ${String(v).padStart(3)} 次`);
  console.log('');
  console.log('机制的岔口（按溶解性分家）：');
  for (const k of ['水溶性', '脂溶性']) {
    const r = receptorSite(k);
    console.log(`  ${k} → ${r.site}：${r.route}（起效${r.onset}、持续${r.duration}）`);
  }
  for (const k of ['长反馈', '短反馈', '超短反馈']) console.log(`  ${k}：${feedbackClass(k).what}`);
  for (const k of ['协同', '拮抗', '允许作用']) console.log(`  ${k}：${interaction(k).what}`);
  console.log('');
  for (const [k, v] of Object.entries(HYPOTHALAMIC_ROUTES)) console.log(`  ${k}：${v}`);
  console.log(`  神经垂体能否合成激素：${NEUROHYPOPHYSIS.能合成激素 ? '能' : '不能'}——${NEUROHYPOPHYSIS.职能}`);
  console.log(`「不给值」类边界句 ${boundaryHits(md)} 处。`);
  console.log('教学边界：本章只解释类别、关系与方向，不写数值与单位，不构成诊断、治疗或用药依据。');

  return { shape: s, cites, judges, kw, routes: Object.keys(HYPOTHALAMIC_ROUTES).length, boundary: boundaryHits(md) };
}

if (require.main === module) main();

module.exports = {
  DOC,
  KEYWORDS,
  HYPOTHALAMIC_ROUTES,
  NEUROHYPOPHYSIS,
  read,
  hanzi,
  shape,
  citations,
  judgments,
  keywords,
  boundaryHits,
  receptorSite,
  feedbackClass,
  interaction,
  main,
};

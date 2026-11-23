#!/usr/bin/env node
/**
 * 生理学 · 第 11 章 感觉器官：全书最容易被写成参数表的一章，给了最多的「不给值」
 * 课程正文: departments/09-jichu/06-shengli-xue/chapters/11-ganjue-qiguan/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章把感官写成一条链：适宜刺激 → 换能 → 编码 → 适应，而不是一张参数表。
 * 程序只读本章正文，现算规模与关键词，并把三处分类写成判别：
 * 感受装置与前庭刺激的配对、编码的三条对应、视觉的明暗分工。
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

const KEYWORDS = ['适宜刺激', '换能', '感受器电位', '听域', '囊斑'];
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
 * 判别一：前庭的两套感受装置对应两类适宜刺激。
 * 囊斑感受直线加速度与头位（椭圆囊水平、球囊竖直），壶腹嵴感受旋转。
 * @param {'直线加速度'|'旋转'} stimulus
 */
function receptorFor(stimulus) {
  if (stimulus === '直线加速度') return { device: '囊斑', where: '椭圆囊感受水平方向、球囊感受竖直方向', basis: '位砂膜在重力下相对毛细胞位移，使纤毛弯曲' };
  if (stimulus === '旋转') return { device: '壶腹嵴', where: '三个半规管各自所处的平面互不相同', basis: '管内液体因惯性相对管壁流动，推动胶质结构使纤毛弯曲' };
  throw new Error('未知刺激：' + stimulus);
}

/**
 * 判别二：编码的三条对应——性质靠专用通路，强度靠纤维数目与冲动疏密，部位靠空间分布与投射。
 * @param {'性质'|'强度'|'部位'} dim
 */
function codingDimension(dim) {
  const T = {
    性质: '哪一条专用通路被激活',
    强度: '参与活动的纤维数目加上单根纤维上冲动的时间分布',
    部位: '被激活感受器所在的感受野位置与中枢的投射关系',
  };
  if (!T[dim]) throw new Error('未知编码维度：' + dim);
  return { dim, how: T[dim] };
}

/**
 * 判别三：明暗条件下两类感光细胞的主次换位。
 * @param {'暗'|'亮'} light
 */
function photoreceptorFor(light) {
  if (light === '暗') return { main: '视杆细胞', why: '对光较为敏感、适合较暗条件，但颜色与细节分辨相对有限' };
  if (light === '亮') return { main: '视锥细胞', why: '敏感性较低、适合较亮条件，颜色与细节分辨相对提高' };
  throw new Error('未知光照条件：' + light);
}

/** 感受器的一般特性四项：本章所有感觉通道的共同框架 */
const RECEPTOR_TRAITS = ['适宜刺激', '换能作用', '编码作用', '适应现象'];

/** 外耳与中耳各解决一个问题：收集定位 / 阻抗匹配 */
const EAR_ROLE = {
  外耳: '收集与定位：耳廓汇聚声音，两侧接收差异用于判断声源方向',
  中耳: '阻抗匹配：鼓膜与卵圆窗面积之差、听骨链杠杆，使振动力量相对增强后进入内耳液体',
  内耳: '换能：把机械振动转变为神经信号',
};

/** 听觉的三个概念摆成一个刻度：听阈 / 最大可听阈 / 听域（听域是区间，不是数值） */
const AUDITORY_SCALE = ['听阈', '最大可听阈', '听域'];

function main() {
  const md = read();
  const s = shape(md);
  const cites = citations(md);
  const judges = judgments(md);
  const kw = keywords(md);
  const ranked = Object.entries(kw).sort((a, b) => b[1] - a[1]);

  console.log('═══ 感觉器官：最容易被写成参数表的一章（生理学 第 11 章）═══');
  console.log(`正文（不含代码块）：${s.hanzi} 汉字 · ${s.h2} 个二级小节 · ${s.h3} 个三级 · ${s.h4} 个四级 · ${s.tables} 行表格 · ${s.paras} 个成段段落`);
  console.log(`引文：《书名·篇名》级 ${cites.length} 条 · 加粗判断句 ${judges.length} 条`);
  console.log('');
  console.log('关键词命中：');
  for (const [k, v] of ranked) console.log(`  ${k.padEnd(5)} ${String(v).padStart(3)} 次`);
  console.log('');
  console.log(`感受器四项一般特性：${RECEPTOR_TRAITS.join('、')}`);
  console.log('');
  for (const k of ['直线加速度', '旋转']) {
    const r = receptorFor(k);
    console.log(`  ${k} → ${r.device}（${r.where}）：${r.basis}`);
  }
  for (const d of ['性质', '强度', '部位']) console.log(`  编码${d}：靠${codingDimension(d).how}`);
  for (const l of ['暗', '亮']) {
    const r = photoreceptorFor(l);
    console.log(`  ${l}光下主要靠${r.main}：${r.why}`);
  }
  console.log('');
  for (const [k, v] of Object.entries(EAR_ROLE)) console.log(`  ${k}：${v}`);
  console.log(`  听觉三概念：${AUDITORY_SCALE.join(' → ')}——听域是区间，不是数值`);
  console.log(`「不给值」类边界句 ${boundaryHits(md)} 处。`);
  console.log('教学边界：本章只说明感觉的类别、关系与机制，不写数值与单位，不构成诊断或治疗依据。');

  return { shape: s, cites, judges, kw, traits: RECEPTOR_TRAITS.length, boundary: boundaryHits(md) };
}

if (require.main === module) main();

module.exports = {
  DOC,
  KEYWORDS,
  RECEPTOR_TRAITS,
  EAR_ROLE,
  AUDITORY_SCALE,
  read,
  hanzi,
  shape,
  citations,
  judgments,
  keywords,
  boundaryHits,
  receptorFor,
  codingDimension,
  photoreceptorFor,
  main,
};

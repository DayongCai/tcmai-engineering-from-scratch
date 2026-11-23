#!/usr/bin/env node
/**
 * 生理学 · 第 10 章 神经系统：全章最密的一节不是电，是抑制
 * 课程正文: departments/09-jichu/06-shengli-xue/chapters/10-shenjing-xitong/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章把神经系统写成「谁兴奋谁、谁抑制谁、谁整合谁」，而不是「多大、多少、多快」。
 * 程序只读本章正文，现算规模与关键词，并把三处分类写成判别：
 * 抑制发生的部位（突触前/后）、突触后抑制的两种来源、以及两类突触的传递性质。
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

const KEYWORDS = ['抑制', '突触', '递质', '反射', '易化'];
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
 * 判别一：抑制是主动的活动过程，按发生部位分两类。
 * @param {'突触后'|'突触前'} site
 */
function inhibitionSite(site) {
  const T = {
    突触后: '抑制性中间神经元末梢释放抑制性递质，后膜产生抑制性突触后电位，后神经元超极化而难以兴奋',
    突触前: '作用在突触前末梢，通过减少递质释放来削弱传递',
  };
  if (!T[site]) throw new Error('未知部位：' + site);
  return { site, mechanism: T[site] };
}

/**
 * 判别二：突触后抑制的两种来源，都属于负反馈性质的调节。
 * @param {'传入侧支'|'回返'} kind
 */
function postsynapticKind(kind) {
  const T = {
    传入侧支: { meaning: '传入冲动兴奋某一中枢的同时经侧支兴奋抑制性中间神经元，抑制另一中枢', role: '使功能上相互拮抗的反射在表现上互相协调' },
    回返: { meaning: '某中枢神经元兴奋时其轴突侧支兴奋抑制性中间神经元，再返回抑制原来的神经元', role: '使活动适时终止、避免兴奋在环路中反复循环' },
  };
  if (!T[kind]) throw new Error('未知来源：' + kind);
  return { kind, ...T[kind], negativeFeedback: true };
}

/**
 * 判别三：化学性突触与电突触的结构差别决定传递性质。
 * @param {'化学'|'电'} kind
 */
function synapseType(kind) {
  if (kind === '化学') return { feature: '单向性', basis: '必须经过递质释放、扩散与受体结合', use: '需要方向明确与整合的场合' };
  if (kind === '电') return { feature: '低电阻直接传播', basis: '缝隙连接允许离子与小分子直接通过，不需递质', use: '需要同步而快速的场合' };
  throw new Error('未知突触类别：' + kind);
}

/** 中枢兴奋传递的五个特征：都由联系方式的结构决定 */
const CENTRAL_FEATURES = ['单向传递', '中枢延搁', '总和', '后放', '易疲劳'];

/** 感觉通路的两套系统：特异管性质与部位，非特异管皮层兴奋状态 */
const PROJECTION = {
  特异投射系统: '丘脑换元后点对点投射到皮层特定区域，传递刺激的性质与部位',
  非特异投射系统: '接受不同感受器的汇聚输入，以弥散方式投向皮层广泛区域，维持皮层兴奋状态',
};

function main() {
  const md = read();
  const s = shape(md);
  const cites = citations(md);
  const judges = judgments(md);
  const kw = keywords(md);
  const ranked = Object.entries(kw).sort((a, b) => b[1] - a[1]);

  console.log('═══ 神经系统：全章最密的一节不是电，是抑制（生理学 第 10 章）═══');
  console.log(`正文（不含代码块）：${s.hanzi} 汉字 · ${s.h2} 个二级小节 · ${s.h3} 个三级 · ${s.h4} 个四级 · ${s.tables} 行表格 · ${s.paras} 个成段段落`);
  console.log(`引文：《书名·篇名》级 ${cites.length} 条 · 加粗判断句 ${judges.length} 条`);
  console.log('');
  console.log('关键词命中：');
  for (const [k, v] of ranked) console.log(`  ${k.padEnd(3)} ${String(v).padStart(3)} 次`);
  console.log('');
  console.log('抑制发生在哪里，机制就不同：');
  for (const k of ['突触后', '突触前']) console.log(`  ${k}抑制：${inhibitionSite(k).mechanism}`);
  for (const k of ['传入侧支', '回返']) {
    const r = postsynapticKind(k);
    console.log(`  ${k}性抑制：${r.meaning}；意义是${r.role}（负反馈性质：${r.negativeFeedback}）`);
  }
  console.log('');
  for (const k of ['化学', '电']) {
    const r = synapseType(k);
    console.log(`  ${k}性突触：${r.feature}——${r.basis}；用于${r.use}`);
  }
  console.log(`  中枢兴奋传递五特征：${CENTRAL_FEATURES.join('、')}`);
  for (const [k, v] of Object.entries(PROJECTION)) console.log(`  ${k}：${v}`);
  console.log(`「不给值」类边界句 ${boundaryHits(md)} 处。`);
  console.log('教学边界：本章只说明神经系统的类别、关系与机制，不写数值与单位，不构成诊断或治疗依据。');

  return { shape: s, cites, judges, kw, features: CENTRAL_FEATURES.length, boundary: boundaryHits(md) };
}

if (require.main === module) main();

module.exports = {
  DOC,
  KEYWORDS,
  CENTRAL_FEATURES,
  PROJECTION,
  read,
  hanzi,
  shape,
  citations,
  judgments,
  keywords,
  boundaryHits,
  inhibitionSite,
  postsynapticKind,
  synapseType,
  main,
};

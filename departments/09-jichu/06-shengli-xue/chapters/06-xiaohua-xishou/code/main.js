#!/usr/bin/env node
/**
 * 生理学 · 第 6 章 消化和吸收：分泌·运动·吸收与调节
 * 课程正文: departments/09-jichu/06-shengli-xue/chapters/06-xiaohua-xishou/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的题几乎全是次序题与去向题。程序只读本章正文，现算规模与关键词，
 * 把三处次序/去向写成判别：吸收走血还是走淋巴、排空速度的固定次序、
 * 胰蛋白酶原的激活链（没有肠激酶起步，后面全不启动）。
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

const KEYWORDS = ['酶原', '胆盐', '排空', '吸收', '平滑肌'];
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
 * 判别一：吸收的最后一步走血液还是走淋巴，只看产物的溶解性。
 * 水溶性的（糖、氨基酸）进毛细血管；脂溶性的重新酯化后成乳糜微粒，进中央乳糜管。
 * @param {'水溶性'|'脂溶性'} kind
 */
function absorptionRoute(kind) {
  if (kind === '水溶性') return { route: '血液', why: '经上皮细胞进入细胞间隙后与毛细血管汇合' };
  if (kind === '脂溶性') return { route: '淋巴', why: '在细胞内重新酯化，与载体蛋白结合成乳糜微粒，经胞吐进入中央乳糜管' };
  throw new Error('未知产物类别：' + kind);
}

/**
 * 判别二：胃排空速度有固定次序——液体快于固体，糖类快于蛋白质，蛋白质快于脂肪。
 * 次序本身就是「排空受十二指肠反馈控制」的证据。
 */
const EMPTYING_ORDER = ['液体', '糖类', '蛋白质', '脂肪'];
function emptyingFaster(a, b) {
  const ia = EMPTYING_ORDER.indexOf(a);
  const ib = EMPTYING_ORDER.indexOf(b);
  if (ia < 0 || ib < 0) throw new Error('未知食物类别：' + a + '/' + b);
  return { faster: ia < ib ? a : b, slower: ia < ib ? b : a, why: '脂肪最慢：不是胃吝啬，是小肠在踩刹车' };
}

/**
 * 判别三：胰蛋白酶原的激活链。
 * 肠激酶先激活胰蛋白酶原，胰蛋白酶再激活自身以及糜蛋白酶原与羧基肽酶原。
 */
const ACTIVATION = ['肠激酶', '胰蛋白酶原', '胰蛋白酶', '糜蛋白酶原'];
function activationStep(name) {
  const i = ACTIVATION.indexOf(name);
  if (i < 0) throw new Error('未知环节：' + name);
  return { step: i + 1, name, note: i === 0 ? '起步环节，缺它后面全不启动' : '由前一步的产物催化，属级联放大' };
}

/** 慢波与动作电位分工：慢波定节拍，动作电位定力度 */
const SLOW_WAVE_ROLE = { 慢波: '定节拍：本身一般不引起收缩', 动作电位: '定力度：叠加在慢波上才决定收缩强弱' };

function main() {
  const md = read();
  const s = shape(md);
  const cites = citations(md);
  const judges = judgments(md);
  const kw = keywords(md);
  const ranked = Object.entries(kw).sort((a, b) => b[1] - a[1]);

  console.log('═══ 消化和吸收：分泌·运动·吸收与调节（生理学 第 6 章）═══');
  console.log(`正文（不含代码块）：${s.hanzi} 汉字 · ${s.h2} 个二级小节 · ${s.h3} 个三级 · ${s.h4} 个四级 · ${s.tables} 行表格 · ${s.paras} 个成段段落`);
  console.log(`引文：《书名·篇名》级 ${cites.length} 条 · 加粗判断句 ${judges.length} 条`);
  console.log('');
  console.log('关键词命中：');
  for (const [k, v] of ranked) console.log(`  ${k.padEnd(4)} ${String(v).padStart(3)} 次`);
  console.log('');
  console.log('两张去向/次序表：');
  for (const k of ['水溶性', '脂溶性']) {
    const r = absorptionRoute(k);
    console.log(`  ${k}产物 → 走${r.route}（${r.why}）`);
  }
  console.log(`  排空次序：${EMPTYING_ORDER.join(' → ')}`);
  const cmp = emptyingFaster('糖类', '脂肪');
  console.log(`  ${cmp.faster} 快于 ${cmp.slower}：${cmp.why}`);
  console.log('');
  console.log('胰蛋白酶原激活链：');
  for (const n of ACTIVATION) {
    const r = activationStep(n);
    console.log(`  ${r.step}. ${r.name}——${r.note}`);
  }
  for (const [k, v] of Object.entries(SLOW_WAVE_ROLE)) console.log(`  ${k}：${v}`);
  console.log(`「不给值」类边界句 ${boundaryHits(md)} 处。`);
  console.log('教学边界：本章只说明消化的类别、关系与机制，不写数值与单位，不构成诊断或治疗依据。');

  return { shape: s, cites, judges, kw, order: EMPTYING_ORDER.length, boundary: boundaryHits(md) };
}

if (require.main === module) main();

module.exports = {
  DOC,
  KEYWORDS,
  EMPTYING_ORDER,
  ACTIVATION,
  SLOW_WAVE_ROLE,
  read,
  hanzi,
  shape,
  citations,
  judgments,
  keywords,
  boundaryHits,
  absorptionRoute,
  emptyingFaster,
  activationStep,
  main,
};

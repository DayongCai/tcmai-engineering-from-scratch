#!/usr/bin/env node
/**
 * 生理学 · 第 3 章 血液：用三张图替掉一张数字表
 * 课程正文: departments/09-jichu/06-shengli-xue/chapters/03-xueye/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章把「记住一堆数字」换成三张结构图：组成与理化、止血的三枚齿轮、血型的布尔表。
 * 程序只读本章正文，现算规模与关键词，并把两处最容易被现象误导的判别写成函数：
 * 凝集（抗原抗体）与凝固（酶促级联）不能互推；血清与血浆只差在纤维蛋白原。
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

/** 关键词命中：本章的重心在止血与血型两处 */
const KEYWORDS = ['凝集', '凝固', '纤维蛋白', '血浆', '红细胞'];
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
 * 判别一：凝集只看两件事是否同时成立——膜上有该抗原、血浆里有对应抗体。
 * @param {{donorAntigen:boolean, recipientAntibody:boolean}} p
 */
function agglutination(p) {
  const hit = !!p.donorAntigen && !!p.recipientAntibody;
  return {
    hit,
    verdict: hit ? '凝集' : '不凝集',
    why: hit ? '供者红细胞膜上的抗原遇到受者血浆中的对应抗体，抗体把相邻红细胞连成团' : '抗原与抗体没有同时在场，凝集不发生',
  };
}

/**
 * 判别二：凝集与凝固是两类反应，现象相似不能反推机制相同。
 * @param {'凝集'|'凝固'} kind
 */
function reactionClass(kind) {
  if (kind === '凝集') return { class: '抗原抗体反应', basis: '膜上抗原与血浆抗体配对，由遗传决定并终生稳定' };
  if (kind === '凝固') return { class: '酶促级联反应', basis: '可溶的纤维蛋白原转为不溶的纤维蛋白网，网罗血细胞' };
  throw new Error('未知现象：' + kind);
}

/**
 * 判别三：血清与血浆的差别只在纤维蛋白原与部分参与凝血的物质被消耗掉。
 * @param {boolean} anticoagulated 是否加了抗凝条件
 */
function specimen(anticoagulated) {
  return anticoagulated
    ? { name: '血浆', why: '未启动凝血，纤维蛋白原仍在' }
    : { name: '血清', why: '凝血已发生，纤维蛋白原转为纤维蛋白网被网罗走' };
}

/** 止血的三枚齿轮：不是一条直线，任何一枚停转都留下可观察的差别 */
const HEMOSTASIS = ['血管收缩', '血小板止血栓', '血液凝固'];

/** ABO 的抗原与抗体互补关系：这张表是布尔的，不需要数值 */
const ABO = {
  A: { antigens: ['A'], antibodies: ['抗B'] },
  B: { antigens: ['B'], antibodies: ['抗A'] },
  AB: { antigens: ['A', 'B'], antibodies: [] },
  O: { antigens: [], antibodies: ['抗A', '抗B'] },
};
function aboOf(type) {
  if (!ABO[type]) throw new Error('未知血型：' + type);
  return { type, ...ABO[type] };
}

function main() {
  const md = read();
  const s = shape(md);
  const cites = citations(md);
  const judges = judgments(md);
  const kw = keywords(md);
  const ranked = Object.entries(kw).sort((a, b) => b[1] - a[1]);

  console.log('═══ 血液：用三张图替掉一张数字表（生理学 第 3 章）═══');
  console.log(`正文（不含代码块）：${s.hanzi} 汉字 · ${s.h2} 个二级小节 · ${s.h3} 个三级 · ${s.h4} 个四级 · ${s.tables} 行表格 · ${s.paras} 个成段段落`);
  console.log(`引文：《书名·篇名》级 ${cites.length} 条`);
  console.log(`加粗判断句 ${judges.length} 条`);
  console.log('');
  console.log('关键词命中：');
  for (const [k, v] of ranked) console.log(`  ${k.padEnd(4)} ${String(v).padStart(3)} 次`);
  console.log('');
  console.log('两张判定表（都不需要数值）：');
  console.log(`  抗凝与否 → ${specimen(true).name}（${specimen(true).why}）／${specimen(false).name}（${specimen(false).why}）`);
  for (const [ag, ab] of [[true, true], [true, false], [false, true]]) {
    const r = agglutination({ donorAntigen: ag, recipientAntibody: ab });
    console.log(`  供者抗原${ag ? '有' : '无'} / 受者抗体${ab ? '有' : '无'} → ${r.verdict}`);
  }
  for (const t of Object.keys(ABO)) {
    const a = aboOf(t);
    console.log(`  ${t} 型：抗原 ${a.antigens.join('') || '无'} · 抗体 ${a.antibodies.join('') || '无'}`);
  }
  console.log('');
  console.log(`止血三枚齿轮：${HEMOSTASIS.join(' → ')}（不是一条直线，任一停转都留下可观察差别）`);
  console.log(`凝集＝${reactionClass('凝集').class}；凝固＝${reactionClass('凝固').class}——现象相似，机制不同。`);
  console.log(`「不给值」类边界句 ${boundaryHits(md)} 处。`);
  console.log('教学边界：本章只说明血液的类别、关系与机制，不写数值与单位，不构成诊断或治疗依据。');

  return { shape: s, cites, judges, kw, hemostasis: HEMOSTASIS.length, boundary: boundaryHits(md) };
}

if (require.main === module) main();

module.exports = {
  DOC,
  KEYWORDS,
  HEMOSTASIS,
  ABO,
  read,
  hanzi,
  shape,
  citations,
  judgments,
  keywords,
  boundaryHits,
  agglutination,
  reactionClass,
  specimen,
  aboOf,
  main,
};

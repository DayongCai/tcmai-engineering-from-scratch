#!/usr/bin/env node
/**
 * 生理学 · 第 8 章 肾脏的排泄功能：一条流水线，三个方向
 * 课程正文: departments/09-jichu/06-shengli-xue/chapters/08-shenzang-paixie/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 尿量是三个环节共同的结果，三步方向各不相同。程序只读本章正文，现算规模与关键词，
 * 并把三处容易记反的地方写成判别：有效滤过压的方向合成（含「推不出」）、
 * 重吸收的两个特点、清除率的三种读法。
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

const KEYWORDS = ['滤过', '重吸收', '分泌', '渗透梯度', '清除率'];
function keywords(md) {
  const prose = md.replace(/```[\s\S]*?```/g, '');
  const out = {};
  for (const k of KEYWORDS) out[k] = prose.split(k).length - 1;
  return out;
}

function boundaryHits(md) {
  return (md.match(/本书不给值|不写数值|不给正常值|不给单位|不提供数值/g) || []).length;
}

const SIGN = { 升: 1, 降: -1, 不变: 0 };
const cn = (n) => (n > 0 ? '增强' : n < 0 ? '减弱' : '推不出');

/**
 * 判别一：有效滤过压是一个净值。
 * 推动力为肾小球毛细血管血压，对抗力为血浆胶体渗透压与肾小囊内压。
 * 两侧同向变动时返回「推不出」——这是本节写进程序的那个结论。
 * @param {{push:'升'|'降'|'不变', colloid:'升'|'降'|'不变', capsule:'升'|'降'|'不变'}} p
 */
function effectiveFiltration(p) {
  for (const k of ['push', 'colloid', 'capsule']) {
    if (!(p[k] in SIGN)) throw new Error('未知变化：' + k + '=' + p[k]);
  }
  const net = SIGN[p.push] - SIGN[p.colloid] - SIGN[p.capsule];
  return {
    net,
    verdict: cn(net),
    why: net === 0 ? '推动与对抗的变化相抵或同向，净值方向无法由类别推出' : net > 0 ? '推力相对占优，滤过增强' : '对抗相对占优，滤过减弱',
  };
}

/**
 * 判别二：重吸收的两个特点必须分开说——选择性看转运体种类，有限性看转运体饱和。
 * @param {'选择性'|'有限性'} trait
 */
function reabsorptionTrait(trait) {
  const T = {
    选择性: { basis: '各段上皮细胞膜上转运体的种类与分布', example: '葡萄糖与氨基酸在近端小管几乎全部被重吸收' },
    有限性: { basis: '转运体的数量与能力有限，超限即饱和', example: '与葡萄糖转运相关的限度称肾糖阈' },
  };
  if (!T[trait]) throw new Error('未知特点：' + trait);
  return { trait, ...T[trait] };
}

/**
 * 判别三：清除率的含义随物质在肾内的转运方式而变，单一物质只反映一个侧面。
 * @param {'只滤过'|'滤过并大量分泌'|'滤过并被大量重吸收'} kind
 */
function clearanceMeaning(kind) {
  const T = {
    只滤过: '反映肾小球滤过过程的水平',
    滤过并大量分泌: '反映肾血浆流量的水平',
    滤过并被大量重吸收: '含义须结合重吸收程度说明，不能单独当作滤过或流量的指标',
  };
  if (!T[kind]) throw new Error('未知转运方式：' + kind);
  return { kind, meaning: T[kind] };
}

/** 排泄是上位概念：滤过 + 分泌属排泄，重吸收把已滤过的收回血液 */
const EXCRETION = { 计入: ['滤过', '分泌'], 不计入: ['重吸收'] };

/** 浓缩的两个条件：缺一不成立 */
const CONCENTRATION_CONDITIONS = ['髓质渗透梯度是否建立', '集合管对水是否通透'];

/** 髓袢的分工：降支出水、升支出盐 */
const LOOP_ROLE = { 降支细段: '对水通透、对溶质相对不通透 → 水出、浓度升', 升支细段: '对水不通透、允许钠氯扩散离开 → 盐出', 升支粗段: '主动重吸收钠氯、对水不通透 → 盐出、浓度降' };

function main() {
  const md = read();
  const s = shape(md);
  const cites = citations(md);
  const judges = judgments(md);
  const kw = keywords(md);
  const ranked = Object.entries(kw).sort((a, b) => b[1] - a[1]);

  console.log('═══ 肾脏的排泄功能：一条流水线，三个方向（生理学 第 8 章）═══');
  console.log(`正文（不含代码块）：${s.hanzi} 汉字 · ${s.h2} 个二级小节 · ${s.h3} 个三级 · ${s.h4} 个四级 · ${s.tables} 行表格 · ${s.paras} 个成段段落`);
  console.log(`引文：《书名·篇名》级 ${cites.length} 条 · 加粗判断句 ${judges.length} 条`);
  console.log('');
  console.log('关键词命中：');
  for (const [k, v] of ranked) console.log(`  ${k.padEnd(4)} ${String(v).padStart(3)} 次`);
  console.log('');
  console.log(`排泄＝${EXCRETION.计入.join('＋')}，不含${EXCRETION.不计入.join('、')}`);
  console.log('');
  console.log('有效滤过压的方向合成（净值决定方向）：');
  for (const p of [
    { push: '升', colloid: '不变', capsule: '不变' },
    { push: '不变', colloid: '升', capsule: '不变' },
    { push: '升', colloid: '升', capsule: '不变' },
  ]) {
    const r = effectiveFiltration(p);
    console.log(`  推力${p.push} / 胶渗${p.colloid} / 囊内压${p.capsule} → ${r.verdict}`);
  }
  console.log('');
  console.log(`髓袢：${Object.entries(LOOP_ROLE).map(([k, v]) => `${k}（${v}）`).join('；')}`);
  console.log(`浓缩的两个条件：${CONCENTRATION_CONDITIONS.join(' ＋ ')}——缺一不成立`);
  for (const k of ['只滤过', '滤过并大量分泌', '滤过并被大量重吸收']) {
    console.log(`  清除率（${k}）→ ${clearanceMeaning(k).meaning}`);
  }
  console.log(`「不给值」类边界句 ${boundaryHits(md)} 处。`);
  console.log('教学边界：本章只解释类别、关系与方向，不写数值与单位，不构成诊断、治疗或健康判定依据。');

  return { shape: s, cites, judges, kw, conditions: CONCENTRATION_CONDITIONS.length, boundary: boundaryHits(md) };
}

if (require.main === module) main();

module.exports = {
  DOC,
  KEYWORDS,
  EXCRETION,
  CONCENTRATION_CONDITIONS,
  LOOP_ROLE,
  read,
  hanzi,
  shape,
  citations,
  judgments,
  keywords,
  boundaryHits,
  effectiveFiltration,
  reabsorptionTrait,
  clearanceMeaning,
  main,
};

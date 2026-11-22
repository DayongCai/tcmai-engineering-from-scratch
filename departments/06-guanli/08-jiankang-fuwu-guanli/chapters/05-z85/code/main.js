#!/usr/bin/env node
/**
 * 健康服务管理 · 第 5 章 质量的底线是可比，绩效的前提是可归因
 * 课程: departments/06-guanli/08-jiankang-fuwu-guanli/chapters/05-z85/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 输出全部从本章正文现算：汉字、节、加粗判断、引文；三层质量、口径三问、可比三条件、
 * 压方差的手段、加盟合同三件事、绩效三原则、指标配对四对这一串清单由正文数出来并与
 * 中文数字对账；卷首那组检出率读回正文，算出极差与倍数，看「差三倍」这句话站不站得住。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 5;
const TITLE = '质量的底线是可比，绩效的前提是可归因';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

const hanzi = (t) => (String(t || '').match(HANZI) || []).length;

function sections(body) {
  const out = [];
  let cur = null;
  for (const line of body.split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      cur = { title: h[1], hanzi: 0 };
      out.push(cur);
      continue;
    }
    if (cur) cur.hanzi += hanzi(line);
  }
  return out;
}

function clauseAfter(body, label) {
  const i = body.indexOf(label + '：');
  if (i < 0) throw new Error('正文里没找到「' + label + '：」');
  const rest = body.slice(i + label.length + 1);
  const j = rest.indexOf('。');
  return (j < 0 ? rest : rest.slice(0, j)).trim();
}

const splitList = (s, re = /[、，]/) =>
  String(s).replace(/以及/g, '、').split(re).map((x) => x.trim()).filter(Boolean);

function numbersBy(body, re) {
  const m = body.match(re);
  if (!m) throw new Error('正文里没找到：' + re);
  return m.slice(1).map((x) => Number(String(x).replace(/,/g, '')));
}

function audit(body) {
  const layerRaw = body.match(/质量是三个层面：([^\n。]+)/);
  if (!layerRaw) throw new Error('正文里没找到三层质量的列举');
  const layers = splitList(layerRaw[1]);
  const questions = splitList(clauseAfter(body, '都要过三问'));
  const comparables = splitList(clauseAfter(body, '可比还需要三个条件'));
  const varianceMeans = splitList(clauseAfter(body, '压方差的手段是可操作的'));
  const franchise = splitList(clauseAfter(body, '合同里必须写清三件事'), /，/);
  const perfRaw = body.match(/绩效要多指标([^。]+)。/);
  if (!perfRaw) throw new Error('正文里没找到绩效三原则');
  const performance = ['多指标', ...splitList(perfRaw[1])];
  const pairs = splitList(clauseAfter(body, '而是给指标配对'));

  const counts = {
    layers: layers.length,
    questions: questions.length,
    comparables: comparables.length,
    varianceMeans: varianceMeans.length,
    franchise: franchise.length,
    performance: performance.length,
    pairs: pairs.length,
  };
  const claims = [
    { label: '三层质量', want: 3, got: counts.layers },
    { label: '口径三问', want: 3, got: counts.questions },
    { label: '可比三条件', want: 3, got: counts.comparables },
    { label: '压方差七种手段', want: 7, got: counts.varianceMeans },
    { label: '加盟合同三件事', want: 3, got: counts.franchise },
    { label: '绩效三原则', want: 3, got: counts.performance },
    { label: '指标配对四对', want: 4, got: counts.pairs },
  ];
  const mismatched = claims.filter((c) => c.want !== c.got).map((c) => c.label);

  const [stores] = numbersBy(body, /有\s*(\d+)\s*家门店/);
  const [satisfaction] = numbersBy(body, /平均\s*(\d+)\s*分/);
  const [low, high] = numbersBy(body, /从\s*([\d.]+)%\s*到\s*([\d.]+)%/);
  const [uplift] = numbersBy(body, /人均消费比最低的门店高\s*(\d+)%/);

  const raw = { stores, satisfaction, low, high, uplift };
  const derived = {
    spread: high - low,
    ratio: high / low,
    threefoldClaim: high / low >= 3,
  };

  return {
    layers, questions, comparables, varianceMeans, franchise, performance, pairs,
    counts, claims, mismatched, raw, derived,
  };
}

function main() {
  const body = read();
  const a = audit(body);
  const secs = sections(body);
  const cites = [...new Set([...body.matchAll(/《([^》\n]+)》/g)].map((x) => x[1]))];

  console.log(`健康服务管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi(body)} 字 · 节 ${secs.length} 节 · 加粗判断 ${(body.match(/\*\*[^*\n]+\*\*/g) || []).length} 处 · 引书 ${cites.length} 部`);
  console.log('');
  console.log('结构清单（条数由正文数出，与句中的中文数字对账）：');
  console.log(`  三层质量 ${a.counts.layers} 层：${a.layers.join('／')}`);
  console.log(`  口径三问 ${a.counts.questions} 问：${a.questions.join('／')}`);
  console.log(`  可比三条件 ${a.counts.comparables} 条：${a.comparables.join('／')}`);
  console.log(`  压方差手段 ${a.counts.varianceMeans} 条：${a.varianceMeans.join('；')}`);
  console.log(`  加盟合同三件事 ${a.counts.franchise} 件`);
  console.log(`  绩效三原则 ${a.counts.performance} 条：${a.performance.join('／')}`);
  console.log(`  指标配对 ${a.counts.pairs} 对：${a.pairs.join('／')}`);
  console.log(`  → 对账${a.mismatched.length ? '不一致，须改稿：' + a.mismatched.join('、') : '一致'}`);
  console.log('');
  console.log('卷首数字复算：');
  const { raw, derived } = a;
  console.log(`  ${raw.stores} 家门店 · 满意度平均 ${raw.satisfaction} 分 · 检出率 ${raw.low}%–${raw.high}%`);
  console.log(`  → 极差 ${derived.spread} 个百分点；最高是最低的 ${derived.ratio.toFixed(2)} 倍`);
  console.log(`  → 正文说「差三倍」：${derived.threefoldClaim ? '倍数成立，说法站得住' : '倍数不足三倍，须改稿'}`);
  console.log(`  加项率最高门店人均消费高出 ${raw.uplift}% —— 体验指标与结局指标同时异动。`);
  console.log('');
  console.log('逐节字数：');
  for (const s of secs) {
    const share = hanzi(body) ? ((s.hanzi / hanzi(body)) * 100).toFixed(1) : '0.0';
    console.log(`  ${s.title.padEnd(26, '　')} ${String(s.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log('→ 判据：短板决定品牌，均值只决定财报；能被测量的往往不是最重要的，量化之外要留同行评议。');
  console.log('※ 数字均从本章 docs/zh.md 现算，正文一改即随之变化；本输出仅用于教学演示，不构成统计意见，也不构成对具体机构的评价。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, hanzi, sections, clauseAfter, splitList, audit };

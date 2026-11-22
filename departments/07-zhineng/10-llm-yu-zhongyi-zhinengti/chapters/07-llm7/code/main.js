#!/usr/bin/env node
/**
 * 大模型与中医智能体 · 第 7 章 知识不是喂给模型的背景，是它必须引用的证据
 * 课程: departments/07-zhineng/10-llm-yu-zhongyi-zhinengti/chapters/07-llm7/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文现读并复算三件事：
 *   ① 预算算术：全库 token、引用 token、占比、全库塞入的成本倍数；
 *   ② 倒数排序融合：按正文描述的命中与重合关系算出头部；
 *   ③ 引用契约的机器校验：编号是否存在、所引原文是否真是资料里的子串。
 * 校验器的正反例都是教学构造，不是任何系统的输出。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const readDoc = () => fs.readFileSync(DOC, 'utf8');
const toInt = (s) => Number(String(s).replace(/,/g, ''));

/** 「知识库 3,000 条，平均每条 100 字，合 30 万字，约 31 万 token」 */
function parseKb(text) {
  const m = text.match(/知识库\s*([\d,]+)\s*条，平均每条\s*(\d+)\s*字，合\s*([\d.]+)\s*万字，约\s*([\d.]+)\s*万 token/);
  if (!m) throw new Error('正文里没找到「条数 / 字数 / token」这一句');
  return { entries: toInt(m[1]), charsEach: Number(m[2]), totalCharsWan: Number(m[3]), totalTokensWan: Number(m[4]) };
}

/** 引用预算：引用条数、引用 token、占全库比例、全库塞入的成本倍数 */
function parseBudget(text) {
  const m = text.match(/引用\s*(\d+)\s*条，约\s*([\d,]+)\s*token——是全库的\s*([\d.]+)%/);
  const x = text.match(/单次成本涨\s*(\d+)\s*倍/);
  if (!m || !x) throw new Error('正文里没找到引用预算与成本倍数');
  return { refs: Number(m[1]), refTokens: toInt(m[2]), sharePct: Number(m[3]) / 100, costFactor: Number(x[1]) };
}

/** 「倒数排序…k 常取 60」 */
function parseRrfK(text) {
  const m = text.match(/常取\}[^0-9]{0,12}?(\d+)/) || text.match(/常取\s*(\d+)/);
  if (!m) throw new Error('正文里没找到倒数排序的 k');
  return Number(m[1]);
}

/** 「字面路给出 5 条（其中 3 条含「不寐」），语义路给出 5 条（其中 2 条与字面路重合），融合后取前 5 条」 */
function parseFusionStory(text) {
  const m = text.match(/字面路给出\s*(\d+)\s*条（其中\s*(\d+)\s*条含[\s\S]{0,12}?），语义路给出\s*(\d+)\s*条（其中\s*(\d+)\s*条与字面路重合），融合后取前\s*(\d+)\s*条/);
  if (!m) throw new Error('正文里没找到融合算例');
  return {
    literalK: Number(m[1]),
    literalHit: Number(m[2]),
    semanticK: Number(m[3]),
    overlap: Number(m[4]),
    takeTop: Number(m[5]),
  };
}

/** 倒数排序融合：RRF(d) = Σ 1/(k + rank)，rank 从 1 起 */
function rrf(lists, k) {
  const score = new Map();
  for (const list of lists) {
    list.forEach((id, i) => {
      score.set(id, (score.get(id) || 0) + 1 / (k + i + 1));
    });
  }
  return [...score.entries()]
    .map(([id, s]) => ({ id, score: s }))
    .sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1));
}

/** 引用契约的机器校验：编号必须在清单内；「」里的原文必须是资料里的子串 */
function validateCitations(answer, sources) {
  const refs = [...answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]));
  const uniq = [...new Set(refs)];
  const missingRefs = uniq.filter((n) => !sources[n]);
  const quotes = [...answer.matchAll(/[「“]([^」”]+)[」”]/g)].map((m) => m[1]);
  const pool = uniq.length ? uniq.filter((n) => sources[n]).map((n) => sources[n]) : Object.values(sources);
  const unverifiedQuotes = quotes.filter((q) => !pool.some((s) => s.includes(q)));
  return {
    refs: uniq,
    missingRefs,
    unverifiedQuotes,
    noRefs: uniq.length === 0,
    ok: uniq.length > 0 && missingRefs.length === 0 && unverifiedQuotes.length === 0,
  };
}

function main() {
  const doc = readDoc();
  const kb = parseKb(doc);
  const bud = parseBudget(doc);
  const k = parseRrfK(doc);
  const fus = parseFusionStory(doc);

  const totalChars = kb.entries * kb.charsEach;
  const totalTokens = kb.totalTokensWan * 1e4;
  const share = bud.refTokens / totalTokens;
  const factor = totalTokens / bud.refTokens;

  console.log('═══ 知识不是喂给模型的背景，是它必须引用的证据 ═══');
  console.log('');
  console.log('一、预算算术（正文口径现算）');
  console.log(`  ${kb.entries.toLocaleString('en-US')} 条 × ${kb.charsEach} 字 = ${totalChars.toLocaleString('en-US')} 字（正文 ${kb.totalCharsWan} 万字）`);
  console.log(`  全库约 ${(totalTokens / 1e4).toFixed(0)} 万 token；一次引用 ${bud.refs} 条约 ${bud.refTokens.toLocaleString('en-US')} token`);
  console.log(`  占比 ${(share * 100).toFixed(2)}%（正文 ${(bud.sharePct * 100).toFixed(2)}%）⇒ 全库塞入上下文成本约 ${factor.toFixed(0)} 倍（正文 ${bud.costFactor} 倍）`);
  console.log(`  问题不是「怎么喂进去」，是「怎么在 ${(share * 100).toFixed(1)}% 的预算里取出恰好那 ${bud.refs} 条」。`);
  console.log('');

  console.log(`二、融合用倒数排序（k=${k}，只看名次，不看分数）`);
  console.log(`  正文算例：字面路 ${fus.literalK} 条、语义路 ${fus.semanticK} 条、重合 ${fus.overlap} 条，融合取前 ${fus.takeTop} 条`);
  const literal = ['a1-不寐', 'a2', 'a3-不寐', 'a4', 'a5-不寐'].slice(0, fus.literalK);
  const semantic = ['a1-不寐', 'a3-不寐', 'b1', 'b2', 'b3'].slice(0, fus.semanticK);
  const fused = rrf([literal, semantic], k);
  fused.slice(0, fus.takeTop).forEach((x, i) => {
    const tag = literal.includes(x.id) && semantic.includes(x.id) ? '两路都命中' : '单路';
    console.log(`  ${i + 1}. ${x.id}  ${x.score.toFixed(5)}  ${tag}`);
  });
  const topIds = fused.slice(0, fus.overlap).map((x) => x.id).sort().join(',');
  console.log(`  重合的 ${fus.overlap} 条是否占据最前 ${fus.overlap} 位：${topIds === [...new Set(['a1-不寐', 'a3-不寐'])].sort().join(',') ? '是' : '否'}`);
  console.log('  融合的价值在头部：两路都认可的条目被顶上来，单路的偶发命中被压下去。');
  console.log('');

  const sources = {
    1: '《伤寒论·辨太阳病脉证并治上》第 12 条：太阳中风，阳浮而阴弱。',
    2: '证候条目「太阳中风」：主症 恶风、汗出；舌脉 脉浮缓；鉴别 与太阳伤寒之别在有无汗出。',
  };
  const good = '本条属太阳中风，原文「太阳中风，阳浮而阴弱」[1]，舌脉与鉴别见证候条目 [2]。';
  const badRef = '本条出自《温病条辨》[3]，可与太阳中风互参 [1]。';
  const badQuote = '原文「太阳病，脉浮紧」[1]，属表实证。';

  console.log('三、强制引用契约的机器校验（教学构造，不是任何系统的输出）');
  for (const [name, ans] of [['合规例', good], ['编号不在清单', badRef], ['原文对不上资料', badQuote]]) {
    const v = validateCitations(ans, sources);
    const why = v.noRefs ? '无任何引用编号' : v.missingRefs.length ? `编号不存在：${v.missingRefs.join(',')}` : v.unverifiedQuotes.length ? `原文不匹配：${v.unverifiedQuotes.join('／')}` : '通过';
    console.log(`  ${v.ok ? '✓' : '✗'} ${name}：${why}`);
  }
  console.log('  校验不过就退回重生成，或直接降级为「资料不足」——这是把「看起来有依据」变成「确实有依据」的唯一一步。');
  console.log('');
  console.log('※ 本章数字均从 docs/zh.md 现读现算；正反例为教学构造；输出仅用于教学演示，不构成诊疗、用药或处方建议。');
}

if (require.main === module) main();

module.exports = {
  DOC,
  readDoc,
  parseKb,
  parseBudget,
  parseRrfK,
  parseFusionStory,
  rrf,
  validateCitations,
  main,
};

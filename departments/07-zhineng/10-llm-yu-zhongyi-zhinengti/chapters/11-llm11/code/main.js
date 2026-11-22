#!/usr/bin/env node
/**
 * 大模型与中医智能体 · 第 11 章 延迟与单价不是运维指标，是临床能不能用的门槛
 * 课程: departments/07-zhineng/10-llm-yu-zhongyi-zhinengti/chapters/11-llm11/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文现读并复算四笔账：
 *   ① 月成本：输入／输出 token 量与费用、输出在费用里的占比；
 *   ② 结构化输出与缓存对单次与月成本的影响；
 *   ③ 延迟四段之和与「每份病案三次」的实际等待；
 *   ④ 本地部署的并发天花板：KV 缓存每 token 字节数、单会话占用、可并行会话数。
 * 单价是正文的假想值，不对应任何厂商报价。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const readDoc = () => fs.readFileSync(DOC, 'utf8');
const toInt = (s) => Number(String(s).replace(/,/g, ''));

/** 「日均 800 次问答，每次输入约 1,800 token、输出约 600 token，每月 22 个工作日」 */
function parseTraffic(text) {
  const m = text.match(/日均\s*([\d,]+)\s*次问答，每次输入约\s*([\d,]+)\s*token、输出约\s*([\d,]+)\s*token，每月\s*(\d+)\s*个工作日/);
  if (!m) throw new Error('正文里没找到日均量、token 量与工作日数');
  return { callsPerDay: toInt(m[1]), input: toInt(m[2]), output: toInt(m[3]), workdays: Number(m[4]) };
}

/** 「假想单价为每百万 token 输入 4 元、输出 16 元」 */
function parsePrice(text) {
  const m = text.match(/每百万 token 输入\s*([\d.]+)\s*元、输出\s*([\d.]+)\s*元/);
  if (!m) throw new Error('正文里没找到假想单价');
  return { inPerM: Number(m[1]), outPerM: Number(m[2]) };
}

/** 「检索 300 毫秒、推理 4 秒、校验 200 毫秒、渲染 100 毫秒，端到端 4.6 秒」 */
function parseLatency(text) {
  const m = text.match(/检索\s*(\d+)\s*毫秒、推理\s*([\d.]+)\s*秒、校验\s*(\d+)\s*毫秒、渲染\s*(\d+)\s*毫秒，端到端\s*([\d.]+)\s*秒/);
  if (!m) throw new Error('正文里没找到延迟四段');
  return { retrieveMs: Number(m[1]), inferS: Number(m[2]), verifyMs: Number(m[3]), renderMs: Number(m[4]), quotedS: Number(m[5]) };
}

/** 「32 层、32 个注意力头、每头维度 128，半精度」 */
function parseKvShape(text) {
  const m = text.match(/(\d+)\s*层、(\d+)\s*个注意力头、每头维度\s*(\d+)，半精度/);
  const w = text.match(/量化后权重约\s*([\d.]+)\s*GB/);
  const g = text.match(/(\d+)\s*GB 的卡装下权重后还剩约\s*([\d.]+)\s*GB/);
  const sess = text.match(/并行约\s*(\d+)–(\d+)\s*个长会话/);
  const r = text.match(/能服务的人数是 4k 上下文的\s*([\d.]+)\s*倍/);
  const shortCtx = text.match(/控制在\s*([\d,]+)\s*token 内/);
  if (!m || !w || !g || !sess || !r || !shortCtx) throw new Error('正文里没找到 KV 缓存算例');
  return {
    layers: Number(m[1]),
    heads: Number(m[2]),
    headDim: Number(m[3]),
    weightsGB: Number(w[1]),
    cardGB: Number(g[1]),
    freeGB: Number(g[2]),
    sessions: [Number(sess[1]), Number(sess[2])],
    ratioQuoted: Number(r[1]),
    shortCtx: toInt(shortCtx[1]),
  };
}

/** 「30% 命中率，月成本降到 207 元」 */
function parseCache(text) {
  const m = text.match(/(\d+)%\s*命中率，月成本降到\s*(\d+)\s*元/);
  if (!m) throw new Error('正文里没找到缓存命中率的算例');
  return { hit: Number(m[1]) / 100, monthly: Number(m[2]) };
}

/** 「把一段 600 字的解释换成 8 个字段共 150 token」 */
function parseStructured(text) {
  const m = text.match(/换成\s*(\d+)\s*个字段共\s*([\d,]+)\s*token，单次输出费用从\s*([\d.]+)\s*元降到\s*([\d.]+)\s*元/);
  if (!m) throw new Error('正文里没找到结构化输出的费用对比');
  return { fields: Number(m[1]), tokens: toInt(m[2]), before: Number(m[3]), after: Number(m[4]) };
}

const toGiB = (bytes) => bytes / 1024 ** 3;

function main() {
  const doc = readDoc();
  const tr = parseTraffic(doc);
  const price = parsePrice(doc);
  const lat = parseLatency(doc);
  const kv = parseKvShape(doc);
  const cache = parseCache(doc);
  const st = parseStructured(doc);

  const monthCalls = tr.callsPerDay * tr.workdays;
  const inTokens = tr.input * monthCalls;
  const outTokens = tr.output * monthCalls;
  const inCost = (inTokens / 1e6) * price.inPerM;
  const outCost = (outTokens / 1e6) * price.outPerM;
  const total = inCost + outCost;
  const perCall = total / monthCalls;

  console.log('═══ 延迟与单价不是运维指标，是临床能不能用的门槛 ═══');
  console.log('');
  console.log('一、月成本（正文 traffic 与假想单价现读）');
  console.log(`  ${tr.callsPerDay} 次/日 × ${tr.workdays} 日 = ${monthCalls.toLocaleString('en-US')} 次/月`);
  console.log(`  输入 ${(inTokens / 1e6).toFixed(2)} M → ${inCost.toFixed(1)} 元；输出 ${(outTokens / 1e6).toFixed(2)} M → ${outCost.toFixed(1)} 元`);
  console.log(`  合计 ${total.toFixed(1)} 元/月，单次约 ${perCall.toFixed(4)} 元`);
  console.log(`  输出占 token 量 ${((outTokens / (inTokens + outTokens)) * 100).toFixed(0)}%，却占费用 ${((outCost / total) * 100).toFixed(0)}% —— 优化方向在输出侧。`);
  console.log('');

  console.log('二、两项立刻见效的改动');
  const afterTokens = st.tokens;
  const afterCost = (afterTokens / 1e6) * price.outPerM;
  console.log(`  结构化输出：${st.tokens} token ⇒ 单次输出 ${afterCost.toFixed(4)} 元（正文 ${st.before} 元 → ${st.after} 元）`);
  console.log(`    按每月 ${monthCalls.toLocaleString('en-US')} 次重算，输出费用从 ${outCost.toFixed(0)} 元降到 ${(afterCost * monthCalls).toFixed(0)} 元。`);
  console.log(`  缓存：命中率 ${(cache.hit * 100).toFixed(0)}% ⇒ 月成本 ${(total * (1 - cache.hit)).toFixed(0)} 元（正文 ${cache.monthly} 元）；缓存须随知识库版本失效。`);
  console.log('');

  const sum = (lat.retrieveMs + lat.inferS * 1000 + lat.verifyMs + lat.renderMs) / 1000;
  console.log('三、延迟四段（钱能摊薄，秒不能）');
  console.log(`  检索 ${lat.retrieveMs} ms ＋ 推理 ${(lat.inferS * 1000).toFixed(0)} ms ＋ 校验 ${lat.verifyMs} ms ＋ 渲染 ${lat.renderMs} ms = ${sum.toFixed(1)} s（正文 ${lat.quotedS}）`);
  console.log(`  每份病案用三次 ⇒ ${(sum * 3).toFixed(1)} s 的等待；对「查一条条文」太慢，对「整理一份病案」可以接受。`);
  console.log('  流式不缩短总时长，只把首字提前：感知等待降下来，排队的焦虑也降下来。');
  console.log('');

  const perTokenBytes = 2 * kv.layers * kv.heads * kv.headDim * 2;
  const perTokenMiB = perTokenBytes / 1024 ** 2;
  const sessionBytes = perTokenBytes * 4000;
  const fits = Math.floor((kv.cardGB - kv.weightsGB) * 1024 ** 3 / sessionBytes);
  console.log('四、本地部署的真实天花板是显存里的 KV 缓存');
  console.log(`  每 token = 2 × ${kv.layers} 层 × ${kv.heads} 头 × ${kv.headDim} 维 × 2 字节 = ${perTokenBytes.toLocaleString('en-US')} 字节 ≈ ${perTokenMiB.toFixed(2)} MiB`);
  console.log(`  4,000 token 会话 ≈ ${toGiB(sessionBytes).toFixed(2)} GiB；权重 ${kv.weightsGB} GB，卡 ${kv.cardGB} GB`);
  console.log(`  剩余 ${kv.freeGB} GB ÷ ${toGiB(sessionBytes).toFixed(2)} GiB ⇒ 约 ${fits} 路并发（正文 ${kv.sessions[0]}–${kv.sessions[1]}）`);
  console.log(`  上下文提到 32k：单会话 KV ×8，并发掉到个位数；控制在 ${kv.shortCtx.toLocaleString('en-US')} token：能服务的人数是 4k 的 ${(4000 / kv.shortCtx).toFixed(1)} 倍（正文 ${kv.ratioQuoted}）。`);
  console.log('  上下文预算是最有效的容量杠杆，比换卡便宜。');
  console.log('');
  console.log('※ 本章数字均从 docs/zh.md 现读现算；单价为正文假想值，不对应任何厂商报价或实测性能；输出仅用于教学演示，不构成采购、合规或技术选型建议。');
}

if (require.main === module) main();

module.exports = {
  DOC,
  readDoc,
  parseTraffic,
  parsePrice,
  parseLatency,
  parseKvShape,
  parseCache,
  parseStructured,
  main,
};

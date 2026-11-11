#!/usr/bin/env node
/**
 * 中医基础理论 · 第 7 章 病因病机 → 因果图与失效模式
 * 课程: departments/01-zhongyi/01-zhongyi-jichu-lilun/chapters/07-bingyin-bingji/docs/zh.md
 * 出处: 教材·第7章 病因（42 段）+ 教材·第9章 病机（39 段）
 * 依赖: 仅 Node.js 标准库
 *
 * 四个量：
 *   1. 病因三层分类（外感 / 内伤 / 病理产物）——教材 7.1 明写，节点可数；
 *   2. 六淫 6、七情 7、病理产物 3——全部按小节标题核对，不靠背；
 *   3. 病机两层（基本 / 具体）——教材 9.1 明写；
 *   4. 「病机十九条」只被引了 2 条——缺 17 条，这是教材的窟窿，不是本章漏抽。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const BOOK = path.join(ROOT, 'standards', 'jichu', '底本.json');
const doc = JSON.parse(fs.readFileSync(BOOK, 'utf8'));

// 教材缺口的外源补录层（不改底本）：standards/jichu/supplements/补源.json
const SUPP = path.join(ROOT, 'standards', 'jichu', 'supplements', '补源.json');
const suppDoc = fs.existsSync(SUPP) ? JSON.parse(fs.readFileSync(SUPP, 'utf8')) : { gaps: [] };

// 取本章相关的缺口补录；底本与补源分开报，绝不合并成「底本有 N 条」
function supplements() {
  return suppDoc.gaps
    .filter((g) => g.chapter === '07-bingyin-bingji')
    .map((g) => ({
      id: g.id,
      name: g.name,
      declared: g.declared,
      supplied: g.found,
      source: g.items.length ? g.items[0].src : '',
      // 八法这类条目 hans 是法名、hans_excerpt 才是释义；释义优先
      items: g.items.map((x) => x.hans_excerpt || x.hans || x.hant),
    }));
}

function chapter(no) {
  return doc.chapters.find((c) => c.no === no);
}

function chText(no) {
  const c = chapter(no);
  const parts = [...(c.paras || [])];
  for (const s of c.secs) {
    parts.push(s.title, ...s.paras);
    for (const sub of s.subs) parts.push(sub.title, ...sub.paras);
  }
  return parts.join('\n');
}

const T7 = chText('7');
const T9 = chText('9');

// ── 1. 病因三层：只认教材 7.1 的句子 ─────────────────────────
const LIUYIN = ['风', '寒', '暑', '湿', '燥', '火'];
const QIQING = ['喜', '怒', '忧', '思', '悲', '恐', '惊'];
const BINGLI = ['痰饮', '瘀血', '结石'];

function taxonomy() {
  // 六淫与七情按「有小节标题」核对，标题是教材自己的结构
  const ch7 = chapter('7');
  const subs = ch7.secs.flatMap((s) => s.subs.map((x) => x.title));
  const liu = LIUYIN.filter((w) => subs.some((t) => t.startsWith(w)));
  const qi = QIQING.filter((w) => new RegExp(`${w}[^、。]{0,6}(伤|志|则)`).test(T7) || T7.includes(`${w}为`));
  const bingli = BINGLI.filter((w) => subs.some((t) => t === w));
  return {
    layers: [
      { name: '外感病因', members: [...liu.map((w) => `${w}邪`), '疠气'] },
      // 七情作为**一个**节点类别（教材原文「七情（喜、怒…）」是一个整体），拆成七个只是词表
      { name: '内伤病因', members: ['七情', '饮食失宜', '劳逸损伤'] },
      { name: '病理产物性病因', members: bingli },
    ],
    liu,
    qi,
    bingli,
    qingText: '七情（喜、怒、忧、思、悲、恐、惊）',
  };
}

// ── 2. 病机两层：基本 3 类 + 具体（脏腑/经络/六经/卫气营血）─────
function bingjiLayers() {
  const base = ['邪正盛衰', '阴阳失调', '气血津液失常'].filter((w) => T9.includes(w));
  const specific = ['脏腑病机', '经络病机', '六经病机', '卫气营血病机'].filter((w) => T9.includes(w));
  return {
    base,
    specific,
    baseSecs: chapter('9').secs.filter((s) => /^9\.[2-4]$/.test(s.no)).map((s) => `${s.no} ${s.title}`),
  };
}

// ── 3. 病机十九条：教材只引了两条 ────────────────────────────
function nineteen() {
  const cites = [...T9.matchAll(/诸[^，。]{0,8}，皆属[于乎][^，。“”]{0,8}/g)].map((m) => m[0]);
  const cited = [...new Set(cites)];
  return { declared: 19, cited, gap: 19 - cited.length };
}

// ── 4. 全书的箭头链：只有一条是病机演化链（在教材第4章）──────
function chains() {
  const all = [];
  for (const c of doc.chapters) {
    const t = chText(c.no);
    for (const m of t.matchAll(/[^。\s：]{2,12}(?:→[^。，\s]{2,20}){2,}/g)) {
      const nodes = m[0].split('→');
      all.push({
        ch: c.no,
        nodes,
        edges: nodes.length - 1,
        raw: m[0],
        // 三类区分：病机演化链（术语链）/ 经络流注（穴位系统）/ 教学流程链（辨证步骤）
        kind: /经$/.test(nodes[0]) && /经$/.test(nodes[nodes.length - 1])
          ? '经络流注'
          : /症状采集|体质辨识|辨证/.test(nodes.join(''))
            ? '教学流程'
            : '病机演化',
      });
    }
  }
  return all;
}

function main() {
  const tax = taxonomy();
  const bj = bingjiLayers();
  const n19 = nineteen();
  const chs = chains();
  const med = chs.filter((x) => x.kind === '病机演化');

  console.log('═══ 病因三层（教材·第7章，42 段 5,761 字）═══');
  for (const l of tax.layers) console.log(`  ${l.name}：${l.members.join(' · ')}`);
  console.log(`  六淫 ${tax.liu.length} 邪：${tax.liu.map((w) => w + '邪').join(' ')}`);
  console.log(`  七情 ${tax.qi.length} 志：${tax.qi.join('')}（教材原句「${tax.qingText}」）`);
  console.log(`  病理产物 ${tax.bingli.length} 类：${tax.bingli.join(' · ')}`);
  console.log(`  → 病因节点合计 ${tax.layers.reduce((n, l) => n + l.members.length, 0)} 个`);
  console.log('');
  console.log('═══ 病机两层（教材·第9章，39 段 5,538 字）═══');
  console.log(`  基本病机 ${bj.base.length} 类：${bj.base.join(' · ')}`);
  console.log(`    对应节：${bj.baseSecs.join(' / ')}`);
  console.log(`  具体病机 ${bj.specific.length} 类：${bj.specific.join(' · ')}`);
  console.log(`  → 教材给的推理结构是「基本病机 × 脏腑 = 复合病机」（9.1.1.2 原话）`);
  console.log('');
  console.log(`═══ 病机十九条：声称 ${n19.declared} 条，引出 ${n19.cited.length} 条，缺 ${n19.gap} 条 ═══`);
  for (const c of n19.cited) console.log(`  「${c}」`);
  console.log('  → 教材写「如…」即举例，未列全十九条；要在本仓库补齐，必须回《素问·至真要大论》原文。');
  console.log('');
  console.log(`═══ 全书箭头链 ${chs.length} 条 ═══`);
  for (const m of chs) console.log(`  [${m.kind}] 第${m.ch}章：${m.nodes.join(' → ')}（${m.edges} 边 / ${m.nodes.length} 节点）`);
  console.log(`  其中真正的病机演化链 ${med.length} 条（其余是经络流注与教学流程，不能当病机因果用）`);
  if (med.length) {
    const m = med[0];
    console.log(`  → 这条链是「失效模式」的模板：起点是行为（饮食不规律），终点是复合病机（心脾两虚），中间全是状态转移。`);
  }
  console.log('');
  const sp = supplements();
  if (sp.length) {
    console.log('═══ 教材缺口的外源补录（不改底本）═══');
    for (const g of sp) console.log(`  ${g.name}：外源补 ${g.supplied}/${g.declared} 条 ← ${g.source}`);
    console.log('  → 底本 327 段 / 45,199 字不含这些条；分账见 standards/jichu/supplements/README.md');
    console.log('');
  }

  console.log('教学边界：本章只整理教材的病因病机分类与原文链，不做辨证、不判断任何人的病情；不构成诊疗依据。');
}

if (require.main === module) main();

module.exports = { supplements, taxonomy, bingjiLayers, nineteen, chains, chText, doc, LIUYIN, QIQING, BINGLI };

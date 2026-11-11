#!/usr/bin/env node
/**
 * 中医诊断学 · 第 10 章 六经与卫气营血（教材第 10/11/12 章）：三套坐标的结构对照
 * 课程: departments/01-zhongyi/05-zhongyi-zhen-duan-xue/chapters/10-liujing-weifen/docs/zh.md
 * 出处: 教材·第10章（六经）· 教材·第11章（卫气营血）· 教材·第12章（三焦）
 * 依赖: 仅 Node.js 标准库
 *
 * 教材把三套辨证纲领分写成三章（10 / 11 / 12），本章只做一件事：
 * **把它们摊在同一张表上数节点，并且明说这不是同一件事。**
 *
 *   六经      799 字 · 6 节点（太阳/阳明/少阳/太阴/少阴/厥阴）· 传变 5 式
 *   卫气营血  612 字 · 4 节点（卫/气/营/血）           · 传变 2（顺传/逆传）
 *   三焦      356 字 · 3 节点（上/中/下）              · 传变 1 条（内含顺、逆两支）
 *   ────────────────────────────────────────────────
 *   合计     1,767 字 · 节点 13 · 每节点平均 135.9 字
 *
 * 口径（写死在代码里，可复核）：
 *   节点 = 教材小节标题所立的阶段数（六经 6 + 卫气营血 4 + 三焦 3 = 13）。
 *   不展开亚型（太阳经证/腑证、少阴寒化/热化），一展开就不是 13 了 —— 见 docs 的边界一节。
 *   字数只数正文段，与教材 counts.chars 同口径。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const BOOK = path.join(ROOT, 'standards', 'zhenduan', '底本.json');
const doc = JSON.parse(fs.readFileSync(BOOK, 'utf8'));

const len = (s) => [...s].length;

function chapter(no) {
  const c = doc.chapters.find((x) => x.no === String(no));
  if (!c) throw new Error(`教材中找不到第 ${no} 章`);
  return c;
}

function secChars(sec) {
  let n = 0;
  for (const p of sec.paras) n += len(p);
  for (const sub of sec.subs) for (const p of sub.paras) n += len(p);
  return n;
}

function chapterChars(c) {
  let n = 0;
  for (const p of c.paras) n += len(p);
  for (const sec of c.secs) n += secChars(sec);
  return n;
}

function corpus(c) {
  const out = [];
  for (const p of c.paras) out.push(p);
  for (const sec of c.secs) {
    out.push(sec.title, ...sec.paras);
    for (const sub of sec.subs) {
      out.push(sub.title, ...sub.paras);
      for (const it of sub.items || []) out.push(it.title);
    }
  }
  return out.join('\n');
}

// 三套坐标：节点与传变名都逐字取自教材，节点顺序由教材的箭头链锁定（见 chains()）
const SYSTEMS = [
  {
    key: 'liujing',
    name: '六经',
    ch: '10',
    role: '外感热病阶段',
    nodes: [
      { name: '太阳', probe: '太阳病证' },
      { name: '阳明', probe: '阳明病证' },
      { name: '少阳', probe: '少阳病证' },
      { name: '太阴', probe: '太阴病证' },
      { name: '少阴', probe: '少阴病证' },
      { name: '厥阴', probe: '厥阴病证' },
    ],
    // 10.2.1 一段列 5 式：循经传 / 越经传 / 直中 / 合病 / 并病
    transmissions: ['循经传', '越经传', '直中', '合病', '并病'],
    groups: 5,
  },
  {
    key: 'weiqi',
    name: '卫气营血',
    ch: '11',
    role: '温病层次',
    nodes: [
      { name: '卫分', probe: '卫分证' },
      { name: '气分', probe: '气分证' },
      { name: '营分', probe: '营分证' },
      { name: '血分', probe: '血分证' },
    ],
    transmissions: ['顺传', '逆传'],
    groups: 2,
  },
  {
    key: 'sanjiao',
    name: '三焦',
    ch: '12',
    role: '温病部位',
    nodes: [
      { name: '上焦', probe: '上焦病证' },
      { name: '中焦', probe: '中焦病证' },
      { name: '下焦', probe: '下焦病证' },
    ],
    // 12.2.1 只有一段，一段里同时讲顺传与逆传：按"条"数是 1，按"支"数是 2
    transmissions: ['顺传', '逆传'],
    groups: 1,
  },
];

const TOTAL_NODES = SYSTEMS.reduce((n, s) => n + s.nodes.length, 0); // 13

function bookShape() {
  return {
    chapters: doc.chapters.length,
    secs: doc.counts.secs,
    subs: doc.counts.subs,
    paras: doc.counts.paras,
    chars: doc.counts.chars,
    sha256: doc.source.sha256,
  };
}

function systems() {
  return SYSTEMS.map((s) => {
    const c = chapter(s.ch);
    const chars = chapterChars(c);
    const text = corpus(c);
    return {
      key: s.key,
      name: s.name,
      ch: s.ch,
      title: c.title,
      role: s.role,
      chars,
      declared: c.counts.chars,
      match: chars === c.counts.chars,
      secs: c.secs.length,
      subs: c.counts.subs,
      paras: c.counts.paras,
      nodes: s.nodes.length,
      perNode: +(chars / s.nodes.length).toFixed(1),
      transmissions: s.transmissions.length,
      groups: s.groups,
      verified: s.nodes.map((n) => ({ name: n.name, inText: text.includes(n.probe) })),
      allPresent: s.nodes.every((n) => text.includes(n.probe)),
    };
  });
}

function totals() {
  const rows = systems();
  const chars = rows.reduce((n, r) => n + r.chars, 0);
  return {
    rows,
    chars,
    nodes: TOTAL_NODES,
    groupSum: rows.reduce((n, r) => n + r.groups, 0),
    branchSum: rows.reduce((n, r) => n + r.transmissions, 0),
    avgPerNode: +(chars / TOTAL_NODES).toFixed(1),
    share: rows.map((r) => ({ name: r.name, share: r.chars / chars })),
    thinnest: rows.slice().sort((a, b) => a.chars - b.chars)[0],
    thickest: rows.slice().sort((a, b) => b.chars - a.chars)[0],
    // 每节点最厚的不是六经（799 字/6 节点），而是卫气营血（612 字/4 节点 = 153.0）
    thickestPerNode: rows.slice().sort((a, b) => b.perNode - a.perNode)[0],
    // 三焦每节点 118.7 字，只有卫气营血（153.0）的 78%
    thinRatio: +((rows[2].perNode / rows[1].perNode) * 100).toFixed(0),
  };
}

// 节点清单：13 个阶段，带所属坐标与序号
function nodesTable() {
  const out = [];
  for (const s of SYSTEMS) {
    const row = systems().find((x) => x.key === s.key);
    s.nodes.forEach((n, i) => {
      out.push({ system: s.name, ch: s.ch, order: i + 1, name: n.name, probe: n.probe, inText: row.verified[i].inText });
    });
  }
  return out;
}

// 顺序不靠记忆：三套坐标的箭头链都必须能在教材里找到
const CHAINS = [
  { key: 'liujing', ch: '10', text: '太阳→阳明→少阳→太阴→少阴→厥阴' },
  { key: 'weiqi', ch: '11', text: '卫→气→营→血' },
  { key: 'sanjiao', ch: '12', text: '上焦→中焦→下焦' },
];

function chains() {
  return CHAINS.map((c) => {
    const text = corpus(chapter(c.ch));
    return { ...c, found: text.includes(c.text), nodes: c.text.split('→').length };
  });
}

// 「不是同一件事」也要有文本依据：三章各自的自我定位句
const ROLES = [
  { ch: '10', key: 'liujing', probe: '外感热病的辨证纲领' },
  { ch: '11', key: 'weiqi', probe: '与六经辨证互为补充' },
  { ch: '12', key: 'sanjiao', probe: '三焦辨证与卫气营血辨证相辅相成' },
];

function roles() {
  return ROLES.map((r) => ({ ...r, found: corpus(chapter(r.ch)).includes(r.probe) }));
}

// 节级分布：传变段有多薄
function sections() {
  const out = [];
  for (const s of SYSTEMS) {
    for (const sec of chapter(s.ch).secs) {
      out.push({ system: s.name, no: sec.no, title: sec.title, chars: secChars(sec) });
    }
  }
  return out;
}

function gaps() {
  const rows = systems();
  const secs = sections();
  const thin = secs.slice().sort((a, b) => a.chars - b.chars)[0];
  return {
    thinSection: thin,
    // 六经 6 证花掉 799 字里的 607 字，传变只有 192 字
    liujingSplit: secs.filter((s) => s.system === '六经').map((s) => [s.no, s.chars]),
    // 少阴一节点内含寒化/热化两个亚型；太阳含经证/腑证 —— 13 是"标题口径"
    subTyped: ['太阳', '少阴'],
    note: '节点数按教材小节标题计（6+4+3=13）；太阳经证/腑证、少阴寒化/热化未展开，展开则超过 13。',
  };
}

function main() {
  const b = bookShape();
  const t = totals();
  const nt = nodesTable();
  const ch = chains();
  const ro = roles();
  const gp = gaps();

  console.log('═══ 教材本体（中医诊断学）═══');
  console.log(`  ${b.chapters} 章 · ${b.secs} 节 · ${b.subs} 小节 · ${b.paras} 段 · ${b.chars.toLocaleString()} 字`);
  console.log(`  sha256 ${b.sha256.slice(0, 16)}`);
  console.log('');
  console.log('═══ 三章：教材把三套坐标并列写在 10 / 11 / 12 ═══');
  for (const r of t.rows) {
    console.log(`  第${r.ch}章 ${r.title}：${r.secs} 节 · ${r.paras} 段 · ${r.chars} 字 · 节点 ${r.nodes} · 每节点 ${r.perNode.toFixed(1)} 字`);
  }
  console.log(`  合计 ${t.chars} 字（六经 ${(t.share[0].share * 100).toFixed(1)}% / 卫气营血 ${(t.share[1].share * 100).toFixed(1)}% / 三焦 ${(t.share[2].share * 100).toFixed(1)}%）`);
  console.log(`  逐章重算 = 声明字数：${t.rows.every((r) => r.match) ? '✓ 三章全对' : '✗ 有章对不上'}`);
  console.log('');
  console.log('═══ 13 个节点 ═══');
  for (const n of nt) {
    console.log(`  ${n.system.padEnd(4, '　')} ${String(n.order).padStart(2)} ${n.name}${n.inText ? '✓' : '✗'}`);
  }
  console.log(`  节点 ${t.nodes} = 6 + 4 + 3；每节点平均 ${t.avgPerNode} 字`);
  console.log(`  三焦最薄：${t.thinnest.chars} 字 / ${t.thinnest.nodes} 节点 = 每节点 ${t.thinnest.perNode.toFixed(1)} 字（是卫气营血 ${t.thickestPerNode.perNode.toFixed(1)} 字的 ${t.thinRatio}%）`);
  console.log('');
  console.log('═══ 传变：5 + 2 + 1 = 8 条（9 支）═══');
  for (const r of t.rows) {
    console.log(`  ${r.name}：${r.groups} 条 / ${r.transmissions} 支`);
  }
  console.log(`  条目合计 ${t.groupSum}；分支合计 ${t.branchSum}（三焦那 1 条内含顺传、逆传两支）`);
  console.log('');
  console.log('═══ 顺序不能靠背：箭头链在教材里 ═══');
  for (const c of ch) console.log(`  第${c.ch}章 ${c.text}（${c.nodes} 节点）${c.found ? '✓' : '✗'}`);
  console.log('');
  console.log('═══ 三套坐标不是同一件事 ═══');
  console.log('  六经 = 外感热病阶段 ｜ 卫气营血 = 温病层次 ｜ 三焦 = 温病部位');
  for (const r of ro) console.log(`  第${r.ch}章「${r.probe}」${r.found ? '✓' : '✗'}`);
  console.log('  → 教材并列三章，本章只做结构对照，不做等同：13 是一个计数量，不是一张统一的分类表。');
  console.log('');
  console.log('═══ 缺口 ═══');
  console.log(`  最薄的一节：${gp.thinSection.no} ${gp.thinSection.title} —— ${gp.thinSection.chars} 字`);
  console.log(`  六经内部：分类段 ${gp.liujingSplit[0][1]} 字 / 传变段 ${gp.liujingSplit[1][1]} 字`);
  console.log(`  ${gp.note}`);
  console.log('');
  console.log('教学边界：本章只做教材第10/11/12章的字数与节点结构对照，不判定任何人处于哪一期，不构成诊断依据。');
}

if (require.main === module) main();

module.exports = {
  bookShape, systems, totals, nodesTable, chains, roles, sections, gaps,
  chapter, secChars, chapterChars, corpus,
  SYSTEMS, CHAINS, ROLES, TOTAL_NODES, doc,
};

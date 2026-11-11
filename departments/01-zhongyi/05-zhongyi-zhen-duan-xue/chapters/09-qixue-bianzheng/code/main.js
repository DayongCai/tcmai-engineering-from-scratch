#!/usr/bin/env node
/**
 * 中医诊断学 · 第 9 章 气血津液辨证（教材第 7 章 病性辨证）：五节的字数账
 * 课程: departments/01-zhongyi/05-zhongyi-zhen-duan-xue/chapters/09-qixue-bianzheng/docs/zh.md
 * 出处: 教材·第7章（standards/zhenduan/底本.json）
 * 依赖: 仅 Node.js 标准库
 *
 * 这一章只做一件事：**把「病性辨证」五节的笔墨称一遍，再把证候名逐字核一遍**。
 *
 *   7.1 六淫与疫疠 413 字（21.2%）   7.2 七情内伤 175 字（9.0%）
 *   7.3 饮食劳逸与外伤 163 字（8.4%） 7.4 气血 770 字（39.6%）  7.5 津液 424 字（21.8%）
 *
 * 三个可以直接复核的结构事实：
 *   ① 气血一节 770 字，是七情（175 字）的 4.40 倍；气血 + 津液 = 1,194 字，占 61.4%。
 *   ② 六淫在教材里只有 3 个条目，却装了 6 个证候（条目 ≠ 证候）。
 *   ③ 气血 14 个证候名 = 单轴 9 + 双轴 5；5 个同病证的名字里同时含「气」「血」二字，
 *      命名本身就是一张 2×2 交叉表 —— 这不是我的归纳，是名字里写着的。
 *
 * 字数口径：只数正文段（不含节标题/小节标题/条目标题），与教材 counts.chars 同口径。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const BOOK = path.join(ROOT, 'standards', 'zhenduan', '底本.json');
const doc = JSON.parse(fs.readFileSync(BOOK, 'utf8'));

const CH = '7'; // 教材第 7 章 = 课程第 9 章

const len = (s) => [...s].length;

function chapter(no = CH) {
  const c = doc.chapters.find((x) => x.no === no);
  if (!c) throw new Error(`教材中找不到第 ${no} 章`);
  return c;
}

// 节字数 = 本节正文段字数之和（小节正文也算在本节内）
function secChars(sec) {
  let n = 0;
  for (const p of sec.paras) n += len(p);
  for (const sub of sec.subs) for (const p of sub.paras) n += len(p);
  return n;
}

function chapterChars(c = chapter()) {
  let n = 0;
  for (const p of c.paras) n += len(p);
  for (const sec of c.secs) n += secChars(sec);
  return n;
}

// 可检索语料：正文 + 节标题 + 小节标题 + 条目标题（证候名常常只出现在标题里）
function corpus(c = chapter()) {
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

const sec = (no) => {
  const s = chapter().secs.find((x) => x.no === no);
  if (!s) throw new Error(`教材中找不到第 ${no} 节`);
  return s;
};

function itemsOf(no) {
  return sec(no).subs.flatMap((u) => u.items || []);
}

function bookShape() {
  const c = chapter();
  const total = doc.counts.chars;
  return {
    chapters: doc.chapters.length,
    secs: doc.counts.secs,
    subs: doc.counts.subs,
    paras: doc.counts.paras,
    chars: total,
    sha256: doc.source.sha256,
    here: { no: c.no, title: c.title, secs: c.secs.length, paras: c.counts.paras, chars: c.counts.chars },
    share: c.counts.chars / total,
  };
}

function sectionTable() {
  const c = chapter();
  const total = chapterChars(c);
  return c.secs.map((s) => {
    const chars = secChars(s);
    return {
      no: s.no,
      title: s.title,
      chars,
      share: chars / total,
      subs: s.subs.length,
      items: (s.subs || []).reduce((n, u) => n + (u.items || []).length, 0),
    };
  });
}

// 五节权重：气血 / 津液 / 六淫 / 七情 / 饮食劳逸
function weights() {
  const rows = sectionTable();
  const total = rows.reduce((n, r) => n + r.chars, 0);
  const at = (no) => rows.find((r) => r.no === no).chars;
  return {
    total,
    qixue: { chars: at('7.4'), share: at('7.4') / total },
    jinye: { chars: at('7.5'), share: at('7.5') / total },
    liuyin: { chars: at('7.1'), share: at('7.1') / total },
    qiqing: { chars: at('7.2'), share: at('7.2') / total },
    yinshi: { chars: at('7.3'), share: at('7.3') / total },
    // 气血 ÷ 七情：教材内部最悬殊的一对
    ratio: +(at('7.4') / at('7.2')).toFixed(2),
    // 气血 + 津液 占病性辨证的比重
    qixueJinyeShare: (at('7.4') + at('7.5')) / total,
    // 每段平均字数（19 段）
    perPara: +(total / chapter().counts.paras).toFixed(1),
  };
}

// 六淫：从条目标题解析证候名（条目 7.1.1.3 一条装四证）
function liuyin() {
  const sub = sec('7.1').subs.find((u) => u.no === '7.1.1');
  const names = [];
  for (const it of sub.items || []) {
    const clean = it.title.replace(/（[^）]*）/g, '');
    for (const part of clean.split('、')) {
      const name = part.replace(/证$/, '').trim();
      if (name && !names.includes(name)) names.push(name);
    }
  }
  const text = corpus();
  return {
    names,
    items: (sub.items || []).length,
    verified: names.map((n) => ({ name: n, inText: text.includes(`${n}证`) })),
    allPresent: names.every((n) => text.includes(`${n}证`)),
    // 条目数 3 < 证候数 6：标题是"打包"的
    packed: names.length > (sub.items || []).length,
  };
}

function yili() {
  const sub = sec('7.1').subs.find((u) => u.no === '7.1.2');
  return {
    items: (sub.items || []).length,
    chars: sub.paras.reduce((n, p) => n + len(p), 0),
    present: corpus().includes('疫疠证候'),
  };
}

// 七情：教材只给两条（直接伤脏 / 影响气机），没有独立的「七情证候」命名
function qiqing() {
  const s = sec('7.2');
  const items = itemsOf('7.2');
  const text = corpus();
  return {
    chars: secChars(s),
    paras: s.paras.length + s.subs.reduce((n, u) => n + u.paras.length, 0),
    subs: s.subs.length,
    items: items.length,
    titles: items.map((i) => i.title),
    hasDirectOrgan: text.includes('七情直接伤脏'),
    hasQiMovement: text.includes('七情影响气机'),
  };
}

const QI = ['气虚', '气陷', '气滞', '气逆'];
const XUE = ['血虚', '血脱', '血瘀', '血热', '血寒'];
const TONGBING = ['气滞血瘀', '气虚血瘀', '气血两虚', '气不摄血', '气随血脱'];

// 气血 14 证：9 个本证 + 5 个同病证；每个名字都要能在教材里逐字找到
function qixue() {
  const text = corpus();
  const row = (n) => ({ name: n, present: text.includes(`${n}证`) });
  const single = [...QI, ...XUE].map(row);
  const dual = TONGBING.map(row);
  return {
    chars: secChars(sec('7.4')),
    qi: single.slice(0, QI.length),
    xue: single.slice(QI.length),
    dual,
    singleCount: single.length,
    dualCount: dual.length,
    total: single.length + dual.length,
    allPresent: [...single, ...dual].every((x) => x.present),
    // 双轴证的名字里同时含「气」「血」——交叉表的字面证据
    dualBothChars: dual.filter((x) => /气/.test(x.name) && /血/.test(x.name)).length,
  };
}

const JINYE = [
  { name: '津亏', probe: '津亏证' },
  { name: '液脱', probe: '液脱证' },
  { name: '痰', probe: '痰证' },
  { name: '痰饮', probe: '痰饮（饮停胃肠' },
  { name: '悬饮', probe: '悬饮（饮停胸胁' },
  { name: '溢饮', probe: '溢饮（饮溢四肢' },
  { name: '支饮', probe: '支饮（饮停胸肺' },
  { name: '水停', probe: '水停证' },
];

function jinye() {
  const text = corpus();
  const rows = JINYE.map((x) => ({ ...x, present: text.includes(x.probe) }));
  return {
    chars: secChars(sec('7.5')),
    rows,
    total: rows.length,
    yin: rows.filter((x) => ['痰饮', '悬饮', '溢饮', '支饮'].includes(x.name)).length,
    allPresent: rows.every((x) => x.present),
  };
}

// 缺口：教材里真实存在的断句（段末停在「、」），如实报，不代补
function gaps() {
  const dangling = [];
  for (const s of chapter().secs) {
    const paras = [...s.paras, ...s.subs.flatMap((u) => u.paras)];
    for (const p of paras) {
      if (/、$/.test(p)) dangling.push({ no: s.no, tail: p.slice(-20) });
    }
  }
  return {
    dangling,
    // 七情只有 2 段、无独立证候命名；气血 3 小节、津液 2 小节
    thinSections: sectionTable().filter((r) => r.chars < 200).map((r) => r.no),
  };
}

function main() {
  const b = bookShape();
  const rows = sectionTable();
  const w = weights();
  const ly = liuyin();
  const yl = yili();
  const qq = qiqing();
  const qx = qixue();
  const jy = jinye();
  const gp = gaps();

  console.log('═══ 教材本体（中医诊断学）═══');
  console.log(`  ${b.chapters} 章 · ${b.secs} 节 · ${b.subs} 小节 · ${b.paras} 段 · ${b.chars.toLocaleString()} 字`);
  console.log(`  sha256 ${b.sha256.slice(0, 16)}`);
  console.log(`  本章取第${b.here.no}章 ${b.here.title}：${b.here.secs} 节 · ${b.here.paras} 段 · ${b.here.chars} 字（全书 ${(b.share * 100).toFixed(1)}%）`);
  console.log('');
  console.log('═══ 五节字数（正文段口径）═══');
  for (const r of rows) {
    console.log(`  ${r.no} ${r.title.padEnd(11, '　')} ${String(r.chars).padStart(4)} 字  ${(r.share * 100).toFixed(1).padStart(5)}%  ${r.subs} 小节 / ${r.items} 条`);
  }
  console.log(`  合计 ${w.total} 字 · 每段平均 ${w.perPara} 字`);
  console.log('');
  console.log('═══ 权重：气血一节顶两节 ═══');
  console.log(`  气血 7.4：${w.qixue.chars} 字 = ${(w.qixue.share * 100).toFixed(1)}%`);
  console.log(`  七情 7.2：${w.qiqing.chars} 字 = ${(w.qiqing.share * 100).toFixed(1)}%（最薄之一）`);
  console.log(`  气血 ÷ 七情 = ${w.ratio} 倍`);
  console.log(`  气血 + 津液 = ${w.qixue.chars + w.jinye.chars} 字 = ${(w.qixueJinyeShare * 100).toFixed(1)}%（病性辨证的重心在气血津液）`);
  console.log('');
  console.log('═══ 六淫：3 个条目，6 个证 ═══');
  console.log(`  条目 ${ly.items} 个 → 证候 ${ly.names.length} 个：${ly.names.join(' · ')}`);
  console.log('  逐字核对：' + ly.verified.map((x) => `${x.name}${x.inText ? '✓' : '✗'}`).join(' '));
  console.log(`  条目 ≠ 证候：${ly.packed ? '是（7.1.1.3 一条里装了四个证）' : '否'}`);
  console.log(`  疫疠证候：${yl.items} 条 / ${yl.chars} 字 / 教材命中 ${yl.present ? '✓' : '✗'}`);
  console.log('');
  console.log('═══ 七情：两条，175 字 ═══');
  console.log(`  ${qq.subs} 小节 / ${qq.items} 条 / ${qq.paras} 段 / ${qq.chars} 字`);
  console.log('  ' + qq.titles.join(' ｜ '));
  console.log(`  两条都在：直接伤脏 ${qq.hasDirectOrgan ? '✓' : '✗'} · 影响气机 ${qq.hasQiMovement ? '✓' : '✗'}`);
  console.log('');
  console.log(`═══ 气血 14 证（${qx.chars} 字）═══`);
  console.log('  气病：' + qx.qi.map((x) => `${x.name}${x.present ? '✓' : '✗'}`).join(' '));
  console.log('  血病：' + qx.xue.map((x) => `${x.name}${x.present ? '✓' : '✗'}`).join(' '));
  console.log('  同病：' + qx.dual.map((x) => `${x.name}${x.present ? '✓' : '✗'}`).join(' '));
  console.log(`  合计 ${qx.total} = 单轴 ${qx.singleCount} + 双轴 ${qx.dualCount}；双轴里同时含「气」「血」的 ${qx.dualBothChars}/${qx.dualCount}`);
  console.log('');
  console.log(`═══ 津液 8 个节点（${jy.chars} 字）═══`);
  console.log('  ' + jy.rows.map((x) => `${x.name}${x.present ? '✓' : '✗'}`).join(' · '));
  console.log(`  津液亏虚 2 + 痰 1 + 饮 ${jy.yin} + 水停 1 = ${jy.total}`);
  console.log('');
  console.log('═══ 缺口（如实报，不代补）═══');
  for (const d of gp.dangling) console.log(`  · ${d.no} 有一段停在「…${d.tail}」——教材此处即断句，后续条目缺失`);
  console.log(`  · 不足 200 字的节：${gp.thinSections.join('、')}（七情与饮食劳逸，教材一笔带过）`);
  console.log('  · 七情没有「七情证候」这样的独立证名，教材只给致病特点，不给证候命名');
  console.log('');
  console.log('教学边界：本章只统计教材第7章的节字数与证候命名，不评价任何个体、不给任何证候结论，不构成诊断依据。');
}

if (require.main === module) main();

module.exports = {
  bookShape, sectionTable, weights, liuyin, yili, qiqing, qixue, jinye, gaps,
  chapter, sec, secChars, chapterChars, corpus,
  QI, XUE, TONGBING, JINYE, doc,
};

#!/usr/bin/env node
/**
 * 中医诊断学 · 第 4 章 闻诊：声音与气味 → 声学与气味谱
 * 课程: departments/01-zhongyi/05-zhongyi-zhen-duan-xue/chapters/04-wenzhen-shengyin/docs/zh.md
 * 出处: 教材·第3章 闻诊（2 节 5 小节 9 段 855 字）
 * 依赖: 仅 Node.js 标准库
 *
 * 闻诊是四诊里最薄的一诊（855 字 / 3.8%），且内部也不均：听声音 684 字、嗅气味 171 字。
 * 本章把它拆成两组可数词表：声音异常 17 词、气味 3 类。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const BOOK = path.join(ROOT, 'standards', 'zhenduan', '底本.json');
const doc = JSON.parse(fs.readFileSync(BOOK, 'utf8'));
const ch = doc.chapters.find((c) => c.no === '3');

const SUPP = path.join(ROOT, 'standards', 'zhenduan', 'supplements', '补源.json');

/** 读补源层：教材缺什么、外源补在哪。返回该章对应的那一处缺口。 */
function supplements(id) {
  const d = JSON.parse(fs.readFileSync(SUPP, 'utf8'));
  const g = d.gaps.find((x) => x.id === id);
  if (!g) throw new Error('补源层里没有 ' + id);
  return g;
}

function sec(no) {
  return ch.secs.find((s) => s.no === no);
}
function secChars(no) {
  const s = sec(no);
  return s.paras.join('').length + s.subs.reduce((n, x) => n + x.paras.join('').length, 0);
}
function allText() {
  const parts = [...ch.paras];
  for (const s of ch.secs) {
    parts.push(s.title, ...s.paras);
    for (const sub of s.subs) parts.push(sub.title, ...sub.paras, ...(sub.items || []).map((i) => i.title));
  }
  return parts.join('\n');
}
const T = allText();

// 声音：教材 3.1 讲了五组
const SOUND = {
  '语声异常': ['谵语', '郑声', '独语', '错语', '狂言'],
  '呼吸异常': ['喘', '哮', '短气', '少气'],
  '咳嗽': ['咳嗽'],
  '胃气上逆': ['呕吐', '呃逆', '嗳气', '太息'],
  '肠腑之声': ['喷嚏', '肠鸣', '矢气'],
};
// 气味：教材 3.2 讲了三条段标题
const ODOR = ['口气', '汗气', '痰涕', '二便', '经带', '病室'];

function sound() {
  const groups = Object.entries(SOUND).map(([k, ws]) => ({
    group: k,
    items: ws.map((w) => ({ w, inText: T.includes(w) })),
  }));
  return {
    groups,
    terms: groups.reduce((n, g) => n + g.items.length, 0),
    hit: groups.reduce((n, g) => n + g.items.filter((x) => x.inText).length, 0),
  };
}

function odor() {
  return ODOR.map((w) => ({ w, inText: T.includes(w) }));
}

function shape() {
  const rows = ch.secs.map((s) => ({
    no: s.no,
    title: s.title,
    subs: s.subs.length,
    paras: s.paras.length + s.subs.reduce((n, x) => n + x.paras.length, 0),
    chars: secChars(s.no),
  }));
  const total = rows.reduce((n, r) => n + r.chars, 0);
  return {
    rows,
    total,
    share: total / doc.counts.chars,
    soundShare: rows[0].chars / total,
  };
}

function main() {
  const s = shape();
  const so = sound();
  const od = odor();

  console.log('═══ 闻诊两节（教材·第3章）═══');
  for (const r of s.rows) console.log(`  ${r.no} ${r.title}：${r.subs} 小节 · ${r.paras} 段 · ${r.chars} 字`);
  console.log(`  合计 ${s.total} 字 = 全书 ${(s.share * 100).toFixed(1)}%；其中听声音占 ${(s.soundShare * 100).toFixed(1)}%`);
  console.log('');
  console.log('═══ 声音五组：' + so.terms + ' 词，命中 ' + so.hit + ' ═══');
  for (const g of so.groups) {
    console.log(`  ${g.group}：${g.items.map((x) => x.w + (x.inText ? '' : '✗')).join(' · ')}`);
  }
  console.log('');
  console.log('═══ 气味：' + od.length + ' 项，命中 ' + od.filter((x) => x.inText).length + ' ═══');
  console.log('  ' + od.map((x) => x.w + (x.inText ? '' : '✗')).join(' · '));
  console.log('');
  console.log('  → 声音有「强弱/高低/断续」这些可比较的维度，气味只有「哪来的」这一维，没有分级。');
  console.log('  → 这就是闻诊在教材里最薄的根本原因：它的一半内容（嗅）无法写成可比量表。');
  console.log('');
  const g = supplements('z3-qiwei-wu-chou');
  console.log(String.fromCharCode(10) + '── 教材缺口的外源补录（气味无分级）──');
  console.log('  教材 3.2 只有 ' + g.textbookSeen.subs.length + ' 小节 / ' + g.textbookSeen.items.length
    + ' 个段标题，覆盖 ' + g.textbookSeen.count + ' 个气源：' + g.textbookSeen.sources.join('、') + '；没有分级。');
  console.log('  外源 ' + g.locator + '：五臭各归一脏 —— '
    + g.entries.map((e) => e.chou + '(' + e.zang + ')').join('、'));
  console.log('  引用格式：' + g.citeAs + '（不是「底本」「原文」）');
  console.log('教学边界：本章只清点教材闻诊的词表与结构，不做闻诊判读、不判断任何人的声音气味；不构成诊断依据。');
}

if (require.main === module) main();

module.exports = { shape, sound, odor, SOUND, ODOR, secChars, allText, doc, ch, supplements };

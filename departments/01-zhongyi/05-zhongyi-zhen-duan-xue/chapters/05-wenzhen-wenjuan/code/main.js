#!/usr/bin/env node
/**
 * 中医诊断学 · 第 5 章 问诊：十问 → 结构化问卷设计
 * 课程: departments/01-zhongyi/05-zhongyi-zhen-duan-xue/chapters/05-wenzhen-wenjuan/docs/zh.md
 * 出处: 教材·第4章 问诊（2 节 10 小节 20 段 2,281 字）
 * 依赖: 仅 Node.js 标准库
 *
 * 本章量两件事：
 *   1. 问诊是四诊里第二厚的一诊（2,281 字），且 80.8% 在「问现在症」；
 *   2. 小节标题写「十问歌」，实际只列 8 个小节——十问变八问，缺的两问去哪了？
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const BOOK = path.join(ROOT, 'standards', 'zhenduan', '底本.json');
const doc = JSON.parse(fs.readFileSync(BOOK, 'utf8'));
const ch = doc.chapters.find((c) => c.no === '4');

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
  return (s.paras || []).join('').length + s.subs.reduce((n, x) => n + x.paras.join('').length, 0);
}

function shape() {
  const rows = ch.secs.map((s) => ({
    no: s.no,
    title: s.title,
    subs: s.subs.length,
    paras: (s.paras || []).length + s.subs.reduce((n, x) => n + x.paras.length, 0),
    chars: secChars(s.no),
  }));
  const total = rows.reduce((n, r) => n + r.chars, 0);
  return { rows, total, share: total / doc.counts.chars, nowShare: rows[1].chars / total };
}

// 「问现在症（十问歌）」下的小节——这是教材自己给的问诊维度
function tenWen() {
  const s = sec('4.2');
  const subs = s.subs.map((x) => ({ no: x.no, title: x.title, paras: x.paras.length }));
  return {
    claimed: /十问歌/.test(s.title),
    subs,
    n: subs.length,
    gap: /十问歌/.test(s.title) ? 10 - subs.length : 0,
  };
}

// 问诊结构：主诉/现病史在前（4.1.2），现在症在后（4.2）
function structure() {
  const s41 = sec('4.1');
  const items = s41.subs.flatMap((x) => (x.items || []).map((i) => i.title));
  return {
    preamble: items.filter((t) => /主诉|现病史|既往史|个人生活史|家族史|一般情况/.test(t)),
    method: items.filter((t) => /技巧|注意事项|地位/.test(t)),
    n: items.length,
  };
}

function main() {
  const s = shape();
  const tw = tenWen();
  const st = structure();

  console.log('═══ 问诊两节（教材·第4章）═══');
  for (const r of s.rows) console.log(`  ${r.no} ${r.title}：${r.subs} 小节 · ${r.paras} 段 · ${r.chars} 字`);
  console.log(`  合计 ${s.total} 字 = 全书 ${(s.share * 100).toFixed(1)}%；问现在症占 ${(s.nowShare * 100).toFixed(1)}%`);
  console.log('');
  console.log(`═══ 十问歌：标题称十问，实列 ${tw.n} 节（差 ${tw.gap}）═══`);
  for (const x of tw.subs) console.log(`  ${x.no} ${x.title}（${x.paras} 段）`);
  console.log('');
  console.log('═══ 前置信息（4.1.2）═══');
  for (const t of st.preamble) console.log('  · ' + t);
  console.log(`  4.1 共 ${st.n} 个段标题，其中方法类 ${st.method.length} 个、资料类 ${st.preamble.length} 个`);
  console.log('');
  console.log('  → 十问变八问：三问（头身/胸腹/耳目）并成一节，「旧病/病因」两问移到了前置病史（4.1.2.2）。');
  console.log('  → 所以「十问」在教材里是 8 节 + 2 项前置资料，不是一个 10 项清单。');
  console.log('');
  const g = supplements('z2-shiwen-ba-jie');
  console.log(String.fromCharCode(10) + '── 教材缺口的外源补录（十问只到八节）──');
  console.log('  教材 4.2 有 ' + g.textbookSeen.count + ' 个小节；《景岳全書》十問篇正文也是 '
    + g.heads.length + ' 问：' + g.heads.join('/') + '。');
  console.log('  十問歌：' + g.entries[0].text);
  const only = (g.songOnly || []).map((x) => x.num + '（' + x.keyword + '）').join('、');
  console.log('  歌诀点名但两书都没有问答段的：' + (only || '无') + ' —— 教材没漏抄，景岳原书亦只到八问。');
  console.log('  引用格式：' + g.citeAs + '（不是「底本」「原文」）');
  console.log('教学边界：本章只做问诊结构的清点与问卷化映射，不做问诊判读、不判断任何人的病情；不构成诊断依据。');
}

if (require.main === module) main();

module.exports = { shape, tenWen, structure, secChars, doc, ch, supplements };

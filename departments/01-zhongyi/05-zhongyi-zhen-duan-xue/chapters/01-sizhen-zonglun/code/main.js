#!/usr/bin/env node
/**
 * 中医诊断学 · 第 1 章 四诊总论：信息采集的偏差与信度
 * 课程: departments/01-zhongyi/05-zhongyi-zhen-duan-xue/chapters/01-sizhen-zonglun/docs/zh.md
 * 出处: 教材·第1章（绪论）+ 全教材 14 章规模（standards/zhenduan/底本.json）
 * 依赖: 仅 Node.js 标准库
 *
 * 这一章不建模型，只量一件事：**四诊在教材里有多不均**。
 * 采集（四诊）占 35.9%、判断（辨证七章）占 39.9%、输出（病案）占 5.9%——
 * 而四诊内部，望 2,812 字、闻 855 字，相差 3.29 倍。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const BOOK = path.join(ROOT, 'standards', 'zhenduan', '底本.json');
const doc = JSON.parse(fs.readFileSync(BOOK, 'utf8'));

const FOUR = [
  { key: 'wang', name: '望诊', ch: '2' },
  { key: 'wen', name: '闻诊', ch: '3' },
  { key: 'wen2', name: '问诊', ch: '4' },
  { key: 'qie', name: '切诊', ch: '5' },
];
const BIANZHENG = ['6', '7', '8', '9', '10', '11', '12'];

function chapter(no) {
  return doc.chapters.find((c) => c.no === no);
}

function bookShape() {
  const cs = doc.chapters;
  return {
    chapters: cs.length,
    secs: doc.counts.secs,
    subs: doc.counts.subs,
    paras: doc.counts.paras,
    chars: doc.counts.chars,
    perChapter: cs.map((c) => ({
      no: c.no,
      title: c.title,
      secs: c.counts.secs,
      paras: c.counts.paras,
      chars: c.counts.chars,
      share: c.counts.chars / doc.counts.chars,
    })),
  };
}

// 四诊：字数、占比、彼此倍数
function fourDiagnosis() {
  const rows = FOUR.map((f) => {
    const c = chapter(f.ch);
    return { name: f.name, ch: f.ch, chars: c.counts.chars, paras: c.counts.paras };
  });
  const total = rows.reduce((n, r) => n + r.chars, 0);
  for (const r of rows) r.share = r.chars / doc.counts.chars;
  const max = rows.slice().sort((a, b) => b.chars - a.chars)[0];
  const min = rows.slice().sort((a, b) => a.chars - b.chars)[0];
  return { rows, total, share: total / doc.counts.chars, max, min, ratio: +(max.chars / min.chars).toFixed(2) };
}

function bianzheng() {
  const rows = BIANZHENG.map((no) => {
    const c = chapter(no);
    return { no, title: c.title, chars: c.counts.chars, share: c.counts.chars / doc.counts.chars };
  });
  const total = rows.reduce((n, r) => n + r.chars, 0);
  return { rows, total, share: total / doc.counts.chars };
}

// 三段：采集 → 判断 → 输出（教材的章是按这三段排的）
function threeStages() {
  const total = doc.counts.chars;
  const collect = fourDiagnosis().total;
  const judge = bianzheng().total;
  const output = chapter('13').counts.chars;
  const intro = chapter('1').counts.chars;
  return {
    rows: [
      { name: '采集（四诊）', chars: collect, share: collect / total },
      { name: '判断（辨证）', chars: judge, share: judge / total },
      { name: '输出（病案）', chars: output, share: output / total },
      { name: '导论（绪论）', chars: intro, share: intro / total },
      { name: '平台（AI 章）', chars: chapter('14').counts.chars, share: chapter('14').counts.chars / total },
    ],
    total,
  };
}

// 教材给的三大原理与三条原则（按原文核对，不凭记忆列）
const PRINCIPLES = ['司外揣内', '见微知著', '以常衡变'];
const RULES = ['整体审察', '四诊合参', '病证结合'];

function principles() {
  const text = (() => {
    const c = chapter('1');
    const parts = [...c.paras];
    for (const s of c.secs) {
      parts.push(s.title, ...s.paras);
      for (const sub of s.subs) parts.push(sub.title, ...sub.paras);
    }
    return parts.join('\n');
  })();
  return {
    principles: PRINCIPLES.map((w) => ({ word: w, inText: text.includes(w) })),
    rules: RULES.map((w) => ({ word: w, inText: text.includes(w) })),
  };
}

function main() {
  const shape = bookShape();
  const four = fourDiagnosis();
  const bz = bianzheng();
  const st = threeStages();
  const pr = principles();

  console.log('═══ 教材本体（中医诊断学）═══');
  console.log(`  ${shape.chapters} 章 · ${shape.secs} 节 · ${shape.subs} 小节 · ${shape.paras} 段 · ${shape.chars.toLocaleString()} 字`);
  console.log(`  sha256 ${doc.source.sha256.slice(0, 16)}`);
  console.log('');
  console.log('  各章规模：');
  for (const c of shape.perChapter) {
    console.log(`    第${c.no}章 ${c.title.slice(0, 14)}：${c.secs} 节 · ${c.paras} 段 · ${c.chars} 字（${(c.share * 100).toFixed(1)}%）`);
  }
  console.log('');
  console.log('═══ 四诊：字数极不均 ═══');
  for (const r of four.rows) {
    console.log(`  ${r.name}：${r.chars} 字 · ${r.share.toFixed(3)}（${(r.share * 100).toFixed(1)}%）`);
  }
  console.log(`  合计 ${four.total} 字 = 全书 ${(four.share * 100).toFixed(1)}%`);
  console.log(`  最厚 ${four.max.name} ${four.max.chars} 字 / 最薄 ${four.min.name} ${four.min.chars} 字 = ${four.ratio} 倍`);
  console.log('  → 四诊是"分工"，但教材给的笔墨是"倾斜"的：闻诊只有望诊的三分之一。');
  console.log('');
  console.log('═══ 辨证七章 ═══');
  for (const r of bz.rows) console.log(`  第${r.no}章 ${r.title.slice(0, 12)}：${r.chars} 字（${(r.share * 100).toFixed(1)}%）`);
  console.log(`  合计 ${bz.total} 字 = ${(bz.share * 100).toFixed(1)}%`);
  console.log('');
  console.log('═══ 三段结构 ═══');
  for (const r of st.rows) console.log(`  ${r.name}：${r.chars} 字（${(r.share * 100).toFixed(1)}%）`);
  console.log('');
  console.log('═══ 原理与原则（按原文核对）═══');
  console.log('  三原理：' + pr.principles.map((x) => `${x.word}${x.inText ? '✓' : '✗'}`).join(' · '));
  console.log('  三原则：' + pr.rules.map((x) => `${x.word}${x.inText ? '✓' : '✗'}`).join(' · '));
  const miss = [...pr.principles, ...pr.rules].filter((x) => !x.inText);
  if (miss.length) console.log('  → 原文未出现：' + miss.map((x) => x.word).join(' / ') + '（本章不替教材补）');
  console.log('');
  console.log('教学边界：本章只做教材文本的结构与字数统计，不评价任何人的四诊结果，不构成诊断依据。');
}

if (require.main === module) main();

module.exports = { bookShape, fourDiagnosis, bianzheng, threeStages, principles, chapter, FOUR, PRINCIPLES, RULES, doc };

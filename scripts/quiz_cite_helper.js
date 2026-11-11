#!/usr/bin/env node
'use strict';
/**
 * scripts/quiz_cite_helper.js <章号> [题号] —— 给每道题列出「候选单元 + 正文覆盖率」
 *
 * 用途：补引证时先看数据，再由人做判断。
 *   覆盖率 = 正确项的内容词（CJK bigram）有多大比例出现在该单元正文里。
 *   它**不是**判据，只是排序线索：覆盖率高的节通常是答案来源，但口径类题（「不作判定」）
 *   在任何一节的正文里都覆盖不到答案，那类题应标「口径见」而不是「依据」。
 *
 * 用法：
 *   node scripts/quiz_cite_helper.js 5          # 第 5 章 6 题
 *   node scripts/quiz_cite_helper.js 5 2        # 只看第 2 题
 */
const fs = require('fs');
const path = require('path');
const Q = require('./lib_quiz_semantics');

const ROOT = path.join(__dirname, '..');
const BOOKS = {
  bingli: { subject: '10-bingli-xue', std: 'bingli' },
  shengli: { subject: '06-shengli-xue', std: 'shengli' },
  zhenduan: { dept: '01-zhongyi', subject: '05-zhongyi-zhen-duan-xue', std: 'zhenduan' },
  binglishengli: { subject: '11-bingli-shengli-xue', std: 'binglishengli' },
};
// 诊断学没有 units.json：单元层就是底本的小节（chapters[].secs[].subs[].paras）。
// 课程 12 章与底本 14 章不是一一对应，所以这里显式写映射（第 2、3 章同出底本第 2 章；
// 第 10 章把六经 + 卫气营血 + 三焦合成一章，故映射三章）。
const ZHENDUAN_MAP = {
  1: [1], 2: [2], 3: [2], 4: [3], 5: [4], 6: [5],
  7: [6], 8: [8], 9: [7], 10: [10, 11, 12], 11: [13], 12: [14],
};

function loadUnits(book, chNo) {
  if (book === 'binglishengli') {
    // 代用底本：课程章 ↔ 底本章不是一一对应，映射在 lib_binglishengli_map.js 里
    const M = require('./lib_binglishengli_map');
    const B = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards', 'binglishengli', '底本.json'), 'utf8'));
    return M.subsOf(B, Number(chNo));
  }
  if (book === 'zhenduan') {
    const B = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards', 'zhenduan', '底本.json'), 'utf8'));
    const out = [];
    for (const n of (ZHENDUAN_MAP[Number(chNo)] || [])) {
      const ch = B.chapters.find((c) => Number(c.no) === n);
      for (const sec of ch.secs) {
        for (const sub of sec.subs) {
          out.push({ sub: sub.no, title: sub.title, rawBody: (sub.paras || []).join('\n') });
        }
      }
    }
    return out;
  }
  const U = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards', BOOKS[book].std, 'units.json'), 'utf8'));
  return U.units.filter((u) => u.chapter === String(Number(chNo)));
}

const book = process.argv[2];
const chNo = process.argv[3];
const only = process.argv[4] ? Number(process.argv[4]) - 1 : null;
if (!BOOKS[book] || !chNo) {
  console.log('用法: node scripts/quiz_cite_helper.js <bingli|shengli|zhenduan|binglishengli> <章号> [题号]');
  process.exit(1);
}
const CH = path.join(ROOT, 'departments', BOOKS[book].dept || '09-jichu', BOOKS[book].subject, 'chapters');
const dir = fs.readdirSync(CH).find((d) => parseInt(d.slice(0, 2), 10) === Number(chNo));
const units = loadUnits(book, chNo);
const qs = JSON.parse(fs.readFileSync(path.join(CH, dir, 'quiz.json'), 'utf8')).questions;

qs.forEach((q, i) => {
  if (only !== null && i !== only) return;
  const opt = String(q.options[q.correct]);
  const scored = units
    .map((u) => {
      const r = Q.judge({ question: q.question, options: q.options, correct: q.correct, explanation: '' }, [{ sub: u.sub, title: u.title, rawBody: u.rawBody }]);
      const g = Q.grams(opt);
      let hit = 0;
      for (const x of g) if (String(u.rawBody).includes(x)) hit += 1;
      return { sub: u.sub, title: u.title.replace(/^\d+(\.\d+){2}\s*/, ''), cov: hit / Math.max(1, g.size) };
    })
    .sort((a, b) => b.cov - a.cov)
    .slice(0, 3);
  console.log(`#${i + 1} ${q.question.slice(0, 60)}`);
  console.log(`   ✓ ${opt.slice(0, 70)}`);
  console.log(`   候选：${scored.map((s) => `${s.sub} ${s.title} ${(s.cov * 100).toFixed(0)}%`).join(' · ')}`);
});

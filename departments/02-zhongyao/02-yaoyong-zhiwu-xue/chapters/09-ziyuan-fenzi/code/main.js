'use strict';
/**
 * 本章自检：只读本目录的 ../docs/zh.md 与 ../quiz.json，不引用 standards/。
 * 判据（任一不满足即 exit 1）：正文 ≥2500 汉字、二级节 ≥4、习题 ≥5 题、
 * pre≥1/check≥2/post≥1、check 题接地 ≥2、最短解释 ≥30 汉字。
 */
const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const HAN = /[\u4e00-\u9fff]/g;
const hanzi = (s) => (s.match(HAN) || []).length;

function load() {
  const doc = fs.readFileSync(DOC, 'utf8');
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const qs = Array.isArray(quiz) ? quiz : (quiz.questions || []);
  return { doc, qs };
}

function stats() {
  const { doc, qs } = load();
  const stage = (n) => qs.filter((q) => (q.stage || q.phase) === n).length;
  const body = doc.replace(/[\s\p{P}]/gu, '');
  const grounded = qs.filter((q) => {
    if ((q.stage || q.phase) !== 'check') return false;
    const opt = String((q.options || q.choices || [])[q.correct ?? q.answer] || '').replace(/[\s\p{P}]/gu, '');
    for (let i = 0; i + 4 <= opt.length; i += 1) if (body.includes(opt.slice(i, i + 4))) return true;
    return false;
  });
  const ex = qs.map((q) => hanzi(q.explain || q.explanation || ''));
  return {
    hanzi: hanzi(doc),
    sections: (doc.match(/^## /gm) || []).length,
    questions: qs.length,
    pre: stage('pre'),
    check: stage('check'),
    post: stage('post'),
    grounded: grounded.length,
    minExplain: ex.length ? Math.min(...ex) : 0,
  };
}

function issues(s) {
  const out = [];
  if (s.hanzi < 2500) out.push(`正文只有 ${s.hanzi} 汉字（下限 2500）`);
  if (s.sections < 4) out.push(`二级节只有 ${s.sections} 个（下限 4）`);
  if (s.questions < 5) out.push(`习题只有 ${s.questions} 题（下限 5）`);
  if (s.pre < 1) out.push('缺 pre 题');
  if (s.check < 2) out.push(`check 题只有 ${s.check} 道（下限 2）`);
  if (s.post < 1) out.push('缺 post 题');
  if (s.grounded < 2) out.push(`接地的 check 题只有 ${s.grounded} 道（下限 2）`);
  if (s.minExplain < 30) out.push(`最短解释 ${s.minExplain} 汉字（下限 30）`);
  return out;
}

if (require.main === module) {
  const s = stats();
  console.log(`正文 ${s.hanzi} 汉字 · 二级节 ${s.sections}`);
  console.log(`习题 ${s.questions} 题 (pre ${s.pre}/check ${s.check}/post ${s.post}) · 最短解释 ${s.minExplain} 汉字`);
  console.log(`接地 check 题 ${s.grounded}/${s.check}`);
  const bad = issues(s);
  if (bad.length) {
    for (const b of bad) console.error('✗ ' + b);
    process.exit(1);
  }
  console.log('✅ 自检通过');
}

module.exports = { stats, issues, DOC, QUIZ };

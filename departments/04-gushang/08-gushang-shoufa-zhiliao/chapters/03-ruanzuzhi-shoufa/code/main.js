#!/usr/bin/env node
/**
 * 骨伤科手法治疗学 · 第 3 章 · 「松」与「伤」只差三个变量
 * 课程: departments/04-gushang/08-gushang-shoufa-zhiliao/chapters/03-ruanzuzhi-shoufa/docs/zh.md
 * 依据: 《厘正按摩要术·卷二·立法》《医宗金鉴·正骨心法要旨·手法释义》
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字与清单全部由本脚本从正文现算，不手打：
 *   三个变量、着力面四档、三种对象、算松的四条判据、三个假松信号，
 *   以及 quiz 的 check 题能在正文里对上几个四字原词。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '3';
const SLUG = '03-ruanzuzhi-shoufa';
const TITLE = '「松」与「伤」只差三个变量：力落在哪一层、停了多久、着力面多大';

const EXPECTED_VARS = ['着力面', '层次', '时间'];
const EXPECTED_OBJECTS = ['痉挛', '粘连', '挛缩'];

const SECTION_PROBES = ['着力面', '以柔克刚', '㨰法', '肿痛未除', '由硬变软', '不给参数'];

const GRAM = 4;
const LINES = /\r?\n/;

const readDoc = () => fs.readFileSync(DOC, 'utf8');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

function h2Titles(text) {
  const out = [];
  for (const line of String(text).split(LINES)) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) out.push(m[1].trim());
  }
  return out;
}

function h2Sections(text) {
  const out = [];
  let cur = null;
  for (const line of String(text).split(LINES)) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) {
      cur = { title: m[1].trim(), body: [line] };
      out.push(cur);
    } else if (cur) cur.body.push(line);
  }
  return out.map((s) => ({ title: s.title, body: s.body.join('\n') }));
}

const sectionAt = (text, i) => (h2Sections(text)[i] || { title: '', body: '' });

function tableBlocks(text) {
  const blocks = [];
  let cur = null;
  for (const line of String(text).split(LINES)) {
    const s = line.trim();
    if (s.startsWith('|')) {
      if (!cur) {
        cur = [];
        blocks.push(cur);
      }
      cur.push(s);
    } else cur = null;
  }
  return blocks.map((b) => {
    const cells = b.map((r) => r.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()));
    return { head: cells[0] || [], rows: cells.slice(2) };
  });
}

const occurrences = (text, term) => String(text).split(term).length - 1;

function grams(text, n = GRAM) {
  const out = new Set();
  for (const seg of String(text).replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/** 三个变量：第一节标题「三个变量：着力面、层次、时间」冒号后三项 */
function threeVars() {
  const title = h2Titles(readDoc())[0] || '';
  const tail = (/三个变量[：:](.+)$/.exec(title) || [null, ''])[1];
  return tail.split(/、/).map((s) => s.trim()).filter(Boolean);
}

/** 着力面四档：第一张表的数据行，首列为着力部位 */
function faceRows() {
  const t = tableBlocks(readDoc())[0];
  return t ? t.rows.map((r) => ({ face: r[0], pressure: r[1], layer: r[2], methods: r[3] })) : [];
}

/** 三种对象：第二张表的数据行，首列为对象 */
function objectRows() {
  const t = tableBlocks(readDoc())[1];
  return t ? t.rows.map((r) => ({ object: r[0], feel: r[1], goal: r[2], method: r[3], excess: r[4] })) : [];
}

/** 算松的四条判据：第五节「其一，……」至「其四，……」 */
function fourSigns() {
  const body = sectionAt(readDoc(), 4).body;
  const out = [];
  const re = /其([一二三四])[，,]([^：:。，]+?)[：:]/g;
  let m;
  while ((m = re.exec(body)) !== null) out.push({ n: m[1], sign: m[2].trim() });
  return out;
}

/** 三个假松信号：第五节「……不等于松」的句子数 */
const fakeSigns = () => occurrences(sectionAt(readDoc(), 4).body, '不等于松');

function quizSummary(quiz, text) {
  const body = grams(text);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  for (const q of qs) if (stage[q.stage] !== undefined) stage[q.stage] += 1;
  const hits = qs.filter((q) => q.stage === 'check').map((q) => {
    const right = String((q.options || [])[q.correct] || '');
    return { question: q.question, grams: [...grams(right)].filter((g) => body.has(g)) };
  });
  return {
    total: qs.length,
    stage,
    check: hits.length,
    grounded: hits.filter((h) => h.grams.length).length,
    hits,
    spread: new Set(qs.map((q) => q.correct)).size,
  };
}

function analyze() {
  const text = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    vars: threeVars(),
    faces: faceRows(),
    objects: objectRows(),
    signs: fourSigns(),
    fakes: fakeSigns(),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).body.includes(p) })),
    terms: ['痉挛', '粘连', '挛缩', '吸定', '介质', '急性期'].map((t) => ({ t, n: occurrences(text, t) })),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`骨伤科手法治疗学 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`三个变量（${r.vars.length} 个）：${r.vars.join(' / ')}`);
  console.log('');
  console.log('着力面四档（正文表序现算）：');
  for (const f of r.faces) console.log(`  ${f.face} · 压强${f.pressure} · 到${f.layer} · ${f.methods}`);
  console.log('');
  console.log('三种对象（正文表序现算）：');
  for (const o of r.objects) console.log(`  ${o.object} · 目标${o.goal} · ${o.method}`);
  console.log('');
  console.log(`算松的判据（${r.signs.length} 条，正文「其一」至「其四」现算）：${r.signs.map((s) => s.sign).join(' / ')}`);
  console.log(`假松信号（${r.fakes} 个，正文「不等于松」句数现算）`);
  console.log('');
  console.log('关键判据（出现次数）：' + r.terms.map((x) => `${x.t} ${x.n}`).join(' · '));
  console.log('');
  console.log('小节探针（每节一个词，须落在本节）：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 答案落在 ${r.quiz.spread} 个位置`
  );
  console.log('');
  console.log('※ 以上数字与清单全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成诊疗建议、诊断或治疗指导。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  h2Titles,
  h2Sections,
  sectionAt,
  tableBlocks,
  occurrences,
  grams,
  threeVars,
  faceRows,
  objectRows,
  fourSigns,
  fakeSigns,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  EXPECTED_VARS,
  EXPECTED_OBJECTS,
  SECTION_PROBES,
};

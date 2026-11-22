'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, hanzi, sections, audit, splitList } = require('./main.js');

const BODY = read();
const A = audit(BODY);

/** 正文与选项共用的 4 字切片，用来判断选项是否真的落在正文里。 */
function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '01-z81', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 1);
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 1 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('规模可复算：汉字、节、引文', () => {
  assert.ok(hanzi(BODY) > 2500, String(hanzi(BODY)));
  assert.strictEqual(sections(BODY).length, 5);
  assert.ok(sections(BODY).every((s) => s.hanzi > 100), '某一节过短');
  assert.ok([...BODY.matchAll(/《([^》\n]+)》/g)].length >= 1);
});

test('五类服务从正文读出，顺序与正文一致', () => {
  assert.deepStrictEqual(A.services, ['医疗', '康复', '养老', '健康管理与体检', '中医治未病与养生保健']);
  assert.strictEqual(A.counts.services, 5);
});

test('四个硬指标、四种越界形态、三问都数得出来', () => {
  assert.strictEqual(A.counts.criteria, 4);
  assert.match(A.criteria.join(''), /能不能下诊断/);
  assert.match(A.criteria.join(''), /钱由谁付/);
  assert.strictEqual(A.counts.overreach, 4);
  assert.match(A.overreach[0], /针刺放血/);
  assert.strictEqual(A.counts.questions, 3);
  assert.match(A.questions[0], /医师资格/);
  assert.match(A.questions[2], /治疗承诺/);
});

test('清单条数与句中的中文数字对账一致', () => {
  assert.deepStrictEqual(A.mismatched, []);
  assert.strictEqual(A.claims.length, 4);
});

test('splitList 处理顿号、逗号与「以及」', () => {
  assert.deepStrictEqual(splitList('甲、乙、丙'), ['甲', '乙', '丙']);
  assert.deepStrictEqual(splitList('甲，乙以及丙'), ['甲', '乙', '丙']);
});

test('quiz 的 check 题正确选项落在本章正文里（≥2 道），答案下标打散', () => {
  const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
  const body = shingles(BODY);
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  const grounded = checks.filter((q) => {
    const right = String(q.options[q.correct] || '');
    return [...shingles(right)].some((g) => body.has(g));
  });
  assert.ok(checks.length >= 2);
  assert.ok(grounded.length >= 2, `只有 ${grounded.length} 道接地`);
  const used = new Set(quiz.questions.map((q) => q.correct));
  assert.ok(used.size >= 3, '正确答案过于集中在一个下标');
  for (const q of quiz.questions) {
    assert.strictEqual(q.options.length, 4);
    assert.ok(hanzi(q.explain) >= 30, q.question);
  }
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /对账一致/);
  assert.match(r.stdout, /不构成对具体业态的合法性判断/);
});

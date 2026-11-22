'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, hanzi, sections, services, audit } = require('./main.js');

const BODY = read();
const A = audit(BODY);

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '04-z84', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 4);
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 4 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('规模可复算：汉字、节、引文', () => {
  assert.ok(hanzi(BODY) > 2500, String(hanzi(BODY)));
  assert.strictEqual(sections(BODY).length, 5);
  assert.ok([...BODY.matchAll(/《([^》\n]+)》/g)].length >= 1);
});

test('十二项内容从正文的「从…到…再到…」里数出来', () => {
  assert.strictEqual(A.items.length, 12);
  assert.strictEqual(A.items[0], '居民健康档案');
  assert.strictEqual(A.items[2], '预防接种');
  assert.strictEqual(A.items[3], '儿童');
  assert.strictEqual(A.items[11], '卫生监督协管');
  assert.deepStrictEqual(services(BODY), A.items);
});

test('三种形态、三个条件、三种失真、三笔钱、分工四件事都对账', () => {
  assert.strictEqual(A.forms, 3);
  assert.strictEqual(A.conditions, 3);
  assert.strictEqual(A.distortions, 3);
  assert.strictEqual(A.money, 3);
  assert.deepStrictEqual(A.division, ['谁定技术方案', '谁做人员培训', '谁做质量控制', '谁承担数据审核']);
  assert.deepStrictEqual(A.mismatched, []);
});

test('卷首分数与居民知晓率复算', () => {
  const { raw, derived } = A;
  assert.strictEqual(raw.score, 96);
  assert.strictEqual(raw.awareness, 41);
  assert.strictEqual(derived.scoreGap, 55);
  assert.strictEqual(raw.control, 53);
  assert.strictEqual(raw.reportForms, 27);
  assert.strictEqual(derived.formsPerMonth, 2.25);
  assert.strictEqual(raw.activeFind, 12);
  assert.strictEqual(derived.passiveFind, 88);
  assert.strictEqual(raw.systems, 3);
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
  assert.match(r.stdout, /不构成政策解读意见/);
});

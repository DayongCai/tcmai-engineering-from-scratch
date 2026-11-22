'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, hanzi, sections,
  qiMoves, shiftActs, supportActs, referralTriggers, sleepDirections, privacyLines, delayMath, audit,
} = require('./main.js');

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
  assert.ok(DOC.endsWith(path.join('chapters', '08-j8', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 8);
  assert.strictEqual(BODY.split('\n')[0], `# 第 8 章 · ${TITLE}`);
});

test('规模可复算：汉字、节、引文', () => {
  assert.ok(hanzi(BODY) > 2500, String(hanzi(BODY)));
  assert.strictEqual(sections(BODY).filter((s) => s.title).length, 6);
  assert.ok(new Set([...BODY.matchAll(/《([^》]+)》/g)].map((m) => m[1])).size >= 1);
});

test('五志读作气机方向，六句齐', () => {
  assert.deepStrictEqual(A.qi, ['怒则气上', '喜则气缓', '悲则气消', '恐则气下', '惊则气乱', '思则气结']);
  assert.match(BODY, /解释框架\*\*，不是诊断标准/);
});

test('移情四类动作与社会支持三件事', () => {
  assert.deepStrictEqual(A.shift, ['转移', '节律', '表达', '呼吸']);
  assert.deepStrictEqual(A.support, ['纳入关键他人', '降低支持的门槛', '识别支持缺失']);
});

test('转介六条里，自伤一条要求立即转介而不是劝解', () => {
  assert.strictEqual(A.triggers.length, 6);
  const selfHarm = A.triggers.find((t) => /自伤/.test(t));
  assert.ok(selfHarm, '缺少自伤条款');
  assert.match(selfHarm, /立即转介，不停留、不评估、不劝解/);
  assert.match(A.triggers[0], /睡眠呼吸障碍/);
});

test('睡眠卫生七向与隐私三底线', () => {
  assert.strictEqual(A.sleep.length, 7);
  assert.match(A.sleep[0], /固定起床时间/);
  assert.deepStrictEqual(A.privacy, ['只问必要的', '记录要克制', '共享要授权']);
});

test('延误例数两类相加回到总数，占比现算', () => {
  assert.deepStrictEqual(A.math, { visits: 460, total: 5, mood: 3, apnea: 2, months: 4, share: 1.09 });
  assert.strictEqual(A.math.mood + A.math.apnea, A.math.total);
});

test('清单条数与句中的中文数字对账一致', () => {
  assert.deepStrictEqual(A.mismatched, []);
  assert.strictEqual(A.claims.length, 7);
});

test('quiz：check 题正确选项落在正文里（≥2 道），答案下标打散', () => {
  const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
  const body = shingles(BODY);
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  const grounded = checks.filter((q) =>
    [...shingles(q.options[q.correct])].some((g) => body.has(g)));
  assert.ok(checks.length >= 2);
  assert.ok(grounded.length >= 2, `只有 ${grounded.length} 道接地`);
  const used = new Set(quiz.questions.map((q) => q.correct));
  assert.ok(used.size >= 3, '正确答案过于集中在一个下标');
  for (const q of quiz.questions) {
    assert.strictEqual(q.options.length, 4, q.question);
    assert.ok(hanzi(q.explain) >= 30, q.question);
  }
});

test('脚本可运行，输出含复算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /= 5 例（文中 5 例）/);
  assert.match(r.stdout, /对账：一致/);
  assert.match(r.stdout, /不构成诊疗意见/);
});

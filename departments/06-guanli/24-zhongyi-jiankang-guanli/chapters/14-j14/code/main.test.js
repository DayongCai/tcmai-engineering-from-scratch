'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, hanzi, sections,
  duties, failures, interfaces, roles, configs, quality, handoffMath, audit,
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
  assert.ok(DOC.endsWith(path.join('chapters', '14-j14', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 14);
  assert.strictEqual(BODY.split('\n')[0], `# 第 14 章 · ${TITLE}`);
});

test('规模可复算：汉字、节、引文', () => {
  assert.ok(hanzi(BODY) > 2500, String(hanzi(BODY)));
  assert.strictEqual(sections(BODY).filter((s) => s.title).length, 6);
  assert.ok(new Set([...BODY.matchAll(/《([^》]+)》/g)].map((m) => m[1])).size >= 1);
});

test('主责三职责齐：整合、取舍、裁断', () => {
  assert.strictEqual(A.duty.length, 3);
  assert.match(A.duty[0], /整合各方意见/);
  assert.match(A.duty[1], /优先级与取舍/);
  assert.match(A.duty[2], /作出裁断并对裁断负责/);
});

test('转介三形态与根源判断', () => {
  assert.deepStrictEqual(A.fails, ['送出去不回来', '回来了不接', '转过去没人接']);
  assert.match(BODY, /转介被当成一次「告知」，而它实际是一次「交接」/);
});

test('四类接口与三种角色', () => {
  assert.deepStrictEqual(A.ifs, ['基本公共卫生服务', '康复服务', '护理服务', '营养和运动指导']);
  assert.deepStrictEqual(A.rl, ['主责', '专业提供者', '执行与接触者']);
  assert.match(BODY, /团队规模超过七人/);
});

test('三样最小配置与质量两件事', () => {
  assert.deepStrictEqual(A.cfg, ['一个共同目标', '一份共享记录', '一个固定节奏']);
  assert.deepStrictEqual(A.q, ['一致', '不冲突']);
  assert.match(BODY, /交接的完整性/);
});

test('交接复算：380 人次回传 41 份，10.8%', () => {
  assert.deepStrictEqual(A.math, { referrals: 380, back: 41, returned: 23, backPct: 10.8, returnPct: 6.1 });
  assert.ok(A.math.backPct < 15, '回传率被高估');
});

test('清单条数与句中的中文数字对账一致', () => {
  assert.deepStrictEqual(A.mismatched, []);
  assert.strictEqual(A.claims.length, 6);
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
  assert.match(r.stdout, /回传 41 份（10\.8%）/);
  assert.match(r.stdout, /对账：一致/);
  assert.match(r.stdout, /不构成诊疗意见/);
});

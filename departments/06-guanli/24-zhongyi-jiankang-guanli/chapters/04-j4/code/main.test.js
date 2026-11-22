'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, hanzi, sections, sectionText, splitTop,
  qualityTests, minDataset, structLayers, lifecycle, triggers, legalBases, minRequirements, systemFunctions, audit,
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
  assert.ok(DOC.endsWith(path.join('chapters', '04-j4', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 4);
  assert.strictEqual(BODY.split('\n')[0], `# 第 4 章 · ${TITLE}`);
});

test('规模可复算：汉字、节、引文', () => {
  assert.ok(hanzi(BODY) > 2500, String(hanzi(BODY)));
  assert.strictEqual(sections(BODY).filter((s) => s.title).length, 6);
  assert.ok(new Set([...BODY.matchAll(/《([^》]+)》/g)].map((m) => m[1])).size >= 1);
});

test('三个测试就是交接、统计、迁移，交接排第一', () => {
  assert.deepStrictEqual(A.tests, ['交接测试', '统计测试', '迁移测试']);
  assert.match(sectionText(BODY, '一、'), /交接测试最便宜也最有效/);
});

test('最小数据集五类，药物那一栏在关键背景里', () => {
  assert.deepStrictEqual(A.dataset.map((d) => d.name), ['身份与联系', '关键背景', '客观测量', '辨识结论', '过程记录']);
  const drug = A.dataset.find((d) => /药物/.test(d.content));
  assert.ok(drug, '没有找到「正在服用的药物」这一栏');
  assert.match(drug.content, /正在服用的药物/);
  assert.strictEqual(drug.name, '关键背景');
});

test('结构化三层与生命周期四段', () => {
  assert.deepStrictEqual(A.layers.map((l) => l.what), ['观察项', '归类依据', '结论与方案']);
  assert.deepStrictEqual(A.cycle, ['建档', '更新', '归档与版本', '销毁']);
});

test('更新触发三类，括号内的顿号不另算一项', () => {
  assert.strictEqual(A.trig.length, 3);
  assert.match(A.trig[1], /住院、手术、新诊断、换药/);
  assert.deepStrictEqual(splitTop('甲（乙、丙）、丁'), ['甲（乙、丙）', '丁']);
});

test('合规三条件、四条最低要求、四组系统功能', () => {
  assert.deepStrictEqual(A.legal, ['最小必要', '目的限定', '告知同意']);
  assert.deepStrictEqual(A.reqs, ['权限分离', '审计留痕', '去标识化使用', '委托处理要签协议']);
  assert.deepStrictEqual(A.funcs.map((f) => f.split('（')[0]), ['录入与校验', '查询与调阅', '提醒与随访', '统计与导出']);
});

test('清单条数与句中的中文数字对账一致', () => {
  assert.deepStrictEqual(A.mismatched, []);
  assert.strictEqual(A.claims.length, 8);
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

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /交接测试／统计测试／迁移测试/);
  assert.match(r.stdout, /对账：一致/);
  assert.match(r.stdout, /不构成诊疗、法律或合规意见/);
});

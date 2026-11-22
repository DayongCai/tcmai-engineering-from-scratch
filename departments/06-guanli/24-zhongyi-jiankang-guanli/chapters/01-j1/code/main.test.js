'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, hanzi, sections, sectionText,
  boundaryTable, chainRings, ringCriteria, payStructures, priceBases, evalQuestions, audit,
} = require('./main.js');

const BODY = read();
const A = audit(BODY);

/** 正文与选项共用的 4 字切片：判断选项是否真的落在正文里。 */
function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '01-j1', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 1);
  assert.strictEqual(BODY.split('\n')[0], `# 第 1 章 · ${TITLE}`);
});

test('规模可复算：汉字、节、引文', () => {
  assert.ok(hanzi(BODY) > 2500, String(hanzi(BODY)));
  assert.strictEqual(sections(BODY).filter((s) => s.title).length, 6);
  assert.ok(sections(BODY).filter((s) => s.title).every((s) => s.hanzi > 150), '某一节过短');
  assert.ok(new Set([...BODY.matchAll(/《([^》]+)》/g)].map((m) => m[1])).size >= 2);
});

test('四条边界从表里读出，责任主体各不相同', () => {
  assert.deepStrictEqual(A.boundary.map((b) => b.name), ['治未病', '健康体检', '慢病管理', '中医健康管理']);
  assert.match(A.boundary[0].nature, /思想与原则/);
  assert.match(A.boundary[0].deliverable, /不直接交付产品/);
  assert.match(A.boundary[3].deliverable, /可复评的闭环/);
  assert.match(A.boundary[3].owner, /不对疾病转归负责/);
  assert.notStrictEqual(A.boundary[1].owner, A.boundary[2].owner);
});

test('五环与五条判据一一对应，顺序不乱', () => {
  assert.deepStrictEqual(A.rings, ['辨识', '评估', '方案', '执行与随访', '评价']);
  assert.deepStrictEqual(A.criteria, ['可复核', '可分层', '可执行', '有变化', '能归因到环节']);
  assert.strictEqual(A.rings.length, A.criteria.length);
});

test('支付结构、定价口径、评价三问都数得出来', () => {
  assert.strictEqual(A.pay.length, 4);
  assert.match(A.pay.join('/'), /商业保险/);
  assert.deepStrictEqual(A.pricing, ['按次', '按年', '按结果']);
  assert.deepStrictEqual(A.questions, ['状态改善了没有？', '行为维持了没有？', '有没有出事？']);
});

test('清单条数与句中的中文数字对账一致', () => {
  assert.deepStrictEqual(A.mismatched, []);
  assert.strictEqual(A.claims.length, 6);
});

test('sectionText 取不到前缀就报错，不静默返回空串', () => {
  assert.throws(() => sectionText(BODY, '九、'), /没有以「九、」开头的一节/);
  assert.ok(sectionText(BODY, '六、').includes('免责声明'));
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
  assert.match(r.stdout, /对账：一致/);
  assert.match(r.stdout, /不对疾病转归负责/);
  assert.match(r.stdout, /不构成诊疗意见/);
});

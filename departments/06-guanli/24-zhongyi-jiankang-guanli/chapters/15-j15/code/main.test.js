'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, hanzi, sections, cnToNum,
  productConds, scopeLayers, payers, repurchase, promoLines, inducement, disciplines, businessMath, audit,
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
  assert.ok(DOC.endsWith(path.join('chapters', '15-j15', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 15);
  assert.strictEqual(BODY.split('\n')[0], `# 第 15 章 · ${TITLE}`);
});

test('规模可复算：汉字、节、引文', () => {
  assert.ok(hanzi(BODY) > 2500, String(hanzi(BODY)));
  assert.strictEqual(sections(BODY).filter((s) => s.title).length, 6);
  assert.ok(new Set([...BODY.matchAll(/《([^》]+)》/g)].map((m) => m[1])).size >= 1);
});

test('产品三条件：可交付、可定价、可复评', () => {
  assert.deepStrictEqual(A.conds, ['可交付', '可定价', '可复评']);
  assert.match(BODY, /第三个决定能不能活下去/);
});

test('范围四层与支付四方', () => {
  assert.deepStrictEqual(A.layers.map((l) => l.n), ['一', '二', '三', '四']);
  assert.match(A.layers[1].what, /技术类/);
  assert.strictEqual(A.pay.length, 4);
  assert.deepStrictEqual(A.pay.map((p) => p.payer), ['个人自费', '单位与团体', '基本公共卫生与医保', '商业保险']);
  assert.match(A.pay[3].notBuy, /难以归因的改善/);
});

test('复购三驱动与推广三线', () => {
  assert.deepStrictEqual(A.rep, ['有可对照的变化', '有明确的下一段', '有可感知的照顾']);
  assert.deepStrictEqual(A.promo, ['不承诺疗效', '不借资质', '不诱导消费']);
  assert.strictEqual(A.induce.length, 3);
  assert.match(A.induce[0], /免费检测制造焦虑/);
});

test('从业者四条自律', () => {
  assert.strictEqual(A.disc.length, 4);
  assert.match(A.disc[0], /能做的说能做/);
  assert.match(A.disc[3], /不利用信任/);
});

test('中文数词与经营复算：3944 万营收对 4000 余万投入', () => {
  assert.strictEqual(cnToNum('五千八百'), 5800);
  assert.strictEqual(cnToNum('六千八百'), 6800);
  assert.strictEqual(cnToNum('四千余万'), 40000000);
  assert.deepStrictEqual(A.math, {
    invest: 4000, price: 5800, visits: 6800, repeat: 4, good: 92,
    revenueWan: 3944, repeatVisits: 272, explainPct: 10,
  });
  assert.ok(A.math.revenueWan < A.math.invest, '首年营收不该超过投入');
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
  assert.match(r.stdout, /首年营收约 3944 万/);
  assert.match(r.stdout, /对账：一致/);
  assert.match(r.stdout, /不构成投资建议/);
});

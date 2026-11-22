'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  docText,
  quizData,
  grams,
  DROP,
  KEEP,
  fieldClasses,
  collectionRules,
  useCases,
  redLines,
  patientRights,
  deleteClause,
  deidentify,
  assertSeparable,
  quizAudit,
} = require('./main.js');

test('四类字段齐：直接标识、准标识、生物特征、推断性标识', () => {
  const got = fieldClasses();
  assert.strictEqual(got.length, 4);
  assert.deepStrictEqual([...got].sort(), ['推断性标识', '直接标识', '生物特征', '准标识'].sort());
});

test('采集三规则、借阅三情形、三条红线、五项权利', () => {
  assert.strictEqual(collectionRules().length, 3);
  assert.deepStrictEqual(useCases(), ['临床借阅', '对外借阅', '二次使用']);
  assert.deepStrictEqual(redLines(), ['数据不出境', '不上境外云', '不以免费筛查换数据']);
  assert.strictEqual(patientRights().length, 5);
});

test('代码里的必删清单逐项都能在正文「必删字段」段找到 —— 正文改了这里就会红', () => {
  const clause = deleteClause();
  assert.ok(clause.length > 0, '正文缺「必删字段」段');
  for (const f of DROP) assert.ok(clause.includes(f), `必删清单里的 ${f} 在正文中找不到`);
});

test('可留字段与正文一致：眼别、年龄段、诊断大类、相对时序都在', () => {
  const text = docText();
  for (const f of KEEP) assert.ok(text.includes(f), `正文缺可留字段：${f}`);
});

test('去标识：删身份痕迹，留可比对字段，精确日期折成相对时序', () => {
  const r = deidentify({ 姓名: '示例', 病历号: 'A1', 眼别: '右', 精确日期: '2026-11-22', 诊断大类: 'DR' });
  assert.ok(!('姓名' in r.kept));
  assert.ok(!('病历号' in r.kept));
  assert.ok(!('精确日期' in r.kept));
  assert.strictEqual(r.kept['眼别'], '右');
  assert.strictEqual(r.kept['诊断大类'], 'DR');
  assert.strictEqual(r.kept['相对时序'], 'T0');
  assert.deepStrictEqual(r.dropped.sort(), ['姓名', '精确日期', '病历号'].sort());
});

test('相对时序可以按参照点给，不必回填日期', () => {
  const r = deidentify({ 精确日期: '2026-11-22', 眼别: '左' }, { relativeTo: '首诊+30d' });
  assert.strictEqual(r.kept['相对时序'], '首诊+30d');
});

test('关联表与数据放在一起就抛错：去标识等于没做', () => {
  assert.strictEqual(assertSeparable({ 关联表: { A1: '示例' } }), true, '关联表单独存放是允许的');
  assert.throws(() => assertSeparable({ 关联表: { A1: '示例' }, 眼别: '右' }), /去标识等于没做/);
});

test('正文保留「默认可识别」的立场与三条来路', () => {
  const text = docText();
  assert.ok(text.includes('默认「可识别」'));
  assert.ok(text.includes('不可重置'));
});

test('习题结构：6 题、pre 1 / check 3 / post 2、每题 4 选项', () => {
  const a = quizAudit();
  assert.strictEqual(a.total, 6);
  assert.deepStrictEqual(a.byStage, { pre: 1, check: 3, post: 2 });
  assert.deepStrictEqual(a.problems, []);
  for (const item of quizData().questions) {
    assert.strictEqual(new Set(item.options).size, 4, `选项有重复：${item.question}`);
  }
});

test('三道 check 题的正确选项都能在本章正文找到原词', () => {
  const a = quizAudit();
  assert.strictEqual(a.grounded, a.byStage.check);
  assert.ok(a.grounded >= 2);
});

test('每题正确选项的用词都能在正文里逐字对上', () => {
  const body = grams(docText());
  for (const item of quizData().questions) {
    const right = item.options[item.correct];
    assert.ok([...grams(right)].some((g) => body.has(g)), `正文里找不到：${right}`);
  }
});

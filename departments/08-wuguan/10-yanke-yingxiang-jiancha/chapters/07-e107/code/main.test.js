'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  docText,
  quizData,
  grams,
  threeSections,
  sightDisciplines,
  adviceTiers,
  reviewTableRows,
  basicInfo,
  adviceTier,
  effectTiers,
  quizAudit,
} = require('./main.js');

test('三段分工固定为 所见 → 解释 → 建议', () => {
  assert.deepStrictEqual(threeSections(), ['所见', '解释', '建议']);
});

test('所见四条纪律：可定位、可比较、可复核、不夹判断', () => {
  assert.deepStrictEqual(sightDisciplines(), ['可定位', '可比较', '可复核', '不夹判断']);
});

test('建议三档：观察档、复查档、转诊档', () => {
  assert.deepStrictEqual(adviceTiers(), ['观察档', '复查档', '转诊档']);
});

test('复查项表按主诉列六行，且表里故意不设间隔栏', () => {
  const rows = reviewTableRows();
  assert.strictEqual(rows.length, 6);
  assert.ok(docText().includes('表里没有「间隔」一栏，是故意的'));
});

test('基本信息自报 9 项，与实列项数对得上（8 + 1 组合项）', () => {
  const info = basicInfo();
  assert.strictEqual(info.stated, 9);
  assert.strictEqual(info.listed.length, 8);
  assert.strictEqual(info.total, info.stated, `实列 ${info.total} 项 ≠ 自报 ${info.stated} 项`);
  assert.ok(info.combined.includes('散瞳状态'));
  assert.ok(info.listed.includes('病历号') && info.listed.includes('检查号'));
});

test('建议定档：有科室的走转诊、有项目的走复查、只有触发条件的走观察', () => {
  assert.deepStrictEqual(adviceTier({ dept: '眼底病专科', when: '一周内' }), { tier: '转诊档', missing: [] });
  assert.deepStrictEqual(adviceTier({ item: '眼底复查', when: '三个月' }), { tier: '复查档', missing: [] });
  assert.deepStrictEqual(adviceTier({ trigger: '视物变形' }), { tier: '观察档', missing: [] });
});

test('缺时点、缺触发条件的写法都要被判成未完成，不能当建议过关', () => {
  assert.deepStrictEqual(adviceTier({ item: '眼底复查' }), { tier: '复查档', missing: ['时点依据'] });
  assert.deepStrictEqual(adviceTier({ dept: '眼底病专科' }), { tier: '转诊档', missing: ['时限'] });
  const blank = adviceTier({});
  assert.strictEqual(blank.tier, null, '「必要时复查」这类写法不该定档');
  assert.deepStrictEqual(blank.missing, ['触发条件']);
});

test('疗效三层：结构层、功能层、患者报告层', () => {
  assert.deepStrictEqual(effectTiers(), ['结构层', '功能层', '患者报告层']);
});

test('含 AI 结果的报告必须标注，这条在正文里', () => {
  const text = docText();
  assert.ok(text.includes('AI 辅助分析结果'));
  assert.ok(text.includes('模型版本'));
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

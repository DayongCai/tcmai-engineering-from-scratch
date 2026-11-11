'use strict';
const assert = require('node:assert');
const test = require('node:test');
const {
  SHI, TAN, byChapter, sections, slots, distinctHerbs, herbFreq,
  sharedHerbs, textbookChars, roleCoverage, sectionTable, selfCheck,
} = require('./main.js');

test('方数：祛湿 9 首、祛痰 7 首，合计 16 首', () => {
  assert.strictEqual(byChapter(SHI).length, 9);
  assert.strictEqual(byChapter(TAN).length, 7);
  assert.strictEqual(byChapter(SHI).length + byChapter(TAN).length, 16);
});

test('节：祛湿 5 节（燥湿和胃起头）、祛痰 4 节（燥湿化痰起头），合计 9 节', () => {
  const shi = sections(byChapter(SHI));
  const tan = sections(byChapter(TAN));
  assert.strictEqual(shi.length, 5);
  assert.strictEqual(tan.length, 4);
  assert.strictEqual(shi[0], '19.1 燥湿和胃剂');
  assert.deepStrictEqual(tan, ['20.1 燥湿化痰剂', '20.2 清热化痰剂', '20.3 润燥化痰剂', '20.4 治风化痰剂']);
});

test('药位：祛湿 65 + 祛痰 42 = 107，去重 44 + 23', () => {
  assert.strictEqual(slots(byChapter(SHI)), 65);
  assert.strictEqual(slots(byChapter(TAN)), 42);
  assert.strictEqual(slots(byChapter(SHI)) + slots(byChapter(TAN)), 107);
  assert.strictEqual(distinctHerbs(byChapter(SHI)), 44);
  assert.strictEqual(distinctHerbs(byChapter(TAN)), 23);
});

test('共享药味 8 味：陈皮、甘草、茯苓、半夏、白术、桔梗、生姜、杏仁', () => {
  const shared = sharedHerbs(byChapter(SHI), byChapter(TAN));
  assert.deepStrictEqual(shared, ['半夏', '陈皮', '桔梗', '生姜', '茯苓', '杏仁', '白术', '甘草'].sort());
  assert.ok(shared.includes('茯苓'), '茯苓应跨两类');
});

test('茯苓在两类各出现 5 次：湿与痰的交集在健脾利水', () => {
  assert.strictEqual(herbFreq(byChapter(SHI)).find((x) => x.herb === '茯苓').n, 5);
  assert.strictEqual(herbFreq(byChapter(TAN)).find((x) => x.herb === '茯苓').n, 5);
  assert.strictEqual(herbFreq(byChapter(TAN))[0].herb, '半夏', '祛痰方首位应为半夏');
});

test('君臣佐使覆盖：君 9/9 与 7/7，使只有 4/9 与 5/7（抽取留白）', () => {
  const shi = Object.fromEntries(roleCoverage(byChapter(SHI)).map((r) => [r.role, r.n]));
  const tan = Object.fromEntries(roleCoverage(byChapter(TAN)).map((r) => [r.role, r.n]));
  assert.strictEqual(shi['君'], 9);
  assert.strictEqual(tan['君'], 7);
  assert.strictEqual(shi['使'], 4);
  assert.strictEqual(tan['使'], 5);
  assert.ok(shi['使'] < shi['君'], '使的覆盖应低于君');
});

test('教材字数 21,612 + 14,605 = 36,217（从底本复算）', () => {
  assert.strictEqual(textbookChars([SHI]), 21612);
  assert.strictEqual(textbookChars([TAN]), 14605);
  assert.strictEqual(textbookChars([SHI, TAN]), 36217);
});

test('每节都有方，方名可回指节归属；自检七项全过', () => {
  const rows = sectionTable([...byChapter(SHI), ...byChapter(TAN)]);
  assert.strictEqual(rows.length, 9);
  assert.ok(rows.every((r) => r.n > 0 && r.names.length === r.n));
  assert.ok(selfCheck().every((c) => c.ok));
});

'use strict';
const assert = require('node:assert');
const test = require('node:test');
const {
  CH_XIAO, CH_QU, XIAO, QU, sections, slots, uniq, herbsOf,
  threeFa, digest, roleCoverage, sharedHerbs, bafaCheck, junDistortion, textbookChars, selfCheck,
} = require('./main.js');

test('方数：消食 3 首、驱虫与涌吐 2 首，合计 5 首四节', () => {
  assert.strictEqual(XIAO().length, 3);
  assert.strictEqual(QU().length, 2);
  assert.strictEqual(sections(XIAO()).length + sections(QU()).length, 4);
  assert.deepStrictEqual(sections(XIAO()), ['21.1 消食化滞剂', '21.2 健脾消食剂']);
  assert.deepStrictEqual(sections(QU()), ['22.1 驱虫剂代表方', '22.2 涌吐剂代表方']);
});

test('五方药味数：保和丸 7、枳实导滞丸 8、健脾丸 13、乌梅丸 10、瓜蒂散 2', () => {
  const m = Object.fromEntries(digest([...XIAO(), ...QU()]).map((d) => [d.name, d.herbs]));
  assert.strictEqual(m['保和丸'], 7);
  assert.strictEqual(m['枳实导滞丸'], 8);
  assert.strictEqual(m['健脾丸'], 13);
  assert.strictEqual(m['乌梅丸'], 10);
  assert.strictEqual(m['瓜蒂散'], 2);
});

test('药位：21 章 28 + 22 章 12 = 40，去重 20 + 12，共享 2 味', () => {
  assert.strictEqual(slots(XIAO()), 28);
  assert.strictEqual(slots(QU()), 12);
  assert.strictEqual(slots(XIAO()) + slots(QU()), 40);
  assert.strictEqual(uniq(herbsOf(XIAO())).length, 20);
  assert.strictEqual(uniq(herbsOf(QU())).length, 12);
  assert.deepStrictEqual(sharedHerbs(), ['人参', '黄连']);
});

test('八法：消 3 + 吐 1 = 4 首，乌梅丸不属八法，全书归八法 52 首', () => {
  const b = bafaCheck();
  assert.strictEqual(b.xiao.n, 3);
  assert.strictEqual(b.tu.n, 1);
  assert.deepStrictEqual(b.xiao.names, ['保和丸', '枳实导滞丸', '健脾丸']);
  assert.deepStrictEqual(b.tu.names, ['瓜蒂散']);
  assert.deepStrictEqual(b.notInBafa, ['乌梅丸']);
  assert.strictEqual(b.totalBafa, 52);
});

test('三法分组不串：消/驱虫/涌吐各归其节', () => {
  const t = threeFa();
  assert.deepStrictEqual(t.map((x) => x.fa), ['消', '驱虫', '涌吐']);
  assert.deepStrictEqual(t[1].list.map((f) => f.name), ['乌梅丸']);
  assert.deepStrictEqual(t[2].list.map((f) => f.name), ['瓜蒂散']);
});

test('君臣佐使覆盖：君 5/5、臣 5/5、使 0/5（抽取层无使药结果）', () => {
  const cov = Object.fromEntries(roleCoverage([...XIAO(), ...QU()]).map((r) => [r.role, `${r.n}/${r.total}`]));
  assert.strictEqual(cov['君'], '5/5');
  assert.strictEqual(cov['臣'], '5/5');
  assert.strictEqual(cov['佐'], '3/5');
  assert.strictEqual(cov['使'], '0/5');
});

test('健脾丸君药失真：证据句说四味共为君，抽取层只留甘草', () => {
  const d = junDistortion();
  assert.strictEqual(d.jun, '甘草');
  assert.strictEqual(d.quoteSaysFour, true);
  assert.match(d.evidence, /四味相合/);
  assert.match(d.evidence, /共为君药/);
});

test('教材字数 8,504 + 4,854 = 13,358，自检八项全过', () => {
  assert.strictEqual(textbookChars([CH_XIAO]), 8504);
  assert.strictEqual(textbookChars([CH_QU]), 4854);
  assert.strictEqual(textbookChars([CH_XIAO, CH_QU]), 13358);
  assert.ok(selfCheck().every((c) => c.ok));
});

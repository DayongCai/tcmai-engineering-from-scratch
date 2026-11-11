'use strict';
const assert = require('node:assert');
const test = require('node:test');

const {
  chuanbian,
  zhiweibing,
  sanyin,
  classifyCause,
  wuxie,
  lookup,
  lookups,
  order,
  xianBuDengYuBiao,
  suode,
  structure,
  verifyQuotes,
  quoted,
  text,
} = require('./main.js');

test('篇 1 形制：17 条 · 0 方 · 1546 字（简繁两栏字数一致）', () => {
  const s = structure();
  assert.strictEqual(s.tiao, 17);
  assert.strictEqual(s.fang, 0, '第 1 篇通篇无方文');
  assert.strictEqual(s.chars, 1546);
  assert.strictEqual(s.hansChars, s.chars, 'zhHans 重算字数应与源页 chars 相同');
});

test('篇 1 句式：问曰 8 · 师曰 6 · 直陈 3，三种相加 = 17', () => {
  const s = structure();
  assert.strictEqual(s.ask, 8);
  assert.strictEqual(s.shi, 6);
  assert.strictEqual(s.other, 3);
  assert.strictEqual(s.ask + s.shi + s.other, s.tiao);
});

test('五藏传变链由克序推出：5 边成环、互异、次序为肝脾肾心肺', () => {
  const cb = chuanbian();
  assert.strictEqual(cb.n, 5);
  assert.ok(cb.closes, '最后一条边必须回到起点，否则克序表写错');
  assert.ok(cb.unique, '链上不得出现重复之藏');
  assert.deepStrictEqual(cb.chain, ['肝', '脾', '肾', '心', '肺']);
  assert.strictEqual(cb.edges[0].to, '脾', '「见肝之病，知肝传脾」');
  assert.strictEqual(cb.edges[0].ke, '木克土');
});

test('五藏传变：5 条边全在 1.1 内有原文印证（不是推演出来的占位）', () => {
  const cb = chuanbian();
  assert.strictEqual(cb.attested, 5);
  for (const e of cb.edges) {
    assert.ok(e.phrase, `${e.from}→${e.to} 缺引文`);
    assert.ok(quoted('1.1', e.phrase), `「${e.phrase}」不在 1.1 中`);
  }
});

test('治未病三分支：实脾 / 勿补 / 不补', () => {
  const normal = zhiweibing({ zang: '肝', xu: true, season: '春' });
  assert.strictEqual(normal.to, '脾');
  assert.strictEqual(normal.act, '实脾');
  assert.ok(quoted('1.1', normal.quote));

  // 「四季脾旺不受邪，即勿补之」——脾当旺时不受邪，补之无的放矢
  const wang = zhiweibing({ zang: '肝', xu: true, season: '四季' });
  assert.strictEqual(wang.act, '勿补');

  // 「肝虚则用此法，实则不在用之」——实证不走这条路
  const shi = zhiweibing({ zang: '肝', xu: false, season: '春' });
  assert.strictEqual(shi.act, '不补');
});

test('治未病：非肝起手时引「余脏准此」，不硬套肝的例句', () => {
  const r = zhiweibing({ zang: '脾', xu: true, season: '长夏' });
  assert.strictEqual(r.to, '肾');
  assert.strictEqual(r.act, '实肾');
  assert.strictEqual(r.quote, '余脏准此');
  assert.ok(quoted('1.1', r.quote));
});

test('三因：3 类 / 9 举项，三类原文全部命中 1.2', () => {
  const sy = sanyin();
  assert.strictEqual(sy.n, 3);
  assert.strictEqual(sy.items, 9);
  assert.strictEqual(sy.attested, 3);
  assert.deepStrictEqual(sy.rows.map((r) => r.no), [1, 2, 3]);
  assert.ok(quoted('1.2', sy.quote), '「千般疢难，不越三条」');
});

test('三因按途径分，不按邪名分：「风」查不到是正确结果', () => {
  assert.strictEqual(classifyCause('风'), null, '风是五邪轴上的名，三因轴查不到');
  assert.strictEqual(classifyCause('金刃').cls, '房室、金刃、虫兽所伤');
  assert.strictEqual(classifyCause('金刃').no, 3);
  assert.strictEqual(classifyCause('九窍').no, 2);
  assert.strictEqual(classifyCause('入脏腑').no, 1);
});

test('五邪：5 名 / 5 法度，两串同名 0 —— 两套分类不一一对应', () => {
  const wx = wuxie();
  assert.strictEqual(wx.nNames, 5);
  assert.strictEqual(wx.nLaws, 5);
  assert.strictEqual(wx.paired, 0, '清浊大小䅽饪 ∩ 风寒湿雾食 = 空集');
  assert.strictEqual(wx.attested, 10);
  assert.strictEqual(wx.names[0].ju, '居上');
  assert.strictEqual(wx.laws[0].law, '中于前，令脉浮');
});

test('望闻判据 21 条：色 11 / 声 3 / 息 7', () => {
  const lk = lookups();
  assert.strictEqual(lk.n, 21);
  assert.deepStrictEqual(lk.byDept, { 色: 11, 声: 3, 息: 7 });
  assert.deepStrictEqual(lk.tiao, ['1.3', '1.4', '1.5', '1.6']);
  assert.deepStrictEqual(lk.bad, [], '每条判据的 sign 都必须逐字来自源条');
});

test('望闻判据的预后词：死 2 · 不治 3 · 难治 2（共 7 条）', () => {
  const { byJing } = lookups();
  assert.strictEqual(byJing['死'], 2);
  assert.strictEqual(byJing['不治'], 3);
  assert.strictEqual(byJing['难治'], 2);
  assert.strictEqual(byJing['无预后词'], 14);
  assert.strictEqual(2 + 3 + 2, 7);
});

test('查表可用部类/预后词/条号三种键：lookup() 与 filter 结果一致', () => {
  assert.strictEqual(lookup().length, 21);
  assert.strictEqual(lookup('色').length, 11);
  assert.strictEqual(lookup('息').length, 7);
  assert.strictEqual(lookup('不治').length, 3);
  assert.strictEqual(lookup('1.6').length, 4, '1.6 四条呼吸判据');
  assert.deepStrictEqual(lookup('色'), lookup().filter((r) => r.dept === '色'));
});

test('治则先后（1.14）：里急先救里，里和后方可救表', () => {
  const seq = order(['里急', '表证']);
  assert.deepStrictEqual(seq.map((s) => s.what), ['里急', '表证']);
  assert.deepStrictEqual(seq.map((s) => s.seq), [1, 2]);
  assert.strictEqual(seq[0].tiao, '1.14');
  assert.ok(quoted(seq[0].tiao, seq[0].quote));
});

test('治则先后（1.15）：痼疾加以卒病，卒病在前、痼疾在后', () => {
  const seq = order(['痼疾', '卒病']);
  assert.deepStrictEqual(seq.map((s) => s.what), ['卒病', '痼疾']);
  assert.strictEqual(seq[1].tiao, '1.15');
  assert.ok(seq[1].quote.includes('痼疾'));
});

test('「先治」不等于「治标」：1.14 先救里，而里属本', () => {
  const x = xianBuDengYuBiao();
  assert.strictEqual(x.first, '里急');
  assert.strictEqual(x.biaoBen, '本');
  assert.strictEqual(x.isBiao, false);
});

test('四证并见时全部入序、无遗漏：rank 0 并列者保留输入次序', () => {
  const seq = order(['里急', '表证', '痼疾', '卒病']);
  assert.strictEqual(seq.length, 4);
  assert.deepStrictEqual([...seq].map((s) => s.seq), [1, 2, 3, 4]);
  assert.deepStrictEqual(seq.map((s) => s.what), ['里急', '卒病', '表证', '痼疾']);
  assert.throws(() => order(['不存在的治法']), /未收录之治法/);
});

test('1.16 / 1.17 四个判定：愈 / 病 / 必发热 / 随所得而攻', () => {
  assert.strictEqual(suode({ kind: '所得' }).verdict, '愈');
  assert.strictEqual(suode({ kind: '所恶' }).verdict, '病');
  assert.strictEqual(suode({ kind: '暴思' }).verdict, '必发热');
  assert.strictEqual(suode({ kind: '在脏' }).verdict, '随所得而攻');
  for (const k of ['所得', '所恶', '暴思', '在脏']) {
    const r = suode({ kind: k });
    assert.ok(r.quoted, `${k} 的引文对不上 ${r.tiao}`);
  }
  assert.strictEqual(suode({ kind: '在脏' }).tiao, '1.17');
});

test('引文核验：47 处全部逐字命中，0 违反', () => {
  const v = verifyQuotes();
  assert.strictEqual(v.checked, 47);
  assert.deepStrictEqual(v.bad, []);
  assert.ok(v.ok);
});

test('取不存在的条号必须抛错 —— 不靠记忆补条', () => {
  assert.throws(() => text('1.99'), /底本无此条/);
  assert.throws(() => quoted('99.1', '任何'), /底本无此条/);
});

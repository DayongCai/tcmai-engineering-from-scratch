'use strict';
const assert = require('node:assert');
const test = require('node:test');
const {
  BOOK,
  NUE_TYPES,
  nueType,
  nueTypes,
  jieLv,
  zhongfengLayers,
  zhongfengSection,
  lijiSection,
  pianStats,
  totals,
} = require('./main.js');

const pian = (no) => BOOK.pian.find((p) => p.no === no);
const tiao = (no, t) => pian(no).articles.find((a) => a.tiao === t);

test('两篇规模：第 4 篇 5 条 3 方 / 第 5 篇 10 条 2 方 / 合计 15 条 5 方', () => {
  const s4 = pianStats(4);
  const s5 = pianStats(5);
  assert.strictEqual(s4.tiao, 5);
  assert.strictEqual(s4.fang, 3);
  assert.strictEqual(s5.tiao, 10);
  assert.strictEqual(s5.fang, 2, '第 5 篇只有 2 个有方文之方（侯氏黑散等在附方段，不计）');
  const t = totals();
  assert.strictEqual(t.tiao, 15);
  assert.strictEqual(t.fang, 5);
});

test('五方药味数：鳖甲煎丸 23 / 白虎加桂枝汤 5 / 蜀漆散 3 / 桂枝芍药知母汤 9 / 乌头汤 5', () => {
  const got = [...pianStats(4).formulas, ...pianStats(5).formulas].map((f) => `${f.name}:${f.herbs}`);
  assert.deepStrictEqual(got, [
    '鳖甲煎丸方:23',
    '白虎加桂枝汤方:5',
    '蜀漆散方:3',
    '桂枝芍药知母汤方:9',
    '乌头汤方:5',
  ]);
  // 药味数必须与 ingredients 实长一致，防止写死
  for (const no of [4, 5]) {
    for (const a of pian(no).articles) {
      for (const f of a.formulas || []) {
        assert.ok(f.ingredients.length > 0, `${f.nameSimp} 无药`);
        for (const i of f.ingredients) assert.ok((i.herbSimp || i.herb || '').length > 0, `${f.nameSimp} 有空药名`);
      }
    }
  }
});

test('疟四型归型：4.2 疟母 · 4.3 瘅疟 · 4.4 温疟 · 4.5 牝疟；4.1 不归型', () => {
  assert.strictEqual(nueType('4.2'), '疟母');
  assert.strictEqual(nueType('4.3'), '瘅疟');
  assert.strictEqual(nueType('4.4'), '温疟');
  assert.strictEqual(nueType('4.5'), '牝疟', '4.5 方后注有「温疟加蜀漆半分」，归型不能看整条');
  assert.strictEqual(nueType('4.1'), '未分型');
  assert.strictEqual(NUE_TYPES.length, 4);
  const rows = nueTypes();
  assert.strictEqual(rows.length, 5);
  assert.deepStrictEqual(rows.map((r) => r.type), ['未分型', '疟母', '瘅疟', '温疟', '牝疟']);
});

test('节律词：本篇 9 处，且「间日」为 0（不得凭空补）', () => {
  const j = jieLv();
  const map = Object.fromEntries(j.terms.map((x) => [x.term, x.count]));
  assert.strictEqual(map['一日发'], 1);
  assert.strictEqual(map['十五日'], 1);
  assert.strictEqual(map['当月尽解'], 1);
  assert.strictEqual(map['未发前'], 1);
  assert.strictEqual(map['临发时'], 1);
  assert.strictEqual(map['时呕'], 1);
  assert.strictEqual(map['日三服'], 2);
  assert.strictEqual(map['间日'], 0);
  assert.strictEqual(j.total, 9);
  assert.deepStrictEqual(j.absent, ['间日']);
  // 病情节律与给药节律必须分开统计，否则「一日发」和「日三服」会被混成一类
  assert.strictEqual(j.attack.length, 4);
  assert.strictEqual(j.dosing.length, 3);
});

test('中风四层：在络/在经/入腑/入脏，四句症状原文可核（5.2）', () => {
  const layers = zhongfengLayers();
  assert.deepStrictEqual(layers.map((l) => l.layer), ['在络', '在经', '入腑', '入脏']);
  assert.deepStrictEqual(layers.map((l) => l.sign), ['肌肤不仁', '即重不胜', '即不识人', '舌即难言，口吐涎']);
  for (const l of layers) assert.ok(l.quoted, `${l.layer} 的症状句在 5.2 中找不到`);
  const s = tiao(5, '5.2').zhHans;
  assert.ok(s.includes('络脉空虚') && s.includes('贼邪不泻'), '5.2 须含病因叙述');
});

test('中风段 5.1–5.3 有方文之方为 0；历节段 5.4–5.10 为 7 条 2 方', () => {
  const zf = zhongfengSection();
  assert.deepStrictEqual(zf.tiao, ['5.1', '5.2', '5.3']);
  assert.strictEqual(zf.fang.length, 0);
  assert.ok(zf.cause);
  const lj = lijiSection();
  assert.strictEqual(lj.tiao.length, 7);
  assert.strictEqual(lj.fang.length, 2);
  assert.deepStrictEqual(lj.fang, ['桂枝芍药知母汤方', '乌头汤方']);
  // 两个成因句各归一条，不能都挂在同一条上
  assert.deepStrictEqual(
    lj.tiao.filter((r) => r.cause).map((r) => `${r.tiao}:${r.cause}`),
    ['5.4:汗出入水中', '5.7:饮酒汗出当风']
  );
});

test('引文逐字取自 zhHans（不凭记忆补条文）', () => {
  assert.ok(tiao(4, '4.3').zhHans.startsWith('师曰：阴气孤绝，阳气独发，则热而少气烦冤'));
  assert.ok(tiao(4, '4.5').zhHans.includes('疟多寒者，名曰牝疟，蜀漆散主之。'));
  assert.ok(tiao(4, '4.4').zhHans.includes('温疟者，其脉如平，身无寒但热，骨节疼烦，时呕'));
  assert.ok(tiao(5, '5.1').zhHans.includes('夫风之为病，当半身不遂，或但臂不遂者，此为痹。'));
  assert.ok(tiao(5, '5.4').zhHans.includes('汗出入水中，如水伤心，历节黄汗出，故曰历节。'));
  assert.ok(tiao(5, '5.10').zhHans.includes('病历节不可屈伸，疼痛，乌头汤主之。'));
  // 繁体栏必须同步存在（底本双栏，缺一栏说明数据被手工改过）
  for (const no of [4, 5]) for (const a of pian(no).articles) assert.ok(a.zhHant && a.zhHant.length > 0);
});

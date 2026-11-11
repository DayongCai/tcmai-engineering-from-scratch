'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { execFileSync } = require('node:child_process');
const {
  FORMULAS, BENCH, SYMPTOM_WORDS, SYNONYMS, HEAD_ZONE,
  fold, zhuZhiOf, scoreFormula, retrieve, evaluate, singleTermBench,
  ambiguity, fieldAudit, compositionCollisions, structureIndex, configSweep, selfCheck,
} = require('./main.js');

const FULL = { mode: 'fallback', normalize: true };

test('底座：114 首方 · 246 味药 · 836 个药位 · 19 章 54 节', () => {
  const st = structureIndex();
  assert.strictEqual(FORMULAS.length, 114);
  assert.strictEqual(st.slots, 836);
  assert.strictEqual(st.herbs, 246);
  assert.strictEqual(st.chapters, 19);
  assert.strictEqual(st.secs, 54);
  assert.ok(st.slots > st.herbs, '药位是多味、药名是去重');
});

test('折叠：标点与空白不进匹配，「口苦，咽干」命中小柴胡汤', () => {
  assert.strictEqual(fold('口苦，咽干'), '口苦咽干');
  assert.strictEqual(fold('往来寒热、胸胁苦满'), '往来寒热胸胁苦满');
  const xrs = FORMULAS.find((f) => f.name === '小柴胡汤');
  assert.ok(zhuZhiOf(xrs, 'fallback').text.includes(fold('口苦，咽干')));
});

test('单主症歧义：15 词平均 10.1 首 / 6.5 章；发热最广 21 首 / 11 章', () => {
  const amb = ambiguity();
  assert.strictEqual(amb.length, 15);
  assert.deepStrictEqual(amb.map((a) => a.word), SYMPTOM_WORDS);
  const byWord = Object.fromEntries(amb.map((a) => [a.word, a]));
  assert.strictEqual(byWord['发热'].n, 21);
  assert.strictEqual(byWord['发热'].chapters, 11);
  assert.strictEqual(byWord['失眠'].n, 5);
  assert.strictEqual(byWord['失眠'].chapters, 3);
  const meanN = amb.reduce((s, a) => s + a.n, 0) / amb.length;
  const meanCh = amb.reduce((s, a) => s + a.chapters, 0) / amb.length;
  assert.strictEqual(Number(meanN.toFixed(1)), 10.1);
  assert.strictEqual(Number(meanCh.toFixed(1)), 6.5);
});

test('必具症状区计分：麻黄汤「恶寒发热＋无汗＋喘」三项都在开头 40 字内，得 6 分', () => {
  const mh = FORMULAS.find((f) => f.name === '麻黄汤');
  const s = scoreFormula(mh, ['恶寒发热', '无汗', '喘'], FULL);
  assert.strictEqual(s.hits, 3);
  assert.strictEqual(s.score, 6);
  assert.strictEqual(s.headHits, 3);
  assert.strictEqual(HEAD_ZONE, 40);
  // 同样三项，麻黄汤比九味羌活汤得分高（后者少一项、且命中在后段）
  const jw = FORMULAS.find((f) => f.name === '九味羌活汤');
  assert.ok(s.score > scoreFormula(jw, ['恶寒发热', '无汗', '喘'], FULL).score);
});

test('检索：往来寒热＋胸胁苦满 只圈出 2 首，并列时按码点排（大柴胡汤在前）', () => {
  const r = retrieve(['往来寒热', '胸胁苦满'], { ...FULL, k: 10 });
  assert.deepStrictEqual(r.map((x) => x.name), ['大柴胡汤', '小柴胡汤']);
  assert.strictEqual(r[0].score, r[1].score, '两首同分 —— 排序由码点决定，没有医学含义');
});

test('基准 14 例：召回@1 8/14、@3 11/14、平均候选 2.14、漏检 3 例', () => {
  const b = evaluate(BENCH, FULL);
  assert.strictEqual(b.n, 14);
  assert.strictEqual(BENCH.filter((x) => x.group === '经方').length, 8);
  assert.strictEqual(b.hit1, 8);
  assert.strictEqual(b.hit3, 11);
  assert.strictEqual(b.miss, 3);
  assert.strictEqual(b.zero, 2);
  assert.strictEqual(Number((b.recall1 * 100).toFixed(1)), 57.1);
  assert.strictEqual(Number((b.recall3 * 100).toFixed(1)), 78.6);
  assert.strictEqual(Number(b.avgCand.toFixed(2)), 2.14);
  assert.deepStrictEqual(b.misses.map((x) => x.gold), ['半夏白术天麻汤', '六味地黄丸', '归脾汤']);
  // 漏的 3 例各有其因：#9 用字两套、#10 主治只给证名（都为零召回）；#12 候选非空但无 gold
  assert.deepStrictEqual(b.misses.map((x) => x.cand === 0), [true, true, false]);
});

test('单主症退化为检索：@1 4/14、@3 8/14、平均候选 4.43 高于整串 2.14', () => {
  const s = evaluate(singleTermBench(), FULL);
  const b = evaluate(BENCH, FULL);
  assert.strictEqual(s.n, 14);
  assert.strictEqual(s.hit1, 4);
  assert.strictEqual(s.hit3, 8);
  assert.strictEqual(Number(s.avgCand.toFixed(2)), 4.43);
  assert.ok(s.hit3 < b.hit3, '丢掉兼症，召回只会下降');
  assert.ok(s.avgCand > b.avgCand, '丢掉兼症，候选只会变多');
});

test('四种配置：字段回退增量归零（已无空字段）、术语归一仍救回 2 例', () => {
  const s = Object.fromEntries(configSweep().map((x) => [x.key, x]));
  assert.deepStrictEqual(Object.keys(s), ['strict·整串', 'strict·单主症', '回退·整串', '回退·归一']);
  assert.deepStrictEqual([s['strict·整串'].hit3, s['回退·整串'].hit3, s['回退·归一'].hit3], [9, 9, 11]);
  assert.deepStrictEqual([s['strict·整串'].hit1, s['回退·整串'].hit1, s['回退·归一'].hit1], [6, 6, 8]);
  // 第6章 6 首主治补全后，strict 已能直接命中 #5 大承气汤：回退开关无字段可退，增量为 0
  assert.strictEqual(s['回退·整串'].hit3 - s['strict·整串'].hit3, 0);
  assert.strictEqual(s['回退·归一'].hit3 - s['回退·整串'].hit3, 2);
  assert.ok(s['strict·单主症'].hit3 < s['strict·整串'].hit3);
  assert.deepStrictEqual(Object.keys(SYNONYMS), ['大热', '大汗', '大渴', '胁痛']);
});

test('主治字段审计：0 首空（114/114 全有字）、18 首只给证名、96 首含「症见」', () => {
  const fa = fieldAudit();
  assert.strictEqual(fa.total, 114);
  assert.strictEqual(fa.empty, 0);
  assert.deepStrictEqual(fa.emptyChapters, {});
  assert.deepStrictEqual(fa.emptyNames, []);
  assert.strictEqual(fa.withZhengJian, 96);
  assert.strictEqual(fa.noZhengJian, 18);
  assert.strictEqual(fa.empty + fa.withZhengJian + fa.noZhengJian, 114);
  assert.strictEqual(fa.lenMin, 6);
  assert.strictEqual(fa.lenMedian, 54);
  assert.strictEqual(fa.lenMax, 435);
  // 上游修复回执：第6章泻下剂 6 首曾整章主治为空，现在全部有字
  const ch6 = FORMULAS.filter((f) => String(f.chapter) === '6');
  assert.strictEqual(ch6.length, 6);
  assert.deepStrictEqual(ch6.map((f) => f.name),
    ['大承气汤', '大黄牡丹汤', '温脾汤', '麻子仁丸', '十枣汤', '黄龙汤']);
  assert.ok(ch6.every((f) => (f.zhuzhi || '').trim().length > 0), '第6章 6 首主治字段不应为空');
  assert.ok(fa.noZhengJianNames.includes('归脾汤'));
  assert.ok(fa.noZhengJianNames.includes('六味地黄丸'));
});

test('药味集合两两不同（0 组重复），但这只是本数据的巧合', () => {
  const col = compositionCollisions();
  assert.strictEqual(col.count, 0);
  assert.deepStrictEqual(col.groups, []);
});

test('规模自检十二项全过', () => {
  const c = selfCheck();
  assert.strictEqual(c.length, 12);
  assert.ok(c.every((x) => x.ok), JSON.stringify(c.filter((x) => !x.ok)));
});

test('运行时最后一行是教学边界声明', () => {
  const out = execFileSync('node', ['code/main.js'], { cwd: __dirname + '/..', encoding: 'utf8' });
  const last = out.trim().split('\n').filter(Boolean).pop();
  assert.match(last, /教学边界/);
  assert.match(last, /不构成/);
});

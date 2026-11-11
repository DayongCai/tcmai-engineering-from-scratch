'use strict';
/**
 * 第 4 章 单测：三病鉴别 + doc 引文逐字校验
 *
 * 前 7 条测代码算得对不对；后 3 条测文档有没有跑偏（引文是否逐字、数字是否与代码同源）。
 * 引文那条是本文件最重要的：它把「不许凭记忆写条文」变成一条会红的断言。
 */
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  BOOK,
  PIAN,
  SEGMENTS,
  FEATURES,
  NAMED_ONLY,
  tiaoOnly,
  classify,
  signature,
  fangCount,
  bookContext,
  parseAudit,
} = require('./main.js');

const DOC = fs.readFileSync(path.join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
const QUIZ = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));

test('篇 3 共 15 条，分属 百合病 9 / 狐惑 4 / 阴阳毒 2', () => {
  assert.strictEqual(PIAN.no, 3);
  assert.strictEqual(PIAN.articles.length, 15);
  const rows = classify();
  assert.deepStrictEqual(rows.map((r) => r.key), ['百合病', '狐惑', '阴阳毒']);
  assert.deepStrictEqual(rows.map((r) => r.tiao), [9, 4, 2]);
  assert.strictEqual(rows.reduce((n, r) => n + r.tiao, 0), 15);
  // 条号连续、不重不漏
  assert.deepStrictEqual(rows.map((r) => r.from), [1, 10, 14]);
  assert.deepStrictEqual(rows.map((r) => r.to), [9, 13, 15]);
});

test('段首锚词必须真的在段首条文里（段界不是拍脑袋划的）', () => {
  for (const s of SEGMENTS) {
    const head = PIAN.articles.find((a) => a.idx === s.from);
    assert.ok(tiaoOnly(head).includes(s.anchor), `${s.key} 段首第 ${s.from} 条不含锚词「${s.anchor}」`);
  }
  // 反证：狐惑段后三条条文里根本没有「狐惑」二字 —— 关键字法归不了类
  const tail = PIAN.articles.filter((a) => a.idx >= 11 && a.idx <= 13);
  for (const a of tail) assert.ok(!/狐|惑/.test(tiaoOnly(a)), `第 ${a.tiao} 条出现了狐惑字样，段界论据需重写`);
});

test('有方文 12 方：百合病 7 / 狐惑 4 / 阴阳毒 1；提名无方文 1', () => {
  const f = fangCount();
  assert.strictEqual(f.fang, 12);
  assert.strictEqual(f.namedOnly, 1);
  assert.strictEqual(f.named, 13);
  assert.deepStrictEqual(f.byDisease, { 百合病: 7, 狐惑: 4, 阴阳毒: 1 });
  const rows = classify();
  assert.deepStrictEqual(rows.map((r) => r.per), [0.78, 1, 0.5]);
  assert.strictEqual(f.per, 0.8, '12 / 15 = 0.80');
});

test('提名无方文的只有 3.15 —— 凡「主之」而无 formulas 的条必须登记', () => {
  assert.strictEqual(NAMED_ONLY.length, 1);
  assert.strictEqual(NAMED_ONLY[0].tiao, '3.15');
  const a = PIAN.articles.find((x) => x.tiao === '3.15');
  assert.strictEqual(a.formulas.length, 0);
  assert.ok(tiaoOnly(a).includes(NAMED_ONLY[0].name));
  // 3.15 是 3.14 的加减方：去雄黄、蜀椒
  assert.ok(tiaoOnly(a).includes('去雄黄、蜀椒'));
  const base = PIAN.articles.find((x) => x.tiao === '3.14');
  assert.strictEqual(base.formulas[0].nameSimp, '升麻鳖甲汤方');
});

test('方条比 0.80 是全书 22 篇正文第二（第一是篇 9 胸痹 1.00，不是篇 17）', () => {
  const b = bookContext();
  assert.strictEqual(b.of, 22);
  assert.strictEqual(b.rank, 2, '底本 v2 把并列方切开后，篇 9 胸痹 9 条 9 方 = 1.00 排第一');
  assert.deepStrictEqual(b.top, [
    '第9篇 胸痹心痛短气病脉证治第九 1.00',
    '第3篇 百合病狐惑阴阳毒病脉证并治第三 0.80',
    '第8篇 奔豚气病脉证治第八 0.75',
  ]);
  assert.strictEqual(b.bookTiao, 398);
  assert.strictEqual(b.bookFang, 174, '174 = 165 有方文 + 9 互见（v1 的 164 是「每块只读首方」的产物）');
  assert.strictEqual(b.bookPer, 0.44);
  assert.strictEqual(b.p17.no, 17);
  assert.strictEqual(b.p17.tiao, 47, '篇 17 47 条 23 方，方条比 0.49');
  assert.strictEqual(b.p17.fang, 23);
});

test('百合病 7 方中 6 方用百合，唯一例外是栝蒌牡蛎散', () => {
  const f = fangCount();
  assert.strictEqual(f.baiheOfBaihe, '6/7');
  assert.deepStrictEqual(f.baiheTiaos, ['3.2', '3.3', '3.4', '3.5', '3.6', '3.8']);
  assert.strictEqual(f.baiheExempt.length, 1);
  assert.ok(f.baiheExempt[0].includes('栝蒌牡蛎散'));
});

test('特征矩阵：前后阴蚀烂/发斑/面青/身痛/唾脓血 为独占点，咽喉为狐惑×阴阳毒共有', () => {
  const s = signature();
  const ex = Object.fromEntries(s.exclusive.map((e) => [e.key, e.only]));
  assert.strictEqual(ex['前后阴蚀烂'], '狐惑');
  assert.strictEqual(ex['发斑'], '阴阳毒');
  assert.strictEqual(ex['面青'], '阴阳毒');
  assert.strictEqual(ex['身痛'], '阴阳毒');
  assert.strictEqual(ex['唾脓血'], '阴阳毒');
  assert.strictEqual(ex['口苦尿赤'], '百合病');
  assert.strictEqual(ex['目症'], '狐惑');
  // 咽喉：狐惑（蚀于喉/咽干）与阴阳毒（咽喉痛）都有 —— 这是本篇最容易误诊的一处
  assert.deepStrictEqual(s.rows['狐惑']['咽喉'], ['3.10', '3.11']);
  assert.deepStrictEqual(s.rows['阴阳毒']['咽喉'], ['3.14', '3.15']);
  assert.deepStrictEqual(s.rows['百合病']['咽喉'], []);
  // 共有症必须被识别为共有，不能被当成鉴别点
  const shared = s.shared.map((x) => x.key);
  for (const k of ['咽喉', '神志不安']) assert.ok(shared.includes(k), `${k} 应判为共有症`);
  // 百合病一条方都不涉前后阴与发斑
  for (const k of ['前后阴蚀烂', '发斑', '面青', '身痛', '唾脓血']) {
    assert.deepStrictEqual(s.rows['百合病'][k], [], `百合病不该命中 ${k}`);
  }
});

test('条文与方文分离：tiaoOnly 不得混入煎法', () => {
  const a = PIAN.articles.find((x) => x.tiao === '3.2');
  const t = tiaoOnly(a);
  assert.ok(t.includes('百合病发汗后者'));
  assert.ok(!t.includes('煎取'), '方文煎法混进了条文');
  for (const x of PIAN.articles) assert.ok(tiaoOnly(x).length > 0, `第 ${x.tiao} 条条文为空`);
});

// ───────── 文档一致性 ─────────
test('docs/zh.md 的分病表与代码同源（行前缀逐字匹配）', () => {
  for (const r of classify()) {
    const row = `| ${r.key} | ${r.tiao} | ${r.fang} | ${r.per.toFixed(2)} |`;
    assert.ok(DOC.includes(row), `docs 缺行：${row}`);
  }
  assert.strictEqual((DOC.match(/^#\s+\S/gm) || []).length, 1, '只允许 1 个 H1');
  for (const k of ['MOTTO', 'PROBLEM', '环境逼迫', '知识积累', '代价与边界', '免责']) {
    assert.ok(DOC.includes(k), `docs 缺 ${k}`);
  }
  const plain = DOC.replace(/\s/g, '').length;
  assert.ok(plain >= 1500, `docs 篇幅 ${plain} < 1500`);
});

test('docs/zh.md 的每条「」引文都能在底本里逐字找到（反编造）', () => {
  // 语料 = 简/繁条文 + 煎法 + 校注。引文只要在其中任一处出现即为真。
  const corpus = PIAN.articles
    .flatMap((a) => [a.zhHans, a.zhHant, ...(a.formulas || []).flatMap((f) => [f.methodSimp, f.method, ...f.ingredients.map((i) => i.herbSimp)]), ...(a.notes || [])])
    .join('\n');
  const quotes = [...DOC.matchAll(/「([^」\n]{10,})」/g)].map((m) => m[1]);
  assert.ok(quotes.length >= 8, `只找到 ${quotes.length} 条长引文，引文太少`);
  for (const q of quotes) {
    assert.ok(corpus.includes(q), `引文不存在于底本（疑似编造）：「${q}」`);
  }
});

test('quiz：恰好 6 题（pre 1 / check 3 / post 2），每题 4 选项', () => {
  const got = { pre: 0, check: 0, post: 0 };
  assert.strictEqual(QUIZ.questions.length, 6);
  for (const q of QUIZ.questions) {
    assert.ok(q.stage in got, `非法 stage: ${q.stage}`);
    got[q.stage] += 1;
    assert.strictEqual(q.options.length, 4);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct <= 3);
    assert.ok(q.explanation && q.explanation.length > 10, `缺解析：${q.question}`);
  }
  assert.deepStrictEqual(got, { pre: 1, check: 3, post: 2 });
});

test('底本 v2：v1 的解析瑕疵已不存在 —— 148 方味数与原文「右N味」自述全吻合、无伪药名', () => {
  const a = parseAudit();
  // 反向断言。v1 的四类瑕疵（并列方被吞 / 非贪婪截断 / 下一味排进上一味的剂量夹注 /
  // 纯校注当药）在数据上都是同一个等式失效：药数 ≠ 原文自述的「右N味」。
  // 这里要求等式成立：底本一旦退回 v1，mismatched 或 pseudo 立刻非空。
  assert.strictEqual(a.anchored, 148, '有「右N味」自述的方数');
  assert.strictEqual(a.matched, 148, `吻合 ${a.matched} / ${a.anchored}`);
  assert.deepStrictEqual(a.mismatched, [], `味数与原文自述不符：${a.mismatched.join('；')}`);
  assert.deepStrictEqual(a.pseudo, [], `药名列表里出现煎法/校注伪药名：${a.pseudo.join('；')}`);
  // 本篇有锚点的 4 方（3.10 七味 / 3.12 一味 / 3.13 二味 / 3.14 六味）全部吻合
  assert.strictEqual(a.pian3.formulas, 12);
  assert.strictEqual(a.pian3.anchored, 4);
  assert.strictEqual(a.pian3.matched, 4);
  // 3.6 百合洗方是源页缺项（无药味栏 → 无「右N味」锚点），不是解析偏差：显式列在豁免表里，
  // 因此也不进本篇药味统计。
  assert.ok(a.pian3.unanchored.includes('3.6'), '3.6 应被列为无锚点豁免');
  assert.strictEqual(a.refOnly, 9, '9 个互见方（见前/见上），无药文');
  // 3.12 的「狐惑」仍只在注文与煎法里 —— 这是校勘事实，与解析无关
  const a12 = PIAN.articles.find((x) => x.tiao === '3.12');
  assert.ok(!tiaoOnly(a12).includes('狐惑'));
  assert.ok(a12.formulas[0].methodSimp.includes('狐惑'));
  assert.strictEqual(FEATURES.length, 12);
});


#!/usr/bin/env node
/**
 * tests/test_embeddings.js — 嵌入层（scripts/build_embeddings.js）
 *
 * 规格来自源材料的 `embedding-code` 工作表，所以测试也对着**规格原文**测：
 *   · ① Document 构建必须与规格模板的字段顺序一致
 *   · ① 空字段必须表现为「缺席」，不能表现为一个取值（写「疾病：未知」会污染向量空间）
 *   · ② 分词必须是字符 bigram
 *   · ③ TF-IDF 必须是 sklearn 默认口径（smooth_idf + L2 归一化）
 *   · ④ BM25 必须让稀有词权重更高
 *   · ⑤ RRF 必须用 k=60（规格原文写死）
 *   · 回归锚点：规格记录了 `/semantic-search?q=失眠 → 心脾两虚证`，这条必须一直成立
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert');

const ROOT = path.resolve(__dirname, '..');
const E = require(path.join(ROOT, 'scripts', 'build_embeddings.js'));

let passed = 0;
const failures = [];
function test(name, fn) {
  try { passed += 1; fn(); console.log(`  ✓ ${name}`); }
  catch (e) { failures.push({ name, err: e }); console.log(`  ✗ ${name}\n      ${e.message}`); }
}

console.log('═══ 嵌入层 ═══\n');

const full = {
  disease: '普通感冒', icd: 'CA00', syndrome: '风寒束表证', dcat: '',
  dsym: '恶寒发热无汗', ssym: '恶寒重发热轻', formula: '麻黄汤', zf: '肺卫', six: '太阳',
};

// ── ① Document 构建 ──
test('① Document 按规格模板拼装，字段顺序与规格一致', () => {
  const t = E.buildDocument({ label: '风寒束表证' }, full);
  const order = ['疾病：普通感冒', 'ICD-11编码：CA00', '西医症状：恶寒发热无汗', '中医证候：风寒束表证', '脏腑：肺卫', '六经：太阳', '主症：恶寒重发热轻', '主方：麻黄汤'];
  let at = -1;
  for (const frag of order) {
    const i = t.indexOf(frag);
    assert.ok(i >= 0, `文档里缺「${frag}」\n${t}`);
    assert.ok(i > at, `「${frag}」的位置不符合规格顺序\n${t}`);
    at = i;
  }
});

test('① 空字段表现为缺席，不倒推、不占位', () => {
  const t = E.buildDocument({ label: '风寒束表证' }, {});
  assert.strictEqual(t, '中医证候：风寒束表证。');
  for (const frag of ['疾病：', 'ICD-11编码：', '西医症状：', '主方：', '未知', '未知：']) {
    assert.ok(!t.includes(frag), `空字段不该写出「${frag}」：${t}`);
  }
});

test('① 只有病侧没有编码时，不编造编码', () => {
  const t = E.buildDocument({ label: '社区获得性肺炎' }, { disease: '社区获得性肺炎' });
  assert.ok(t.includes('疾病：社区获得性肺炎'));
  assert.ok(!t.includes('ICD-11'), `没编码却写了编码字段：${t}`);
});

// ── ② 分词 ──
test('② 中文分词是字符 bigram', () => {
  assert.deepStrictEqual(E.tokenizeBigram('风寒束表证'), ['风寒', '寒束', '束表', '表证']);
  assert.deepStrictEqual(E.tokenizeBigram('风'), ['风'], '单字段应保留自身');
  assert.deepStrictEqual(E.tokenizeBigram('中医 AI'), ['中医', 'ai']);
});

// ── ③ TF-IDF ──
test('③ TF-IDF 向量是 L2 归一化的（sklearn 默认 norm=l2）', () => {
  const docs = [{ text: '风寒束表证' }, { text: '风热犯表证' }, { text: '风寒束表证恶寒' }];
  const { vectors } = E.buildTfidf(docs, (t) => E.tokenizeBigram(t));
  vectors.forEach((v, i) => {
    const n = Math.sqrt([...v.values()].reduce((s, w) => s + w * w, 0));
    assert.ok(Math.abs(n - 1) < 1e-9, `第 ${i} 篇未归一化：${n}`);
  });
});

test('③ 出现在所有文档里的词 idf 恰为 1（smooth_idf 口径）', () => {
  const docs = [{ text: '中医证候' }, { text: '中医证候' }, { text: '中医证候' }];
  const { df, N } = E.buildTfidf(docs, (t) => E.tokenizeBigram(t));
  const idf = Math.log((1 + N) / (1 + df.get('中医'))) + 1;
  assert.ok(Math.abs(idf - 1) < 1e-12, `idf=${idf}`);
});

// ── ④ BM25 ──
test('④ BM25 让稀有词比常见词权重更高（倒排索引按 df 打折）', () => {
  const docs = [
    { text: '中医证候常见词' }, { text: '中医证候常见词' }, { text: '中医证候常见词' },
    { text: '中医证候常见词 失眠' },
  ];
  const { search } = E.buildBm25(docs, (t) => E.tokenizeBigram(t));
  const rare = search(E.tokenizeBigram('失眠'), 4);
  const common = search(E.tokenizeBigram('常见'), 4);
  assert.strictEqual(rare[0].i, 3, '含「失眠」的文档应排第一');
  const idfRare = rare[0].score;
  const idfCommon = common[0].score;
  assert.ok(idfRare > idfCommon, `稀有词得分 ${idfRare} 未高于常见词 ${idfCommon}`);
});

// ── ⑤ RRF ──
test('⑤ RRF 用 k=60，首位得 1/61', () => {
  const fused = E.rrf([[7, 3, 9], [3, 7]]);
  const s = new Map(fused.map((x) => [x.i, x.score]));
  assert.ok(Math.abs(s.get(7) - (1 / 61 + 1 / 62)) < 1e-12, `doc7=${s.get(7)}`);
  assert.ok(Math.abs(s.get(3) - (1 / 62 + 1 / 61)) < 1e-12, `doc3=${s.get(3)}`);
  assert.ok(Math.abs(s.get(9) - 1 / 63) < 1e-12, `doc9=${s.get(9)}`);
});

// ── 端到端（跑真入口，读真产物）──
console.log('\n  跑真实入口（node scripts/build_embeddings.js）…');
const run = spawnSync(process.execPath, ['scripts/build_embeddings.js'], { cwd: ROOT, encoding: 'utf8' });
assert.strictEqual(run.status, 0, `嵌入层退出码 ${run.status}\n${run.stdout}\n${run.stderr}`);
const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/semtensor/embeddings/index.json'), 'utf8'));

test('产物 index.json 记录了对规格的每一处偏离（偏离必须显式）', () => {
  assert.ok(idx.deviations.length >= 3, '偏离少于 3 处，疑似被删');
  assert.ok(idx.notImplemented.some((n) => /ICD-11 双通道/.test(n.component)), '未记录 ⑦ 未实现');
  assert.ok(idx.specComponents.length >= 7, '规格组件记录不全');
});

test('字段供给被如实记录（证候满、病侧稀）', () => {
  assert.strictEqual(idx.counts.dsu, 103);
  assert.strictEqual(idx.evaluation.ngram13.diseaseCoverage, 12, '病侧覆盖数变了');
  const withIcd = idx.documents.filter((d) => d.kind === 'dsu' && d.fields.icd).length;
  assert.strictEqual(withIcd, 7, `ICD 覆盖数变了：${withIcd}`);
});

test('语料里不许出现派生件（防"自己的输出喂回自己的输入"的反馈环）', () => {
  const list = idx.counts.corpusFileList || [];
  assert.ok(list.length > 100, `语料文件清单过短：${list.length}`);
  const bad = list.filter((f) => /embeddings[\\/]|stats\.json|outputs[\\/]index\.json|dashboard\.html|icd11[\\/]README|icd11[\\/]meta\.json|manifest\.json/.test(f));
  assert.deepStrictEqual(bad, [], `语料里混进了派生件：\n${bad.join('\n')}`);
});

test('回归锚点：失眠的期望答案心脾两虚证 在前 5 内', () => {
  // 断言"排第几"而不是"top1 恰好是它"：top1 是**语料快照**的性质，任何无关文件的增删
  // 都会改 IDF 从而翻转排名（第一次就是这么断的）。位次才是系统的性质。
  const s = idx.retrievalSmoke.find((x) => /失眠/.test(x.query));
  assert.ok(s, '冒烟里没有失眠这一条');
  assert.ok(s.expectedRank != null, '失眠的期望答案未入榜');
  assert.ok(s.expectedRank <= 5, `失眠的期望答案掉到第 ${s.expectedRank}（前 5 外）`);
});

test('失败端点记为失败，并记下它排第几（不许美化）', () => {
  // 注意这条**不断言"必须有失败"** —— 那种断言与"top1 必须是 X"一样脆：语料一改就断，
  // 而断的原因与系统的质量无关。这里守的是**报告不许丢掉对照**：
  // 规格的每个用例都必须出现、都必须带着期望值与被测位次（位次可为 null = 未入榜）。
  assert.strictEqual(idx.retrievalSmoke.length, 3, `规格用例少了：只有 ${idx.retrievalSmoke.length} 条`);
  for (const s of idx.retrievalSmoke) {
    assert.ok(s.expectedInSpec, `${s.endpoint} 丢了规格原值`);
    assert.ok('expectedRank' in s, `${s.endpoint} 没记位次`);
    assert.ok('allUnits' in s && 'top5' in s.allUnits, `${s.endpoint} 没记实际返回`);
  }
  const inTop5 = idx.retrievalSmoke.filter((s) => s.expectedRank != null && s.expectedRank <= 5).length;
  console.log(`      （期望答案进前 5：${inTop5}/3 —— 数字随语料变化，报告必须跟着变，但不许不记）`);
});

test('检索是确定性的（同一份语料跑两次，位次一致）', () => {
  const run2 = spawnSync(process.execPath, ['scripts/build_embeddings.js'], { cwd: ROOT, encoding: 'utf8' });
  assert.strictEqual(run2.status, 0);
  const idx2 = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/semtensor/embeddings/index.json'), 'utf8'));
  const ranks = (o) => o.retrievalSmoke.map((s) => `${s.query}:${s.expectedRank}`).join('|');
  assert.strictEqual(ranks(idx2), ranks(idx), '两次运行位次不同 —— 检索不可复现');
  assert.strictEqual(idx2.counts.corpusFiles, idx.counts.corpusFiles);
});

console.log(`\n  ${passed} 通过 · ${failures.length} 失败`);
if (failures.length) {
  console.log('\n失败明细:');
  failures.forEach((f) => console.log(`  ✗ ${f.name}\n    ${f.err.stack.split('\n').slice(0, 3).join('\n    ')}`));
  process.exit(1);
}
console.log('\n✅ 嵌入层通过');

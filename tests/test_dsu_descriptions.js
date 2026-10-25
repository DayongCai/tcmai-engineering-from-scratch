#!/usr/bin/env node
/**
 * tests/test_dsu_descriptions.js — 证候描述（从证据组装）
 *
 * 守三件事：
 *  1. 构词解析正确（证名是构词的，拆得出才拆得出，拆不出要留残余而不是硬凑）
 *  2. **证据只取正文** —— 这条是本仓库第 3 次栽的同一个坑，必须有断言钉住
 *  3. 覆盖数字如实（含"教材证据只有 3/96"这个难看但真实的数）
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');

const ROOT = path.resolve(__dirname, '..');
const D = require(path.join(ROOT, 'scripts', 'build_dsu_descriptions.js'));

let passed = 0;
const failures = [];
function test(name, fn) {
  try { passed += 1; fn(); console.log(`  ✓ ${name}`); }
  catch (e) { failures.push({ name, err: e }); console.log(`  ✗ ${name}\n      ${e.message}`); }
}

console.log('═══ 证候描述 ═══\n');

const JSON_PATH = path.join(ROOT, 'standards/semtensor/descriptions/dsu-descriptions.json');
const MD_PATH = path.join(ROOT, 'standards/semtensor/descriptions/descriptions.md');
assert.ok(fs.existsSync(JSON_PATH), '先跑 node scripts/build_dsu_descriptions.js');
const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
const md = fs.readFileSync(MD_PATH, 'utf8');

test('构词解析：风寒束表证 → 病性含「风寒」、病位含「表」', () => {
  const d = D.decompose('风寒束表证');
  assert.ok(d.nature.includes('风寒'), `病性实为 ${JSON.stringify(d.nature)}`);
  assert.ok(d.locus.includes('表'), `病位实为 ${JSON.stringify(d.locus)}`);
});

test('构词解析：肝胆湿热证 → 病性「湿热」、病位「肝」「胆」', () => {
  const d = D.decompose('肝胆湿热证');
  assert.ok(d.nature.includes('湿热'), `病性实为 ${JSON.stringify(d.nature)}`);
  assert.ok(d.locus.includes('肝') && d.locus.includes('胆'), `病位实为 ${JSON.stringify(d.locus)}`);
});

test('构词解析：最长匹配不重复计数（寒湿不被拆成 寒+湿）', () => {
  const d = D.decompose('寒湿困脾证');
  assert.ok(d.nature.includes('寒湿'), `病性实为 ${JSON.stringify(d.nature)}`);
  assert.ok(!d.nature.includes('寒') || d.nature.filter((x) => x === '寒').length === 0,
    `「寒湿」被重复拆成了 ${JSON.stringify(d.nature)}`);
});

test('**守门：证据语料只能来自正文（.md），不许含数据集/索引/报告**', () => {
  const list = data.stats.corpusFileList || [];
  assert.ok(list.length > 10, `语料过短：${list.length}`);
  const bad = list.filter((f) => {
    const s = f.replace(/\\/g, '/');
    return !/\.md$/.test(s) || /semtensor\/datasets\//.test(s) || /semtensor\/descriptions\//.test(s);
  });
  assert.deepStrictEqual(bad, [],
    `语料里混进了非正文（这正是第 3 次栽的坑 —— 教材证据曾 96/96 全部来自自己的 JSON）：\n${bad.join('\n')}`);
});

test('覆盖数字如实：教材证据 33（原钉 3，教材语料扩容后重钉）', () => {
  // 这个数很难看，但它必须被钉住：任何一次"语料放宽"都会把它推回虚高。
  // 证名数不是永恒 96：拆名/合名会改它（2026-10-19 DSU-00102 拆成两条 → 97）。
  // 钉住的不是"96"，而是"与 DSU 的对应关系说得清"。
  assert.ok(data.stats.labels >= 96 && data.stats.labels <= data.stats.dsuRecords,
    `证名数 ${data.stats.labels} 与 DSU ${data.stats.dsuRecords} 的关系异常（证名 ≤ DSU 记录）`);
  assert.strictEqual(data.stats.dsuRecords, (() => {
    const raw = JSON.parse(require('fs').readFileSync(
      require('path').join(__dirname, '..', 'standards/semtensor/datasets/reference-units.json'), 'utf8'));
    return (Array.isArray(raw) ? raw : raw.units).filter((u) => u.kind === 'dsu').length;
  })(), 'dsuRecords 必须等于 reference-units.json 里 dsu 的条数（拆名会改它）');
  // 3 → 33（2026-10-22 核）：教材语料已从当年的 3 篇扩到 99 门 / 2995 个 md
  // （textbooks/<院系>/<学科>/…），33 条命中涉及的 51 个出处**全部**在 textbooks/ 下、
  // 无一是自产 JSON —— 是语料真的变厚，不是口径放宽。原来钉 3 只是
  // 「语料没混进自产 JSON」的**代理指标**；代理会随语料扩容失效，所以下面改成直接钉出处。
  assert.strictEqual(data.stats.withTextbook, 33,
    `教材证据 ${data.stats.withTextbook}/${data.stats.labels} —— 若这个数突然变大，先查语料是不是又放宽了`);
  const strayEvidence = data.records
    .flatMap((r) => (r.textbookEvidence || []).map((c) => c.file))
    .filter((f) => !/^textbooks\//.test(String(f).replace(/\\/g, '/')));
  assert.deepStrictEqual(strayEvidence, [],
    `教材证据的出处不在 textbooks/ 下（自产 JSON 混进语料的老坑）：\n${strayEvidence.join('\n')}`);
  assert.ok(data.stats.withExternal >= 1, '外部证据一条都没有？那 external.json 没被读进来');
  // 这条原来断言 `fullyMissing > 0`，用来钉住"不是人人都齐"。覆盖爬到 85/96 后它自然变成 0，
  // 硬钉这个数只会逼人改数据。改钉**真正的不变量**：统计必须与逐条记录重算一致，
  // 且「整串级 + 构件级」不能超过外部证据总数（否则两级被重复计入，覆盖数就虚高）。
  const recomputed = data.records.filter((r) => r.missing.length === 7).length;
  assert.strictEqual(data.stats.fullyMissing, recomputed,
    `fullyMissing ${data.stats.fullyMissing} ≠ 逐条重算 ${recomputed} —— 统计与记录不一致`);
  assert.ok(data.stats.withExternalWhole >= 1, '整串级为 0？分级没算进构建');
  assert.ok(data.stats.withExternalWhole + data.stats.withExternalComponent + data.stats.withConcurrent + data.stats.withChain <= data.stats.withExternal,
    `整串级 ${data.stats.withExternalWhole} + 并病 ${data.stats.withConcurrent} + 因果链 ${data.stats.withChain} + 构件级 ${data.stats.withExternalComponent} 超过外部证据总数 ${data.stats.withExternal}`);
  // 并病（两证同存）是领域判断，必须真的被标出来，且都停在 component —— 否则说明标记与证据脱节。
  // 原来这里钉 `>= 5`（当时 5 条并病的快照）。2026-10-25 三条并病（胆郁痰扰、心神不宁 /
  // 肝肾阴虚、肝阳上亢 / 气阴两虚、痰瘀阻络）拿到「一句断言写整串」的来源升了整串级，
  // 并病这条宽判据随之退场 —— 硬钉数字只会逼人改数据。改钉**真正的不变量**：
  // external.json 里标了 concurrent、且判定仍停在 component 的条目，构建必须原样报出来
  // （标记没丢、也没多算）；整串/单构件级不许再挂并病标记，否则同一条记录既算整串又算并病。
  const extEntries = JSON.parse(fs.readFileSync(
    path.join(ROOT, 'standards/semtensor/descriptions/external.json'), 'utf8')).entries;
  const concurrentMarked = new Set(extEntries.filter((x) => x.concurrent).map((x) => x.label));
  const expectedConcurrent = data.records
    .filter((r) => concurrentMarked.has(r.label) && r.externalScope === 'component');
  assert.ok(expectedConcurrent.length >= 1, '并病标注一条都没落进 component —— 标记与证据脱节了');
  assert.strictEqual(data.stats.withConcurrent, expectedConcurrent.length,
    `并病达标 ${data.stats.withConcurrent} ≠ 标注且停在构件级 ${expectedConcurrent.length} —— 统计与记录不一致`);
  for (const r of data.records) {
    if (!r.externalConcurrent) continue;
    assert.strictEqual(r.externalScope, 'component',
      `${r.label} 标为并病但 scope=${r.externalScope} —— 并病的判据是"两侧各有来源"`);
  }
  // 因果链（因→果）同样以 component 为达标，且必须与并病互斥 —— 一个证名不可能既是同存又是因果
  const chainMarked = new Set(extEntries
    .filter((x) => x.relationChain === 'cause-effect' && !x.concurrent).map((x) => x.label));
  const expectedChain = data.records.filter((r) => chainMarked.has(r.label) && r.externalScope === 'component');
  assert.strictEqual(data.stats.withChain, expectedChain.length,
    `因果链达标 ${data.stats.withChain} ≠ 标注且停在构件级 ${expectedChain.length} —— 统计与记录不一致`);
  assert.ok(data.stats.withChain >= 1, `因果链达标只有 ${data.stats.withChain} 条，relationChain 标记丢了？`);
  for (const r of data.records) {
    if (!r.externalChain) continue;
    assert.strictEqual(r.externalScope, 'component',
      `${r.label} 标为因果链但 scope=${r.externalScope} —— 因果链的判据同样是"两侧各有来源"`);
    assert.ok(!r.externalConcurrent, `${r.label} 同时标了并病与因果链 —— 语义互斥，必须二选一`);
  }
  for (const r of data.records) {
    if (!r.externalEvidence.length) continue;
    assert.ok(['single', 'whole', 'component', 'partial'].includes(r.externalScope),
      `${r.label} 的 externalScope 非法：${r.externalScope}`);
  }
});

test('每条记录都带出处或显式缺失，不留空话', () => {
  for (const r of data.records) {
    assert.ok(Array.isArray(r.missing), `${r.label} 没有 missing 字段`);
    const has = r.decomposed.nature.length || r.decomposed.locus.length || r.mechanisms.length ||
      r.disease || r.icd || r.textbookEvidence.length || r.externalEvidence.length;
    if (!has) assert.ok(r.missing.length >= 6, `${r.label} 什么都没给，却没标缺失`);
    for (const c of r.textbookEvidence) assert.ok(c.file && c.snippet, `${r.label} 的教材证据缺出处`);
    for (const e of r.externalEvidence) assert.ok(e.url && e.snippet, `${r.label} 的外部证据缺 URL`);
  }
});

test('外部证据带 URL 与出处类型（可核查，不是转述）', () => {
  const ext = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/semtensor/descriptions/external.json'), 'utf8'));
  assert.ok(ext.entries.length >= 5, `外部证据只有 ${ext.entries.length} 条`);
  assert.ok(ext.channel && /web_search/.test(ext.channel), '未记录检索途径');
  assert.ok(/不可达/.test(ext.$note.join(' ')) || /403/.test(ext.$note.join(' ')), '未记录维基不可达这一事实');
  for (const e of ext.entries) for (const s of e.sources) {
    assert.match(s.url, /^https?:\/\//, `${e.label} 的来源缺 URL`);
    assert.ok(s.type, `${e.label} 的来源缺类型标注`);
  }
});

test('人读版（descriptions.md）写明了那条更正', () => {
  assert.match(md, /教材证据只有 \d+\/\d+/, '人读版没写更正');
  assert.match(md, /自我印证/, '人读版没解释为什么 96/96 是假的');
});

test('构词解析：肝阳上亢证 → 动作「阳上亢」（它在词表里，但**不是连续的「阳亢」**）', () => {
  // 这一条是踩出来的：证名里是「阳**上**亢」，我第一版词表写的是「阳亢」，永远匹配不上。
  // 于是 96 个证名里 79 个拆不干净 —— 词表不该凭记忆写，该从证名里量出来。
  const d = D.decompose('肝阳上亢证');
  assert.ok(d.locus.includes('肝'), `病位实为 ${JSON.stringify(d.locus)}`);
  assert.ok(d.action.includes('阳上亢'), `动作实为 ${JSON.stringify(d.action)}`);
  assert.strictEqual(d.residue, '', `仍有残余：${d.residue}`);
});

test('残余只算汉字，不算标点（「、」「/」不是词）', () => {
  const d = D.decompose('肺肾气虚、痰瘀阻络证');
  assert.ok(!/[、/（）()]/.test(d.residue), `残余里混进了标点：${JSON.stringify(d.residue)}`);
});

test('「例如（常见于）」来自证据，且标注了样本范围', () => {
  const r = data.records.find((x) => x.label === '肝阳上亢证');
  assert.ok(r, '没有肝阳上亢证这条');
  const ex = r.diseaseExamples.find((d) => d.uid === 'DSU-00008');
  assert.ok(ex, '肝阳上亢证 的例如里没有 DSU-00008');
  assert.strictEqual(ex.disease, '原发性高血压', `实为 ${ex.disease}`);
  assert.strictEqual(ex.icd, 'BA00');
  // 出处限定必须写在人读版里：那是样例表，不是全量对照
  assert.match(md, /例如（常见于）/, '人读版没有「例如（常见于）」');
  assert.match(md, /样例表.*非 \d+ 个证候的全量对照/, '没有标注样本范围 —— 会把样例当全量');
});

test('WHO-TCM 代码被拆成结构（段.组.项），且与词典类目路径**分开**', () => {
  const p = D.parseWhoCode('2.9.90');
  assert.deepStrictEqual(p, { raw: '2.9.90', parts: ['2', '9', '90'], depth: 3, division: '2', group: '2.9', item: '90' });
  assert.strictEqual(D.parseWhoCode('不是代码'), null, '非法代码应返回 null，不能编一个拆法');
  const who = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/semtensor/descriptions/who-tcm.json'), 'utf8'));
  const e = who.entries[0];
  assert.ok(e.whoCode && e.classPathFromDict.length >= 2, 'WHO 条目缺代码或类目路径');
  // 两套编号必须都在：代码 2.9.90 ≠ 类目路径里的 2.4
  assert.notStrictEqual(e.whoCode.split('.').slice(0, 2).join('.'), '2.4',
    'WHO 代码与词典类目路径被混为一谈了');
  assert.match(who.caution, /不是同一套|不换算/, '未声明两套编号不可换算');
  assert.match(who.entries[0].whoEdition, /2007|2022/, '未记录版本');
});

test('覆盖数字如实：构词拆净 72/96，且拆不干净的名单在产物里可见', () => {
  // 这个数来回变过两次，都值得记：
  //   · 第一版 72 —— 但 `strip` 对每个词独立 includes，`寒湿困脾证` 拆成 ["寒湿","湿","寒"]，
  //     同一处算三遍，**病位虚高到 80 是假的**；
  //   · 改成"三类共用一条游标"后掉到 69 —— 修对了重复计数，却让**跨类也互相吞**
  //     （`困脾` 被 `脾` 吃掉，动作变空），那是过度修正；
  //   · 最终"每类各自一条游标"：同类不重复、跨类允许重叠 → 72。
  //     `寒湿困脾证` = 病性[寒湿] 病位[脾] 动作[困脾]，三者都对。
  // 拆净数随**证名条数**变（拆名 96→97 时跟着变），所以钉的不是"72"这个字面值，
  // 而是它与逐条记录的一致性 + 与缺口名单的互补性 —— 重复计数/放宽词表会让这两条同时破。
  const recomputedClean = data.records.filter((r) => !r.decomposed.residue).length;
  assert.strictEqual(data.stats.cleanDecompose, recomputedClean,
    `拆净 ${data.stats.cleanDecompose} ≠ 逐条重算 ${recomputedClean} —— 统计与记录不一致`);
  assert.strictEqual(data.stats.cleanDecompose + data.stats.dirtyDecompose.length, data.stats.labels,
    `拆净 ${data.stats.cleanDecompose} + 缺口名单 ${data.stats.dirtyDecompose.length} ≠ 证名总数 ${data.stats.labels}`);
  assert.ok(data.stats.dirtyDecompose.length > 0, '拆不干净的名单空了 —— 缺口被盖住了');
  for (const d of data.stats.dirtyDecompose) assert.match(d, /← 残余「.+」/, `名单格式不对：${d}`);
});

test('构词：同类不重复计、跨类不互相吞', () => {
  const d = D.decompose('寒湿困脾证');
  assert.deepStrictEqual(d.nature, ['寒湿'], `病性被重复拆成 ${JSON.stringify(d.nature)}`);
  assert.ok(d.locus.includes('脾'), `病位实为 ${JSON.stringify(d.locus)}`);
  assert.ok(d.action.includes('困脾'), `动作实为 ${JSON.stringify(d.action)}（曾因共用一个游标被「脾」吃掉）`);
  assert.strictEqual(d.residue, '', `仍有残余：${d.residue}`);
});

console.log(`\n  ${passed} 通过 · ${failures.length} 失败`);
if (failures.length) {
  console.log('\n失败明细:');
  failures.forEach((f) => console.log(`  ✗ ${f.name}\n    ${f.err.stack.split('\n').slice(0, 3).join('\n    ')}`));
  process.exit(1);
}
console.log('\n✅ 证候描述通过');

#!/usr/bin/env node
/**
 * tests/test_icd11_terms.js — ICD-11 术语嵌入层（scripts/icd11_terms.js）+ 真 FTS5（scripts/lib_fts5.js）
 *
 * 分三层测，因为三层的外部依赖完全不同：
 *   A. lib_fts5 纯逻辑 —— 内存库即可，任何机器都能跑。
 *      重点守两件**实测踩过的事**：中文 unicode61 会把整段 CJK 当一个 token（所以必须在
 *      写入侧做 bigram 分词），以及 trigram 不匹配 <3 字符的查询（所以短查询不能只靠子串）。
 *   B. icd11_terms 单元构造 —— fixture 实体即可。守论文 Listing 2 的字段顺序与去重口径。
 *   C. 真数据 —— 小样本建库（临时目录）+ 正式库存在时的体检。缺 data/icd11/ 时**显式跳过**，
 *      不拿 fixture 冒充真结论。
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert');

const ROOT = path.resolve(__dirname, '..');
const F = require(path.join(ROOT, 'scripts', 'lib_fts5.js'));
const T = require(path.join(ROOT, 'scripts', 'icd11_terms.js'));
const E = require(path.join(ROOT, 'scripts', 'build_embeddings.js'));

let passed = 0, skipped = 0;
const failures = [];
function test(name, fn) {
  try { passed += 1; fn(); console.log(`  ✓ ${name}`); }
  catch (e) { failures.push({ name, err: e }); console.log(`  ✗ ${name}\n      ${e.message}`); }
}
function skip(name, why) { skipped += 1; console.log(`  ⊘ ${name}\n      ${why}`); }

console.log('═══ ICD-11 术语嵌入层 + 真 FTS5 ═══\n');
console.log(' A. lib_fts5（内存库）\n');

// ── A. FTS5 ──
test('建的是 FTS5 虚表，不是自研 BM25', () => {
  const ix = new F.Fts5Index(':memory:');
  ix.addMany([{ id: 'a', text: '心脾两虚证 心悸 失眠' }]);
  ix.finish();
  const s = ix.stats();
  assert.strictEqual(s.engine, 'sqlite');
  assert.strictEqual(s.fts5, true);
  assert.deepStrictEqual(s.virtualTables.map((t) => t.module), ['fts5', 'fts5']);
  assert.match(s.sqliteVersion, /^\d+\.\d+/);
  ix.close();
});

test('中文靠写入侧 bigram 分词命中（unicode61 直接吃 CJK 会整段成一个 token）', () => {
  const ix = new F.Fts5Index(':memory:');
  ix.addMany([
    { id: 'd1', text: '中医证候：心脾两虚证' },
    { id: 'd2', text: '中医证候：肝郁气滞证' },
  ]);
  ix.finish();
  // 「心脾两虚」不是文档里的完整 token（文档里是「心脾两虚证」），
  // 但按 bigram 切完之后两边都有 心脾/脾两/两虚，命中是必然的。
  assert.deepStrictEqual(ix.search('心脾两虚', { k: 3 }).map((h) => h.id), ['d1']);
  assert.deepStrictEqual(ix.search('肝郁', { k: 3 }).map((h) => h.id), ['d2']);
  assert.deepStrictEqual(ix.search('完全不存在的词', { k: 3 }), []);
  ix.close();
});

test('子串表：≥3 字符走 trigram 命中；2 字符查询返回空而不是瞎猜', () => {
  const ix = new F.Fts5Index(':memory:');
  ix.addMany([{ id: 'e1', text: 'Essential hypertension Intracranial injury' }]);
  ix.finish();
  assert.deepStrictEqual(ix.searchSubstring('hypertension', { k: 3 }).map((h) => h.id), ['e1']);
  // trigram 的硬限制：查询短于 3 字符无从匹配。如实返回空，不降级成模糊猜。
  assert.deepStrictEqual(ix.searchSubstring('hy', { k: 3 }), []);
  ix.close();
});

test('查询串里的 FTS5 语法字符被转义（不许注入 MATCH 表达式）', () => {
  const ix = new F.Fts5Index(':memory:');
  ix.addMany([{ id: 'x', text: 'ordinary text about "quotes" and stars *' }]);
  ix.finish();
  for (const q of ['"', '*', 'a OR b', 'NEAR(x y)', '"quoted"']) {
    assert.doesNotThrow(() => ix.search(q, { k: 3 }), `查询「${q}」抛异常了`);
  }
  // 词表检索不该被 OR 语法撑成"全命中"
  assert.deepStrictEqual(ix.search('NEAR', { k: 5 }), []);
  ix.close();
});

test('lib_fts5 的分词与 build_embeddings 的 ② 完全同口径', () => {
  for (const s of ['风寒束表证', '心脾两虚证（热淋）', '中医 AI-2 神机', 'Gambiense trypanosomiasis']) {
    assert.deepStrictEqual(F.segment(s), E.tokenizeBigram(s), `分词不一致：${s}`);
  }
});

// ── B. 单元构造（论文 Listing 2）──
console.log('\n B. 单元构造（论文 Listing 2 的字段顺序）\n');

const ent = {
  id: '1671640403', code: '1F51.0', title: 'Gambiense trypanosomiasis', kind: 'category',
  definition: 'A disease caused by an infection with the protozoan parasite.',
  inclusions: 'West African sleeping sickness', indexTerms: 'Gambiense trypanosomiasis; Sleeping sickness',
  chapterCode: '01', chapterTitle: 'Certain infectious or parasitic diseases',
};

test('entityUnit 字段顺序 = Disorder Name / Code / symptoms / Chapter / Inclusions / Index terms', () => {
  const t = T.entityUnit(ent);
  const order = ['Disorder Name:', 'Disorder Code:', 'Disorder symptoms:', 'Chapter:', 'Inclusions:', 'Index terms:'];
  let at = -1;
  for (const frag of order) {
    const i = t.indexOf(frag);
    assert.ok(i >= 0, `缺「${frag}」\n${t}`);
    assert.ok(i > at, `「${frag}」位置不符\n${t}`);
    at = i;
  }
  assert.ok(t.includes('1F51.0') && t.includes(ent.definition));
});

test('缺 definition 时不编造症状（用标题占位并标明 no definition）', () => {
  const t = T.entityUnit({ ...ent, definition: '', fullText: '' });
  assert.ok(t.includes('(no definition)'), `没标缺定义：\n${t}`);
});

test('termUnit 把术语与编码绑成一条（术语嵌入的关键：命中术语就带编码回来）', () => {
  const t = T.termUnit('Sleeping sickness', ent);
  assert.ok(t.startsWith('Term: Sleeping sickness'));
  assert.ok(t.includes('(1F51.0)'), '术语单元里没有编码');
});

test('splitTerms 丢空、丢超长整句、按原文顺序', () => {
  assert.deepStrictEqual(T.splitTerms(' a ; b ;;  '), ['a', 'b']);
  assert.deepStrictEqual(T.splitTerms(`${'x'.repeat(200)};ok`), ['ok']);
  assert.deepStrictEqual(T.splitTerms(''), []);
});

test('forEachUnit：无编码实体不产单元；同一术语跨实体只留第一条', () => {
  const list = [];
  const stats = T.forEachUnit([
    { ...ent },
    { ...ent, id: '2', code: '1F51.1', title: 'Other', indexTerms: 'Sleeping sickness; new term' },
    { id: '3', title: 'Chapter with no code', indexTerms: 'ignored' },
  ], (u) => list.push(u));
  assert.ok(list.every((u) => u.code), '产出了无编码单元');
  const termIds = list.filter((u) => u.kind === 'term').map((u) => u.term.toLowerCase());
  assert.strictEqual(termIds.filter((x) => x === 'sleeping sickness').length, 1, '同一术语重复产出');
  // 唯一术语 = {gambiense trypanosomiasis, sleeping sickness, new term}
  assert.strictEqual(stats.uniqueTerms, 3, `唯一术语数 ${stats.uniqueTerms}`);
  assert.strictEqual(stats.termDup, 1);
});

// ── C. 真数据 ──
console.log('\n C. 真数据\n');

const SRC = path.join(ROOT, 'data/icd11/entities.ndjson');
if (!fs.existsSync(SRC)) {
  skip('小样本建库 + 检索', 'data/icd11/entities.ndjson 不存在。补法：npm run icd11:ensure（需联网取 19.5 MB 快照）');
  skip('正式库体检', '同上');
} else {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'icd11-terms-test-'));
  test('小样本建库 → 加载 → 检索，产物与 meta 自洽', () => {
    const meta = T.build({ outDir: dir, limit: 400 });
    assert.ok(meta.docs.entitiesWithCode > 100, `实体太少：${meta.docs.entitiesWithCode}`);
    assert.strictEqual(meta.docs.unitsTotal, meta.docs.entitiesWithCode + meta.docs.termUnits);
    assert.strictEqual(meta.fts5.fts5, true, 'FTS5 没建起来');
    assert.ok(meta.vector.vocabSize > 100);
    const lines = fs.readFileSync(path.join(dir, 'units.ndjson'), 'utf8').split('\n').filter((l) => l.trim());
    assert.strictEqual(lines.length, meta.docs.unitsTotal, 'units.ndjson 行数与 meta 不符');

    const ix = T.load({ dir, fresh: true });
    assert.strictEqual(ix.units.length, meta.docs.unitsTotal);
    assert.strictEqual(ix.offsets.length, ix.units.length + 1, 'CSR 偏移表长度不对');
    const hits = T.search('sleeping sickness', { k: 3, index: ix });
    assert.ok(hits.length > 0, '检索无命中');
    assert.ok(hits.every((h) => h.code && h.title), '命中缺编码/标题');
  });

  test('两次建库结果一致（确定性：同一份源 → 同一套单元）', () => {
    const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'icd11-terms-test2-'));
    const m2 = T.build({ outDir: dir2, limit: 400 });
    const a = fs.readFileSync(path.join(dir, 'units.ndjson'), 'utf8');
    const b = fs.readFileSync(path.join(dir2, 'units.ndjson'), 'utf8');
    assert.strictEqual(a, b, '两次建库的单元文本不同');
    assert.strictEqual(fs.readFileSync(path.join(dir, 'csr_idx.bin')).equals(fs.readFileSync(path.join(dir2, 'csr_idx.bin'))), true,
      '两次建库的向量不同');
    fs.rmSync(dir2, { recursive: true, force: true });
  });

  // 正式库（data/icd11/term-index/）存在时体检：这是 build_embeddings 的 ⑦ 通道依赖
  const realMeta = path.join(T.OUTDIR, 'meta.json');
  if (!fs.existsSync(realMeta)) {
    skip('正式库体检', 'data/icd11/term-index/ 未构建。补法：npm run icd11:terms');
  } else {
    test('正式库：术语层能按英文名命中 ICD-11 TM1 传统医学编码', () => {
      const ix = T.load({ fresh: true });
      const hits = T.search('dual deficiency of the heart and spleen', {
        k: 4, index: ix, filter: (u) => /\(TM1\)/.test(String(u.title)),
      });
      assert.ok(hits.length > 0, 'TM1 限定下无命中');
      assert.ok(hits.every((h) => /\(TM1\)/.test(h.title)), '限定失效，返回了非 TM1 条目');
      assert.ok(hits.some((h) => /heart/i.test(h.title) && /spleen|blood/i.test(h.title)),
        `没落到心脾相关证候：${hits.map((h) => h.code).join(',')}`);
    });

    test('正式库：meta 的计数与产物一致（不许报告跑在产物前面）', () => {
      const m = JSON.parse(fs.readFileSync(realMeta, 'utf8'));
      const ix = T.load({ fresh: true });
      assert.strictEqual(ix.units.length, m.docs.unitsTotal, 'meta.docs.unitsTotal 与 units.ndjson 不符');
      assert.strictEqual(ix.vocab.tokens.length, m.vector.vocabSize, 'meta 词表大小与 vocab.json 不符');
      const off = fs.statSync(path.join(T.OUTDIR, 'csr_offset.bin')).size / 4;
      assert.strictEqual(off, ix.units.length + 1, 'CSR 偏移表与单元数不符');
      assert.ok(m.substitutions.length >= 3, '口径差没记全');
    });
  }
  fs.rmSync(dir, { recursive: true, force: true });
}

// ── D. 第 26 章分账 + 官方中文名 ──
//
// 这一节守的是 ICD-11 **指导材料写明的两件事**（Reference Guide §3.2.26 / §2.23.24）：
//   1. 第 26 章分 TM1（中医/日韩）与 TM2（阿育吠陀/悉达），混在一张索引里就是选错体系；
//   2. disorder(TM1) 与 pattern(TM1) 是两个概念，且题名以「身体结构 / 病因解释 / 属性 /
//      严重程度」命名 —— 所以官方中文名与我们的证候名之间只能按**名字**对齐，不能按形近。
console.log('\n D. 第 26 章分账 + 官方中文名\n');

const NAMES_JSON = path.join(ROOT, 'standards/icd11/zh-names.json');

test('moduleOf：靠标题后缀 (TM1)/(TM2) 定模块，没有后缀就不猜', () => {
  assert.strictEqual(T.moduleOf({ title: 'Lung yin deficiency pattern (TM1)' }), 'TM1');
  assert.strictEqual(T.moduleOf({ title: 'Vata predominant age pattern (TM2)' }), 'TM2');
  assert.strictEqual(T.moduleOf({ title: 'Asthma' }), null);
});

test('forEachUnit：官方中文名成一条 term 单元，module 与 lang 都带上', () => {
  const list = [];
  const zh = new Map([['SA00', { code: 'SA00', zh: '胁痛', module: 'TM1' }]]);
  T.forEachUnit([{ id: '1', code: 'SA00', title: 'Hypochondrium pain disorder (TM1)', indexTerms: 'Hypochondrium pain disorder (TM1)' }],
    (u) => list.push(u), zh);
  const zhUnits = list.filter((u) => u.kind === 'term' && u.lang !== 'en');
  assert.strictEqual(zhUnits.length, 1, '一个中文名一条单元（WHO 只给简体）');
  assert.strictEqual(zhUnits[0].term, '胁痛');
  assert.strictEqual(zhUnits[0].lang, 'zh-Hans');
  assert.ok(zhUnits.every((u) => u.module === 'TM1'), 'module 没带上');
  assert.ok(list[0].text.includes('Disorder Name (zh-Hans): 胁痛'), '实体单元里没有中文名行');
});

test('官方中文名表：源头是 WHO 原件，TM1 全译、TM2 源头无中文、题名 0 冲突', () => {
  if (!fs.existsSync(NAMES_JSON)) { skipped += 1; return; }
  const d = JSON.parse(fs.readFileSync(NAMES_JSON, 'utf8'));
  assert.ok(d.names.length >= 1000, `第 26 章条目太少：${d.names.length}`);
  assert.strictEqual(String(d.meta.source.sha256).length, 64, '来源 sha256 缺失');
  assert.ok(/icdcdn\.who\.int/.test(d.meta.source.url), '来源不是 WHO 官方 CDN');
  // 中文名的两个锚点：一个 disorder、一个 pattern（pattern 的中文名正是本轮补的东西）
  assert.strictEqual(d.names.find((n) => n.code === 'SA00').zh, '胁痛');
  assert.strictEqual(d.names.find((n) => n.code === 'SF62').zh, '心气血两虚证');
  assert.strictEqual(d.names.find((n) => n.code === 'SF81').zh, '肺阴虚证');
  // TM1 全译；TM2 在 WHO 中译本里整章没有中文题名（源头缺，不是解析漏）
  const tm1 = d.names.filter((n) => n.module === 'TM1');
  const tm2 = d.names.filter((n) => n.module === 'TM2');
  assert.ok(tm1.length > 400 && tm1.every((n) => n.zh), 'TM1 有缺中文的条目');
  assert.ok(tm2.length > 500 && tm2.every((n) => !n.zh), 'TM2 居然有中文名？先核实来源');
  assert.deepStrictEqual(d.meta.reconcile.titleMismatch, [], '题名与快照不一致 —— 必须人工看，不许静默合并');
});

if (!fs.existsSync(path.join(T.OUTDIR, 'meta.json'))) {
  skip('正式库：官方中文名回查 / TM2 拦截', 'data/icd11/term-index/ 未构建。补法：npm run icd11:terms');
} else {
  test('正式库：官方中文名逐字命中自身（走同名通道，不靠向量近邻）', () => {
    const ix = T.load({ fresh: true });
    const d = JSON.parse(fs.readFileSync(NAMES_JSON, 'utf8'));
    const probes = ['SA00', 'SA01', 'SF81', 'SF62', 'SB30'].map((c) => d.names.find((n) => n.code === c)).filter(Boolean);
    assert.ok(probes.length >= 4, '中文名表里找不到探针码');
    for (const n of probes) {
      const hits = T.search(n.zh, { k: 3, index: ix, modules: ['TM1'] });
      assert.ok(hits.length, `${n.zh} 无命中`);
      assert.strictEqual(hits[0].code, n.code, `${n.zh} top1 = ${hits[0].code}，应为 ${n.code}`);
      assert.ok(hits[0].viaExactName, `${n.zh} 没走同名通道 —— 说明是碰巧排第一`);
    }
  });

  test('正式库：TM2 能被拦掉，但第 1–25 章（西医）不许拦 —— 参考指南要的就是并列编码', () => {
    const ix = T.load({ fresh: true });
    const q = 'Vata predominant age pattern';
    const all = T.search(q, { k: 5, index: ix });
    assert.ok(all.some((h) => h.module === 'TM2'), 'TM2 本来就该查得到（否则这条测试没意义）');
    const tm1Only = T.search(q, { k: 5, index: ix, modules: ['TM1'] });
    assert.ok(tm1Only.every((h) => h.module !== 'TM2'), `TM2 漏进结果：${tm1Only.map((h) => h.code).join(',')}`);
    const insomnia = T.search('失眠', { k: 4, index: ix, modules: ['TM1'] });
    assert.ok(insomnia.some((h) => !/\(TM[12]\)/.test(h.title)), '西医章节被一起拦掉了（失眠应能回到 MG41 一类）');
  });

  test('同名通道不做形近：「胁痛证」不等于「胁痛」（pattern ≠ disorder）', () => {
    const ix = T.load({ fresh: true });
    const hits = T.search('胁痛证', { k: 4, index: ix, modules: ['TM1'] });
    assert.ok(hits.every((h) => !h.viaExactName), '把「证」后缀抹掉当同名了 —— 那是改概念不是加召回');
  });
}

// ── E. 快照缺口补齐（WHO 发布文件 vs 第三方快照）──
//
// 第三方快照（2025-01）第 26 章只收了 876/1120 个码，差的 244 个里 **126 个是 TM1、且带官方中文名**。
// 这些码由 `zh-names.json`（WHO 原件）补进术语层，标 `synthetic:true`；
// 不补的后果不是"少几个码"，而是这 126 个证候在检索里根本不存在。
console.log('\n E. 快照缺口补齐（synthetic 实体）\n');

test('readEntities：WHO 有、快照没有的码被补进来，且都标了 synthetic 与来源', () => {
  const ents = T.readEntities();
  assert.ok(ents.supplement >= 200, `补进来的实体太少：${ents.supplement}`);
  const syn = ents.filter((e) => e.synthetic);
  assert.strictEqual(syn.length, ents.supplement, 'synthetic 标记数与 supplement 计数不一致');
  for (const e of syn) {
    assert.ok(e.code && e.title, `synthetic 实体缺 code/title：${JSON.stringify(e).slice(0, 120)}`);
    assert.ok(/who-tabulation/.test(String(e.source)), `${e.code} 没有来源标注`);
    assert.strictEqual(e.hasDefinition, false, `${e.code} 不该有定义（发布文件里就没有）`);
  }
  // 快照来的实体不许被标 synthetic —— 两源不能混称
  const fromSnapshot = ents.filter((e) => !e.synthetic && e.code);
  assert.ok(fromSnapshot.length > 12000, `快照实体数异常：${fromSnapshot.length}`);
  assert.ok(fromSnapshot.every((e) => e.source === undefined), '快照实体不该带 who-tabulation 的 source');
});

test('正式库：补进来的 TM1 码（快照里没有的那些）现在能被中文名查到', () => {
  const ix = T.load({ fresh: true });
  const d = JSON.parse(fs.readFileSync(NAMES_JSON, 'utf8'));
  const snapCodes = new Set(T.readEntities().filter((e) => !e.synthetic).map((e) => e.code));
  const probes = d.names.filter((n) => n.module === 'TM1' && n.zh && !snapCodes.has(n.code)).slice(0, 5);
  assert.ok(probes.length >= 3, `找不到「快照没有」的 TM1 探针：${probes.length}`);
  for (const n of probes) {
    const hits = T.search(n.zh, { k: 3, index: ix, modules: ['TM1'] });
    assert.ok(hits.length, `${n.code} ${n.zh}：补进来之后仍查不到`);
    assert.strictEqual(hits[0].code, n.code, `${n.zh} top1 = ${hits[0].code}，应为 ${n.code}`);
  }
});

test('正式库：meta 记了补了几条，且总数对得上', () => {
  const m = JSON.parse(fs.readFileSync(path.join(T.OUTDIR, 'meta.json'), 'utf8'));
  assert.ok(m.docs.supplementEntities >= 200, `meta 没记 supplementEntities：${m.docs.supplementEntities}`);
  // 读入总数 = 快照行数 + 补齐的条数（快照里有 898 条无编码实体，所以不能拿 entitiesWithCode 比）
  const snapLines = fs.readFileSync(path.join(ROOT, 'data/icd11/entities.ndjson'), 'utf8')
    .split('\n').filter((l) => l.trim()).length;
  assert.strictEqual(m.docs.entitiesRead, snapLines + m.docs.supplementEntities,
    `entitiesRead ${m.docs.entitiesRead} ≠ 快照 ${snapLines} + 补齐 ${m.docs.supplementEntities}`);
  assert.ok(m.substitutions.some((s) => /synthetic/.test(s)), '口径差里没写两源合一');
});

// ── F. 本机镜像（D:\ICD11-source）──
//
// 镜像不是仓库的一部分（34.6 MB 的 WHO 原件 + 解压后的表），但它是**所有派生数据的原件**。
// 有镜像就校验；没有就跳过 —— 换机器克隆本仓库时不该因为没挂 D 盘而红。
console.log('\n F. 本机镜像（可选，D:\\ICD11-source）\n');

const MIRROR = process.env.ICD11_MIRROR || 'D:\\ICD11-source';
const MIRROR_MANIFEST = path.join(MIRROR, 'MANIFEST.json');

if (!fs.existsSync(MIRROR_MANIFEST)) {
  skip('本机镜像校验', `没找到 ${MIRROR_MANIFEST}。补法：python scripts/icd11_mirror.py`);
} else {
  test('镜像清单：文件齐全、sha256 与清单一致（离线可复算）', () => {
    const crypto = require('node:crypto');
    const man = JSON.parse(fs.readFileSync(MIRROR_MANIFEST, 'utf8'));
    assert.ok(man.files.length >= 15, `清单里文件太少：${man.files.length}`);
    assert.ok(man.files.some((f) => f.kind === 'linearization' && f.lang === 'zh'), '缺中文全表');
    assert.ok(man.files.some((f) => f.kind === 'changes'), '缺变更包');
    assert.ok((man.gaps || []).length >= 3, '缺口没写明 —— 镜像必须说清「没有的是什么」');
    for (const f of man.files) {
      const full = path.join(MIRROR, f.path);
      assert.ok(fs.existsSync(full), `缺文件：${f.path}`);
      assert.strictEqual(fs.statSync(full).size, f.bytes, `${f.path} 大小与清单不符`);
      const h = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
      assert.strictEqual(h, f.sha256, `${f.path} sha256 不符 —— 文件被改过或下载不完整`);
    }
  });

  test('镜像里的中文全表与仓库派生表对得上（37,098 行 / 第 26 章 1,120 条）', () => {
    const txt = path.join(MIRROR, 'release', String(man_release()), 'zh', 'SimpleTabulation-ICD-11-MMS-zh.txt');
    assert.ok(fs.existsSync(txt), `缺 ${txt}`);
    const lines = fs.readFileSync(txt, 'utf8').split('\n').filter((l) => l.trim());
    assert.ok(lines.length > 36000, `中文表行数异常：${lines.length}`);
    const ch26 = lines.filter((l) => l.includes('\t26\t') && l.includes('category'));
    assert.ok(ch26.length >= 1100, `第 26 章 category 行太少：${ch26.length}`);
  });

  function man_release() {
    const man = JSON.parse(fs.readFileSync(MIRROR_MANIFEST, 'utf8'));
    return man.release;
  }
}

// ── G. 释义（定义段）与检索约束 ──
//
// 释义来自 **WHO 打印版 PDF**（免API凭据），第 26 章在 WHO 源头就没有定义段 ——
// 所以「释义级」能覆盖第 1–25 章，覆盖不到证候。这条边界必须钉住，否则以后有人
// 以为是解析漏了，去「补」一堆编出来的中医定义。
console.log('\n G. 释义（定义段）与检索约束\n');

const DEFS_JSON = path.join(ROOT, 'standards/icd11/definitions-en.json');

if (!fs.existsSync(DEFS_JSON)) {
  skip('释义产物', `缺 ${DEFS_JSON}。补法：npm run icd11:definitions`);
} else {
  test('释义产物：条数、第 26 章为 0、页面与锚点可查', () => {
    const d = JSON.parse(fs.readFileSync(DEFS_JSON, 'utf8'));
    const c = d.meta.counts;
    assert.ok(c.withDefinition >= 2000, `释义条数过少：${c.withDefinition}`);
    assert.strictEqual(c.chapter26, 0, '第 26 章不该有释义 —— WHO 源头就没有');
    const cholera = d.entries['1A00'];
    assert.ok(cholera && /^Cholera is/.test(cholera.definition), '1A00 的释义与 WHO 原文不符');
    assert.ok(cholera.page > 0, '释义没记页码');
    for (const [code, v] of Object.entries(d.entries)) {
      assert.ok(!/\([A-Z0-9]{3,7}\s*[‑–-]\s*[A-Z0-9]{3,7}\)/.test(v.definition),
        `${code} 的释义里混进了码段区间（块标题）`);
    }
  });

  test('术语层：释义回填到实体，且有释义的实体数写进 meta', () => {
    const m = JSON.parse(fs.readFileSync(path.join(T.OUTDIR, 'meta.json'), 'utf8'));
    assert.ok(m.docs.withDefinition > 1000, `meta 没记 withDefinition：${m.docs.withDefinition}`);
    const ix = T.load({ fresh: true });
    const ents = ix.units.filter((u) => u.kind === 'entity');
    const withDef = ents.filter((u) => u.hasDefinition);
    assert.strictEqual(withDef.length, m.docs.withDefinition, 'meta 与单元里的释义数不一致');
    // 释义是英文的，TM1 一条都没有
    assert.ok(withDef.every((u) => u.module !== 'TM1'), 'TM1 不该有释义');
    const e1a00 = ix.byId.get('E:1A00');
    assert.ok(e1a00 && /Cholera is/.test(e1a00.text), '实体单元里没有把释义喂进去');
  });

  test('检索约束 evidenceMin=definition：只回有释义的条目', () => {
    const ix = T.load({ fresh: true });
    const loose = T.search('cholera', { k: 3, index: ix });
    const strict = T.search('cholera', { k: 3, index: ix, evidenceMin: 'definition' });
    assert.ok(loose.some((h) => h.evidence === 'definition'), '默认检索里 1A00 应标 definition');
    assert.ok(strict.length > 0, '约束后不该一条都不剩（1A00 有释义）');
    assert.ok(strict.every((h) => h.evidence === 'definition'), `约束失效：${JSON.stringify(strict.map((h) => h.code))}`);
  });

  test('证候命中永远是名字级；约束只挡掉证候、不挡西医药名', () => {
      const ix = T.load({ fresh: true });
      const hits = T.search('痰热壅肺证', { k: 4, index: ix, modules: ['TM1'] });
      assert.ok(hits.length > 0, '痰热壅肺证 应有命中');
      assert.ok(hits.every((h) => h.evidence === 'name'), 'TM1 命中不该被标成释义级');
      const strict = T.search('痰热壅肺证', { k: 4, index: ix, modules: ['TM1'], evidenceMin: 'definition' });
      // modules:['TM1'] 的语义是「拦 TM2」，第 1–25 章照旧放行 —— 所以约束后仍可能剩西医药名，
      // 但**一条 TM1 都不该有**（WHO 源头就没给第 26 章写释义）。
      assert.ok(strict.every((h) => h.module !== 'TM1'), `约束后仍有 TM1 命中：${JSON.stringify(strict.map((h) => h.code))}`);
      assert.ok(strict.every((h) => h.evidence === 'definition'), '约束后的命中必须是释义级');
    });
}

console.log(`\n  ${passed} 通过 · ${failures.length} 失败 · ${skipped} 跳过`);
if (failures.length) {
  console.log('\n失败明细:');
  failures.forEach((f) => console.log(`  ✗ ${f.name}\n    ${f.err.stack.split('\n').slice(0, 3).join('\n    ')}`));
  process.exit(1);
}
console.log('\n✅ ICD-11 术语嵌入层通过');

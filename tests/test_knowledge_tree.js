#!/usr/bin/env node
/**
 * tests/test_knowledge_tree.js — 《中医知识树》导入层硬证据
 *
 * 测的是**导入的产物与源文件的关系**，不是「文件存在」：
 *   - xlsx 读取器能否真的读出来（工作表数、共享串、单元格取值）
 *   - 教材稿的形状：10 章 / 49 节 / 无 CRLF / 每章有 H1 与节标题
 *   - 连续性合并真的发生了（表格并成一张、代码并成一个围栏块）
 *     —— 逐行各自围栏是这个导入器最容易犯的错，必须能被抓到
 *   - 骨架 schema：L0–L4、八域、合计 120（与本仓库 120 一致）
 *   - 交叉印证：与语义张量参考实现的 DSU 编号空间同源、零矛盾
 *   - 出处可复现：source-map 记录的 sha256 必须等于源文件当前指纹
 *
 * 反作用力：若有人手改 textbooks/ 下的生成稿，本节第 3 组会因字数不符而失败。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert');

const ROOT = path.resolve(__dirname, '..');
const TB = path.join(ROOT, 'textbooks', '07-zhineng', '05-zhongyi-zhishi-tupu');
const STD = path.join(ROOT, 'standards', 'knowledge-tree');
const SRC = path.join(STD, 'sources', '中医知识树.xlsx');

let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed += 1; console.log(`  ✓ ${name}`); }
  catch (e) { failures.push({ name, err: e }); console.log(`  ✗ ${name}\n      ${e.message}`); }
}

console.log('═══ 《中医知识树》导入层 ═══\n');

// ── 1. xlsx 读取器 ────────────────────────────────────────────────────
console.log('[1] xlsx 读取器');

const { readWorkbook, readZipEntries, colIndex, serialToDate } = require('../scripts/lib_xlsx');

test('读取器能读出 18 个工作表，且表名非空', () => {
  const wb = readWorkbook(SRC);
  assert.strictEqual(wb.sheets.length, 18, `期望 18 个工作表，得到 ${wb.sheets.length}`);
  wb.sheets.forEach((s, i) => assert.ok(s.name, `第 ${i} 个工作表无名字`));
});

test('读出的内容是真文本，不是空壳（正文总表应有 296 个内容单元）', () => {
  const wb = readWorkbook(SRC);
  const body = wb.sheets.find((s) => s.name.includes('正文总表'));
  const cells = body.rows.slice(2).filter((r) => String(r[2] || '').trim());
  assert.ok(cells.length >= 290, `正文总表内容单元只有 ${cells.length}，读取器可能没读到`);
  const nonEmpty = cells.filter((r) => String(r[3] || '').trim().length > 4);
  assert.ok(nonEmpty.length >= 250, `真正有内容的行只有 ${nonEmpty.length}`);
});

test('列号换算正确', () => {
  assert.strictEqual(colIndex('A1'), 0);
  assert.strictEqual(colIndex('Z9'), 25);
  assert.strictEqual(colIndex('AA1'), 26);
  assert.strictEqual(colIndex('AB100'), 27);
});

test('日期序列号处理了 Excel 1900 闰年幽灵（serial<60 必须 +1 天）', () => {
  // 统一用 1899-12-30 基准会让 1900 年 1–2 月全部差一天 —— 静默错误，必须断言。
  assert.strictEqual(serialToDate(1), '1900-01-01');
  assert.strictEqual(serialToDate(59), '1900-02-28');
  assert.strictEqual(serialToDate(61), '1900-03-01');
  assert.strictEqual(serialToDate(45000), '2023-03-15');
});

test('zip 中央目录可解析，且 OOXML 必需条目都在', () => {
  const buf = fs.readFileSync(SRC);
  const entries = readZipEntries(buf);
  for (const need of ['xl/workbook.xml', 'xl/worksheets/sheet1.xml']) {
    assert.ok(entries.has(need), `缺少 zip 条目 ${need}`);
  }
});

// ── 2. 教材稿形状 ─────────────────────────────────────────────────────
console.log('\n[2] 教材稿形状');

// 章号允许三位：外源古籍学科章数过百（100-第100章…），写死 \d{2} 会把它们漏在书外
const chapterFiles = fs.readdirSync(TB).filter((f) => /^\d{2,}-.*\.md$/.test(f)).sort((a, b) => parseInt(a, 10) - parseInt(b, 10) || a.localeCompare(b, 'zh'));
const sourceMap = JSON.parse(fs.readFileSync(path.join(STD, 'source-map.json'), 'utf8'));

test('生成 11 个文件（00-前言 + 10 章）', () => {
  assert.strictEqual(chapterFiles.length, 11, `期望 11 个，得到 ${chapterFiles.length}: ${chapterFiles.join(', ')}`);
  assert.ok(chapterFiles[0].startsWith('00-'), `首个文件应是 00-前言，实为 ${chapterFiles[0]}`);
});

test('10 章 · 49 节 · 与 source-map 记录一致', () => {
  assert.strictEqual(sourceMap.imported.chapters, 10);
  assert.strictEqual(sourceMap.imported.sections, 49);
  assert.strictEqual(sourceMap.chapterIndex.length, 10);
  sourceMap.chapterIndex.forEach((c) => {
    assert.ok(chapterFiles.includes(c.file), `source-map 记的 ${c.file} 不存在`);
  });
});

test('每章都有 H1，且第 1..10 章齐全', () => {
  for (let n = 1; n <= 10; n += 1) {
    const f = chapterFiles.find((x) => x.startsWith(`${String(n).padStart(2, '0')}-第${n}章-`));
    assert.ok(f, `缺第 ${n} 章文件`);
    const md = fs.readFileSync(path.join(TB, f), 'utf8');
    assert.ok(/^# 第[一二三四五六七八九十]+章/.test(md), `${f} 开头不是章级 H1`);
    const h2 = (md.match(/^## /gm) || []).length;
    assert.ok(h2 >= 3, `${f} 只有 ${h2} 个节标题，疑似空壳`);
  }
});

test('全部生成稿是 LF，无 CRLF（仓库 .gitattributes 要求）', () => {
  chapterFiles.forEach((f) => {
    const t = fs.readFileSync(path.join(TB, f), 'utf8');
    assert.ok(!t.includes('\r'), `${f} 含 CRLF`);
  });
});

test('每章字数与 source-map 记录相符（防手改生成稿）', () => {
  sourceMap.chapterIndex.forEach((c) => {
    const t = fs.readFileSync(path.join(TB, c.file), 'utf8');
    const chars = t.replace(/\s/g, '').length;
    assert.strictEqual(chars, c.chars, `${c.file} 实测 ${chars} 字，记录 ${c.chars} 字 —— 生成稿被手改了？`);
  });
});

// ── 3. 连续性合并（本导入器最易犯的错）────────────────────────────────
console.log('\n[3] 连续性合并');

const MDS = Object.fromEntries(chapterFiles.map((f) => [f, fs.readFileSync(path.join(TB, f), 'utf8')]));

test('表格并成了整张表：不存在「只有一行数据」的表格块', () => {
  // 逐行各自输出会产出大量「表头 + 分隔 + 1 行」的碎片。合并正确时，每张表都应 >= 2 行数据。
  const all = Object.values(MDS).join('\n');
  const blocks = all.split(/\n\s*\n/).filter((b) => b.trim().startsWith('|'));
  assert.ok(blocks.length >= 8, `表格块只有 ${blocks.length} 个，疑似被拆碎`);
  const single = blocks.filter((b) => b.trim().split('\n').length === 3);
  assert.strictEqual(single.length, 0, `有 ${single.length} 张表只有一行数据，说明逐行未合并`);
});

test('代码并成了围栏块：围栏成对，且平均每块 >1 行', () => {
  const all = Object.values(MDS).join('\n');
  const fences = (all.match(/^```/gm) || []).length;
  assert.strictEqual(fences % 2, 0, `围栏数 ${fences} 是奇数，有未闭合的代码块`);
  assert.ok(fences >= 20, `围栏只有 ${fences} 个（${fences / 2} 块），疑似代码行被吞`);
  const oneLiners = [...all.matchAll(/^```\n([^\n]*)\n```$/gm)].length;
  assert.ok(oneLiners * 2 < fences, `单行代码块 ${oneLiners} 个，占 ${fences / 2} 块的一半以上，疑似未合并`);
});

test('内联列表被拆行：同一行内不出现「； - 」连排', () => {
  const all = Object.values(MDS).join('\n');
  // 注意：必须用 [ \t] 而不是 \s —— \s 会吃掉换行，
  // 于是「；\n- 」这种**已正确拆行**的结果反倒被误判为连排（本断言的第一版就错在这里）。
  const glued = all.match(/；[ \t]+-[ \t]+\S/g) || [];
  assert.strictEqual(glued.length, 0, `有 ${glued.length} 处列表仍连排在同一行`);
  // 反向确认拆行真的发生了：拆开后的形态必须存在
  assert.ok(/；\n- /.test(all), '没有找到任何「；」后接换行再起列表的拆行结果，拆行逻辑可能没生效');
});

// ── 4. 骨架 schema ────────────────────────────────────────────────────
console.log('\n[4] 骨架 schema');

const schema = JSON.parse(fs.readFileSync(path.join(STD, 'tree-schema.json'), 'utf8'));

test('L0–L4 五级齐全，名称是须/根/干/枝/叶', () => {
  assert.strictEqual(schema.levels.length, 5, `层级数 ${schema.levels.length}`);
  const names = schema.levels.map((l) => l.name);
  ['须', '根', '干', '枝', '叶'].forEach((n, i) => {
    assert.ok(names[i].includes(n), `第 ${i} 级应是「${n}」，实为「${names[i]}」`);
  });
});

test('八域齐全，每域学科数 >0，合计 120（源材料口径）；本仓库学科数与本仓库声明值一致', () => {
  assert.strictEqual(schema.domains.length, 8, `院系数 ${schema.domains.length}`);
  schema.domains.forEach((d) => assert.ok(d.subjectCount > 0, `${d.code} 学科数为 ${d.subjectCount}`));
  assert.strictEqual(schema.domainTotal, 120, `八域学科合计 ${schema.domainTotal}`);
  // curriculum.json 没有顶层 counts，学科数要自己数（不要依赖不存在的字段）
  const local = JSON.parse(fs.readFileSync(path.join(ROOT, 'curriculum.json'), 'utf8'));
  const localSubjects = local.departments.reduce((a, d) => a + d.subjects.length, 0);
  // 源材料《中医知识树》写书时的 8 域 / 120 学科口径；本仓库已扩到 9 院系（+09-jichu 等），
  // 且 2026-10 补了第 9/10 学期轮转与毕设。所以「源 120 ≠ 本仓库 N」是有意为之的差异，不是漂移 ——
  // 断言只钉「本仓库自洽」，不再钉某个历史数字（钉死数字的测试会逼着人改测试而不是改数据）。
  assert.strictEqual(localSubjects, local.domain.scale.subjects,
    `本仓库学科数 ${localSubjects} ≠ 声明值 ${local.domain.scale.subjects}`);
  assert.strictEqual(local.departments.length, 9, '本仓库院系数不是 9（8 域 + 09-jichu）');
});

test('域码是 D01–D08，且概念丛被记录', () => {
  assert.deepStrictEqual(schema.domains.map((d) => d.code), ['D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', 'D08']);
  assert.ok(schema.conceptCluster && schema.conceptCluster.count > 0, '概念丛缺失');
});

test('五项分歧被显式记录，且各自带「未裁定 / 已说明」状态', () => {
  assert.strictEqual(schema.discrepancies.length, 5, `分歧项 ${schema.discrepancies.length} 项`);
  schema.discrepancies.forEach((d) => {
    assert.ok(d.id && d.field && d.source && d.local, `${d.id} 缺少对比字段`);
    assert.ok(d.status, `${d.id} 没有状态`);
  });
});

// ── 5. 交叉印证 ───────────────────────────────────────────────────────
console.log('\n[5] 与语义张量参考实现的交叉印证');

const ref = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards', 'semtensor', 'datasets', 'reference-units.json'), 'utf8'));
const xref = schema.crossReferences.dsuIdentifierSpace;

test('参考实现的 DSU 数 = xlsx 声称的 103 + 已登记的 1 处拆分', () => {
  const n = ref.units.filter((u) => u.kind === 'dsu').length;
  // xlsx 那张样例表声称 103；参考实现的 104 多出来的一条来自
  // `standards/semtensor/descriptions/splice-repairs.json` 里 DSU-00102 的 1→2 拆分
  // （痰郁气结 / 毒热蕴结）。**源与源不一致的地方要显式记，不许把 104 说成 103。**
  assert.strictEqual(xref.xlsxClaimedCount, 103, 'xlsx 的声称值变了');
  assert.strictEqual(n, 104, `参考实现 DSU ${n} 个`);
  assert.strictEqual(xref.referenceDsuCount, 104);
});

test('编号三元组逐条吻合：DSU-00001 在两边都是「风寒束表证」', () => {
  assert.ok(xref.checks.length >= 1, '没有解析到任何编号三元组');
  xref.checks.forEach((c) => {
    assert.ok(c.agree, `${c.uid}: xlsx 为「${c.nameInXlsx}」，参考实现为「${c.labelInReference}」`);
  });
  const one = xref.checks.find((c) => c.uid === 'DSU-00001');
  assert.ok(one, '没有 DSU-00001 的核对记录');
  assert.strictEqual(one.nameInXlsx, '风寒束表证');
});

test('零矛盾：xlsx 里出现的证名没有一个是参考实现 104 之外的', () => {
  assert.strictEqual(xref.contradictions, 0, `发现 ${xref.contradictions} 个外来证名: ${xref.foreignNames.join(', ')}`);
  assert.strictEqual(xref.verdict, '编号空间同源（已按编号+名字核对）');
});

test('印证结论带有范围声明（不把部分重叠说成全量核对）', () => {
  assert.ok(xref.nameOverlap > 0 && xref.nameOverlap <= xref.nameOverlapOf, `重叠 ${xref.nameOverlap}/${xref.nameOverlapOf} 越界`);
  assert.ok(xref.nameOverlap < xref.nameOverlapOf, '若重叠已达全量，应更新 note 的措辞');
  assert.ok(/只摘录|非全名单/.test(xref.note), 'note 未声明「非全量」范围');
});

// ── 6. 出处可复现 ─────────────────────────────────────────────────────
console.log('\n[6] 出处可复现');

test('source-map 记录的 sha256 等于源文件当前指纹', () => {
  const now = crypto.createHash('sha256').update(fs.readFileSync(SRC)).digest('hex');
  assert.strictEqual(now, sourceMap.source.sha256, '源文件已变，需重跑导入器');

  // 并核：语义张量那边记的也是同一份来源的指纹体系（至少格式自洽）
  assert.match(sourceMap.source.sha256, /^[0-9a-f]{64}$/);
});

test('source-map 记的 18 张工作表与实际读出的表名逐条一致', () => {
  const wb = readWorkbook(SRC);
  const names = wb.sheets.map((s) => s.name);
  assert.deepStrictEqual(sourceMap.source.sheets.map((s) => s.name), names);
});

// ── 汇总 ──────────────────────────────────────────────────────────────
console.log(`\n  ${passed} 通过 · ${failures.length} 失败`);
if (failures.length) {
  console.log('\n失败明细:');
  failures.forEach((f) => console.log(`  ✗ ${f.name}\n    ${f.err.stack.split('\n').slice(0, 3).join('\n    ')}`));
  process.exit(1);
}
console.log('\n✅ 《中医知识树》导入层通过');

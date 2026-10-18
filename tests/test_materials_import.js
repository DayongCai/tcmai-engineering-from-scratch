#!/usr/bin/env node
/**
 * tests/test_materials_import.js — 「格式乙」源材料批量导入层
 *
 * 测的是**源与产物的对应关系**，以及**每种形态真的渲染成了它该有的样子**：
 *   - 13 份材料各有一套产物（源 xls(x)/docx + 全本 md + source-map.json）
 *   - source-map 记的 sha256 等于入库源文件当前指纹（可复现）
 *   - md 字数与 source-map 记录一致（防手改生成稿）
 *   - 字幕形态真的带时间码；宽表形态真的成表；键值形态真的有标签；散文形态真的成段
 *   - 类经图翼的「语义标注」「术语对齐（国标/ICD-11）」两列必须在（那是接入语义张量的接口）
 *   - content.json 是纯派生、**允许缺席**（.gitignore 排除）
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert');

const ROOT = path.resolve(__dirname, '..');
const MAT = path.join(ROOT, 'standards', 'materials');

let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed += 1; console.log(`  ✓ ${name}`); }
  catch (e) { failures.push({ name, err: e }); console.log(`  ✗ ${name}\n      ${e.message}`); }
}

console.log('═══ 源材料批量导入层 ═══\n');

const registry = JSON.parse(fs.readFileSync(path.join(MAT, 'registry.json'), 'utf8'));
const bySlug = Object.fromEntries(registry.materials.map((m) => [m.slug, m]));
const readMap = (slug) => JSON.parse(fs.readFileSync(path.join(MAT, slug, 'source-map.json'), 'utf8'));
const readMd = (slug) => fs.readFileSync(path.join(MAT, slug, readMap(slug).readme.file), 'utf8');

test('注册表收录 13 份材料，且每份都有 节/单元/字数 计数', () => {
  // 数字写死（而不是取自 registry）：注册表少一份时，取自 registry 的断言永远成立
  assert.strictEqual(registry.materials.length, 13, `注册了 ${registry.materials.length} 份`);
  registry.materials.forEach((m) => {
    assert.ok(m.sections > 0, `${m.slug} 节数为 0`);
    assert.ok(m.units > 0, `${m.slug} 单元数为 0`);
    assert.ok(m.chars > 0, `${m.slug} 字数为 0`);
  });
  assert.strictEqual(registry.totals.materials, 13);
});

test('每份材料三件产物齐全：源 xls(x) · 全本 md · source-map.json', () => {
  registry.materials.forEach((m) => {
    const dir = path.join(MAT, m.slug);
    const srcPath = path.join(dir, 'sources', m.file);
    assert.ok(fs.existsSync(srcPath), `${m.slug} 缺源文件 sources/${m.file}`);
    assert.ok(fs.existsSync(path.join(dir, 'source-map.json')), `${m.slug} 缺 source-map.json`);
    const map = readMap(m.slug);
    assert.ok(fs.existsSync(path.join(dir, map.readme.file)), `${m.slug} 缺全本 ${map.readme.file}`);
  });
});

test('出处可复现：source-map 的 sha256 等于入库源文件当前指纹', () => {
  registry.materials.forEach((m) => {
    const map = readMap(m.slug);
    const now = crypto.createHash('sha256')
      .update(fs.readFileSync(path.join(MAT, m.slug, 'sources', m.file))).digest('hex');
    assert.strictEqual(now, map.source.sha256, `${m.slug} 源文件已变，需重跑导入器`);
    assert.strictEqual(map.source.bytes, fs.statSync(path.join(MAT, m.slug, 'sources', m.file)).size);
  });
});

test('反作用力：全本 md 字数与 source-map 记录一致（防手改生成稿）', () => {
  registry.materials.forEach((m) => {
    const map = readMap(m.slug);
    const chars = readMd(m.slug).replace(/\s/g, '').length;
    assert.strictEqual(chars, map.readme.chars, `${m.slug} 实测 ${chars} vs 记录 ${map.readme.chars}`);
  });
});

test('content.json 是纯派生：允许缺席，且 source-map 写明了重建命令', () => {
  registry.materials.forEach((m) => {
    const map = readMap(m.slug);
    assert.ok(/纯派生产物/.test(map.note || ''), `${m.slug} 未声明 content.json 的性质`);
    assert.ok(/node scripts\/import_materials\.js/.test(map.note || ''), `${m.slug} 未写重建命令`);
  });
});

// ── 四种形态：各自渲染成了它该有的样子 ────────────────────────────────

test('字幕形态（武夷山）：真字幕带时间码，注释块按段落渲染（不伪造时间码）', () => {
  const md = readMd('wuyishan-suwen30');
  const m = bySlug['wuyishan-suwen30'];
  assert.strictEqual(readMap('wuyishan-suwen30').shape.body, 'subtitle');
  const cues = md.match(/^- `\d{2}:\d{2}:\d{2},\d{3}`→`\d{2}:\d{2}:\d{2},\d{3}` /gm) || [];
  assert.strictEqual(cues.length, m.timedCues, `带时间码 ${cues.length} 条，注册表记 ${m.timedCues} 条`);
  assert.ok(cues.length > 30000, `真字幕只有 ${cues.length} 条`);
  // 空时间码行是渲染缺陷，必须为零
  assert.strictEqual((md.match(/^- ``→`` /gm) || []).length, 0, '存在空时间码行');
  // 无时间码的块被单独计数，按段落渲染。实测它们分两类：
  //   60 个带【】标签（30 讲 ×【正文内容总结】/【…独到注释】）+ 14 个编号研读笔记（「一、…六、」）
  assert.ok(m.noteBlocks > 0, '未统计到注释块');
  const labelled = (md.match(/^【[^】]+】/gm) || []).length;
  assert.ok(labelled > 0, '未找到带【】标签的注释块');
  assert.ok(labelled <= m.noteBlocks, `带标签块 ${labelled} 多于注释块总数 ${m.noteBlocks}`);
  assert.strictEqual(labelled, 60, `带【】标签的块 ${labelled} 个（30 讲 × 2 类）`);
  assert.strictEqual(m.timedCues + m.noteBlocks, m.units, '真字幕 + 注释块 ≠ 单元总数');
  // 无时间码的块绝不能伪装成字幕行
  assert.strictEqual((md.match(/^- ``→`` /gm) || []).length, 0, '存在空时间码行');
});

test('宽表形态（类经图翼）：真的成了表，且语义标注两列在', () => {
  const md = readMd('leijing-tuyi');
  const map = readMap('leijing-tuyi');
  assert.strictEqual(map.shape.body, 'wide');
  // 表头必须在正文首行出现
  assert.ok(/\| 序号 \| 卷次 \| 篇目 \|/.test(md), '宽表表头缺失');
  // 接入语义张量的两个接口列
  assert.ok(md.includes('语义标注'), '缺「语义标注」列（16 类语义范畴的载体）');
  assert.ok(md.includes('术语对齐'), '缺「术语对齐（国标/ICD-11）」列');
  assert.ok(md.includes('一致性校正记录'), '缺「一致性校正记录」列');
  const rows = md.match(/^\| \d+ \| 卷[一二三四五六七八九十]+ \|/gm) || [];
  assert.ok(rows.length > 1000, `宽表数据行只有 ${rows.length} 行`);
});

test('键值形态（内因七情 / ai-intro）：真的有标签块，不是一整块散文', () => {
  const md = readMd('neiyin-qiqing');
  assert.strictEqual(readMap('neiyin-qiqing').shape.body, 'kv');
  assert.ok(/\*\*视频标题\*\*/.test(md), '缺「视频标题」标签块');
  assert.ok(/\*\*时长\*\*/.test(md), '缺「时长」标签块');
  // 每讲一个分表
  assert.ok(md.includes('## 02心喜'), '缺「02心喜」分表小节');
});

test('散文形态（内经急诊）：无目录，三个分表都成段', () => {
  const map = readMap('neijing-jizhen');
  assert.strictEqual(map.shape.toc, 'none', '内经急诊本应无标准目录');
  assert.strictEqual(map.shape.body, 'prose');
  const md = readMd('neijing-jizhen');
  ['## 原文', '## 病理生理', '## 健康计划'].forEach((h) => {
    assert.ok(md.includes(h), `缺小节 ${h}`);
  });
  assert.ok(md.includes('《黄帝内经》急症救命'), '缺正文首句');
});

test('登记的空分表被如实记录（Excel 遗留 Sheet1/2/3，不假装不存在）', () => {
  const anyEmpty = registry.materials.filter((m) => m.empty > 0);
  assert.ok(anyEmpty.length > 0, '本应有若干空分表被记录');
  anyEmpty.forEach((m) => {
    const map = readMap(m.slug);
    assert.strictEqual(map.emptySections.length, m.empty, `${m.slug} 空分表数不一致`);
  });
});

test('每份材料的节数 = 正文分表数（除显式跳过的）', () => {
  registry.materials.forEach((m) => {
    const map = readMap(m.slug);
    assert.strictEqual(map.counts.bodySections, m.sections, `${m.slug} 节数不一致`);
    assert.strictEqual(map.counts.bodyUnits, m.units, `${m.slug} 单元数不一致`);
  });
});

test('全本 md 无 CRLF（仓库 .gitattributes 要求 LF）', () => {
  registry.materials.forEach((m) => {
    assert.ok(!readMd(m.slug).includes('\r'), `${m.slug} 的全本含 CRLF`);
  });
});

console.log(`\n  ${passed} 通过 · ${failures.length} 失败`);
if (failures.length) {
  console.log('\n失败明细:');
  failures.forEach((f) => console.log(`  ✗ ${f.name}\n    ${f.err.stack.split('\n').slice(0, 3).join('\n    ')}`));
  process.exit(1);
}
console.log('\n✅ 源材料批量导入层通过');

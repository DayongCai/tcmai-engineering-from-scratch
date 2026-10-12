#!/usr/bin/env node
/**
 * tests/test_outputs_index.js — 根级产出物索引层
 *
 * 索引是**生成物**，所以本节测的不是"文件存在"，而是：
 *   - 索引与文件系统**一致**：不能少列（漏掉已产出的产物 = 找不到 = 与没写等价），
 *     也不能多列（索引里有、磁盘上没有 = 假的）
 *   - 缺口要**显式**：已建章节缺产物必须出现在 gaps 里，而不是被索引瞒过去
 *   - `npm run build` 后不漂移（--check 退出 0）：说明索引确实由脚本产出
 *   - 三个产物（index.json / README.md / index.html）同批同源
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'outputs');

let passed = 0;
const failures = [];
function test(name, fn) {
  try { passed += 1; fn(); console.log(`  ✓ ${name}`); }
  catch (e) { failures.push({ name, err: e }); console.log(`  ✗ ${name}\n      ${e.message}`); }
}

console.log('═══ 产出物索引层 ═══\n');

const index = JSON.parse(fs.readFileSync(path.join(OUT, 'index.json'), 'utf8'));
const readme = fs.readFileSync(path.join(OUT, 'README.md'), 'utf8');
const html = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');

/** 现场扫磁盘：所有章节的 outputs/*.md */
function scanDisk() {
  const found = [];
  for (const deptDir of fs.readdirSync(path.join(ROOT, 'departments'))) {
    const dp = path.join(ROOT, 'departments', deptDir);
    if (!fs.statSync(dp).isDirectory()) continue;
    for (const subjDir of fs.readdirSync(dp)) {
      const sp = path.join(dp, subjDir);
      if (!fs.statSync(sp).isDirectory()) continue;
      const chRoot = path.join(sp, 'chapters');
      if (!fs.existsSync(chRoot)) continue;
      for (const ch of fs.readdirSync(chRoot)) {
        const od = path.join(chRoot, ch, 'outputs');
        if (!fs.existsSync(od)) continue;
        for (const f of fs.readdirSync(od)) {
          if (/^(prompt|skill|agent|mcp)-.+\.md$/.test(f)) found.push(path.join(od, f));
        }
      }
    }
  }
  return found;
}

test('不多不少：索引列出的文件数与磁盘上的产出物数一致', () => {
  const disk = scanDisk();
  assert.strictEqual(index.items.length, disk.length,
    `索引 ${index.items.length} 件，磁盘 ${disk.length} 件`);
  assert.ok(disk.length > 0, '磁盘上一个产出物都没有，索引无从谈起');
});

test('索引里每个 file 都真实存在（索引不许列不存在的东西）', () => {
  index.items.forEach((it) => {
    assert.ok(fs.existsSync(path.join(ROOT, it.file)), `索引列了 ${it.file}，磁盘上没有`);
  });
});

test('反向：磁盘上每个产出物都在索引里（漏列 = 找不到 = 与没写等价）', () => {
  const listed = new Set(index.items.map((i) => i.file));
  scanDisk().forEach((abs) => {
    const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
    assert.ok(listed.has(rel), `磁盘上有 ${rel}，索引没列`);
  });
});

test('每件产出物带齐 类型/标题/字数/归属（院系 · 学科 · 章节）', () => {
  index.items.forEach((it) => {
    ['kind', 'file', 'title', 'chars', 'dept', 'subject', 'chapter', 'chapterTitle'].forEach((k) => {
      assert.ok(it[k] !== undefined && it[k] !== '', `${it.file} 缺字段 ${k}`);
    });
    assert.ok(['prompt', 'skill', 'agent', 'mcp'].includes(it.kind), `未知类型 ${it.kind}`);
    assert.ok(it.chars > 0, `${it.file} 字数为 ${it.chars}`);
  });
});

test('计数与实际相符（items / byKind / chaptersWithOutputs）', () => {
  const kinds = {};
  index.items.forEach((i) => { kinds[i.kind] = (kinds[i.kind] || 0) + 1; });
  assert.deepStrictEqual(index.counts.byKind, kinds);
  assert.strictEqual(index.counts.items, index.items.length);
  const chapters = new Set(index.items.map((i) => `${i.deptSlug}/${i.subjectSlug}/${i.chapter}`));
  assert.strictEqual(index.counts.chaptersWithOutputs, chapters.size);
});

test('缺口显式：每个已建章节若缺 prompt/skill 必须出现在 gaps 里', () => {
  // 反推：已建章节 = 有 chapters/<slug>/docs/zh.md 的章节
  const built = [];
  for (const deptDir of fs.readdirSync(path.join(ROOT, 'departments'))) {
    const dp = path.join(ROOT, 'departments', deptDir);
    if (!fs.statSync(dp).isDirectory()) continue;
    for (const subjDir of fs.readdirSync(dp)) {
      const sp = path.join(dp, subjDir);
      if (!fs.statSync(sp).isDirectory()) continue;
      const chRoot = path.join(sp, 'chapters');
      if (!fs.existsSync(chRoot)) continue;
      for (const ch of fs.readdirSync(chRoot)) {
        if (fs.existsSync(path.join(chRoot, ch, 'docs', 'zh.md'))) built.push(`${subjDir}/${ch}`);
      }
    }
  }
  const gapKeys = new Set(index.gaps.map((g) => `${g.subjectSlug ?? ''}/${g.chapter}`));
  let incomplete = 0;
  built.forEach((key) => {
    const [subj, ch] = key.split('/');
    const has = ['prompt', 'skill'].every((k) => index.items.some((i) => i.subjectSlug === subj && i.chapter === ch && i.kind === k));
    if (!has) {
      incomplete += 1;
      const listed = index.gaps.some((g) => g.chapter === ch && g.subject === index.items.find((i) => i.subjectSlug === subj)?.subject);
      assert.ok(listed, `章节 ${key} 缺产物，但没进 gaps —— 索引比现实漂亮了`);
    }
  });
  assert.strictEqual(index.gaps.length, incomplete, `gaps ${index.gaps.length} 个，实际不完整章节 ${incomplete} 个`);
});

test('--check 不漂移：索引确实由脚本产出（手改会被抓出）', () => {
  const r = spawnSync(process.execPath, ['scripts/build_outputs_index.js', '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, `--check 退出码 ${r.status}，索引与现场不一致（手改过？）\n${r.stdout}`);
});

test('三个产物同批同源：README 与 HTML 的数字都等于 index.json', () => {
  const n = String(index.counts.items);
  assert.ok(readme.includes(`**${n}** 件产出物`) || readme.includes(`${n}** 件产出物`), `README 未出现产出物数 ${n}`);
  assert.ok(html.includes(`<b>${n}</b> 件产出物`), `HTML 未出现产出物数 ${n}`);
  assert.ok(html.includes('__OUTPUTS_INDEX__'), 'HTML 未内联索引数据');
});

test('HTML 里每个内部 href 都指向真实文件（链接检查只扫 .md，HTML 得自己守）', () => {
  const hrefs = [...html.matchAll(/href="(\.\.\/[^"]+)"/g)].map((m) => m[1]);
  assert.ok(hrefs.length > 0, 'HTML 里没有内部链接，卡片点不动');
  hrefs.forEach((h) => {
    const abs = path.resolve(path.join(OUT), h);
    assert.ok(fs.existsSync(abs), `HTML 链接 ${h} 指向不存在的位置`);
  });
});

test('HTML 自包含：无外部请求（离线可开）', () => {
  assert.ok(!/<link[^>]+href=["']https?:/i.test(html), 'HTML 引了外部样式');
  assert.ok(!/<script[^>]+src=/i.test(html), 'HTML 引了外部脚本');
  assert.ok(!/<img[^>]+src=["']https?:/i.test(html), 'HTML 引了外部图片');
});

test('HTML 里不出现 markdown 粗体星号（那是渲染缺陷）', () => {
  assert.strictEqual((html.match(/\*\*/g) || []).length, 0, 'HTML 里出现了字面 ** —— 该用 <strong>');
});

test('人可读 README 列出每个章节与每件产物', () => {
  index.items.forEach((it) => {
    assert.ok(readme.includes(it.title.split('\n')[0]), `README 未列出产物「${it.title}」`);
  });
  assert.ok(readme.includes('## 缺口'), 'README 缺「缺口」小节');
});

console.log(`\n  ${passed} 通过 · ${failures.length} 失败`);
if (failures.length) {
  console.log('\n失败明细:');
  failures.forEach((f) => console.log(`  ✗ ${f.name}\n    ${f.err.stack.split('\n').slice(0, 3).join('\n    ')}`));
  process.exit(1);
}
console.log('\n✅ 产出物索引层通过');

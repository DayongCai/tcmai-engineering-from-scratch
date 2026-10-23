#!/usr/bin/env node
/**
 * tests/test_who_tcm.js —— WHO-TCM 代码通道的守门测试
 *
 * 这条通道的风险和 aliases.json 不同：别名表怕"凭记忆写同义词"，
 * 这里怕的是 **批量解析把代码对错了行**。2007 版原文 PDF 的表格是四列各自成文本流，
 * 直接复制文字就会串行（中文名落到相邻条目上），所以按坐标解析 —— 一旦行带切错，
 * 就会得到"代码正确、但挂在了别的证候上"的数据，这种错**看起来完全正常**。
 *
 * 因此这里钉三件事：
 *   1. 每条都必须有**原文中文名**（whoCnName）与其代码同条，供人回书逐行复核；
 *   2. 代码必须形如 x.y.z（国家医保/国标码 B02.05.04.04 不属于这套编号）；
 *   3. 章·节路径与代码是**两套坐标**，不能相互换算（代码 2.9.x 不等于类目 2.4 之类）。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WHO = path.join(ROOT, 'standards/semtensor/descriptions/who-tcm.json');
const EXT = path.join(ROOT, 'standards/semtensor/descriptions/external.json');

let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed += 1; console.log(`  ✓ ${name}`); }
  catch (e) { failures.push({ name, msg: e.message }); console.log(`  ✗ ${name}\n    ${e.message}`); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const who = JSON.parse(fs.readFileSync(WHO, 'utf8'));
const ext = JSON.parse(fs.readFileSync(EXT, 'utf8'));
const labels = new Set(ext.entries.map((e) => e.label));
const CODE = /^\d{1,2}\.\d{1,2}\.\d{1,3}$/;

test('每条都带原文中文名，且代码形如 x.y.z', () => {
  for (const e of who.entries) {
    assert(e.whoCode && CODE.test(e.whoCode), `${e.label}: 代码不是 x.y.z（实为 ${e.whoCode}）`);
    assert(e.whoCnName && /[\u4e00-\u9fff]/.test(e.whoCnName),
      `${e.label}: 缺原文中文名 —— 没有它就无法回书复核代码有没有对错行`);
    assert(!/^B\d/.test(e.whoCode), `${e.label}: 混入了医保/国标码（${e.whoCode}）`);
  }
});

test('WHO 通道不新增证名：每个 label 都在 external.json 里', () => {
  for (const e of who.entries) assert(labels.has(e.label), `${e.label} 不在 external.json（证名来自知识树，不在这里造）`);
});

test('章·节路径与代码是两套坐标，不混写', () => {
  for (const e of who.entries) {
    assert(Array.isArray(e.classPathFromDict) && e.classPathFromDict.length >= 2,
      `${e.label}: 章·节路径至少两段`);
    assert(!e.classPathFromDict.some((s) => CODE.test(String(s).trim())),
      `${e.label}: 章·节路径里混入了代码样式的编号（两套编号不可换算）`);
  }
});

test('label 唯一；同一代码挂多个 label 只允许出现在「证名(部位/别名)」上', () => {
  const seen = new Set();
  for (const e of who.entries) {
    assert(!seen.has(e.label), `重复 label：${e.label}`);
    seen.add(e.label);
  }
  const byCode = new Map();
  for (const e of who.entries) {
    if (!byCode.has(e.whoCode)) byCode.set(e.whoCode, []);
    byCode.get(e.whoCode).push(e.label);
  }
  for (const [code, group] of byCode) {
    if (group.length < 2) continue;
    const bases = new Set(group.map((l) => l.replace(/[（(][^（）()]*[）)]/g, '')));
    assert(bases.size === 1, `代码 ${code} 挂在互不相同的证名上：${group.join(' / ')} —— 解析多半串行了`);
  }
});

test('每条都有出处（url + 版本），可回原文核对', () => {
  for (const e of who.entries) {
    assert(e.source && /^https?:\/\//.test(e.source.url || ''), `${e.label}: 缺可核对的 url`);
    assert(/2007|2022/.test(e.whoEdition || ''), `${e.label}: 未记录版本`);
    if (/原文 PDF/.test(e.source.type || '')) {
      assert(/^[0-9a-f]{64}$/.test(e.source.pdfSha256 || ''), `${e.label}: PDF 来源缺 sha256`);
      assert(Number.isInteger(e.source.bookPage), `${e.label}: PDF 来源缺书页号`);
    }
  }
});

console.log(`\n  ${passed} 通过 · ${failures.length} 失败\n`);
if (failures.length) {
  console.log('❌ WHO-TCM 通道不通过');
  process.exit(1);
}
console.log('✅ WHO-TCM 通道通过');

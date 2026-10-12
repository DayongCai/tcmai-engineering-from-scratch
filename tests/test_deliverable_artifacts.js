#!/usr/bin/env node
/**
 * tests/test_deliverable_artifacts.js — 两条交付物线的成品
 *
 *   [tcmP] 平台  : site/stats.json（必产）· site/sitemap.xml + robots.txt（配了域名才产）
 *   [textbooks] : textbooks/build/volume-*.html（单文件书，不需要 pandoc）
 *
 * 测什么才有意义？测"文件在"没意义 —— 有意义的是：
 *   · stats.json 里的数字与**别的源**对得上（否则它只是个好看的文件）
 *   · sitemap 不配域名时**必须不生成**（编个假域名比没有更糟）
 *   · 书 HTML 是**真能读**的：自包含、目录锚点能对上正文、带免责声明
 *
 * 本测试会临时以 SITE_ORIGIN 构建一次站点（写盘），用完**恢复默认态**并断言恢复成功 ——
 * 留下一个带假域名的 sitemap 被提交，是这个测试自己制造的脏。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert');

const ROOT = path.resolve(__dirname, '..');
const SITE = path.join(ROOT, 'site');
const BUILDDIR = path.join(ROOT, 'textbooks', 'build');

let passed = 0;
const failures = [];
function test(name, fn) {
  try { passed += 1; fn(); console.log(`  ✓ ${name}`); }
  catch (e) { failures.push({ name, err: e }); console.log(`  ✗ ${name}\n      ${e.message}`); }
}

const run = (args, env) => spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...env } });
const buildSite = (env) => run(['site/build.js'], env);
const cleanDeployArtifacts = () => {
  for (const f of ['sitemap.xml', 'robots.txt']) {
    const p = path.join(SITE, f);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
};

console.log('═══ 两条交付物线的成品 ═══\n');

// ── [tcmP] 平台 ───────────────────────────────────────────────────────

test('[tcmP] site/stats.json 生成，且数字与 catalog / outputs 索引对得上', () => {
  buildSite();
  const stats = JSON.parse(fs.readFileSync(path.join(SITE, 'stats.json'), 'utf8'));
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog.json'), 'utf8'));
  const outputsIndex = JSON.parse(fs.readFileSync(path.join(ROOT, 'outputs', 'index.json'), 'utf8'));

  assert.strictEqual(stats.subjects, catalog.counts.subjects, 'stats 学科数与 catalog 不符');
  assert.strictEqual(stats.chaptersTarget, catalog.counts.chapters, 'stats 章节目标与 catalog 不符');
  assert.strictEqual(stats.outputs.items, outputsIndex.counts.items,
    `stats 产出物 ${stats.outputs.items} 与 outputs/index.json 的 ${outputsIndex.counts.items} 不符`);
  assert.deepStrictEqual(stats.outputs.kinds, outputsIndex.counts.byKind, '产出物分类计数不符');
});

test('[tcmP] stats.json 不含时间戳（含时间戳会让任何「产物漂移」比较永远失败）', () => {
  const raw = fs.readFileSync(path.join(SITE, 'stats.json'), 'utf8');
  assert.ok(!/"(generatedAt|timestamp|buildTime|date)"/i.test(raw), `stats.json 里出现了时间字段:\n${raw.slice(0, 300)}`);
});

test('[tcmP] 不配 SITE_ORIGIN 时，sitemap.xml / robots.txt 必须不生成', () => {
  cleanDeployArtifacts();
  const r = buildSite({ SITE_ORIGIN: '' });
  assert.strictEqual(r.status, 0);
  assert.ok(!fs.existsSync(path.join(SITE, 'sitemap.xml')), '没配域名却生成了 sitemap —— 里面的绝对 URL 是编的');
  assert.ok(!fs.existsSync(path.join(SITE, 'robots.txt')), '没配域名却生成了 robots.txt');
  assert.match(r.stdout, /未配置 SITE_ORIGIN/, '未提示为何不生成');
});

test('[tcmP] 配了 SITE_ORIGIN 时生成 sitemap + robots，且 XML 合法、loc 全部同一 origin', () => {
  const ORIGIN = 'https://tcmai.test.invalid';
  try {
    const r = buildSite({ SITE_ORIGIN: ORIGIN });
    assert.strictEqual(r.status, 0);
    const xml = fs.readFileSync(path.join(SITE, 'sitemap.xml'), 'utf8');
    assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
    assert.match(xml, /<\/urlset>\s*$/);

    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    assert.ok(locs.length >= 7, `sitemap 只有 ${locs.length} 条 URL`);
    locs.forEach((l) => assert.ok(l.startsWith(ORIGIN), `loc 不在配置的 origin 下: ${l}`));
    // loc 里的 & 必须转义，否则 XML 直接不合法
    assert.ok(!/&(?!amp;|lt;|gt;|quot;|apos;)/.test(xml), 'loc 里有未转义的 & —— XML 不合法');

    const robots = fs.readFileSync(path.join(SITE, 'robots.txt'), 'utf8');
    assert.match(robots, /Sitemap: https:\/\/tcmai\.test\.invalid\/sitemap\.xml/);
  } finally {
    // 恢复默认态：不配域名时这两个文件本不该存在
    cleanDeployArtifacts();
    buildSite({ SITE_ORIGIN: '' });
  }
});

test('[tcmP] 恢复成功：仓库里不留带假域名的部署产物', () => {
  assert.ok(!fs.existsSync(path.join(SITE, 'sitemap.xml')), 'sitemap.xml 残留（带假域名）');
  assert.ok(!fs.existsSync(path.join(SITE, 'robots.txt')), 'robots.txt 残留（带假域名）');
});

// ── [textbooks] 教材 ─────────────────────────────────────────────────

test('[textbooks] 生成单文件书 HTML（不需要 pandoc 就能得到可读成品）', () => {
  const r = run(['textbooks/build_book.js', '--volume', '1']);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  const p = path.join(BUILDDIR, 'volume-1-sheng.html');
  assert.ok(fs.existsSync(p), '未生成 volume-1-sheng.html');
  const html = fs.readFileSync(p, 'utf8');
  assert.ok(html.length > 5000, `HTML 只有 ${html.length} 字节，疑似空壳`);

  // 自包含：拷走一个文件就能读
  assert.ok(!/<link[^>]+href=["']https?:/i.test(html), '引了外部样式');
  assert.ok(!/<script[^>]+src=/i.test(html), '引了外部脚本');
  assert.ok(!/<img[^>]+src=["']https?:/i.test(html), '引了外部图片');
  assert.match(html, /<style>/, '样式未内联');
});

test('[textbooks] 目录锚点与正文章节一一对应（目录点了能跳）', () => {
  const html = fs.readFileSync(path.join(BUILDDIR, 'volume-1-sheng.html'), 'utf8');
  const hrefs = [...html.matchAll(/href="#(ch\d+)"/g)].map((m) => m[1]);
  const ids = [...html.matchAll(/id="(ch\d+)"/g)].map((m) => m[1]);
  assert.ok(hrefs.length > 0, '目录里没有锚点');
  assert.deepStrictEqual(hrefs, ids, `目录锚点 [${hrefs}] 与正文 id [${ids}] 不一致`);
});

test('[textbooks] 书里带免责声明，且标注了生成方式', () => {
  const html = fs.readFileSync(path.join(BUILDDIR, 'volume-1-sheng.html'), 'utf8');
  assert.match(html, /免责声明/, '书里没有免责声明');
  assert.match(html, /不构成临床诊疗建议/, '免责声明措辞不完整');
  assert.match(html, /build_book\.js/, '未标注生成方式（读者无法判断来源）');
});

test('[textbooks] 书的元信息与 Markdown 汇总一致（同一批数据，两处不许打架）', () => {
  const html = fs.readFileSync(path.join(BUILDDIR, 'volume-1-sheng.html'), 'utf8');
  const md = fs.readFileSync(path.join(BUILDDIR, 'volume-1-sheng.md'), 'utf8');
  const m = /已写 (\d+) 章 \/ (\d+) 字/.exec(html);
  assert.ok(m, 'HTML 里找不到章节/字数元信息');

  // Markdown 汇总里 `---` 分隔的正文块数应与章数一致（前言 + 各章）
  const wc = (t) => t.replace(/\s/g, '').length;
  const mdBody = md.split('\n---\n').slice(1);
  assert.ok(mdBody.length >= Number(m[1]), `Markdown 正文块 ${mdBody.length} 少于 HTML 声称的 ${m[1]} 章`);
  assert.ok(wc(md) > 0);
});

console.log(`\n  ${passed} 通过 · ${failures.length} 失败`);
if (failures.length) {
  console.log('\n失败明细:');
  failures.forEach((f) => console.log(`  ✗ ${f.name}\n    ${f.err.stack.split('\n').slice(0, 3).join('\n    ')}`));
  process.exit(1);
}
console.log('\n✅ 两条交付物线的成品通过');

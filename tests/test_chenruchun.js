#!/usr/bin/env node
/**
 * tests/test_chenruchun.js — 《伤寒论临床应用》交付物的硬证据
 *
 * 测的不是「文件存在」，而是三件容易糊过去的事：
 *   1. 交付物里的每个数字都能从源页面重算出来（目录树、章节字数、00目录的条数/字数）
 *   2. 与《伤寒论》底本的方名交叉是可复现的断言，不是抄下来的印象
 *   3. 01–03 表里每一行的「出处」必须真是原书目录里的题名 —— 手写过一次假出处就失败
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const MAT = path.join(ROOT, 'standards', 'materials', 'chenruchun-shanghan');
const SRC = path.join(MAT, 'sources', '陈瑞春伤寒实践论-weread.html');
const MAP = path.join(MAT, 'source-map.json');
const README = path.join(MAT, '陈瑞春伤寒实践论-目录.md');
const FANG_WITH_DOMAIN_PREFIX = /^S\d+_/;

let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed += 1; console.log(`  ✓ ${name}`); }
  catch (e) { failures.push({ name, err: e }); console.log(`  ✗ ${name}\n      ${e.message}`); }
}

console.log('═══ 《伤寒论临床应用》交付物 ═══\n');

const { readWorkbook } = require('../scripts/lib_xlsx');
const sourceMap = JSON.parse(fs.readFileSync(MAP, 'utf8'));

// 交付物按仓库口径重建到临时目录（桌面那份是同一命令的产物）
const TMP = path.join(os.tmpdir(), `tcmai-chenruchun-${process.pid}`);
fs.mkdirSync(TMP, { recursive: true });
const OUT = path.join(TMP, '伤寒论临床应用.xlsx');
const run = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'import_chenruchun.js'), '--out', OUT], { encoding: 'utf8' });
if (run.status !== 0) {
  console.error(`✗ 生成失败：\n${run.stderr || run.stdout}`);
  process.exit(1);
}
const wb = readWorkbook(OUT);
const sheet = (n) => wb.sheets.find((s) => s.name === n);
const cellStr = (v) => String(v === undefined || v === null ? '' : v).trim();

// ── 1. 源与指纹 ───────────────────────────────────────────────────────
console.log('[1] 源与指纹');

test('source-map 记录的 sha256 等于源页面当前指纹（出处可复现）', () => {
  const sha = crypto.createHash('sha256').update(fs.readFileSync(SRC)).digest('hex');
  assert.strictEqual(sourceMap.source.sha256, sha);
  assert.strictEqual(sourceMap.source.bytes, fs.statSync(SRC).size);
});

test('源页面里没有原书正文（只有目录与元信息）——本交付物不复制版权正文', () => {
  const t = fs.readFileSync(SRC, 'utf8');
  assert.ok(!t.includes('chapterContentTargetHtml"') || !/chapterContentHtml":"<p>/.test(t), '源页面意外含正文 HTML');
});

test('人可读目录与 source-map 的章节数一致（防生成物与记录漂移）', () => {
  const md = fs.readFileSync(README, 'utf8');
  const rows = md.split('\n').filter((l) => /^\|\s*　*L\d /.test(l));
  assert.strictEqual(rows.length, sourceMap.counts.nodes, `目录表 ${rows.length} 行 ≠ ${sourceMap.counts.nodes} 节点`);
});

// ── 2. 交付物形状 ─────────────────────────────────────────────────────
console.log('\n[2] 交付物形状');

test('10 个工作表，名字与顺序固定', () => {
  assert.deepStrictEqual(wb.sheets.map((s) => s.name), [
    '00目录', '01学习方法', '02学术思想', '03分析逻辑', '04经方实践',
    '05医案实录', '06医话实说', '07学术实见', '08条文映射', '09溯源',
  ]);
});

test('00目录 的 条数/字数 等于分表**实测**值（不接受手写数字）', () => {
  const toc = sheet('00目录').rows.slice(1).map((r) => r.map(cellStr));
  assert.ok(toc.length >= 9, `00目录 只有 ${toc.length} 行`);
  toc.forEach((row) => {
    const name = row[1];
    if (!name || name === '00目录' || name === '09溯源') return;
    const body = sheet(name);
    assert.ok(body, `00目录 列出的 ${name} 不存在`);
    const dataRows = body.rows.length - 1; // 减去表头
    const chars = body.rows.slice(1)
      .reduce((a, r) => a + r.reduce((x, c) => x + cellStr(c).replace(/\s/g, '').length, 0), 0);
    assert.strictEqual(Number(row[3]), dataRows, `${name} 条数 ${row[3]} ≠ 实测 ${dataRows}`);
    assert.strictEqual(Number(row[4]), chars, `${name} 字数 ${row[4]} ≠ 实测 ${chars}`);
  });
});

test('分表没有空正文（空壳会被 00目录 的字数暴露，这里再钉一次）', () => {
  ['01学习方法', '02学术思想', '03分析逻辑'].forEach((n) => {
    sheet(n).rows.slice(1).forEach((r, i) => {
      assert.ok(cellStr(r[2]).length >= 8, `${n} 第 ${i + 1} 行正文过短: ${cellStr(r[2])}`);
      assert.strictEqual(Number(r[1]), (String(r[2]).match(/[。；]/g) || []).length || 1, `${n} 第 ${i + 1} 行句数与正文不符`);
    });
  });
});

// ── 3. 出处必须是原书目录里的题名 ─────────────────────────────────────
console.log('\n[3] 出处可信');

const bookTitles = new Set();
{
  const re = /"title":"([^"\\]{1,60})"/g;
  const t = fs.readFileSync(SRC, 'utf8');
  let m;
  while ((m = re.exec(t))) bookTitles.add(m[1]);
}
const NON_BOOK_CITES = ['页面·简介', '页面·简介＋上篇体例', '页面·简介＋上篇目录', '上篇＋中篇目录', '本文件·生成说明', '上篇目录'];

test('01–03 的每一条出处要么是页面文案，要么是原书目录里的题名', () => {
  ['01学习方法', '02学术思想', '03分析逻辑'].forEach((n) => {
    sheet(n).rows.slice(1).forEach((r, i) => {
      const cite = cellStr(r[3]);
      if (NON_BOOK_CITES.includes(cite)) return;
      const last = cite.split('·').pop();
      assert.ok(bookTitles.has(last), `${n} 第 ${i + 1} 行出处不在目录里: ${cite}`);
    });
  });
});

test('推测类行必须自报「推断」，不能冒充原文', () => {
  ['01学习方法', '02学术思想', '03分析逻辑'].forEach((n) => {
    const rows = sheet(n).rows.slice(1);
    const grades = new Set(rows.map((r) => cellStr(r[4])));
    assert.ok(grades.size >= 2, `${n} 只有一种证据等级，疑似没分级`);
    grades.forEach((g) => assert.ok(/原文|目录题名|库内统计|推断/.test(g), `${n} 出现未定义证据等级: ${g}`));
  });
});

// ── 4. 与《伤寒论》底本的交叉可复现 ───────────────────────────────────
console.log('\n[4] 底本交叉');

test('04经方实践 33 行，方名与目录里的 33 首方一致（去序号）', () => {
  const rows = sheet('04经方实践').rows.slice(1);
  assert.strictEqual(rows.length, 33, `得到 ${rows.length} 行`);
  rows.forEach((r, i) => assert.strictEqual(Number(r[0]), i + 1));
  const names = rows.map((r) => cellStr(r[1]));
  assert.ok(names.includes('桂枝汤') && names.includes('炙甘草汤'), '方名缺失');
  assert.strictEqual(new Set(names).size, 33, '有重名');
});

test('桂枝汤的底本命中数可独立重算（42 处方外感第一方，必须命中）', () => {
  const base = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards', 'shanghan', '底本.json'), 'utf8'));
  const text = base.pian.flatMap((p) => (p.items || []).map((it) => it.text)).join('\n');
  const mine = text.split('\n').filter((t) => t.includes('桂枝汤') && !t.includes('桂枝加')).length;
  const row = sheet('04经方实践').rows.slice(1).find((r) => cellStr(r[1]) === '桂枝汤');
  assert.ok(Number(row[6]) >= mine, `04表 ${row[6]} < 独立重算 ${mine}`);
});

test('命中的方必有域分布与首见条目，未命中的方写「未命中」而不是空', () => {
  sheet('04经方实践').rows.slice(1).forEach((r, i) => {
    const hits = Number(r[6]);
    if (hits > 0) {
      assert.ok(!/未命中/.test(cellStr(r[7])), `第 ${i + 1} 行命中却标未命中`);
      assert.ok(cellStr(r[8]).includes('#'), `第 ${i + 1} 行命中却无首见条文`);
    } else {
      assert.strictEqual(cellStr(r[7]), '未命中', `第 ${i + 1} 行未命中却写了域分布`);
    }
  });
});

test('08条文映射 的域合计等于 04表 命中数逐方相加（同一方跨域重复计）', () => {
  const rows04 = sheet('04经方实践').rows.slice(1);
  const expect = rows04.reduce((a, r) => {
    if (Number(r[6]) === 0) return a;
    return a + cellStr(r[7]).split('／').reduce((x, seg) => x + (Number((/(\d+)$/.exec(seg) || [])[1]) || 0), 0);
  }, 0);
  const rows08 = sheet('08条文映射').rows.slice(1);
  const totalRow = rows08[rows08.length - 1];
  assert.ok(/合计/.test(cellStr(totalRow[1])), '08表缺少合计行');
  assert.strictEqual(Number(totalRow[2]), expect, `08合计 ${totalRow[2]} ≠ 04逐方相加 ${expect}`);
});

test('未命中的方多为《金匮》方：source-map 记的名单与 04表 逐行一致', () => {
  const miss = sheet('04经方实践').rows.slice(1).filter((r) => Number(r[6]) === 0).map((r) => cellStr(r[1]));
  assert.deepStrictEqual(miss, sourceMap.baseLink.missed);
  assert.ok(miss.length >= 8, `未命中只有 ${miss.length} 首，与「经方不止《伤寒论》」这一判断不符`);
});

test('每首未命中的方都写清了原因（金匮 / 底本缺口），不留「待定」', () => {
  const rows = sheet('04经方实践').rows.slice(1).filter((r) => Number(r[6]) === 0);
  rows.forEach((r) => {
    const why = cellStr(r[9]);
    assert.ok(/(《金匮要略》方|本底本缺该篇)/.test(why), `${cellStr(r[1])} 未命中原因缺失: ${why}`);
    assert.ok(!/待定/.test(why), `${cellStr(r[1])} 原因未分类`);
  });
  const kinds = sourceMap.baseLink.missedDetail.reduce((m, x) => { m[x.kind] = (m[x.kind] || 0) + 1; return m; }, {});
  assert.ok(kinds['金匮'] >= 5 && kinds['缺口'] >= 1, `分类结果异常: ${JSON.stringify(kinds)}`);
});

test('底本异体用字对齐是显式记录的，不是默默改数（桂枝麻黄各半汤）', () => {
  const row = sheet('04经方实践').rows.slice(1).find((r) => cellStr(r[1]) === '桂枝麻黄各半汤');
  assert.ok(Number(row[6]) > 0, '桂枝麻黄各半汤应能通过「桂枝、麻黄各半汤」在底本命中');
  assert.ok(cellStr(row[2]).includes('桂枝、麻黄各半汤'), `检索名字段未记异体用字: ${cellStr(row[2])}`);
  const realigned = sourceMap.baseLink.aliasRealigned.map((x) => x.fang);
  assert.ok(realigned.includes('桂枝麻黄各半汤') && realigned.includes('苓桂术甘汤'), `source-map 缺异体对齐记录: ${realigned.join('、')}`);
});

test('同形异名被挡在门外：理中汤不拿「人参汤」当检索名，命中数没被灌水', () => {
  const row = sheet('04经方实践').rows.slice(1).find((r) => cellStr(r[1]) === '理中汤');
  assert.ok(cellStr(row[2]).includes('理中丸'), `检索名应用底本实际用字「理中丸」: ${cellStr(row[2])}`);
  assert.ok(!cellStr(row[2]).includes('人参汤'), `「人参汤」是同形异方，不该作为检索名: ${cellStr(row[2])}`);
  assert.ok(Number(row[6]) <= 8, `理中丸真实命中 5 条，得到 ${row[6]}，疑似混入白虎/四逆加人参汤`);
  assert.ok(sourceMap.baseLink.aliasRejected.some((x) => x.alias === '人参汤'), 'source-map 未记录被否掉的别名');
});

// ── 5. 中篇/下篇整理 ──────────────────────────────────────────────────
console.log('\n[5] 中篇·下篇整理');

test('05医案实录 覆盖 8 大类且列出病种清单', () => {
  const rows = sheet('05医案实录').rows.slice(1);
  const classes = rows.filter((r) => cellStr(r[1]) === '大类');
  assert.strictEqual(classes.length, 8, `大类 ${classes.length} 个`);
  classes.forEach((r) => assert.ok(cellStr(r[5]).length > 4, `${cellStr(r[2])} 没有病种清单`));
  assert.strictEqual(rows.reduce((a, r) => a + Number(r[3]), 0) >= 100, true, '病种合计偏少');
});

test('06医话 20 篇 / 07附篇 8 篇，篇题与目录一致且都归了主题', () => {
  const y = sheet('06医话实说').rows.slice(1);
  const f = sheet('07学术实见').rows.slice(1);
  assert.strictEqual(y.length, 20);
  assert.strictEqual(f.length, 8);
  [...y, ...f].forEach((r) => {
    assert.ok(bookTitles.has(cellStr(r[1])), `题名不在目录里: ${cellStr(r[1])}`);
    assert.notStrictEqual(cellStr(r[3]), '—', `${cellStr(r[1])} 未归主题`);
  });
});

test('09溯源 记全了 URL / 指纹 / 重建命令 / 局限', () => {
  const kv = new Map(sheet('09溯源').rows.slice(1).map((r) => [cellStr(r[1]), cellStr(r[2])]));
  assert.ok(kv.get('源页面').startsWith('https://weread.qq.com/web/reader/'));
  assert.ok(kv.get('源指纹').includes(sourceMap.source.sha256));
  assert.ok(kv.get('重建命令').includes('import_chenruchun.js'));
  assert.ok(kv.get('本文件不含').includes('正文'));
  assert.ok(kv.get('证据等级').includes('推断'));
});

fs.rmSync(TMP, { recursive: true, force: true });

console.log(`\n${failures.length ? '✗' : '✓'} 交付物：${passed} 通过 · ${failures.length} 失败`);
if (failures.length) process.exit(1);

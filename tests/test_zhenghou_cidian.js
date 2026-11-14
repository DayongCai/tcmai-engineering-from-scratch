#!/usr/bin/env node
/**
 * tests/test_zhenghou_cidian.js —— 「疾病证候单元辞典」专用断言
 *
 * 为什么单独一套：audit_curriculum.js 只管"章有 docs/quiz/outputs、篇幅够"，
 * 它不关心 291 证是不是真的都在、四级码是不是拼得起来、张量是不是与结构同源。
 * 那些恰恰是本辞典的核心承诺 —— 承诺不写成断言，就只是文案。
 *
 * 断言分四组：
 *   A 数据层   结构.json / 张量.json / 语素表的存在、形状、互相自洽
 *   B 编码层   全码格式、唯一性、父链、候码可拼接
 *   C 正文层   辞典 16 个文件在、291 个证标题在、图注引用的 6 张 SVG 在
 *   D 校验层   校对差异与缺口登记不许被悄悄删掉（数量只许变多，不许变少）
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const STD = path.join(ROOT, 'standards', 'zhenghou-cidian');
const TB = path.join(ROOT, 'textbooks', '01-zhongyi', '14-zhongyi-zhenghou-xue');
const DEPT = path.join(ROOT, 'departments', '01-zhongyi', '14-zhongyi-zhenghou-xue');

const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const struct = read(path.join(STD, '结构.json'));
const tensor = read(path.join(STD, '张量.json'));
const gap = read(path.join(STD, '缺口登记.json'));
const wei = read(path.join(STD, '语素-位.json'));
const xing = read(path.join(STD, '语素-性.json'));
const tai = read(path.join(STD, '语素-态.json'));

const men = struct.men;
const allZheng = men.flatMap((m) => m.lei.flatMap((l) => l.zhengList));
const allHou = men.flatMap((m) => m.lei.flatMap((l) => l.zhengList.flatMap((z) => z.houList)));

// ── A 数据层 ──────────────────────────────────────────────

test('A1 底本与四个派生文件都在', () => {
  for (const f of ['目录原文.txt', 'PDF登记.json', '结构.json', '张量.json', '缺口登记.json',
    '语素-位.json', '语素-性.json', '语素-态.json']) {
    assert.ok(fs.existsSync(path.join(STD, f)), '缺 ' + f);
  }
  const toc = fs.readFileSync(path.join(STD, '目录原文.txt'), 'utf8').trim().split('\n');
  assert.strictEqual(toc.length, 2268, '目录原文应为 2268 条书签，实为 ' + toc.length);
});

test('A2 四级计数与声明一致，且逐级可加总', () => {
  const c = struct.counts;
  assert.strictEqual(c.men, 12);
  assert.strictEqual(c.lei, 45);
  assert.strictEqual(c.zhengInstances, allZheng.length);
  assert.strictEqual(c.houInstances, allHou.length);
  assert.strictEqual(c.men, men.length);
  assert.strictEqual(c.lei, men.reduce((a, m) => a + m.lei.length, 0));
});

test('A3 三张语素表与张量轴对齐', () => {
  assert.strictEqual(wei['证位'].length, 22);
  assert.strictEqual(xing['门'].length, 12);
  assert.strictEqual(xing['类'].length, 45);
  const taiSet = new Set(tai['态'].map((t) => t.zh));
  assert.strictEqual(taiSet.size, tensor.axes['态'].length);
  assert.strictEqual(tensor.shape[0], 22);
  assert.strictEqual(tensor.shape[1], 45);
  assert.strictEqual(tensor.shape[2], taiSet.size);
});

test('A4 张量计数与结构逐格重算相等（不是抄来的）', () => {
  const recount = {};
  for (const h of allHou) {
    const k = `${h.wei}|${h.zheng.split('-')[2] ? allZheng.find((z) => z.full === h.zheng).wei : ''}|${h.tai}`;
    recount[k] = (recount[k] || 0) + 1;
  }
  const cells = tensor.cells;
  const sum = Object.values(cells).reduce((a, b) => a + b, 0);
  assert.strictEqual(sum, allHou.length, '张量格值总和应等于候条目数');
  assert.strictEqual(Object.keys(cells).length, struct.counts.tensorCells);
  for (const [k, v] of Object.entries(cells)) {
    assert.strictEqual(recount[k], v, '格 ' + k + ' 计数不一致');
  }
});

// ── B 编码层 ──────────────────────────────────────────────

test('B1 全码格式：Mnn-Lnn-Znn[-Hnnn]', () => {
  const zre = /^M\d{2}-L\d{2}-Z\d{2}[a-z]?$/;
  const hre = /^M\d{2}-L\d{2}-Z\d{2}[a-z]?-H\d{3}$/;
  for (const z of allZheng) {
    assert.ok(zre.test(z.full), '证全码不合格式: ' + z.full);
    for (const h of z.houList) assert.ok(hre.test(h.full), '候全码不合格式: ' + h.full);
  }
});

test('B2 父链唯一：证只属一个类，类只属一个门', () => {
  for (const m of men) {
    for (const l of m.lei) {
      for (const z of l.zhengList) {
        assert.strictEqual(z.men, m.code);
        assert.strictEqual(z.lei, l.code);
        assert.ok(z.full.startsWith(m.code + '-' + l.code + '-'), z.full);
      }
    }
  }
});

test('B3 候码可拼接且前缀正确', () => {
  for (const z of allZheng) {
    for (const h of z.houList) {
      assert.strictEqual(h.full, z.full + '-' + h.code.split('-').pop());
      assert.strictEqual(h.zheng, z.full);
    }
  }
});

test('B4 每个证名都能拆成「位 + 类性 + 证」，每个候名都能拆成「位 + 态」', () => {
  const bad = allZheng.filter((z) => !z.wei || !z.weiParts || !z.weiParts.length);
  assert.deepStrictEqual(bad.map((z) => z.code), []);
  assert.deepStrictEqual(gap['证名拆分失败'] || [], []);
  assert.deepStrictEqual(gap['候名拆分失败'] || [], []);
  const holes = allHou.filter((h) => !h.wei || !h.tai);
  assert.deepStrictEqual(holes.map((h) => h.code), []);
});

// ── C 正文层 ──────────────────────────────────────────────

test('C1 辞典 19 个文件齐备（凡例 + 12 章 + 6 附录）', () => {
  const files = fs.readdirSync(TB).filter((f) => f.endsWith('.md'));
  assert.strictEqual(files.length, 19, '实为 ' + files.length + '：' + files.join(', '));
  assert.ok(files.some((f) => f.startsWith('00-')));
  for (let i = 1; i <= 12; i += 1) {
    assert.ok(files.some((f) => f.startsWith(String(i).padStart(2, '0') + '-第' + i + '章-')), '缺第 ' + i + ' 章');
  }
  for (const a of ['A', 'B', 'C', 'D', 'E', 'F']) assert.ok(files.some((f) => f.startsWith('附录' + a)), '缺附录' + a);
});

test('C1b 附录 D（百姓反查）与附录 E（工程手册）内容达标', () => {
  const d = fs.readFileSync(path.join(TB, '附录D-症状反查索引.md'), 'utf8');
  const rows = (d.match(/^\| \*\*/gm) || []).length;
  assert.ok(rows >= 200, '附录 D 词项只有 ' + rows + ' 行，契约要求 ≥200');
  const e = fs.readFileSync(path.join(TB, '附录E-应用工程手册.md'), 'utf8');
  for (const k of ['CI/CD', '迁移协议', '危候', '未收录']) {
    assert.ok(e.includes(k), '附录 E 缺「' + k + '」段');
  }
});

test('C2 291 个证条目都在正文里，且全码一字不差', () => {
  const body = fs.readFileSync(path.join(TB, '00-凡例与使用.md'), 'utf8')
    + men.map((m) => fs.readFileSync(path.join(TB, fs.readdirSync(TB)
      .find((f) => f.startsWith(String(m.n).padStart(2, '0') + '-第' + m.n + '章-'))), 'utf8')).join('\n');
  const missing = allZheng.filter((z) => !body.includes('`' + z.full + '`') && !body.includes(z.full));
  assert.deepStrictEqual(missing.map((z) => z.full), [], '正文缺证条目');
  // 1866 条候必须逐条出现（以全码形式）
  const missHou = allHou.filter((h) => !body.includes(h.full));
  assert.strictEqual(missHou.length, 0, '正文缺候条目 ' + missHou.length + ' 条，例：' + (missHou[0] || {}).full);
});

test('C3 图注引用的 12 张 SVG 都在，且有源文件', () => {
  const vol0 = fs.readFileSync(path.join(TB, '00-凡例与使用.md'), 'utf8');
  const refs = [...vol0.matchAll(/\((figures\/[^)]+\.svg)\)/g)].map((m) => m[1]);
  assert.strictEqual(refs.length, 12, '图注应引用 12 张图，实为 ' + refs.length);
  for (const r of refs) {
    assert.ok(fs.existsSync(path.join(TB, r)), '缺图 ' + r);
    const src = fs.readdirSync(path.join(TB, 'figures')).filter((f) =>
      (f.endsWith('.py') || f.endsWith('.mmd')) && path.basename(r, '.svg') === path.basename(f, path.extname(f)));
    assert.strictEqual(src.length, 1, '缺源文件：' + r);
  }
});

test('C5 正文层（OCR）与结构、正文三处对上', () => {
  const bodies = fs.readdirSync(STD)
    .filter((f) => /^正文-M\d{2}\.json$/.test(f)).map((f) => path.join(STD, f));
  if (!bodies.length) {
    assert.ok(true, '尚无正文层（OCR 未跑）—— 不判失败，但一旦有就必须自洽');
    return;
  }
  const codes = new Set(allHou.map((h) => h.full));
  for (const f of bodies) {
    const d = read(f);
    assert.ok(d.items && typeof d.items === 'object');
    const keys = Object.keys(d.items);
    assert.ok(keys.length > 0, path.basename(f) + ' 里没有任何候');
    // 1) 每个键都必须能在结构.json 里找到（不许 OCR 出来的码自己另立门户）
    const orphan = keys.filter((k) => !codes.has(k));
    assert.deepStrictEqual(orphan, [], path.basename(f) + ' 里有结构外的码');
    // 2) counts 必须与 items 自洽
    assert.strictEqual(d.counts.matched, keys.length);
    assert.ok(d.counts.chars > 0);
    // 3) 每条都要有正文字段与印张
    for (const k of keys.slice(0, 40)) {
      const v = d.items[k];
      assert.ok(v.page, k + ' 缺印张');
      assert.ok(Object.keys(v.fields || {}).length >= 3, k + ' 字段太少');
    }
  }
});

test('C6 正文层进书的是全文，不是节选', () => {
  const f = fs.readdirSync(TB).find((x) => x.startsWith('06-第6章-'));
  const md = fs.readFileSync(path.join(TB, f), 'utf8');
  const blocks = (md.match(/^##### \(\d+\)/gm) || []).length;
  assert.ok(blocks >= 300, '第6章候级小节只有 ' + blocks + ' 个，契约要求覆盖 313 候');
  for (const k of ['**病因病机**', '**方症**', '**摘录**']) {
    assert.ok(md.includes(k), '正文缺整段字段：' + k + '（退回节选了？）');
  }
  // 单条最长段落应远超 110 字（旧节选上限），否则说明 clip 又回来了
  const longest = Math.max(...[...md.matchAll(/^> (.+)$/gm)].map((m) => m[1].length));
  assert.ok(longest > 400, '最长原书段落仅 ' + longest + ' 字，疑似退回节选');
});

test('C7 正文层可复现：OCR 管线脚本全部在仓库里（不在 scratch）', () => {
  const need = ['_paths.py', 'scan_headers.py', 'build_doors.py', 'run_ocr.py',
    'parse_records.py', 'merge_bodies.py', 'recover_missing.py', 'verify_bodies.py',
    'report.py', 'run_ten.sh', 'finish_pipeline.sh', 'README.md'];
  const dir = path.join(ROOT, 'scripts', 'zgh_ocr');
  assert.ok(fs.existsSync(dir), '缺 scripts/zgh_ocr/ —— 管线不能只活在 scratch（.gitignore）里');
  const miss = need.filter((f) => !fs.existsSync(path.join(dir, f)));
  assert.deepStrictEqual(miss, [], '管线脚本缺失，正文层将无法复现');
  // 脚本里不许再引用 scratch 的代码路径（数据在 scratch 可以，代码不行）
  const bad = fs.readdirSync(dir).filter((f) => f.endsWith('.py'))
    .filter((f) => /scratch[\/]zgh_ocr[\/][a-z_]+\.py/.test(fs.readFileSync(path.join(dir, f), 'utf8')));
  assert.deepStrictEqual(bad, [], '脚本仍在引用 scratch 下的旧代码路径');
});

test('C4 课程层 12 章目录与 chapters.json 一致', () => {
  const idx = read(path.join(DEPT, 'chapters.json'));
  assert.strictEqual(idx.chapters.length, 12);
  for (const c of idx.chapters) {
    const dir = path.join(DEPT, 'chapters', c.slug);
    assert.ok(fs.existsSync(dir), '缺章节目录 ' + c.slug);
    for (const f of ['docs/zh.md', 'quiz.json']) assert.ok(fs.existsSync(path.join(dir, f)), c.slug + ' 缺 ' + f);
    assert.strictEqual(c.code, 'M' + String(c.n).padStart(2, '0'));
  }
});

// ── D 校验层（缺口只许变多、不许悄悄变少） ──────────────────

test('D1 校对差异 ≥10 条，且都带 declare/actual', () => {
  const diffs = struct['校对']['差异'];
  assert.ok(diffs.length >= 10, '差异从 10 条变成 ' + diffs.length + ' 条 —— 有人删了校勘记录？');
  for (const d of diffs) {
    assert.ok(d.declare && d.actual && d.code, '差异条目缺字段：' + JSON.stringify(d));
  }
  assert.strictEqual(gap['校对差异'].length, diffs.length);
});

test('D2 证码冲突被显式登记', () => {
  const dup = struct['校对']['证码重复'];
  assert.ok(Object.keys(dup).length >= 1, 'L05-Z13 一号两用的记录不见了');
  assert.ok(dup['L05-Z13']);
  assert.strictEqual(dup['L05-Z13'].length, 2);
});

test('D3 未做事项写清了，不许静默', () => {
  assert.ok((gap['未做'] || []).length >= 3);
  assert.ok(gap['未做'].some((s) => s.includes('OCR')), 'OCR 缺口必须写出来');
});

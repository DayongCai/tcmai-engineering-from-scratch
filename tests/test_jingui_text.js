#!/usr/bin/env node
/**
 * tests/test_jingui_text.js —— 《金匮要略》外源底本的"不许改口"测试
 *
 * 金匮在本仓库没有教材底本（qhzy-*.xlsx 100 份里没有），原文只来自外源笈成。
 * 外源一旦漂移，10 章引文就全部失效 —— 所以这里钉的是**留档与解析的指纹**：
 *   sha256、篇数、条数、方数、条号格式、繁简双栏、附篇无条号。
 * 任何一个数变了都会红，逼人去 git diff 看是「网页改版」还是「解析改坏」。
 */

'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'standards/jingui');
const BOOK = JSON.parse(fs.readFileSync(path.join(DIR, '底本.json'), 'utf8'));

let passed = 0;
const failures = [];
const test = (name, fn) => {
  try { fn(); passed += 1; console.log(`  ✓ ${name}`); } catch (e) { failures.push([name, e.message]); console.log(`  ✗ ${name}\n      ${e.message}`); }
};

const zhengwen = BOOK.pian.filter((p) => p.no != null);
const fu = BOOK.pian.filter((p) => p.no == null);
const allArticles = BOOK.pian.flatMap((p) => p.articles);
const allFormulas = allArticles.flatMap((a) => a.formulas || []);

console.log('\n金匮要略外源底本\n');

test('留档 sha256 与产物登记一致（网页改版即失效）', () => {
  const buf = fs.readFileSync(path.join(DIR, 'source.html'));
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  assert.strictEqual(sha, BOOK.source.sha256, 'source.html 的 sha256 与 底本.json 登记不符');
  assert.strictEqual(buf.length, BOOK.source.bytes, '字节数不符');
});

test('规模：22 篇正文 + 序附 4 项 · 402 条 · 174 方 · 165 味药', () => {
  assert.strictEqual(zhengwen.length, 22);
  assert.strictEqual(fu.length, 4, '序 + 杂疗方 + 禽兽鱼虫禁忌 + 果实菜谷禁忌');
  assert.strictEqual(allArticles.length, 402);
  assert.strictEqual(BOOK.counts.articles, 402);
  assert.strictEqual(allFormulas.length, 174);
  const herbs = new Set(allFormulas.flatMap((f) => f.ingredients.map((i) => i.herbSimp || i.herb)));
  assert.strictEqual(herbs.size, 165);
});

test('22 篇正文合计 398 条（与宋本条数巧合，但不是同一体系，须说明）', () => {
  const n = zhengwen.reduce((s, p) => s + p.articles.length, 0);
  assert.strictEqual(n, 398);
  assert.ok(/条号/.test(BOOK.numbering), '产物必须声明条号口径');
});

test('条号格式 = 「篇.条」，且与所属篇一致', () => {
  for (const p of zhengwen) {
    for (const a of p.articles) {
      assert.match(a.tiao, /^\d+\.\d+$/, `条号形态异常：${a.tiao}`);
      assert.strictEqual(Number(a.tiao.split('.')[0]), p.no, `第${p.no}篇里出现 ${a.tiao}`);
    }
  }
});

test('第 1 篇第 1 条存在，且是老段 <div data-sec> 标记（首版曾整条丢失）', () => {
  const p1 = zhengwen.find((p) => p.no === 1);
  const a = p1.articles.find((x) => x.tiao === '1.1');
  assert.ok(a, '缺 1.1 —— 「上工治未病」是全书开篇，丢了就是解析坏了');
  assert.ok(a.zhHans.includes('上工治未病'), `1.1 内容异常：${a.zhHans.slice(0, 40)}`);
});

test('繁简双栏都在，且简体非空（opencc 只做字形）', () => {
  for (const a of allArticles) {
    assert.ok(a.zhHant && a.zhHant.length > 3, `${a.tiao} 缺繁文`);
    assert.ok(a.zhHans && a.zhHans.length > 3, `${a.tiao} 缺简文`);
  }
  assert.ok(/opencc/.test(BOOK.t2s) || BOOK.t2s.includes('未安装'), '必须交代繁简转换方式');
});

test('序与 3 附篇无条号（tiao: null），不得混进辨证统计', () => {
  for (const p of fu) for (const a of p.articles) assert.strictEqual(a.tiao, null);
});

test('方剂：有方名、有药味、有煎服法；方名不含主治句（源里「乌头汤方：治脚气…」）', () => {
  for (const f of allFormulas) {
    assert.ok(f.nameSimp && f.nameSimp.length >= 2, `方名异常：${f.name}`);
    assert.ok(!/[：:]/.test(f.nameSimp), `方名混入主治句：${f.nameSimp}`);
    // 互见方（「见前痉病中」「见上」）方名在、药文在他篇：允许 0 药味，但必须标 refOnly
    if (f.ingredients.length === 0) {
      assert.strictEqual(f.refOnly, true, `${f.nameSimp} 无药味却未标 refOnly`);
    } else {
      assert.ok(!f.refOnly, `${f.nameSimp} 有药味却标了 refOnly`);
    }
  }
  const wu = allFormulas.find((f) => f.nameSimp.startsWith('乌头汤'));
  assert.ok(wu, '缺乌头汤（第 5 篇）');
  assert.strictEqual(wu.nameSimp, '乌头汤方');
});

test('互见方 9 个单列，不进配伍统计（174 = 165 有方文 + 9 互见）', () => {
  const ref = allFormulas.filter((f) => f.refOnly);
  assert.strictEqual(ref.length, 9);
  assert.strictEqual(BOOK.counts.formulasWithText, 165);
  assert.strictEqual(BOOK.counts.formulasRefOnly, 9);
  assert.strictEqual(BOOK.counts.formulasWithText + BOOK.counts.formulasRefOnly, BOOK.counts.formulas);
});

test('高频药与统计口径一致（甘草 67 · 桂枝 41 · 生姜 36）', () => {
  const cnt = new Map();
  for (const f of allFormulas) for (const i of f.ingredients) {
    const k = i.herbSimp || i.herb;
    cnt.set(k, (cnt.get(k) || 0) + 1);
  }
  const top = [...cnt.entries()].sort((a, b) => b[1] - a[1]);
  assert.deepStrictEqual(top.slice(0, 3).map(([k]) => k), ['甘草', '桂枝', '生姜']);
  assert.strictEqual(top[0][1], 67);
});

test('自校验：148 方自述「右N味」全部吻合（底本 v2 修完，不一致必须为 0）', () => {
  const cn = (n) => {
    const m = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
    if (/^十[一二三四五六七八九]$/.test(n)) return 10 + m[n[1]];
    if (/^[二三四五六七八九]十$/.test(n)) return m[n[0]] * 10;
    if (/^[二三四五六七八九]十[一二三四五六七八九]$/.test(n)) return m[n[0]] * 10 + m[n[2]];
    return m[n] || null;
  };
  const bad = [];
  let declared = 0;
  for (const f of allFormulas) {
    const mm = (f.methodSimp || '').match(/右([一二三四五六七八九十]+)味/);
    if (!mm) continue;
    declared += 1;
    if (cn(mm[1]) !== f.ingredients.length) bad.push(f.nameSimp);
  }
  assert.strictEqual(declared, 148, `自述味数的方数变了：${declared}`);
  assert.deepStrictEqual(bad, [], `解析与原文自述不一致：${bad.join('、')} —— 底本 v2 的口径是「必须全对」`);
});

test('README 记录来源 / sha256 / 引用格式（外源不得标「底本」）', () => {
  const md = fs.readFileSync(path.join(DIR, 'README.md'), 'utf8');
  assert.ok(md.includes(BOOK.source.sha256), 'README 未记录 sha256');
  assert.ok(md.includes('jicheng.tw'), 'README 未记录来源 URL');
  assert.ok(md.includes('外源·笈成'), 'README 未声明引用格式');
  assert.ok(!/标为「底本」|写作「底本」/.test(md.replace(/不得写「底本」/g, '')), 'README 不得暗示可标底本');
});

console.log(`\n  ${passed} 通过 · ${failures.length} 失败`);
if (failures.length) { for (const f of failures) console.error(`  · ${f[0]}: ${f[1]}`); process.exit(1); }

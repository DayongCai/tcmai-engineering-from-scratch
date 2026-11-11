#!/usr/bin/env node
/**
 * tests/test_jingui_quanwen.js —— 《金匮要略》402 条是否**一条不漏、一条不重、逐字对**地进了课程 docs
 *
 * 为什么需要这道门：
 *   audit_curriculum 的 L3 只看「有没有《书·篇》级引文」，不看覆盖；
 *   `test_jingui_chapters` 只看「引用的那句能不能在底本里找到」，不看漏没漏。
 *   于是「整本可读」这句话没有任何一道门在守——补到 208 条时会绿，停在 208 条也会绿。
 *   本测试把三件事钉死：
 *     1. 398 个带条号的条（402 条减去序 1 + 附篇 3 段）在 24 章 docs 里**各出现恰好一次**；
 *     2. 每条的正文与 `底本.json` 的 `zhHans` **逐字相等**（不是「相似」）；
 *     3. 序 1 条 + 附篇 3 篇（笈成本整篇 1 条、按段引用）也在 docs 里有落点。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');

const ROOT = path.resolve(__dirname, '..');
const SUBJ = path.join(ROOT, 'departments', '01-zhongyi', '08-jingui-yaolue');
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards', 'jingui', '底本.json'), 'utf8'));

const chapters = JSON.parse(fs.readFileSync(path.join(SUBJ, 'chapters.json'), 'utf8')).chapters;
const docs = new Map(); // slug → md
for (const c of chapters) {
  const p = path.join(SUBJ, 'chapters', c.slug, 'docs/zh.md');
  if (fs.existsSync(p)) docs.set(c.slug, fs.readFileSync(p, 'utf8'));
}

/** 条号 → 正文（底本口径：带条号的 398 条） */
const BEN = new Map();
for (const p of BOOK.pian) {
  for (const a of p.articles || []) {
    if (a.tiao) BEN.set(a.tiao, a.zhHans);
  }
}
const TAIL = BOOK.pian.filter((p) => !p.no); // 序 + 23/24/25

/** docs 里的「**第X.Y条**　正文」条目（全录块的格式）。
 *  正文可能跨行（底本 v2 把方文拼进 body，条内自带空行），所以按「下一个条标记」切块，
 *  不能按行取 —— 按行只会捕获条文第一行，凡是带方文的条都会假红。 */
const FOUND = new Map(); // tiao → [{slug, text}]
for (const [slug, md] of docs) {
  const marks = [...md.matchAll(/^\*\*第(\d+)\.(\d+)条\*\*　/gm)];
  marks.forEach((m, i) => {
    const start = m.index + m[0].length;
    const end = i + 1 < marks.length ? marks[i + 1].index : md.length;
    const tiao = `${m[1]}.${m[2]}`;
    const text = md.slice(start, end)
      .replace(/<!-- jingui-quanwen:end -->[\s\S]*$/, '')
      .replace(/\n*> 本章全录[\s\S]*$/, '')
      .replace(/\n*> \*\*第 \d+ 篇[\s\S]*$/, '')
      .trim();
    if (!FOUND.has(tiao)) FOUND.set(tiao, []);
    FOUND.get(tiao).push({ slug, text });
  });
}

let passed = 0;
const failures = [];
const test = (name, fn) => {
  try { fn(); passed += 1; console.log(`  ✓ ${name}`); } catch (e) { failures.push([name, e.message]); console.log(`  ✗ ${name}\n      ${e.message}`); }
};

console.log('\n金匮要略 · 402 条覆盖（原文全录）\n');

test('底本带条号的条 = 398（402 减去序 1 + 附篇 3）', () => {
  assert.strictEqual(BOOK.counts.articles, 402, '底本条数变了？');
  assert.strictEqual(BEN.size, 398, `带条号的条应为 398，实为 ${BEN.size}`);
  assert.strictEqual(TAIL.length, 4, '底本尾部应为 序 + 23/24/25');
});

test('398 条在 24 章 docs 里各出现恰好一次（不漏、不重）', () => {
  const missing = [...BEN.keys()].filter((t) => !FOUND.has(t)).sort();
  const dup = [...FOUND.entries()].filter(([, v]) => v.length > 1).map(([t, v]) => `${t} (${v.map((x) => x.slug).join(',')})`);
  assert.deepStrictEqual(missing, [], `漏录 ${missing.length} 条：${missing.slice(0, 8).join('、')}`);
  assert.deepStrictEqual(dup, [], `重复 ${dup.length} 条：${dup.slice(0, 5).join('；')}`);
  assert.strictEqual(FOUND.size, 398, `docs 里只有 ${FOUND.size} 个条号`);
});

test('逐字相等：docs 里的每条正文 = 底本 zhHans', () => {
  const bad = [];
  for (const [t, [hit]] of FOUND) {
    if (hit.text !== BEN.get(t)) {
      bad.push(`${t}（${hit.slug}）：docs「${hit.text.slice(0, 18)}…」≠ 底本「${BEN.get(t).slice(0, 18)}…」`);
    }
  }
  assert.deepStrictEqual(bad, [], `${bad.length} 条正文与底本不一致：\n      ${bad.slice(0, 4).join('\n      ')}`);
});

test('序（无条号）在成书章里整段落位', () => {
  const md = docs.get('01-chengshu-zabing') || '';
  assert.ok(md.includes('**序（无条号）**'), '缺序的全录行');
  assert.ok(md.includes(TAIL[0].articles[0].zhHans.slice(0, 30)), '序的正文与底本不一致');
});

test('附篇三篇（23-25）在对应章里有段式引用', () => {
  for (const [slug, marker] of [
    ['22-pian23-zaliaofang', '段 1'],
    ['23-pian24-qinshou-jinji', '段 1'],
    ['24-pian25-guoshi-jinji', '段 1'],
  ]) {
    const md = docs.get(slug);
    assert.ok(md, `缺章 ${slug}`);
    assert.ok(md.includes(marker), `${slug} 缺附篇段式全录`);
    assert.ok(/附篇在底本里整篇存为 1 条/.test(md), `${slug} 未说明附篇分条口径`);
  }
  const tailCount = TAIL.slice(1).length;
  assert.strictEqual(tailCount, 3, '附篇应为 3 篇');
});

test('覆盖口径自洽：191 + 208 = 399，加上附篇 3 篇 = 402', () => {
  const firstTen = ['01-chengshu-zabing', '02-zangfu-chuanbian', '03-jing-shi-ye', '04-baihe-huhuo',
    '05-nueb-zhongfeng', '06-pibai-xulao', '07-tanyin-kesou', '08-xiao ke-linbing'.replace(' ', ''),
    '09-furen-sanpian'];
  let nFirst = 0;
  for (const slug of firstTen) {
    for (const m of (docs.get(slug) || '').matchAll(/^\*\*第\d+\.\d+条\*\*　/gm)) nFirst += 1;
  }
  const nPian = FOUND.size - nFirst;
  assert.strictEqual(nFirst, 190, `前十章带条号的条应为 190，实为 ${nFirst}`);
  assert.strictEqual(nPian, 208, `篇目精读应为 208 条，实为 ${nPian}`);
  assert.strictEqual(nFirst + 1 + nPian + 3, 402, '191 + 208 + 3 应等于 402');
});

console.log(`\n  ${passed} 通过 · ${failures.length} 失败`);
if (failures.length) { for (const f of failures) console.error(`  · ${f[0]}: ${f[1]}`); process.exit(1); }

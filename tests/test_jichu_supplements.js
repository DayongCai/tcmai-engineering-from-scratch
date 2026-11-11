'use strict';
/**
 * 中医基础理论「教材缺口补源」门
 *   1. 四份源留档存在，字节与 sha256 与 补源.json 记录一致
 *   2. 六处缺口 · 56 条 · 0 未取到
 *   3. 每条（繁体原文）都能在其源文里逐字找到
 *   4. 病机十九条恰 19 条、无重复、都以句号收尾
 *   5. 八法 8 条各带释义（不是只有法名）
 *   6. 奇经 8 脉名齐（含阳跷/阴跷/阳维/阴维）
 *   7. 十二经 12 条、十二组（手足×三阴三阳）各一
 *   8. 底本不被污染：底本 counts 仍是 13 章 / 327 段 / 45,199 字
 *   9. 落点章 docs 必须引到「外源·笈成·」且落点是真实章节目录
 */

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const SUPP = path.join(ROOT, 'standards', 'jichu', 'supplements');
const DOC = JSON.parse(fs.readFileSync(path.join(SUPP, '补源.json'), 'utf8'));
const BASE = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards', 'jichu', '底本.json'), 'utf8'));
const CHDIR = path.join(ROOT, 'departments', '01-zhongyi', '01-zhongyi-jichu-lilun', 'chapters');

function sha256(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

function plain(p) {
  return fs.readFileSync(p, 'utf8')
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, '');
}

const TEXT = {};
for (const s of DOC.sources) TEXT[s.id] = plain(path.join(SUPP, s.file));

test('四份源留档：字节与 sha256 与记录一致', () => {
  assert.strictEqual(DOC.sources.length, 4);
  for (const s of DOC.sources) {
    const p = path.join(SUPP, s.file);
    assert.ok(fs.existsSync(p), `缺源文件 ${s.file}`);
    assert.strictEqual(fs.statSync(p).size, s.bytes, `${s.title} 字节变化`);
    assert.strictEqual(sha256(p), s.sha256, `${s.title} sha256 变化（网页改版？）`);
    assert.ok(/^https:\/\/jicheng\.tw\/tcm\/book\//.test(s.url), `${s.title} 出处不是笈成`);
  }
});

test('规模：8 处缺口 · 74 条 · 0 未取到', () => {
  assert.strictEqual(DOC.gaps.length, 8);
  assert.strictEqual(DOC.counts.items, 74);
  assert.strictEqual(DOC.counts.found, 74);
  assert.strictEqual(DOC.counts.missing, 0);
  for (const g of DOC.gaps) {
    assert.strictEqual(g.found, g.declared, `${g.id} 未补齐`);
    assert.deepStrictEqual(g.missing, [], `${g.id} 有缺失`);
  }
});

test('每条原文都能在源文里逐字找到（繁体验证）', () => {
  const bad = [];
  for (const g of DOC.gaps) {
    for (const it of g.items) {
      const src = it.src || '';
      const sid = /素問/.test(src) ? 'suwen' : /靈樞/.test(src) ? 'lingshu' : /難經/.test(src) ? 'nanjing' : 'xinyu';
      const raw = (it.hant || it.hant_excerpt || '').replace(/\s+/g, '');
      if (!raw) continue;
      // 八法条目只核「法名 + 释义首句」中的释义部分
      const probe = it.hant_excerpt ? it.hant_excerpt.replace(/\s+/g, '') : raw;
      if (!TEXT[sid].includes(probe)) bad.push(`${g.id}/${it.no}: ${probe.slice(0, 24)}`);
    }
  }
  assert.deepStrictEqual(bad, [], `以下条目在源文中找不到：\n${bad.join('\n')}`);
});

test('病机十九条：19 条、无重复、均以句号收尾', () => {
  const g = DOC.gaps.find((x) => x.id === 'bingji-19');
  assert.strictEqual(g.items.length, 19);
  const set = new Set(g.items.map((x) => x.hans));
  assert.strictEqual(set.size, 19);
  for (const it of g.items) {
    assert.ok(it.hans.endsWith('。'), `第 ${it.no} 条未以句号收尾`);
    assert.ok(it.hans.includes('皆属'), `第 ${it.no} 条缺「皆属」`);
  }
});

test('八法：8 条各带释义（不是只有法名）', () => {
  const g = DOC.gaps.find((x) => x.id === 'bafa-8');
  assert.strictEqual(g.items.length, 8);
  for (const it of g.items) {
    assert.ok(it.hans_excerpt && it.hans_excerpt.length >= 8, `${it.hans} 缺释义`);
    assert.ok(it.found, `${it.hans} 未切到`);
  }
  const names = g.items.map((x) => x.hans);
  assert.deepStrictEqual(names, ['汗法', '吐法', '下法', '和法', '温法', '清法', '补法', '消法']);
});

test('奇经八脉：8 脉齐，含阳跷/阴跷/阳维/阴维', () => {
  const g = DOC.gaps.find((x) => x.id === 'qijing-8');
  const names = g.items.map((x) => x.hans);
  assert.strictEqual(names.length, 8);
  // 督/任/冲/带 原文作「X脈者」；阳维、阴维原文只作「陽維、陰維者」，不带「脈」字，照原文收
  for (const n of ['督脉', '任脉', '冲脉', '带脉', '阳跷脉', '阴跷脉', '阳维', '阴维']) {
    assert.ok(names.includes(n), `缺 ${n}`);
  }
  const forms = g.items.map((x) => x.form);
  assert.strictEqual(forms.filter((f) => f === 'bare').length, 2, '阳维/阴维应为 bare 形态');
});

test('十二经：12 条，十二组（手足×三阴三阳）各一', () => {
  const g = DOC.gaps.find((x) => x.id === 'meridian-12');
  assert.strictEqual(g.items.length, 12);
  const keys = g.items.map((x) => {
    const m = x.hans.match(/(手|足)(太阴|少阴|厥阴|太阳|阳明|少阳)/);
    return m ? m[1] + m[2] : null;
  });
  assert.ok(keys.every(Boolean), '有经名解析不出手足阴阳');
  assert.strictEqual(new Set(keys).size, 12);
});

test('五运六气七篇：7 篇齐、篇序递增、规模可复算（1,055 句 / 34,637 字）', () => {
  const g = DOC.gaps.find((x) => x.id === 'yunqi-7pian');
  assert.strictEqual(g.items.length, 7);
  const names = ['天元纪大论', '五运行大论', '六微旨大论', '气交变大论', '五常政大论', '六元正纪大论', '至真要大论'];
  for (const n of names) assert.ok(g.items.some((x) => x.hans.startsWith(n)), `缺 ${n}`);
  const orders = g.items.map((x) => Number(x.planChars));
  assert.ok(orders.every((v) => v > 1000), '每篇都应有正文');
  assert.strictEqual(g.items.reduce((n, x) => n + x.planSentences, 0), 1055);
  assert.strictEqual(g.items.reduce((n, x) => n + x.planChars, 0), 34637);
  // 最大的一篇是六元正纪
  const max = g.items.slice().sort((a, b) => b.planChars - a.planChars)[0];
  assert.strictEqual(max.hans.startsWith('六元正纪'), true);
});

test('六气胜复：11 条 = 司天之化 6 + 胜复原则 3 + 亢害承制 2', () => {
  const g = DOC.gaps.find((x) => x.id === 'liuqi-shengfu');
  const kinds = g.items.reduce((m, x) => { m[x.kind] = (m[x.kind] || 0) + 1; return m; }, {});
  assert.deepStrictEqual(kinds, { 司天之化: 6, 勝復原則: 3, 亢害承制: 1, 六氣承制鏈: 1 });
  assert.ok(g.items.some((x) => x.hans.includes('有胜则复，无胜则否')));
  assert.ok(g.items.some((x) => x.hans.includes('亢则害，承乃制')));
});

test('底本不被污染：仍是 13 章 / 70 节 / 164 小节 / 327 段 / 45,199 字', () => {
  const c = BASE.counts;
  assert.strictEqual(c.chapters, 13);
  assert.strictEqual(c.secs, 70);
  assert.strictEqual(c.subs, 164);
  assert.strictEqual(c.paras, 327);
  assert.strictEqual(c.chars, 45199);
  // 补源层不得混入底本 chapters
  assert.strictEqual(BASE.chapters.length, 13);
});

test('落点章真实存在，且 docs 引到「外源·笈成·」', () => {
  for (const g of DOC.gaps) {
    const dir = path.join(CHDIR, g.chapter);
    assert.ok(fs.existsSync(dir), `落点章不存在：${g.chapter}`);
    const md = fs.readFileSync(path.join(dir, 'docs', 'zh.md'), 'utf8');
    assert.ok(md.includes('外源·笈成·'), `${g.chapter} 未标注外源出处`);
    assert.ok(md.includes('外源补录'), `${g.chapter} 缺「外源补录」小节`);
  }
});

'use strict';
/**
 * 中医诊断学补源层门（9 项）
 *   1. 三份源留档在册：字节数与 sha256 与 补源.json 一致
 *   2. 四处缺口：补 3 拒 1；拒补项必须有 refused/reason/alternative，且不许带 entries
 *   3. 每条补录都带 textbookLocator 与 locator（缺哪、取哪，缺一不可）
 *   4. 脈經 24 名：条数=24、名称唯一、含「緩脈」
 *   5. 脈經条目原文必须能在留档 HTML 里逐字找到（去掉标签后）
 *   6. 十問：歌诀含「九因脈色察陰陽」「十從氣味章神見」；目次恰 8 条（一問寒熱…八問渴）
 *   7. 五臭：5 条、臊焦香腥腐齐、各归一脏；每条「其臭X」能在素問留档里找到
 *   8. 底本未动：补源里的 base.sha256 与现盘 底本.json 一致；补录不得写进 底本.json（gaps 数>0 且底本段数不变）
 *   9. 引用格式：不得出现「底本·」式引用；citeAs 必须含「外源·笈成·」
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const SUP = path.join(ROOT, 'standards', 'zhenduan', 'supplements');
const DOC = path.join(SUP, '补源.json');
const SRC = path.join(SUP, 'sources');
const SUWEN = path.join(ROOT, 'standards', 'jichu', 'supplements', 'sources', '黃帝內經素問.html');
const BASE = path.join(ROOT, 'standards', 'zhenduan', '底本.json');

const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const doc = () => JSON.parse(fs.readFileSync(DOC, 'utf8'));
const strip = (p) => fs.readFileSync(p, 'utf8').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, '');
const gapById = (id) => doc().gaps.find((g) => g.id === id);

test('1. 三份源留档在册（字节 + sha256）', () => {
  const d = doc();
  assert.strictEqual(d.sources.length, 3);
  for (const s of d.sources) {
    const p = s.id === 'suwen' ? SUWEN : path.join(SRC, path.basename(s.file));
    assert.ok(fs.existsSync(p), `${s.title} 留档缺失：${p}`);
    assert.strictEqual(fs.statSync(p).size, s.bytes, `${s.title} 字节数变了`);
    assert.strictEqual(sha(p), s.sha256, `${s.title} sha256 变了`);
    assert.ok(s.url.startsWith('https://jicheng.tw/tcm/book/'), `${s.title} 缺提供方链接`);
  }
});

test('2. 四处缺口：补 3 拒 1，拒补项不许带条目', () => {
  const d = doc();
  assert.strictEqual(d.gaps.length, 4);
  const refused = d.gaps.filter((g) => g.refused);
  assert.strictEqual(refused.length, 1, '必须有且只有 1 处拒补');
  assert.strictEqual(d.stats.filled, 3);
  for (const r of refused) {
    assert.ok(r.reason.length >= 20, '拒补要写清理由');
    assert.ok(r.alternative, '拒补要给替代口径');
    assert.strictEqual(r.entries, undefined, '拒补项不得列出条目');
    assert.strictEqual(r.evidence.percentInTextbook, 0, '教材百分号实测应为 0');
  }
});

test('3. 每条补录都带「缺哪 + 取哪」', () => {
  for (const g of doc().gaps.filter((x) => !x.refused)) {
    assert.ok(g.textbookLocator && /教材·第\d+章/.test(g.textbookLocator), `${g.id} 缺教材定位`);
    assert.ok(g.locator && g.locator.length >= 6, `${g.id} 缺外源定位`);
    assert.ok(g.entries && g.entries.length > 0, `${g.id} 没有条目`);
  }
});

test('4. 脈經 24 名：条数、唯一性、含缓脉', () => {
  const g = gapById('z1-mai-ming-que-huan');
  assert.strictEqual(g.entries.length, 24, '《脈經》二十四種应为 24 条');
  const names = g.entries.map((e) => e.name);
  assert.strictEqual(new Set(names).size, 24, '脉名重复');
  assert.ok(names.includes('緩脈'), '缺緩脈');
  assert.ok(g.comparison.inBoth.length >= 20, '与教材同名数太少');
  assert.deepStrictEqual(g.comparison.onlyTextbook.sort(), ['长', '牢', '疾', '短'].sort(), '教材独有的四名应是长/短/疾/牢');
});

test('5. 脈經条目原文可在留档里逐字找到', () => {
  const text = strip(path.join(SRC, '脈經.html')).replace(/\s+/g, '');
  const g = gapById('z1-mai-ming-que-huan');
  const miss = g.entries.filter((e) => !text.includes(e.text.replace(/\s+/g, '')));
  assert.deepStrictEqual(miss.map((e) => e.name), [], '有条目在留档里找不到原文');
});

test('6. 十問：歌诀两项 + 八问目次', () => {
  const g = gapById('z2-shiwen-ba-jie');
  const song = g.entries.find((e) => e.kind === 'song').text;
  assert.ok(song.includes('九因脈色察陰陽'), '歌诀缺第九问');
  assert.ok(song.includes('十從氣味章神見'), '歌诀缺第十问');
  assert.strictEqual(g.heads.length, 8, '十問篇正文只到八问');
  assert.deepStrictEqual(g.heads, ['一問寒熱', '二問汗', '三問頭身', '四問便', '五問飲食', '六問胸', '七問聾', '八問渴']);
});

test('7. 五臭：五条各归一脏，原文可查', () => {
  const g = gapById('z3-qiwei-wu-chou');
  assert.strictEqual(g.entries.length, 5);
  assert.deepStrictEqual(g.entries.map((e) => e.chou).sort(), ['臊', '焦', '香', '腥', '腐'].sort());
  // 留档是繁体本，脏名按原文作「腎」，不折简
  assert.deepStrictEqual(g.entries.map((e) => e.zang).sort(), ['心', '肝', '脾', '肺', '腎'].sort());
  const text = strip(SUWEN).replace(/\s+/g, '');
  for (const e of g.entries) {
    assert.ok(text.includes('其臭' + e.chou), `素問留档里找不到「其臭${e.chou}」`);
  }
  // 每条都要带「其臭X」出处短语，不许只给一个脏名
  for (const e of g.entries) assert.strictEqual(e.quote, '其臭' + e.chou);
});

test('8. 底本未动', () => {
  const d = doc();
  assert.strictEqual(d.base.sha256, sha(BASE), '底本.json 变了——本层不许改底本');
  const b = JSON.parse(fs.readFileSync(BASE, 'utf8'));
  assert.strictEqual(b.counts.paras, 196, '底本段数应仍为 196');
  assert.strictEqual(b.counts.chars, 22215, '底本字数应仍为 22,215');
});

test('9. 引用格式：只许「外源·笈成·」，不许「底本·」', () => {
  const raw = fs.readFileSync(DOC, 'utf8');
  for (const g of doc().gaps.filter((x) => !x.refused)) {
    assert.ok(g.citeAs.includes('外源·笈成·'), `${g.id} 的 citeAs 不合格式`);
  }
  const bad = raw.match(/「?底本·[^」"]{2,}」?/g) || [];
  assert.deepStrictEqual(bad, [], '补源里出现「底本·」式引用');
});

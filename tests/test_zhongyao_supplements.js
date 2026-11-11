'use strict';
/**
 * 中药学补源层门（9 项）
 *   1. 源留档在册：字节、sha256、结构（h1/h2/h3）与 补源.json 一致
 *   2. 三处缺口齐；g1 有教材示例 17 味 + 规则 4 条，其余两处指向未进课程的教材章
 *   3. 教材示例逐字回查：每条 quote 必须在底本 5.3 段里出现
 *   4. 教材示例自洽：药名出现在自己的 quote 里，趋向取值合法
 *   5. 外源线索逐字回查：每条 sentence 必须能在留档 HTML 里去标签后找到
 *   6. 外源线索自洽：句子含该药名 + 至少一个升降浮沉关键词
 *   7. 残差自洽：287 = 教材示例 + 新增线索 + 无源
 *   8. g2 / g3 数字与底本一致（7 章 7,965 字；12 味 / 2,262 字）
 *   9. 口径：底本未动、禁「底本·」式引用、citeAs 含「外源·笈成·」
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'standards', 'zhongyao');
const SUP = path.join(DIR, 'supplements');
const DOC = path.join(SUP, '补源.json');
const SRC = path.join(SUP, 'sources', '醫學衷中參西錄.html');
const BASE = path.join(DIR, '底本.json');

const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const doc = () => JSON.parse(fs.readFileSync(DOC, 'utf8'));
const base = () => JSON.parse(fs.readFileSync(BASE, 'utf8'));
const gap = (id) => doc().gaps.find((g) => g.id === id);
const fold = (s) => String(s).replace(/\s/g, '').replace(/[，,。．；;：:、（）()「」『』“”'']/g, '');

function paras53() {
  const c = base().chapters.find((x) => x.no === '5');
  const sec = c.secs.find((s) => s.no === '5.3');
  return sec.subs.flatMap((u) => u.paras).join('\n');
}

test('1. 源留档在册', () => {
  const d = doc();
  assert.strictEqual(d.sources.length, 1);
  const s = d.sources[0];
  assert.strictEqual(s.title, '醫學衷中參西錄');
  assert.ok(fs.existsSync(SRC), '缺留档');
  assert.strictEqual(fs.statSync(SRC).size, s.bytes);
  assert.strictEqual(sha(SRC), s.sha256);
  assert.ok(s.structure.h2 > 200, 'h2 篇数异常（书没下全？）');
});

test('2. 三处缺口与 g1 的内容量', () => {
  const d = doc();
  assert.strictEqual(d.gaps.length, 3);
  const g1 = gap('g1-shengjiang-fuchen');
  assert.strictEqual(g1.textbook.examples.length, 17);
  assert.strictEqual(g1.textbook.rules.length, 4);
  assert.strictEqual(g1.textbook.namedDrugs, 17);
  assert.ok(gap('g2-zonglun-7zhang').textbook.chapters.length === 7);
  assert.ok(gap('g3-gongdu-badu').textbook.drugs.length === 12);
});

test('3. 教材示例逐字回查（5.3 段）', () => {
  const flat = fold(paras53());
  for (const e of gap('g1-shengjiang-fuchen').textbook.examples) {
    assert.ok(flat.includes(fold(e.quote)), `${e.drug} 的 quote 在 5.3 段里找不到：${e.quote}`);
  }
});

test('4. 教材示例自洽', () => {
  const OK = new Set(['升', '降', '浮', '沉', '升浮', '沉降']);
  for (const e of gap('g1-shengjiang-fuchen').textbook.examples) {
    assert.ok(OK.has(e.trend), `${e.drug} 趋向取值非法：${e.trend}`);
    assert.ok(e.quote.includes(e.drug), `${e.drug} 的名字不在自己的 quote 里`);
    assert.ok(/^教材·第5章·5\.3/.test(e.locator), `${e.drug} locator 不对`);
  }
});

test('5. 外源线索逐字回查（留档 HTML）', () => {
  const text = fold(fs.readFileSync(SRC, 'utf8').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ''));
  for (const c of gap('g1-shengjiang-fuchen').clues) {
    assert.ok(text.includes(fold(c.sentence)), `${c.drug} 的句子在留档里找不到`);
  }
});

test('6. 外源线索自洽', () => {
  const KW = ['升浮', '沉降', '升提', '升阳', '上行', '下降', '下行', '镇潜', '降逆'];
  for (const c of gap('g1-shengjiang-fuchen').clues) {
    assert.ok(c.sentence.includes(c.drug), `${c.drug} 的句子不含药名`);
    assert.ok(c.keywords.some((k) => c.sentence.includes(k)), `${c.drug} 的句子不含升降浮沉词`);
    assert.ok(c.section && c.section.length >= 2, `${c.drug} 缺篇名定位`);
  }
});

test('7. 残差自洽：287 = 示例 + 新增线索 + 无源', () => {
  const g1 = gap('g1-shengjiang-fuchen');
  const r = g1.residual;
  assert.strictEqual(r.total, 287);
  assert.strictEqual(r.withTextbook, 17);
  assert.strictEqual(r.withTextbook + r.withClue + r.noSource, r.total,
    `17 + ${r.withClue} + ${r.noSource} ≠ 287`);
  assert.ok(r.noSource > 200, '无源数太少，说明线索被当成了标注');
  assert.ok(/推断/.test(r.why), '残差说明必须写明「按规则推是推断」');
});

test('8. g2 / g3 与底本一致', () => {
  const byNo = new Map(base().chapters.map((c) => [c.no, c]));
  const g2 = gap('g2-zonglun-7zhang');
  const sum2 = g2.textbook.chapters.reduce((n, c) => n + c.chars, 0);
  assert.strictEqual(sum2, g2.textbook.chars);
  assert.strictEqual(g2.textbook.chars, 7965);
  for (const c of g2.textbook.chapters) assert.strictEqual(c.chars, byNo.get(c.no).counts.chars);

  const g3 = gap('g3-gongdu-badu');
  assert.strictEqual(g3.textbook.chars, 2262);
  assert.strictEqual(g3.textbook.drugs.length, 12);
});

test('9. 口径：底本未动 / 禁底本式引用 / citeAs 合规', () => {
  const d = doc();
  assert.strictEqual(d.base.sha256, sha(BASE), '底本.json 变了');
  assert.ok(gap('g1-shengjiang-fuchen').citeAs.includes('外源·笈成·'));
  const raw = fs.readFileSync(DOC, 'utf8');
  assert.deepStrictEqual(raw.match(/「?底本·[^」"]{2,}」?/g) || [], []);
  const readme = fs.readFileSync(path.join(SUP, 'README.md'), 'utf8');
  assert.ok(readme.includes('249 味无源拒补'), 'README 必须写明 249 味无源');
});

'use strict';
/**
 * 中药学底本门（10 项）
 *   1. 母本指纹：sha256 / 字节 / 43 表（30 内容 + 13 方法）
 *   2. 五级计数自洽：章 30 · 节 74 · 小节 342 · 段标题 971 · 段 971 · 63,865 字
 *   3. 编号体系：章为纯数字 1..30；节号前缀=章号；小节号前缀=章.节
 *   4. 表头不产生假章：章集合恰为 1..30，sheet 无重复
 *   5. 段标题与正文一比一（971 = 971），且段标题都带「药名·」或「N.N.N.M 编号」
 *   6. 药物 287 味：只来自第 9–29 章；小节号格式正确；每味都有三段字段
 *   7. 性味归经覆盖：287/285/284；缺味缺归经的名单固定（雷公藤/龙骨/丁香）
 *   8. 四气分布复算：温 77 · 寒 72 · 平 52 · 微寒 41 …
 *   9. 空值只许来自教材没写：四气值必须落在 9 个合法值内，且 partialMiss 与空值一致
 *  10. 引用口径：README 与 底本.json 都写「教材·第N章」，不许出现「底本·」「原文·」
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'standards', 'zhongyao');
const BASE = path.join(DIR, '底本.json');
const DRUGS = path.join(DIR, 'drugs.json');
const MD = path.join(DIR, '底本.md');
const README = path.join(DIR, 'README.md');

const base = () => JSON.parse(fs.readFileSync(BASE, 'utf8'));
const drugs = () => JSON.parse(fs.readFileSync(DRUGS, 'utf8'));

const QI = ['微寒', '大寒', '大热', '微温', '平', '寒', '热', '温', '凉'];

test('1. 母本指纹', () => {
  const s = base().source;
  assert.strictEqual(s.bytes, 240889);
  assert.strictEqual(s.sha256, '6934bcebc856a70f' + s.sha256.slice(16));
  assert.strictEqual(s.sheets, 43);
  assert.strictEqual(s.contentSheets, 30);
  assert.strictEqual(s.methodSheets, 13);
  assert.ok(fs.existsSync(s.path), '母本不在原路径（换了机器要改 ZHONGYAO_XLSX）');
});

test('2. 五级计数自洽', () => {
  const d = base();
  const c = d.counts;
  assert.strictEqual(c.chapters, 30);
  assert.strictEqual(c.secs, 74);
  assert.strictEqual(c.subs, 342);
  assert.strictEqual(c.items, 971);
  assert.strictEqual(c.paras, 971);
  assert.strictEqual(c.chars, 63865);
  // 逐章求和必须等于总计
  const sum = (k) => d.chapters.reduce((n, ch) => n + ch.counts[k], 0);
  for (const k of ['secs', 'subs', 'items', 'paras', 'chars']) {
    assert.strictEqual(sum(k), c[k], `${k} 逐章之和 ≠ 总计`);
  }
});

test('3. 编号体系', () => {
  const d = base();
  for (const ch of d.chapters) {
    assert.ok(/^\d+$/.test(ch.no), `章号非数字：${ch.no}`);
    for (const sec of ch.secs) {
      assert.strictEqual(sec.no.split('.')[0], ch.no, `${sec.no} 的节号前缀不是第 ${ch.no} 章`);
      for (const sub of sec.subs) {
        assert.strictEqual(sub.no.split('.').slice(0, 2).join('.'), sec.no, `${sub.no} 的小节前缀不是 ${sec.no}`);
      }
    }
  }
});

test('4. 表头不产生假章', () => {
  const nos = base().chapters.map((c) => Number(c.no)).sort((a, b) => a - b);
  assert.deepStrictEqual(nos, Array.from({ length: 30 }, (_, i) => i + 1), '章号应恰为 1..30');
  const sheets = base().chapters.map((c) => c.sheet);
  assert.strictEqual(new Set(sheets).size, 30, '有内容表被解析成多个章（表头行没跳过）');
});

test('5. 段标题与正文一比一', () => {
  const d = base();
  let items = 0;
  let paras = 0;
  for (const ch of d.chapters) {
    for (const sec of ch.secs) {
      paras += sec.paras.length;
      for (const sub of sec.subs) {
        items += sub.items.length;
        paras += sub.paras.length;
      }
    }
    paras += ch.paras.length;
  }
  assert.strictEqual(items, d.counts.items);
  assert.strictEqual(paras, d.counts.paras);
  assert.strictEqual(items, paras, '段标题与正文应一比一（教材是 段=1..3 标题 / 段=11..13 正文）');
});

test('6. 药物 287 味，只来自 9–29 章', () => {
  const list = drugs().drugs;
  assert.strictEqual(list.length, 287);
  for (const x of list) {
    const ch = Number(x.chapter);
    assert.ok(ch >= 9 && ch <= 29, `${x.name} 来自第 ${x.chapter} 章（应在 9–29）`);
    assert.ok(/^\d+\.\d+\.\d+$/.test(x.sub), `${x.name} 的小节号格式不对：${x.sub}`);
    assert.ok(x.fields['来源与性味归经'], `${x.name} 缺「来源与性味归经」段`);
    assert.ok(x.fields['功效与主治'], `${x.name} 缺「功效与主治」段`);
  }
  const names = list.map((x) => x.name);
  assert.strictEqual(new Set(names).size, 287, '药名有重复');
});

test('7. 性味归经覆盖与缺项名单', () => {
  const d = drugs();
  assert.strictEqual(d.counts.drugsWithQi, 287);
  assert.strictEqual(d.counts.drugsWithWei, 285);
  assert.strictEqual(d.counts.drugsWithGui, 284);
  assert.deepStrictEqual(d.partialMiss.noWei.slice().sort(), ['雷公藤', '龙骨'].sort());
  assert.deepStrictEqual(d.partialMiss.noGui.slice().sort(), ['丁香', '雷公藤', '龙骨'].sort());
});

test('8. 四气分布复算', () => {
  const t = {};
  for (const x of drugs().drugs) t[x.nature.qi] = (t[x.nature.qi] || 0) + 1;
  assert.deepStrictEqual(t, { 温: 77, 寒: 72, 平: 52, 微寒: 41, 微温: 20, 凉: 12, 热: 8, 大热: 3, 大寒: 2 });
  const wei = {};
  for (const x of drugs().drugs) for (const w of x.nature.wei) wei[w] = (wei[w] || 0) + 1;
  assert.deepStrictEqual(wei, { 苦: 126, 辛: 116, 甘: 115, 咸: 31, 涩: 19, 酸: 19, 微苦: 13, 淡: 6 });
  const gui = {};
  for (const x of drugs().drugs) for (const g of x.nature.guijing) gui[g] = (gui[g] || 0) + 1;
  assert.strictEqual(gui['肝'], 139);
  assert.strictEqual(gui['肺'], 110);
});

test('9. 空值只来自教材没写', () => {
  const d = drugs();
  for (const x of d.drugs) {
    if (x.nature.qi) assert.ok(QI.includes(x.nature.qi), `${x.name} 的四气「${x.nature.qi}」不合法定值`);
    if (!x.nature.wei.length) assert.ok(d.partialMiss.noWei.includes(x.name), `${x.name} 无味但不在缺项名单`);
    if (!x.nature.guijing.length) assert.ok(d.partialMiss.noGui.includes(x.name), `${x.name} 无归经但不在缺项名单`);
  }
  assert.strictEqual(d.counts.drugsUnparsed, 0, '没有「全拆不出」的药');
  assert.strictEqual(d.unparsed.length, 0);
});

test('10. 引用口径', () => {
  const readme = fs.readFileSync(README, 'utf8');
  assert.ok(readme.includes('教材·第N章'), 'README 缺引用格式');
  assert.ok(base().note.includes('教材·'), '底本 note 缺引用格式');
  for (const f of [README, MD]) {
    const t = fs.readFileSync(f, 'utf8');
    assert.ok(!/「?底本·[^」"]{2,}」?/.test(t), `${path.basename(f)} 出现「底本·」式引用`);
  }
});

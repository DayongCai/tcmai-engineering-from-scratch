'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const M = require('./main.js');

const HERE = path.join(__dirname, '..');
const fold = (s) => String(s).replace(/\s/g, '')
  .replace(/[，,。．；;：:、（）()「」『』]/g, '');

/** 教材全段池：本章引文逐字回查用（只取底本，不取任何转述） */
function pool() {
  const out = [];
  for (const c of M.base.chapters) {
    out.push(...(c.paras || []));
    for (const s of c.secs || []) {
      out.push(...(s.paras || []));
      for (const u of s.subs || []) out.push(...(u.paras || []));
    }
  }
  return out.map(fold);
}

test('1. 规模：10 节 / 45 小节 / 135 段 / 7726 字，全部现算', () => {
  const c = M.counts();
  assert.strictEqual(c.chapters, 4);
  assert.strictEqual(c.secs, 10);
  assert.strictEqual(c.subs, 45);
  assert.strictEqual(c.paras, 135);
  assert.strictEqual(c.chars, 7726);
  // 与教材逐章字数对账（不凭总数，逐章也要对上）
  for (const [no, v] of Object.entries(c.byCh)) {
    const ch = M.base.chapters.find((x) => String(x.no) === no);
    assert.strictEqual(v.chars, ch.counts.chars, `教材第${no}章字数`);
    assert.strictEqual(v.subs, ch.counts.subs, `教材第${no}章小节数`);
    assert.strictEqual(v.paras, ch.counts.paras, `教材第${no}章段数`);
  }
});

test('2. 结构：45 味药，药名与教材各小节标题一一对应', () => {
  const list = M.group();
  assert.strictEqual(list.length, 45);
  const titles = [];
  for (const c of M.scope()) for (const s of c.secs) for (const u of s.subs) titles.push(u.title);
  assert.deepStrictEqual(list.map((d) => d.name).sort(), titles.slice().sort());
  // 药名不带编号（教材第 9 章起小节列就是药名，编号由列号拼）
  for (const d of list) assert.ok(!/^\d/.test(d.name), `${d.name} 的 name 里混进了编号`);
});

test('3. 四气：分布合计 45，且与教材标注逐项一致', () => {
  const dist = M.qiDist(M.group());
  assert.deepStrictEqual(Object.fromEntries(dist), {
    寒: 15, 平: 7, 温: 11, 热: 2, 微温: 2, 凉: 2, 微寒: 6,
  });
  let sum = 0;
  for (const n of dist.values()) sum += n;
  assert.strictEqual(sum, 45);
  assert.ok(!dist.has('(空)'), '有药的四气解析为空');
});

test('4. 教材原文核对：引用的句子能在教材原段里逐字找到', () => {
  const P = pool();
  const quotes = [
    '大黄功效泻下攻积、清热泻火、凉血解毒、逐瘀通经、利湿退黄',
    '利水而不伤正，为利水渗湿之要药',
    '治下半身风湿痹痛要药',
  ];
  for (const q of quotes) {
    assert.ok(P.some((p) => p.includes(fold(q))), `教材里找不到：${q}`);
  }
  // 反向校验：故意改一个字必须查不到，防止 fold 过宽导致「假命中」
  assert.ok(!P.some((p) => p.includes(fold('大黄功效泻下攻积、清热泻火、凉血解毒、逐瘀通络'))));
});

test('5. 本仓库口径：287 味药、四气 287、归经缺 3 味，且小节号由列号拼成', () => {
  const root = path.join(__dirname, '..', '..', '..', '..', '..', '..');
  const meta = JSON.parse(fs.readFileSync(path.join(root, 'standards', 'zhongyao', 'drugs.json'), 'utf8'));
  assert.strictEqual(meta.counts.drugs, 287);
  assert.strictEqual(meta.counts.drugsWithQi, 287);
  assert.strictEqual(meta.counts.drugsWithGui, 284);
  // 「拆不出就留空」：这三味不补齐、不推断
  const missingGui = meta.drugs.filter((d) => !d.nature.guijing.length).map((d) => d.name).sort();
  assert.deepStrictEqual(missingGui, ['丁香', '龙骨', '雷公藤'].sort());
  const lt = meta.drugs.find((d) => d.name === '雷公藤');
  assert.deepStrictEqual(lt.nature.wei, [], '雷公藤无味，应留空而不是补「苦」');
  // 小节号 = 章.节.小节，不是从正文抠的
  for (const d of M.group()) {
    assert.match(String(d.sub), new RegExp(`^${d.chapter}\\.\\d+\\.\\d+$`), `${d.name} 的小节号不合口径`);
  }
});

test('6. 峻猛度：巴豆霜剂量上限最小，且排序不含未解析项', () => {
  const list = M.group().map((d) => ({ name: d.name, cap: M.doseCap(d) })).filter((x) => x.cap != null);
  assert.strictEqual(list.length, 45, '有药的剂量上限解析失败');
  const sorted = list.sort((a, b) => a.cap - b.cap);
  assert.strictEqual(sorted[0].name, '巴豆霜');
  assert.strictEqual(sorted[0].cap, 0.3);
  assert.ok(M.doseCap(M.group().find((d) => d.name === '金钱草')) >= 30);
  assert.strictEqual(M.doseCap({ fields: { '用法用量与使用注意': '未知用法' } }), null);
});

test('7. 教学边界：运行时最后一行是边界声明', () => {
  const out = execFileSync('node', ['code/main.js'], { cwd: HERE, encoding: 'utf8' });
  const last = out.trim().split('\n').filter(Boolean).pop();
  assert.ok(/教学边界/.test(last), `最后一行缺「教学边界」：${last}`);
  assert.ok(/不构成用药依据/.test(last), `最后一行缺边界句：${last}`);
});

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

test('1. 规模：2 节 / 19 小节 / 57 段 / 3384 字，逐章与教材对账', () => {
  const c = M.counts();
  assert.strictEqual(c.chapters, 2);
  assert.strictEqual(c.secs, 2);
  assert.strictEqual(c.subs, 19);
  assert.strictEqual(c.paras, 57);
  assert.strictEqual(c.chars, 3384);
  for (const [no, v] of Object.entries(c.byCh)) {
    const ch = M.base.chapters.find((x) => String(x.no) === no);
    assert.strictEqual(v.chars, ch.counts.chars, `教材第${no}章字数`);
    assert.strictEqual(v.subs, ch.counts.subs, `教材第${no}章小节数`);
    assert.strictEqual(v.paras, ch.counts.paras, `教材第${no}章段数`);
  }
});

test('2. 结构：19 味药，药名与教材小节标题一一对应（温里 8 + 理气 11）', () => {
  const list = M.group();
  assert.strictEqual(list.length, 19);
  assert.strictEqual(M.group(['15']).length, 8);
  assert.strictEqual(M.group(['16']).length, 11);
  const titles = [];
  for (const c of M.scope()) for (const s of c.secs) for (const u of s.subs) titles.push(u.title);
  assert.deepStrictEqual(list.map((d) => d.name).sort(), titles.slice().sort());
  assert.ok(list.some((d) => d.name === '附子') && list.some((d) => d.name === '柿蒂'));
});

test('3. 四气：分布合计 19，温里 8 味全部不低于「温」', () => {
  const dist = M.qiDist(M.group());
  assert.deepStrictEqual(Object.fromEntries(dist), {
    大热: 2, 热: 3, 温: 9, 微寒: 1, 微温: 1, 寒: 1, 平: 2,
  });
  let sum = 0;
  for (const n of dist.values()) sum += n;
  assert.strictEqual(sum, 19);
  for (const d of M.group(['15'])) {
    assert.ok(M.QI_SCORE[d.nature.qi] >= M.QI_SCORE['温'], `${d.name} 的气低于温：${d.nature.qi}`);
  }
  // 理气组必须真的跨到寒侧，否则「两条轴」的说法就没有证据
  assert.ok(M.group(['16']).some((d) => M.QI_SCORE[d.nature.qi] < 0));
});

test('4. 教材原文核对：引文逐字可查，改一字即失败', () => {
  const P = pool();
  const quotes = [
    '气病之总司，女科之主帅',
    '治痰先治气，气顺痰自消',
    '回阳救逆第一要药',
    '温中散寒要药',
  ];
  for (const q of quotes) assert.ok(P.some((p) => p.includes(fold(q))), `教材里找不到：${q}`);
  assert.ok(!P.some((p) => p.includes(fold('气病之总司，女科之总帅'))), 'fold 过宽，改字也命中');
});

test('5. 本仓库口径：丁香的归经原文残缺，按「拆不出就留空」处理', () => {
  const ding = M.group().find((d) => d.name === '丁香');
  assert.deepStrictEqual(ding.nature.guijing, [], '丁香归经应留空，不得补');
  assert.deepStrictEqual(ding.nature.wei, ['辛'], '丁香的味是可解析的，不应留空');
  const miss = M.group().filter((d) => !d.nature.guijing.length).map((d) => d.name);
  assert.deepStrictEqual(miss, ['丁香']);
  // 大热在常规四气词表里常常漏掉，本仓库词表包含它
  assert.ok(M.QI_ORDER.includes('大热'));
  assert.strictEqual(M.QI_SCORE['大热'], 4);
  for (const d of M.group()) {
    assert.match(String(d.sub), new RegExp(`^${d.chapter}\\.\\d+\\.\\d+$`), `${d.name} 小节号不合口径`);
  }
});

test('6. 两条轴：温里纵>横，理气横>纵；热性均分温里远高于理气', () => {
  const pc = M.perChapter();
  assert.ok(pc['15'].v > pc['15'].h, `温里 纵 ${pc['15'].v} 应大于 横 ${pc['15'].h}`);
  assert.ok(pc['16'].h > pc['16'].v, `理气 横 ${pc['16'].h} 应大于 纵 ${pc['16'].v}`);
  assert.ok(pc['15'].qi > pc['16'].qi);
  assert.ok(pc['15'].qi >= 2.5, `温里热性均分应 ≥2.5，实为 ${pc['15'].qi}`);
  assert.strictEqual(pc['15'].toxic, 3); // 附子、吴茱萸、花椒
  assert.strictEqual(pc['16'].toxic, 1); // 川楝子
});

test('7. 教学边界：运行时最后一行是边界声明', () => {
  const out = execFileSync('node', ['code/main.js'], { cwd: HERE, encoding: 'utf8' });
  const last = out.trim().split('\n').filter(Boolean).pop();
  assert.ok(/教学边界/.test(last), `最后一行缺「教学边界」：${last}`);
  assert.ok(/不构成用药依据/.test(last), `最后一行缺边界句：${last}`);
});

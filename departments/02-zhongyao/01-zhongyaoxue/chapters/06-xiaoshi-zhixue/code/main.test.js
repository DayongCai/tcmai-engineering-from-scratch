'use strict';
const test = require('node:test');
const assert = require('node:assert');
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

test('1. 规模：6 节 / 24 小节 / 72 段 / 4017 字，逐章与教材对账', () => {
  const c = M.counts();
  assert.strictEqual(c.chapters, 3);
  assert.strictEqual(c.secs, 6);
  assert.strictEqual(c.subs, 24);
  assert.strictEqual(c.paras, 72);
  assert.strictEqual(c.chars, 4017);
  for (const [no, v] of Object.entries(c.byCh)) {
    const ch = M.base.chapters.find((x) => String(x.no) === no);
    assert.strictEqual(v.chars, ch.counts.chars, `教材第${no}章字数`);
    assert.strictEqual(v.subs, ch.counts.subs, `教材第${no}章小节数`);
    assert.strictEqual(v.paras, ch.counts.paras, `教材第${no}章段数`);
  }
});

test('2. 结构：24 味药（消食 5 / 驱虫 4 / 止血 15），药名与小节标题一致', () => {
  const list = M.group();
  assert.strictEqual(list.length, 24);
  assert.strictEqual(M.group(['17']).length, 5);
  assert.strictEqual(M.group(['18']).length, 4);
  assert.strictEqual(M.group(['19']).length, 15);
  const titles = [];
  for (const c of M.scope()) for (const s of c.secs) for (const u of s.subs) titles.push(u.title);
  assert.deepStrictEqual(list.map((d) => d.name).sort(), titles.slice().sort());
  assert.ok(list.some((d) => d.name === '灶心土') && list.some((d) => d.name === '三七'));
});

test('3. 四气：分布合计 24，与教材标注一致', () => {
  const dist = M.qiDist(M.group());
  assert.deepStrictEqual(Object.fromEntries(dist), {
    微温: 1, 温: 7, 平: 7, 寒: 4, 凉: 2, 微寒: 3,
  });
  let sum = 0;
  for (const n of dist.values()) sum += n;
  assert.strictEqual(sum, 24);
  assert.ok(!dist.has('(空)'));
});

test('4. 教材原文核对：引文逐字可查，改一字即失败', () => {
  const P = pool();
  const quotes = [
    '止血不留瘀，化瘀不伤正',
    '消肉食积滞要药',
    '温经止血要药',
    '驱蛔要药',
  ];
  for (const q of quotes) assert.ok(P.some((p) => p.includes(fold(q))), `教材里找不到：${q}`);
  assert.ok(!P.some((p) => p.includes(fold('止血不留瘀，化瘀不伤气'))), 'fold 过宽，改字也命中');
});

test('5. 本仓库口径：炮制词必须连「来源与性味归经」段一起检索', () => {
  // 地榆的「炒炭止血」只写在来源段，只查功效/用法段会漏
  const diyu = M.group().find((d) => d.name === '地榆');
  assert.ok(diyu.fields['来源与性味归经'].includes('炒炭止血'));
  assert.ok(M.hasProc(diyu, '炭'), '地榆应命中「炭」');
  assert.ok(!M.dualUse(diyu), '地榆只写炒炭、没写生用，不该算双用法');
  const tan = M.group().filter((d) => M.hasProc(d, '炭')).map((d) => d.name);
  assert.strictEqual(tan.length, 9);
  const dual = M.group().filter(M.dualUse).map((d) => d.name);
  assert.deepStrictEqual(dual.sort(),
    ['山楂', '麦芽', '莱菔子', '鸡内金', '侧柏叶', '茜草', '蒲黄', '艾叶'].sort());
  // 消食药全是甘味、无一味含苦 —— 这是「靠甘平不靠苦泄」的数据依据
  assert.strictEqual(M.group(['17']).filter((d) => d.nature.wei.some((w) => w.includes('苦'))).length, 0);
  for (const d of M.group()) {
    assert.match(String(d.sub), new RegExp(`^${d.chapter}\\.\\d+\\.\\d+$`), `${d.name} 小节号不合口径`);
  }
});

test('6. 剂量窗口：三七 1.5g 与南瓜子 120g 相差 80 倍', () => {
  const caps = M.group().map((d) => ({ name: d.name, cap: M.doseCap(d) })).filter((x) => x.cap != null);
  assert.strictEqual(caps.length, 24, '有药的剂量上限解析失败');
  const s = caps.sort((a, b) => a.cap - b.cap);
  assert.strictEqual(s[0].name, '三七');
  assert.strictEqual(s[0].cap, 1.5);
  assert.strictEqual(s[s.length - 1].cap, 120);
  assert.strictEqual(s[s.length - 1].cap / s[0].cap, 80);
  assert.strictEqual(M.doseCap({ fields: { '用法用量与使用注意': '适量外用' } }), null);
});

test('7. 教学边界：运行时最后一行是边界声明', () => {
  const out = execFileSync('node', ['code/main.js'], { cwd: HERE, encoding: 'utf8' });
  const last = out.trim().split('\n').filter(Boolean).pop();
  assert.ok(/教学边界/.test(last), `最后一行缺「教学边界」：${last}`);
  assert.ok(/不构成用药依据/.test(last), `最后一行缺边界句：${last}`);
});

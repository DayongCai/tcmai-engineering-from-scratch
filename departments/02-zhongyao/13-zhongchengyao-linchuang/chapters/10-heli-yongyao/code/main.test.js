'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MAIN = path.join(__dirname, 'main.js');
const ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const MAP = path.join(ROOT, 'standards', 'zhongchengyao-linchuang', 'chapter-map.json');
const UNITS = path.join(ROOT, 'standards', 'zhongchengyao-linchuang', 'units.json');
const { chapterKeys, chapterUnits, summarize, topicTerms, docStats, CHAPTER, SLUG } = require('./main.js');

test('本章映射存在且非空', () => {
  // 保留原断言：chapter-map 里本章必须有单元号
  const keys = chapterKeys();
  assert.ok(keys.length > 0, 'chapter-map 里本章没有单元');
});

test('单元记录都能在单元层找到', () => {
  const units = chapterUnits();
  assert.strictEqual(units.length, chapterKeys().length);
  for (const u of units) assert.ok(u.sub && u.hanzi > 0, '单元缺少编号或汉字量');
});

test('规模与单元层求和一致', () => {
  const units = chapterUnits();
  const s = summarize(units);
  assert.strictEqual(s.hanzi, units.reduce((a, b) => a + b.hanzi, 0));
  assert.ok(s.hanzi > 500, `汉字过少：${s.hanzi}`);
});

test('两类分布的键取自单元层顶层，不写死', () => {
  const all = JSON.parse(fs.readFileSync(UNITS, 'utf8'));
  const s = summarize(chapterUnits());
  assert.deepStrictEqual(Object.keys(s.views).sort(), Object.keys(all.views).sort());
  assert.deepStrictEqual(Object.keys(s.levels).sort(), Object.keys(all.levels).sort());
});

test('主导主题簇与主导篇层是可复算的极值', () => {
  const s = summarize(chapterUnits());
  for (const [k, v] of Object.entries(s.views)) assert.ok(v <= s.viewTop[1], `${k} 超过主导主题簇`);
  for (const [k, v] of Object.entries(s.levels)) assert.ok(v <= s.levelTop[1], `${k} 超过主导篇层`);
  assert.ok(Object.values(s.views).reduce((a, b) => a + b, 0) > 0, '主题簇全为 0');
});

test('术语命中按次数降序且落在底本关键词内', () => {
  const all = JSON.parse(fs.readFileSync(UNITS, 'utf8'));
  const known = new Set(Object.values(all.views).flat());
  const terms = topicTerms(chapterUnits());
  assert.ok(terms.length > 0, '没有任何术语命中');
  for (const t of terms) assert.ok(known.has(t.term), `${t.term} 不是底本关键词`);
  for (let i = 1; i < terms.length; i += 1) assert.ok(terms[i - 1].n >= terms[i].n, '未按命中次数降序');
});

test('正文统计与 docs/zh.md 自洽', () => {
  const d = docStats();
  assert.ok(d.sections >= 5, `小节过少：${d.sections}`);
  assert.ok(d.paras >= 15, `正文段过少：${d.paras}`);
  assert.ok(d.hanzi > 1200, `正文汉字过少：${d.hanzi}`);
  assert.ok(d.boundary >= 3, `边界条目过少：${d.boundary}`);
});

test('脚本可运行且输出含章名与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.length > 200, '输出过短');
  assert.ok(out.includes('第 10 章 合理用药的最后一公里，是一张能被打勾的核对表'), '输出缺章名');
  assert.match(out, /教学样例：数字由 standards\/zhongchengyao-linchuang\/units\.json 与本章 docs\/zh\.md 现算/);
  assert.match(out, /不构成临床判断依据/);
});

test('章节号与章映射一致，头部注释指向本章', () => {
  const cm = JSON.parse(fs.readFileSync(MAP, 'utf8')).chapters;
  assert.strictEqual(String(cm[SLUG].n), String(CHAPTER));
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('/chapters/10-heli-yongyao/docs/zh.md'), '头部注释未指向本章');
});

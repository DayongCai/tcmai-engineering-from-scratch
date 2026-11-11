'use strict';
/**
 * 第 8 章 单测（教材·第15章 理气剂 + 教材·第16章 理血剂）
 * 期望值钉死在断言里；main.js 里的统计全部现算。
 */
const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const {
  base, CHS, han, fold, nodeOf, chapterOf, parasOf,
  roster, scale, structure, herbs, tracing, roles, roleAudit, cite, anchor, verify,
} = require('./main.js');

const DOCS = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

test('规模：两章 34,084 字 = 14,870 + 19,214，占全书 9.50%', () => {
  const s = scale();
  assert.deepStrictEqual(CHS, ['15', '16']);
  assert.strictEqual(chapterOf('15').counts.hanzi, 14870);
  assert.strictEqual(chapterOf('16').counts.hanzi, 19214);
  assert.strictEqual(s.hanzi, 34084);
  assert.ok(Math.abs(s.share - 34084 / 358800) < 1e-12);
  assert.ok(s.share > 0.094 && s.share < 0.096);
  assert.strictEqual(s.secs, 4);
  assert.strictEqual(s.subs, 16);
  assert.strictEqual(s.paras, 96);
  assert.strictEqual(s.formulas, 16);
  assert.strictEqual(s.perFormula, 2130);
  assert.strictEqual(s.gap, 4344);
});

test('结构：四节字数 8,513/6,357/12,483/6,731，十六方全六段', () => {
  const st = structure();
  assert.strictEqual(st.rows.length, 4);
  assert.strictEqual(st.sixParts, true);
  assert.deepStrictEqual(st.partsPerFormula, Array(16).fill(6));
  assert.deepStrictEqual(st.rows.map((r) => r.chars), [8513, 6357, 12483, 6731]);
  assert.deepStrictEqual(st.rows.map((r) => r.paras), [24, 18, 36, 18]);
  assert.deepStrictEqual(st.rows.map((r) => r.formulas), [4, 3, 6, 3]);
  assert.strictEqual(st.rows.reduce((n, r) => n + r.chars, 0), 34084);
  for (const r of st.rows) assert.strictEqual(r.paras, r.formulas * 6);
});

test('十六首方：理气 7 + 理血 9，locator 落到 N.M.K', () => {
  const rs = roster();
  assert.strictEqual(rs.length, 16);
  assert.deepStrictEqual(rs.map((r) => r.name).slice(0, 3), ['越鞠丸', '半夏厚朴汤', '枳实薤白桂枝汤']);
  assert.ok(rs.map((r) => r.name).includes('血府逐瘀汤'));
  assert.ok(rs.map((r) => r.name).includes('黄土汤'));
  assert.strictEqual(rs.filter((r) => r.chapter === '15').length, 7);
  assert.strictEqual(rs.filter((r) => r.chapter === '16').length, 9);
  for (const r of rs) {
    assert.strictEqual(r.locator, cite(r.sub));
    assert.ok(/^教材·第1[56]章·1[56]\.\d\.\d$/.test(r.locator), r.locator);
    assert.ok(nodeOf(r.sub), `${r.name} 的 ${r.sub} 在教材里找不到`);
  }
});

test('药：122 药位 / 72 味 / 方均 7.6，甘草 9 方居首', () => {
  const h = herbs();
  assert.strictEqual(h.slots, 122);
  assert.strictEqual(h.unique, 72);
  assert.strictEqual(h.avg, 7.6);
  assert.deepStrictEqual(h.top.slice(0, 3), [['甘草', 9], ['当归', 6], ['半夏', 5]]);
  assert.strictEqual(h.staples.length, 10);
  assert.strictEqual(h.cross.length, 10);
  assert.ok(h.cross.includes('川芎') && h.cross.includes('当归') && h.cross.includes('甘草'));
  assert.deepStrictEqual(h.perChapter, [{ no: '15', slots: 50 }, { no: '16', slots: 72 }]);
});

test('抽取：118/122 可逐字回查（96.7%），四处失配', () => {
  const t = tracing();
  assert.strictEqual(t.slots, 122);
  assert.strictEqual(t.traced, 118);
  assert.ok(Math.abs(t.rate - 118 / 122) < 1e-12);
  assert.deepStrictEqual(t.stray.map((x) => x.name), ['越鞠丸', '天台乌药散', '十灰散', '黄土汤']);
  const by = Object.fromEntries(t.stray.map((x) => [x.name, x.items]));
  assert.deepStrictEqual(by['越鞠丸'], ['即现行教材所载']);
  assert.deepStrictEqual(by['天台乌药散'], ['巴豆七十粒']);
  assert.deepStrictEqual(by['十灰散'], ['茜根']);
  assert.deepStrictEqual(by['黄土汤'], ['生地黄']);
});

test('君臣佐使：有君 16/16、四角色齐仅温经汤、无重复判定', () => {
  const r = roles();
  assert.strictEqual(r.total, 16);
  assert.strictEqual(r.withJun, 16);
  assert.strictEqual(r.full, 1);
  assert.deepStrictEqual(r.fullNames, ['温经汤']);
  assert.strictEqual(r.three, 9);
  assert.deepStrictEqual(r.missingJun, []);
  assert.deepStrictEqual(roleAudit().dup, []);
});

test('七条引文逐字落在所标小节，错标即失败', () => {
  const Q = [
    ['15.1.1', '气、血、湿、火、食、痰六者可单独为病'],
    ['15.1.2', '咽中如有炙脔'],
    ['15.2.3', '心下痞硬，噫气不除者，旋覆代赭汤主之'],
    ['16.1.2', '治胸中血瘀之代表方'],
    ['16.1.3', '中风之气虚血瘀证'],
    ['16.2.3', '脾阳不足、脾不统血证'],
    ['16.2.3', '大便下血，先便后血'],
  ];
  for (const [no, q] of Q) {
    assert.strictEqual(verify(q, no), true, `${no} 找不到「${q}」`);
  }
  assert.strictEqual(verify('中风之气虚血瘀证', '16.2.3'), false);
  assert.strictEqual(verify('咽中如有炙脔', '15.2.3'), false);
  assert.ok(anchor('16.2.3', '先便后血').sentence.includes('先便后血'));
  assert.ok(fold(anchor('15.2.3', '旋覆代赭汤主之').sentence).includes(fold('心下痞硬，噫气不除者，旋覆代赭汤主之')));
});

test('docs：七段俱全、出现 34,084、引文可回查', () => {
  const doc = fs.readFileSync(DOCS, 'utf8');
  for (const head of ['MOTTO', 'PROBLEM', '双根因定位', '代价与边界', '运行与验证', '免责']) {
    assert.ok(doc.includes(head), `docs 缺 ${head}`);
  }
  assert.ok(doc.replace(/,/g, '').includes('34084'));
  assert.ok(!doc.includes('底本'));
  assert.ok(!doc.includes('原文'));
  assert.ok(han(doc) >= 2500, `docs 汉字 ${han(doc)} < 2500`);

  let checked = 0;
  for (const line of doc.split('\n')) {
    if (!/教材·第\d+章/.test(line)) continue;
    for (const m of line.matchAll(/「([^」]{6,})」/g)) {
      checked += 1;
      const node = (line.match(/教材·第\d+章·([\d.]+)/) || [])[1];
      assert.ok(node, `引文「${m[1]}」所在行没有小节号`);
      assert.strictEqual(verify(m[1], node), true, `「${m[1]}」在 ${node} 找不到`);
    }
  }
  assert.ok(checked >= 2, `标了出处的引文只有 ${checked} 条`);
});

test('quiz 契约：6 题 pre/check×3/post×2，选项 4 个、correct 0–3', () => {
  const qs = JSON.parse(fs.readFileSync(QUIZ, 'utf8')).questions;
  assert.strictEqual(qs.length, 6);
  assert.deepStrictEqual(qs.map((x) => x.stage), ['pre', 'check', 'check', 'check', 'post', 'post']);
  for (const x of qs) {
    assert.strictEqual(x.options.length, 4);
    assert.strictEqual(new Set(x.options).size, 4);
    assert.ok(Number.isInteger(x.correct) && x.correct >= 0 && x.correct <= 3);
    assert.ok((x.explanation || '').length >= 10);
  }
  assert.ok(new Set(qs.map((x) => x.correct)).size >= 3);
});

test('运行时最后一行是教学边界声明', () => {
  const out = execFileSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8' });
  const last = out.trim().split(/\r?\n/).filter(Boolean).pop();
  assert.ok(last.startsWith('教学边界：'), last);
  assert.ok(last.endsWith('不构成诊断/用药依据'), last);
  assert.ok(/教材·第15章/.test(out) && /教材·第16章/.test(out));
  assert.strictEqual(parasOf(chapterOf('16').secs[0]).length, 36);
  assert.strictEqual(base.counts.chapters, 24);
});

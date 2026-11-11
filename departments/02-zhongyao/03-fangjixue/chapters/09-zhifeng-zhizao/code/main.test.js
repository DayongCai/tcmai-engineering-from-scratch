'use strict';
/**
 * 第 9 章 单测（教材·第17章 治风剂 + 教材·第18章 治燥剂）
 * 期望值钉死在断言里；main.js 里的统计全部现算。
 */
const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const {
  base, CHS, han, fold, nodeOf, chapterOf, parasOf,
  roster, scale, structure, herbs, tracing, roles, declared, gap, cn2n, cite, anchor, verify,
} = require('./main.js');

const DOCS = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

test('规模：两章 27,766 字 = 14,861 + 12,905，占全书 7.74%', () => {
  const s = scale();
  assert.deepStrictEqual(CHS, ['17', '18']);
  assert.strictEqual(chapterOf('17').counts.hanzi, 14861);
  assert.strictEqual(chapterOf('18').counts.hanzi, 12905);
  assert.strictEqual(s.hanzi, 27766);
  assert.ok(Math.abs(s.share - 27766 / 358800) < 1e-12);
  assert.ok(s.share > 0.077 && s.share < 0.078);
  assert.strictEqual(s.secs, 4);
  assert.strictEqual(s.subs, 11);
  assert.strictEqual(s.paras, 66);
  assert.strictEqual(s.formulas, 11);
  assert.strictEqual(s.perFormula, 2524);
  assert.strictEqual(s.gap, 1956);
});

test('结构：四节字数 7,450/7,411/7,686/5,219，十一方全六段', () => {
  const st = structure();
  assert.strictEqual(st.rows.length, 4);
  assert.strictEqual(st.sixParts, true);
  assert.deepStrictEqual(st.partsPerFormula, Array(11).fill(6));
  assert.deepStrictEqual(st.rows.map((r) => r.chars), [7450, 7411, 7686, 5219]);
  assert.deepStrictEqual(st.rows.map((r) => r.paras), [18, 18, 18, 12]);
  assert.deepStrictEqual(st.rows.map((r) => r.formulas), [3, 3, 3, 2]);
  assert.strictEqual(st.rows.reduce((n, r) => n + r.chars, 0), 27766);
  // 17.1 与 17.2 对称：外风与内风各 3 方 18 段
  assert.deepStrictEqual([st.rows[0].formulas, st.rows[0].paras], [st.rows[1].formulas, st.rows[1].paras]);
});

test('十一首方：治风 6 + 治燥 5，locator 落到 N.M.K', () => {
  const rs = roster();
  assert.strictEqual(rs.length, 11);
  assert.deepStrictEqual(rs.map((r) => r.name), [
    '川芎茶调散', '消风散', '牵正散', '羚角钩藤汤', '镇肝息风汤', '天麻钩藤饮',
    '杏苏散', '桑杏汤', '清燥救肺汤', '麦门冬汤', '养阴清肺汤',
  ]);
  assert.strictEqual(rs.filter((r) => r.chapter === '17').length, 6);
  assert.strictEqual(rs.filter((r) => r.chapter === '18').length, 5);
  for (const r of rs) {
    assert.strictEqual(r.locator, cite(r.sub));
    assert.ok(/^教材·第1[78]章·1[78]\.\d\.\d$/.test(r.locator), r.locator);
    assert.ok(nodeOf(r.sub), `${r.name} 的 ${r.sub} 在教材里找不到`);
  }
});

test('药：99 药位 / 75 味 / 方均 9.0，甘草 8 方居首', () => {
  const h = herbs();
  assert.strictEqual(h.slots, 99);
  assert.strictEqual(h.unique, 75);
  assert.strictEqual(h.avg, 9);
  assert.deepStrictEqual(h.top.slice(0, 3), [['甘草', 8], ['麦冬', 3], ['桑叶', 3]]);
  assert.strictEqual(h.cross.length, 6);
  assert.deepStrictEqual([...h.cross].sort(), ['薄荷', '甘草', '石膏', '桑叶', '白芍', '玄参'].sort());
  assert.deepStrictEqual(h.perChapter, [{ no: '17', slots: 58 }, { no: '18', slots: 41 }]);
  assert.deepStrictEqual([h.biggest.name, h.biggest.slots], ['消风散', 13]);
  assert.deepStrictEqual([h.smallest.name, h.smallest.slots], ['牵正散', 4]);
});

test('抽取：92/99 可回查（92.9%），六处失配，消风散 13/13', () => {
  const t = tracing();
  assert.strictEqual(t.slots, 99);
  assert.strictEqual(t.traced, 92);
  assert.ok(Math.abs(t.rate - 92 / 99) < 1e-12);
  assert.ok(t.rate > 0.929 && t.rate < 0.930);
  assert.strictEqual(t.stray.length, 6);
  assert.deepStrictEqual(t.stray.map((x) => x.name), [
    '牵正散', '羚角钩藤汤', '天麻钩藤饮', '杏苏散', '桑杏汤', '养阴清肺汤',
  ]);
  assert.deepStrictEqual(t.worstThree.map((x) => x.name), ['牵正散', '羚角钩藤汤', '桑杏汤']);
  assert.deepStrictEqual([t.worst.name, t.worst.traced.length, t.worst.slots], ['牵正散', 3, 4]);
  // 同名方误取已修：消风散 13 味与自报数一致，且 13 味全部可回查
  const xf = t.rs.find((r) => r.name === '消风散');
  assert.deepStrictEqual([xf.slots, xf.traced.length], [13, 13]);
  assert.ok(!t.stray.some((x) => x.name === '消风散'));
});

test('教材自报味数：六首治风方都自报，五首与组成字段相符', () => {
  const d = declared();
  assert.strictEqual(d.length, 6);
  assert.deepStrictEqual(d.map((x) => x.name), ['川芎茶调散', '消风散', '牵正散', '羚角钩藤汤', '镇肝息风汤', '天麻钩藤饮']);
  assert.deepStrictEqual(d.map((x) => x.declared), [8, 13, 3, 10, 12, 11]);
  assert.deepStrictEqual(d.map((x) => x.diff), [0, 0, 1, 0, 0, 0]);
  assert.strictEqual(d.filter((x) => x.diff === 0).length, 5);
  // 唯一失配是牵正散多一条「并生用」用法串，白附子已收回
  assert.deepStrictEqual(d.filter((x) => x.diff !== 0).map((x) => x.name), ['牵正散']);
  assert.strictEqual(d.find((x) => x.name === '消风散').traced, 13);
  // 治燥五方没有「凡N味」声明
  assert.ok(!d.some((x) => ['杏苏散', '桑杏汤', '清燥救肺汤', '麦门冬汤', '养阴清肺汤'].includes(x.name)));
  assert.strictEqual(cn2n('十三'), 13);
  assert.strictEqual(cn2n('十'), 10);
  assert.strictEqual(cn2n('二十一'), 21);
});

test('漏药审计：十首方有漏，多为异名残片与词表噪声', () => {
  const g = gap();
  const by = Object.fromEntries(g.map((x) => [x.name, x.missing]));
  assert.strictEqual(g.length, 10);
  // 天麻钩藤饮 11 味全部回查，不再有漏
  assert.ok(!by['天麻钩藤饮']);
  assert.deepStrictEqual(by['羚角钩藤汤'], ['三味', '生地', '贝母']);
  assert.deepStrictEqual(by['镇肝息风汤'], ['白芍', '三味']);
  assert.deepStrictEqual(by['养阴清肺汤'], ['地黄', '生地黄', '生地']);
  assert.deepStrictEqual(by['清燥救肺汤'], ['竹叶', '粳米', '瓜蒌', '胡麻', '贝母']);
  // 「三味」是词表里混入的切分噪声（源出牡蛎散组成），十首里有六首被它命中
  assert.strictEqual(g.filter((x) => x.missing.includes('三味')).length, 6);
});

test('君臣佐使：有君 8/11（治风 5/6、治燥 3/5），四角色齐 2 首', () => {
  const r = roles();
  assert.strictEqual(r.total, 11);
  assert.strictEqual(r.withJun, 8);
  assert.strictEqual(r.full, 2);
  assert.deepStrictEqual(r.fullNames, ['镇肝息风汤', '杏苏散']);
  assert.strictEqual(r.three, 8);
  assert.deepStrictEqual(r.byChapter, [{ no: '17', withJun: 5, total: 6 }, { no: '18', withJun: 3, total: 5 }]);
  assert.deepStrictEqual(r.missingJun, ['川芎茶调散', '麦门冬汤', '养阴清肺汤']);
});

test('七条引文逐字落在所标小节，错标即失败', () => {
  const Q = [
    ['17.1.1', '为治外感风邪头痛之常用方'],
    ['17.1.1', '偏正头痛或巅顶作痛，目眩鼻塞'],
    ['17.2.2', '肝肾阴虚、肝阳偏亢'],
    ['18.1.1', '为治外感凉燥之代表方'],
    ['18.1.1', '轻宣凉燥，理肺化痰'],
    ['18.1.2', '清宣温燥，润肺止咳'],
    ['18.2.1', '滋养肺胃以培土生金'],
  ];
  for (const [no, q] of Q) {
    assert.strictEqual(verify(q, no), true, `${no} 找不到「${q}」`);
    assert.ok(anchor(no, q.slice(0, 6)).sentence.includes(q.slice(0, 6)));
  }
  assert.strictEqual(verify('轻宣凉燥，理肺化痰', '18.1.2'), false);
  assert.strictEqual(verify('为治外感凉燥之代表方', '18.2.1'), false);
  assert.strictEqual(verify('滋养肺胃以培土生金', '17.1.1'), false);
  assert.ok(fold(anchor('18.2.1', '培土生金').sentence).includes(fold('滋养肺胃以培土生金')));
});

test('docs：七段俱全、出现 27,766、引文可回查', () => {
  const doc = fs.readFileSync(DOCS, 'utf8');
  for (const head of ['MOTTO', 'PROBLEM', '双根因定位', '代价与边界', '运行与验证', '免责']) {
    assert.ok(doc.includes(head), `docs 缺 ${head}`);
  }
  assert.ok(doc.replace(/,/g, '').includes('27766'));
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
  assert.ok(/教材·第17章/.test(out) && /教材·第18章/.test(out));
  assert.strictEqual(parasOf(chapterOf('18').secs[1]).length, 12);
  assert.strictEqual(base.counts.paras, 750);
});

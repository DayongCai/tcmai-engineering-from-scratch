'use strict';
/**
 * 第 7 章 单测（教材·第13章 固涩剂 + 教材·第14章 安神剂与开窍剂）
 * 期望值钉死在断言里；main.js 里的统计全部现算。
 */
const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const {
  base, form, CHS, han, fold, nodeOf, chapterOf, parasOf,
  roster, scale, structure, herbs, tracing, roles, roleAudit, cite, anchor, verify,
} = require('./main.js');

const DOCS = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

test('规模：两章 27,100 字 = 12,028 + 15,072，占全书 7.55%', () => {
  const s = scale();
  assert.deepStrictEqual(CHS, ['13', '14']);
  assert.strictEqual(chapterOf('13').counts.hanzi, 12028);
  assert.strictEqual(chapterOf('14').counts.hanzi, 15072);
  assert.strictEqual(s.hanzi, 27100);
  assert.strictEqual(base.counts.hanzi, 358800);
  assert.ok(Math.abs(s.share - 27100 / 358800) < 1e-12);
  assert.ok(s.share > 0.075 && s.share < 0.076);
  assert.strictEqual(s.secs, 7);
  assert.strictEqual(s.subs, 9);
  assert.strictEqual(s.paras, 54);
  assert.strictEqual(s.formulas, 9);
  assert.strictEqual(s.perFormula, 3011);
});

test('结构：六段/方 恒定，七节字数 2,688/6,250/3,090/2,981/5,991/3,070/3,030', () => {
  const st = structure();
  assert.strictEqual(st.rows.length, 7);
  assert.strictEqual(st.sixParts, true);
  assert.deepStrictEqual(st.partsPerFormula, [6, 6, 6, 6, 6, 6, 6, 6, 6]);
  assert.deepStrictEqual(st.rows.map((r) => r.chars), [2688, 6250, 3090, 2981, 5991, 3070, 3030]);
  assert.deepStrictEqual(st.rows.map((r) => r.paras), [6, 12, 6, 6, 12, 6, 6]);
  assert.strictEqual(st.rows.reduce((n, r) => n + r.chars, 0), 27100);
  // 段数与方数严格六倍
  for (const r of st.rows) assert.strictEqual(r.paras, r.formulas * 6);
});

test('九首方与出处：13 章 4 首 + 14 章 5 首，locator 落到 N.M.K', () => {
  const rs = roster();
  assert.strictEqual(rs.length, 9);
  assert.deepStrictEqual(rs.map((r) => r.name), [
    '牡蛎散', '四神丸', '真人养脏汤', '金锁固精丸',
    '朱砂安神丸', '天王补心丹', '酸枣仁汤', '安宫牛黄丸', '苏合香丸',
  ]);
  assert.strictEqual(rs.filter((r) => r.chapter === '13').length, 4);
  assert.strictEqual(rs.filter((r) => r.chapter === '14').length, 5);
  for (const r of rs) {
    assert.strictEqual(r.locator, cite(r.sub));
    assert.ok(/^教材·第1[34]章·1[34]\.\d\.\d$/.test(r.locator), r.locator);
    assert.ok(nodeOf(r.sub), `${r.name} 的 ${r.sub} 在教材里找不到`);
  }
});

test('组成：75 药位 / 57 味 / 方均 8.3，两章共用药只有 7 味', () => {
  const h = herbs();
  assert.strictEqual(h.slots, 75);
  assert.strictEqual(h.unique, 57);
  assert.strictEqual(h.avg, 8.3);
  assert.deepStrictEqual(h.top.slice(0, 3).map((x) => x[1]), [3, 3, 2]);
  assert.deepStrictEqual(h.top.slice(0, 2).map((x) => x[0]).sort(), ['当归', '朱砂'].sort());
  assert.strictEqual(h.cross.length, 7);
  assert.ok(h.cross.includes('甘草') && h.cross.includes('诃子') && h.cross.includes('人参'));
  // 五味子是新增的跨章药：四神丸涩肠、天王补心丹敛心
  assert.ok(h.cross.includes('五味子'));
  assert.deepStrictEqual(h.perChapter, [{ no: '13', slots: 25 }, { no: '14', slots: 50 }]);
});

test('抽取：66/75 可在方解段逐字回查（88.0%），9 个失配留账', () => {
  const t = tracing();
  assert.strictEqual(t.slots, 75);
  assert.strictEqual(t.traced, 66);
  assert.ok(Math.abs(t.rate - 66 / 75) < 1e-12);
  assert.strictEqual(t.stray.length, 6);
  assert.deepStrictEqual(t.stray.map((x) => x.name), [
    '牡蛎散', '金锁固精丸', '朱砂安神丸', '天王补心丹', '安宫牛黄丸', '苏合香丸',
  ]);
  // 噪声与异名分开记：牡蛎散/金锁固精丸/朱砂安神丸是切分噪声，后三首是异名或旧名
  const byName = Object.fromEntries(t.stray.map((x) => [x.name, x.items]));
  assert.deepStrictEqual(byName['牡蛎散'], ['三味', '小麦百余粒']);
  assert.deepStrictEqual(byName['金锁固精丸'], ['取莲子肉煮粉为']);
  assert.deepStrictEqual(byName['朱砂安神丸'], ['酒洗', '炙甘草五']);
  assert.deepStrictEqual(byName['天王补心丹'], ['麦冬']);
  assert.deepStrictEqual(byName['安宫牛黄丸'], ['真珠']);
  assert.deepStrictEqual(byName['苏合香丸'], ['犀角', '熏陆香']);
  // 四神丸的组成补齐后 4 味全部可回查，不再留账
  assert.ok(!t.stray.some((x) => x.name === '四神丸'));
  assert.strictEqual(t.stray.reduce((n, x) => n + x.items.length, 0), 9);
});

test('君臣佐使：有君 9/9、三角色以上 3/9、四角色齐 0/9，朱砂安神丸被重复判定', () => {
  const r = roles();
  assert.strictEqual(r.total, 9);
  assert.strictEqual(r.withJun, 9);
  assert.strictEqual(r.full, 0);
  assert.strictEqual(r.three, 3);
  assert.deepStrictEqual(r.missingJun, []);
  assert.strictEqual(roleAudit().dup.length, 1);
  assert.ok(roleAudit().dup[0].startsWith('朱砂安神丸'));
});

test('七条引文逐字落在所标小节，错标即失败', () => {
  const Q = [
    ['13.1.1', '敛阴止汗，益气固表'],
    ['13.2.1', '五更作泻、泻后则安'],
    ['13.3.1', '遗精滑泄，日久不愈，腰酸耳鸣'],
    ['14.1.1', '镇固浮越之心神'],
    ['14.2.2', '虚劳虚烦不得眠，酸枣仁汤主之'],
    ['14.3.1', '为凉开剂之第一要方'],
    ['14.4.1', '本方为芳香温开之急救剂，只宜于寒闭'],
  ];
  for (const [no, q] of Q) {
    assert.strictEqual(verify(q, no), true, `${no} 找不到「${q}」`);
    assert.ok(anchor(no, q.slice(0, 6)).sentence.includes(q));
  }
  // 换一个节点就该失败：同一句不能在别的小节通过
  assert.strictEqual(verify('敛阴止汗，益气固表', '14.1.1'), false);
  assert.strictEqual(verify('遗精滑泄，日久不愈，腰酸耳鸣', '13.1.1'), false);
  // 折叠口径：去标点后仍可回查
  assert.ok(fold(anchor('14.3.1', '凉开剂之第一要方').sentence).includes(fold('为凉开剂之第一要方')));
});

test('docs：七段俱全、出现 27,100、引文可回查、无一字自造', () => {
  const doc = fs.readFileSync(DOCS, 'utf8');
  for (const head of ['MOTTO', 'PROBLEM', '双根因定位', '代价与边界', '运行与验证', '免责']) {
    assert.ok(doc.includes(head), `docs 缺 ${head}`);
  }
  assert.ok(doc.replace(/,/g, '').includes('27100'));
  assert.ok(!doc.includes('底本'));
  assert.ok(!/「?原文·/.test(doc));
  const hanzi = han(doc);
  assert.ok(hanzi >= 2500, `docs 汉字 ${hanzi} < 2500`);

  // 每一行标了教材出处的「」引文，都必须逐字回查
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
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const qs = q.questions || q;
  assert.strictEqual(qs.length, 6);
  assert.deepStrictEqual(qs.map((x) => x.stage), ['pre', 'check', 'check', 'check', 'post', 'post']);
  for (const x of qs) {
    assert.strictEqual(x.options.length, 4);
    assert.ok(Number.isInteger(x.correct) && x.correct >= 0 && x.correct <= 3);
    assert.ok((x.explanation || '').length >= 10);
    assert.strictEqual(new Set(x.options).size, 4);
  }
  // 正确答案不能全是同一个下标
  assert.ok(new Set(qs.map((x) => x.correct)).size >= 3);
});

test('运行时最后一行是教学边界声明', () => {
  const out = execFileSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8' });
  const last = out.trim().split(/\r?\n/).filter(Boolean).pop();
  assert.ok(last.startsWith('教学边界：'), last);
  assert.ok(last.endsWith('不构成诊断/用药依据'), last);
  assert.ok(/教材·第13章/.test(out) && /教材·第14章/.test(out));
  assert.strictEqual(parasOf(chapterOf('13').secs[0]).length, 6);
});

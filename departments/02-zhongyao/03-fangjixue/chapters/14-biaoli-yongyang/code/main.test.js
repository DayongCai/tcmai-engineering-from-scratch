'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { execFileSync } = require('node:child_process');
const {
  NAMES, CHAPTERS, ROLES, FORMULAS, FA_DIRS, BAFA, GROUP_SIGNAL,
  herbNames, slotCount, herbSet, avgSlots, chapterStats, hanziTotal, faDirs,
  directionProfile, bafaChapters, outsideBafa, bafaScale, axisByChapter,
  sharedHerbs, groupedRoles, roleDepth, compositionTable, selfCheck,
} = require('./main.js');

const byName = (n) => FORMULAS.find((f) => f.name === n);

test('六方齐：方名与章位来自 formulas.json，两章 2＋4 方', () => {
  assert.deepStrictEqual(FORMULAS.map((f) => f.name), NAMES);
  assert.strictEqual(FORMULAS.length, 6);
  const ax = axisByChapter();
  assert.deepStrictEqual(ax.map((a) => a.no), ['11', '23']);
  assert.deepStrictEqual(ax[0].formulas, ['大柴胡汤', '防风通圣散']);
  assert.deepStrictEqual(ax[1].formulas, ['仙方活命饮', '五味消毒饮', '透脓散', '阳和汤']);
  assert.strictEqual(byName('防风通圣散').sub, '11.1.2');
  assert.strictEqual(byName('阳和汤').sub, '23.2.2');
});

test('组成钉死：8 / 17 / 13 / 5 / 5 / 7 味，合计 55 药位、去重 42 味、平均 9.17', () => {
  assert.deepStrictEqual(FORMULAS.map((f) => f.composition.herbs.length), [8, 17, 13, 5, 5, 7]);
  assert.strictEqual(slotCount(), 55);
  assert.strictEqual(herbSet().size, 42);
  assert.strictEqual(Number(avgSlots().toFixed(2)), 9.17);
  const ct = compositionTable();
  assert.strictEqual(ct.min, 5);
  assert.strictEqual(ct.max, 17);
  // 大方与最小方各是哪两首
  assert.deepStrictEqual(ct.rows.filter((r) => r.n === 17).map((r) => r.name), ['防风通圣散']);
  assert.deepStrictEqual(ct.rows.filter((r) => r.n === 5).map((r) => r.name), ['五味消毒饮', '透脓散']);
});

test('逐味核对四首方：药名是归并后的正名（野菊花→菊花、生黄芪→黄芪、炮姜炭→干姜）', () => {
  assert.deepStrictEqual(byName('大柴胡汤').composition.herbs.map((h) => h.name),
    ['柴胡', '黄芩', '芍药', '半夏', '生姜', '枳实', '大枣', '大黄']);
  assert.deepStrictEqual(byName('五味消毒饮').composition.herbs.map((h) => h.name),
    ['金银花', '菊花', '蒲公英', '紫花地丁', '紫背天葵子']);
  assert.deepStrictEqual(byName('透脓散').composition.herbs.map((h) => h.name),
    ['黄芪', '川芎', '当归', '皂角刺', '穿山甲']);
  assert.deepStrictEqual(byName('阳和汤').composition.herbs.map((h) => h.name),
    ['熟地黄', '鹿角胶', '白芥子', '肉桂', '甘草', '干姜', '麻黄']);
  // 防风通圣散 17 味，含汗下清利四路药，但功用只写两法
  const fts = herbNames(byName('防风通圣散'));
  assert.strictEqual(fts.length, 17);
  assert.ok(fts.includes('麻黄') && fts.includes('大黄') && fts.includes('滑石') && fts.includes('石膏'));
});

test('教材字数：第11章 5,504 + 第23章 9,526 = 15,030（由 底本.json 的 counts.hanzi 现算）', () => {
  const st = chapterStats();
  assert.deepStrictEqual(st.map((c) => c.no), ['11', '23']);
  assert.deepStrictEqual(st.map((c) => c.hanzi), [5504, 9526]);
  assert.deepStrictEqual(st.map((c) => c.secs), [1, 2]);
  assert.deepStrictEqual(st.map((c) => c.subs), [2, 4]);
  assert.deepStrictEqual(st.map((c) => c.paras), [12, 24]);
  assert.strictEqual(hanziTotal(), 15030);
  assert.strictEqual(st[0].hanzi + st[1].hanzi, 15030);
});

test('方向档案：六方各 2 个法向，共 12 个，其中「托」不在八法之内', () => {
  const prof = directionProfile();
  assert.deepStrictEqual(prof.map((p) => p.dirs), [
    ['下', '和'], ['汗', '下'], ['清', '消'], ['清', '消'], ['补', '托'], ['温', '补'],
  ]);
  assert.ok(prof.every((p) => p.n === 2));
  assert.strictEqual(prof.reduce((n, p) => n + p.n, 0), 12);
  assert.deepStrictEqual(prof.flatMap((p) => p.outside), ['托']);
  assert.deepStrictEqual(BAFA, ['汗', '吐', '下', '和', '温', '清', '消', '补']);
  // 判定只看功用文本：同一段功用里不会因为药味多而多出法向
  assert.deepStrictEqual(faDirs('和解少阳，内泻热结。'), ['下', '和']);
  assert.deepStrictEqual(faDirs('疏风解表，泻热通便。'), ['汗', '下']);
  assert.deepStrictEqual(faDirs('温阳补血，散寒通滞。'), ['温', '补']);
  assert.strictEqual(FA_DIRS.length, 8);
});

test('不进八法的构造证据：6/6 首 fa 为空，且两章不在八法章集合内', () => {
  const ob = outsideBafa();
  assert.strictEqual(ob.length, 6);
  assert.deepStrictEqual(ob.map((x) => x.fa), ['', '', '', '', '', '']);
  assert.ok(ob.every((x) => x.labelled === false));
  assert.ok(ob.every((x) => x.inBafaChapter === false));
  const chs = bafaChapters();
  assert.strictEqual(chs.size, 8, '八法公式出现在 8 个章里');
  assert.ok(!chs.has('11') && !chs.has('23'));
  assert.deepStrictEqual([...chs].sort(), ['10', '12', '21', '22', '5', '6', '7', '8'].sort());
  const b = bafaScale();
  assert.strictEqual(b.total, 52);
  assert.strictEqual(b.outside, 62);
  assert.strictEqual(b.outside + b.total, b.totalFormulas);
  assert.strictEqual(b.totalFormulas, 114);
  // 六方都落在「不属八法」的 62 首里
  assert.ok(6 <= b.outside);
});

test('两章两轴：第11章 2 方并集 {汗,下,和}，第23章 4 方并集 {清,消,补,温,托}', () => {
  const ax = axisByChapter();
  assert.deepStrictEqual(ax[0].union, ['下', '和', '汗'].sort());
  assert.deepStrictEqual(ax[1].union, ['托', '消', '补', '温', '清'].sort());
  assert.strictEqual(ax[0].multi, 2);
  assert.strictEqual(ax[1].multi, 4);
  // 第11章两方共有「下」，即汗/和与下并存；第23章既有清也有温，即同一病名两个相反方向
  assert.ok(ax[0].perFormula.every((p) => p.dirs.includes('下')));
  assert.ok(ax[1].union.includes('清') && ax[1].union.includes('温'));
  assert.ok(ax[1].union.includes('托'), '托法只在第23章出现');
});

test('本章内部共享药 11 味、只出现 1 次的 31 味（节点 42）', () => {
  const sh = sharedHerbs();
  assert.strictEqual(sh.nodes, 42);
  assert.strictEqual(sh.shared.length, 11);
  assert.strictEqual(sh.once, 31);
  assert.strictEqual(sh.shared[0].n, 3);
  assert.deepStrictEqual(sh.shared.filter((x) => x.n === 3).map((x) => x.name), ['当归', '甘草']);
  // 穿山甲出现在 2 首方里，两首都在第23章——教材明令禁用
  assert.deepStrictEqual(FORMULAS.filter((f) => herbNames(f).includes('穿山甲')).map((f) => f.name),
    ['仙方活命饮', '透脓散']);
});

test('君臣佐使是抽取：11 处教材成组标注，数据层每角色只留 1 味', () => {
  const g = groupedRoles();
  assert.strictEqual(g.positions, 11);
  assert.strictEqual(g.rows.filter((r) => r.roles.length).length, 6);
  assert.deepStrictEqual(g.rows.find((r) => r.name === '防风通圣散').roles, ['君', '臣', '佐']);
  assert.deepStrictEqual(g.rows.find((r) => r.name === '阳和汤').roles, ['君', '使']);
  assert.ok(GROUP_SIGNAL.test('二药合用，温阳补血，共为君药'));
  // 阳和汤教材是熟地黄＋鹿角胶「二药合用…共为君药」，数据层君位只剩鹿角胶
  assert.deepStrictEqual(byName('阳和汤').roles.君, ['鹿角胶']);
  assert.ok(byName('阳和汤').roleEvidence.some((e) => e.role === '君' && /共为君药/.test(e.quote)));
  // 防风通圣散教材是四味「共为君药」，数据层君位只剩薄荷
  assert.deepStrictEqual(byName('防风通圣散').roles.君, ['薄荷']);
  const d = roleDepth();
  assert.deepStrictEqual(d.four, ['仙方活命饮'], '六方里唯一四角色齐的');
  assert.strictEqual(d.min, 2);
  assert.deepStrictEqual(d.minNames, ['透脓散']);
  assert.deepStrictEqual(d.rows.map((r) => r.depth), [3, 3, 4, 3, 2, 3]);
  assert.deepStrictEqual(ROLES, ['君', '臣', '佐', '使']);
});

test('规模自检十六项全过', () => {
  const c = selfCheck();
  assert.strictEqual(c.length, 16);
  assert.ok(c.every((x) => x.ok), JSON.stringify(c.filter((x) => !x.ok)));
});

test('运行时最后一行是教学边界声明', () => {
  const out = execFileSync('node', ['code/main.js'], { cwd: __dirname + '/..', encoding: 'utf8' });
  const last = out.trim().split('\n').filter(Boolean).pop();
  assert.match(last, /教学边界/);
  assert.match(last, /不构成/);
  assert.match(out, /15030/);
});

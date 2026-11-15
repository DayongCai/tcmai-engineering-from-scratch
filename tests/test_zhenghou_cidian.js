#!/usr/bin/env node
/**
 * tests/test_zhenghou_cidian.js —— 「疾病证候单元辞典」专用断言
 *
 * 为什么单独一套：audit_curriculum.js 只管"章有 docs/quiz/outputs、篇幅够"，
 * 它不关心 291 证是不是真的都在、四级码是不是拼得起来、张量是不是与结构同源。
 * 那些恰恰是本辞典的核心承诺 —— 承诺不写成断言，就只是文案。
 *
 * 断言分四组：
 *   A 数据层   结构.json / 张量.json / 语素表的存在、形状、互相自洽
 *   B 编码层   全码格式、唯一性、父链、候码可拼接
 *   C 正文层   辞典 16 个文件在、291 个证标题在、图注引用的 6 张 SVG 在
 *   D 校验层   校对差异与缺口登记不许被悄悄删掉（数量只许变多，不许变少）
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const STD = path.join(ROOT, 'standards', 'zhenghou-cidian');
const TB = path.join(ROOT, 'textbooks', '01-zhongyi', '14-zhongyi-zhenghou-xue');
const DEPT = path.join(ROOT, 'departments', '01-zhongyi', '14-zhongyi-zhenghou-xue');

const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const struct = read(path.join(STD, '结构.json'));
const tensor = read(path.join(STD, '张量.json'));
const gap = read(path.join(STD, '缺口登记.json'));
const wei = read(path.join(STD, '语素-位.json'));
const xing = read(path.join(STD, '语素-性.json'));
const tai = read(path.join(STD, '语素-态.json'));

const men = struct.men;
const allZheng = men.flatMap((m) => m.lei.flatMap((l) => l.zhengList));
const allHou = men.flatMap((m) => m.lei.flatMap((l) => l.zhengList.flatMap((z) => z.houList)));

// ── A 数据层 ──────────────────────────────────────────────

test('A1 底本与四个派生文件都在', () => {
  for (const f of ['目录原文.txt', 'PDF登记.json', '结构.json', '张量.json', '缺口登记.json',
    '语素-位.json', '语素-性.json', '语素-态.json']) {
    assert.ok(fs.existsSync(path.join(STD, f)), '缺 ' + f);
  }
  const toc = fs.readFileSync(path.join(STD, '目录原文.txt'), 'utf8').trim().split('\n');
  assert.strictEqual(toc.length, 2268, '目录原文应为 2268 条书签，实为 ' + toc.length);
});

test('A2 四级计数与声明一致，且逐级可加总', () => {
  const c = struct.counts;
  assert.strictEqual(c.men, 12);
  assert.strictEqual(c.lei, 45);
  assert.strictEqual(c.zhengInstances, allZheng.length);
  assert.strictEqual(c.houInstances, allHou.length);
  assert.strictEqual(c.men, men.length);
  assert.strictEqual(c.lei, men.reduce((a, m) => a + m.lei.length, 0));
});

test('A3 三张语素表与张量轴对齐', () => {
  assert.strictEqual(wei['证位'].length, 22);
  assert.strictEqual(xing['门'].length, 12);
  assert.strictEqual(xing['类'].length, 45);
  const taiSet = new Set(tai['态'].map((t) => t.zh));
  assert.strictEqual(taiSet.size, tensor.axes['态'].length);
  assert.strictEqual(tensor.shape[0], 22);
  assert.strictEqual(tensor.shape[1], 45);
  assert.strictEqual(tensor.shape[2], taiSet.size);
});

test('A4 张量计数与结构逐格重算相等（不是抄来的）', () => {
  const recount = {};
  for (const h of allHou) {
    const k = `${h.wei}|${h.zheng.split('-')[2] ? allZheng.find((z) => z.full === h.zheng).wei : ''}|${h.tai}`;
    recount[k] = (recount[k] || 0) + 1;
  }
  const cells = tensor.cells;
  const sum = Object.values(cells).reduce((a, b) => a + b, 0);
  assert.strictEqual(sum, allHou.length, '张量格值总和应等于候条目数');
  assert.strictEqual(Object.keys(cells).length, struct.counts.tensorCells);
  for (const [k, v] of Object.entries(cells)) {
    assert.strictEqual(recount[k], v, '格 ' + k + ' 计数不一致');
  }
});

// ── B 编码层 ──────────────────────────────────────────────

test('B1 全码格式：Mnn-Lnn-Znn[-Hnnn]', () => {
  const zre = /^M\d{2}-L\d{2}-Z\d{2}[a-z]?$/;
  const hre = /^M\d{2}-L\d{2}-Z\d{2}[a-z]?-H\d{3}$/;
  for (const z of allZheng) {
    assert.ok(zre.test(z.full), '证全码不合格式: ' + z.full);
    for (const h of z.houList) assert.ok(hre.test(h.full), '候全码不合格式: ' + h.full);
  }
});

test('B2 父链唯一：证只属一个类，类只属一个门', () => {
  for (const m of men) {
    for (const l of m.lei) {
      for (const z of l.zhengList) {
        assert.strictEqual(z.men, m.code);
        assert.strictEqual(z.lei, l.code);
        assert.ok(z.full.startsWith(m.code + '-' + l.code + '-'), z.full);
      }
    }
  }
});

test('B3 候码可拼接且前缀正确', () => {
  for (const z of allZheng) {
    for (const h of z.houList) {
      assert.strictEqual(h.full, z.full + '-' + h.code.split('-').pop());
      assert.strictEqual(h.zheng, z.full);
    }
  }
});

test('B4 每个证名都能拆成「位 + 类性 + 证」，每个候名都能拆成「位 + 态」', () => {
  const bad = allZheng.filter((z) => !z.wei || !z.weiParts || !z.weiParts.length);
  assert.deepStrictEqual(bad.map((z) => z.code), []);
  assert.deepStrictEqual(gap['证名拆分失败'] || [], []);
  assert.deepStrictEqual(gap['候名拆分失败'] || [], []);
  const holes = allHou.filter((h) => !h.wei || !h.tai);
  assert.deepStrictEqual(holes.map((h) => h.code), []);
});

// ── C 正文层 ──────────────────────────────────────────────

test('C1 辞典 22 个文件齐备（凡例 + 12 章 + 9 附录）', () => {
  const files = fs.readdirSync(TB).filter((f) => f.endsWith('.md'));
  assert.strictEqual(files.length, 22, '实为 ' + files.length + '：' + files.join(', '));
  assert.ok(files.some((f) => f.startsWith('00-')));
  for (let i = 1; i <= 12; i += 1) {
    assert.ok(files.some((f) => f.startsWith(String(i).padStart(2, '0') + '-第' + i + '章-')), '缺第 ' + i + ' 章');
  }
  for (const a of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']) assert.ok(files.some((f) => f.startsWith('附录' + a)), '缺附录' + a);
});

test('C1g 缺条核实与码归位：三条缺条都带原页依据、归位不留双份', () => {
  const gap = JSON.parse(fs.readFileSync(path.join(STD, '缺口登记.json'), 'utf8'));
  const codes = new Set();
  for (const m of ['M01','M02','M03','M04','M05','M06','M07','M08','M09','M10','M11','M12']) {
    const f = path.join(STD, `正文-${m}.json`);
    if (!fs.existsSync(f)) continue;
    for (const c of (JSON.parse(fs.readFileSync(f, 'utf8')).校勘.缺条 || [])) codes.add(c);
  }
  const checked = gap['缺条核实'] || [];
  assert.strictEqual(checked.length, codes.size, '缺条核实条数 != 实际缺条数');
  for (const c of codes) assert.ok(checked.some(x => x.code === c), '缺条未核实：' + c);
  for (const x of checked) {
    assert.ok(x.结论 && x.依据 && x.处理, '核实缺字段：' + x.code);
    assert.ok(x.依据.length >= 40, '依据太薄（要写印张与页上所见）：' + x.code);
  }
  const moved = gap['码归位'] || [];
  assert.strictEqual(moved.length, 1, '归位条数应为 1（M09 那条改由印刷码两解分派）');
  for (const m of moved) {
    assert.ok(m.from && m.to && m.why && m.page, '归位缺字段');
    assert.ok(m.why.length >= 30, '归位依据太薄：' + m.from);
  }
  // 归位后不许两边都在
  for (const m of moved) {
    const [men] = m.from.split('-');
    const items = JSON.parse(fs.readFileSync(path.join(STD, `正文-${men}.json`), 'utf8')).items;
    assert.ok(!items[m.from], '归位后旧键仍在：' + m.from);
    assert.ok(items[m.to], '归位后新键缺失：' + m.to);
  }
  // 已解决的缺条：不许再出现在 缺条 里，且必须写明怎么解的
  for (const x of (gap['缺条已解决'] || [])) {
    assert.ok(!codes.has(x.code), '已解决的缺条仍缺：' + x.code);
    assert.ok(x.原判 && x.现解 && x.现解.length >= 30, '已解决条目缺解释：' + x.code);
  }
  // 印刷码两解的分派：每条都要带页码与依据，且落到的必须不是原码
  const split = gap['同码分派'] || [];
  assert.ok(split.length >= 5, '同码分派应至少 5 条，实际 ' + split.length);
  for (const s2 of split) {
    assert.ok(s2.from && s2.to && s2.page && s2.why, '同码分派缺字段');
    assert.notStrictEqual(s2.from, s2.to, '同码分派没换码：' + s2.from);
  }

  // 参考书目吴方医案：回原页核过，必须留结论
  const bib = JSON.parse(fs.readFileSync(path.join(STD, '参考书目.json'), 'utf8'));
  const wu = bib.items.find(x => x.title === '吴方医案');
  assert.ok(wu && wu['核对'] && wu['核对'].includes('2294'), '吴方医案缺原页核对结论');
});

test('C1f 态根对照表自洽：判定和=总次、映射必带病机、待核必带依据、附录 G 有 G.7', () => {
  const r = JSON.parse(fs.readFileSync(path.join(STD, '态根-病机对照.json'), 'utf8'));
  const c = r.counts;
  const sum = Object.values(c['按判定']).reduce((a, b) => a + b, 0);
  assert.strictEqual(sum, c['出现总次'], '判定之和 != 出现总次');
  const rootsSum = r.roots.reduce((a, x) => a + x.次数, 0);
  assert.strictEqual(rootsSum, c['出现总次'], '逐根次数之和 != 出现总次');
  for (const x of r.roots) {
    assert.ok(['映射', '性质不映', '待核', '噪声'].includes(x.判定), '未知判定：' + x.判定);
    assert.ok(x.依据 && x.依据.length >= 8, '缺依据：' + x.态根);
    if (x.判定 === '映射') {
      assert.ok(x.病机, '映射项缺病机：' + x.态根);
      assert.ok(typeof x.可落格次数 === 'number', '映射项缺可落格次数：' + x.态根);
    }
    if (x.判定 === '性质不映' || x.判定 === '噪声') assert.strictEqual(x.病机, null);
  }
  // 不接进计分：编码器输出里不许出现「态根」/「映射」相关字段
  const enc = require(path.join(ROOT, 'scripts', 'zhenghou_encode.js'));
  const out = enc.encode(enc.load(), '怕冷 无汗');
  assert.ok(!JSON.stringify(out).includes('态根'), '编码器不该消费这张表');
  // 待核 8 根的「位×根」细表
  const pending = r.roots.filter(x => x.判定 === '待核');
  const subAll = pending.flatMap(x => x.细分 || []);
  assert.strictEqual(subAll.reduce((a, b) => a + b.次数, 0), c['按判定']['待核'],
    '待核明细覆盖不全（细分次数之和 != 待核总次）');
  const subHit = subAll.filter(y => y.判定 === '映射').reduce((a, b) => a + b.次数, 0);
  assert.strictEqual(subHit, c['待核细分落格次数'], '细分落格次数对不上');
  for (const y of subAll) {
    assert.ok(['映射', '表外', '低频待核', '未细分'].includes(y.判定), '未知细分判定：' + y.判定);
    assert.ok(y.依据 && y.依据.length >= 6, '细分缺依据：' + y.位 + '×' + y.次数);
    if (y.判定 === '映射') assert.ok(y.原表该格, '映射项在原表没有这一格：' + y.位 + '｜' + y.病机);
    else assert.strictEqual(y.病机, null);
  }
  assert.strictEqual(c['细分后可解释'],
    1468 + c['映射项能真正落格的次数'] + c['待核细分落格次数'], '可解释累计算错');
  const md = fs.readFileSync(path.join(TB, '附录G-证象总表.md'), 'utf8');
  assert.ok(md.includes('G.7') && md.includes('不接进计分'), '附录 G 缺 G.7 或不接进计分声明');
  assert.ok(md.includes('G.8'), '附录 G 缺 G.8 细表');
});

test('C1e 证象组合质检自洽：分类和=标签总次、证象型明细可回查、附录 G 有 G.6', () => {
  const q = JSON.parse(fs.readFileSync(path.join(STD, '证象组合-质检.json'), 'utf8'));
  const c = q.counts;
  assert.ok(c['有证象组合字段'] > 1700, '字段数 ' + c['有证象组合字段']);
  const forms = Object.values(c['字段形态']).reduce((a, b) => a + b, 0);
  assert.strictEqual(forms, c['有证象组合字段'], '字段形态之和 != 有字段条数');
  const cls = Object.values(c['标签型判定']).reduce((a, b) => a + b, 0);
  assert.strictEqual(cls, c['标签出现总次'], '标签分类之和 != 标签出现总次');
  assert.ok(c['证象型判定'] && typeof c['证象型判定'] === 'object');
  for (const r of q['证象型明细']) {
    assert.ok(r['判定'] && r['label'] && r['page'], '明细缺字段：' + JSON.stringify(r));
  }
  const md = fs.readFileSync(path.join(TB, '附录G-证象总表.md'), 'utf8');
  assert.ok(md.includes('G.6'), '附录 G 缺 G.6');
  assert.ok(md.includes('不是同一套词'), 'G.6 没写出结论');
});

test('C1d 附录 I 参考书目：144 条齐、每条有书名与印张、校名不超原书条数', () => {
  const b = JSON.parse(fs.readFileSync(path.join(STD, '参考书目.json'), 'utf8'));
  assert.ok(b.count >= 140, '参考书目只有 ' + b.count + ' 条');
  assert.strictEqual(b.items.length, b.count, 'count 与 items 不一致');
  for (const it of b.items) {
    assert.ok(it.title && it.title.length >= 2, '无书名：' + JSON.stringify(it).slice(0, 80));
    assert.ok(it.page >= 2290 && it.page <= 2299, '印张越界：' + it.page);
    assert.ok(Object.prototype.hasOwnProperty.call(it, 'author'), '缺 author 字段');
  }
  const fixed = b.items.filter((x) => x.ocrTitle);
  assert.ok(fixed.length <= 20, '校名 ' + fixed.length + ' 条，超出人工核过的范围');
  const md = fs.readFileSync(path.join(TB, '附录I-参考书目.md'), 'utf8');
  assert.ok(md.includes('金匮要略') && md.includes('脾胃论'), '附录 I 缺关键书名');
  assert.ok((md.match(/^\| \d+ \|/gm) || []).length >= 140, '附录 I 表格行数不足');
});

test('C1c 附录 G/H 是真表，不是占位：322 病候逐号齐、证象格数与声明相符', () => {
  const bh = JSON.parse(fs.readFileSync(path.join(STD, '附录-病候.json'), 'utf8'));
  assert.strictEqual(bh.count, 322, '附录二条数 ' + bh.count);
  assert.deepStrictEqual(bh.校勘.缺号, [], '附录二缺号：' + JSON.stringify(bh.校勘.缺号));
  const hs = Object.keys(bh.items);
  assert.strictEqual(hs.length, 322, '病候号条数 ' + hs.length);
  for (const h of hs) assert.match(h, /^H\d{3}$/, '病候号格式：' + h);
  const zx = JSON.parse(fs.readFileSync(path.join(STD, '附录-证象.json'), 'utf8'));
  assert.ok(zx.cells.length >= 70, '证象格只有 ' + zx.cells.length);
  assert.strictEqual(zx.cells.length, zx.count, 'count 与 cells 不一致');
  for (const c of zx.cells) {
    assert.ok(zx.rows.includes(c.row), '未登记的行标：' + c.row);
    assert.ok(zx.cols.includes(c.col), '未登记的列标：' + c.col);
    assert.ok(c.text.length >= 3, '格内文字过短：' + c.text);
  }
  const g = fs.readFileSync(path.join(TB, '附录G-证象总表.md'), 'utf8');
  const hh = fs.readFileSync(path.join(TB, '附录H-病候总表.md'), 'utf8');
  assert.ok(g.includes('腠理不宣') && g.includes('脱绝'), '附录 G 缺关键格');
  assert.ok(hh.includes('H001') && hh.includes('H322'), '附录 H 缺首尾病候号');
});

test('C1b 附录 D（百姓反查）与附录 E（工程手册）内容达标', () => {
  const d = fs.readFileSync(path.join(TB, '附录D-症状反查索引.md'), 'utf8');
  const rows = (d.match(/^\| \*\*/gm) || []).length;
  assert.ok(rows >= 200, '附录 D 词项只有 ' + rows + ' 行，契约要求 ≥200');
  const e = fs.readFileSync(path.join(TB, '附录E-应用工程手册.md'), 'utf8');
  for (const k of ['CI/CD', '迁移协议', '危候', '未收录']) {
    assert.ok(e.includes(k), '附录 E 缺「' + k + '」段');
  }
});

test('C2 291 个证条目都在正文里，且全码一字不差', () => {
  const body = fs.readFileSync(path.join(TB, '00-凡例与使用.md'), 'utf8')
    + men.map((m) => fs.readFileSync(path.join(TB, fs.readdirSync(TB)
      .find((f) => f.startsWith(String(m.n).padStart(2, '0') + '-第' + m.n + '章-'))), 'utf8')).join('\n');
  const missing = allZheng.filter((z) => !body.includes('`' + z.full + '`') && !body.includes(z.full));
  assert.deepStrictEqual(missing.map((z) => z.full), [], '正文缺证条目');
  // 1866 条候必须逐条出现（以全码形式）
  const missHou = allHou.filter((h) => !body.includes(h.full));
  assert.strictEqual(missHou.length, 0, '正文缺候条目 ' + missHou.length + ' 条，例：' + (missHou[0] || {}).full);
});

test('C3 图注引用的 12 张 SVG 都在，且有源文件', () => {
  const vol0 = fs.readFileSync(path.join(TB, '00-凡例与使用.md'), 'utf8');
  const refs = [...vol0.matchAll(/\((figures\/[^)]+\.svg)\)/g)].map((m) => m[1]);
  assert.strictEqual(refs.length, 12, '图注应引用 12 张图，实为 ' + refs.length);
  for (const r of refs) {
    assert.ok(fs.existsSync(path.join(TB, r)), '缺图 ' + r);
    const src = fs.readdirSync(path.join(TB, 'figures')).filter((f) =>
      (f.endsWith('.py') || f.endsWith('.mmd')) && path.basename(r, '.svg') === path.basename(f, path.extname(f)));
    assert.strictEqual(src.length, 1, '缺源文件：' + r);
  }
});

test('C5 正文层（OCR）与结构、正文三处对上', () => {
  const bodies = fs.readdirSync(STD)
    .filter((f) => /^正文-M\d{2}\.json$/.test(f)).map((f) => path.join(STD, f));
  if (!bodies.length) {
    assert.ok(true, '尚无正文层（OCR 未跑）—— 不判失败，但一旦有就必须自洽');
    return;
  }
  const codes = new Set(allHou.map((h) => h.full));
  for (const f of bodies) {
    const d = read(f);
    assert.ok(d.items && typeof d.items === 'object');
    const keys = Object.keys(d.items);
    assert.ok(keys.length > 0, path.basename(f) + ' 里没有任何候');
    // 1) 每个键都必须能在结构.json 里找到（不许 OCR 出来的码自己另立门户）
    const orphan = keys.filter((k) => !codes.has(k));
    assert.deepStrictEqual(orphan, [], path.basename(f) + ' 里有结构外的码');
    // 2) counts 必须与 items 自洽
    assert.strictEqual(d.counts.matched, keys.length);
    assert.ok(d.counts.chars > 0);
    // 3) 每条都要有正文字段与印张
    for (const k of keys.slice(0, 40)) {
      const v = d.items[k];
      assert.ok(v.page, k + ' 缺印张');
      assert.ok(Object.keys(v.fields || {}).length >= 3, k + ' 字段太少');
    }
  }
});

test('C6 正文层进书的是全文，不是节选', () => {
  const f = fs.readdirSync(TB).find((x) => x.startsWith('06-第6章-'));
  const md = fs.readFileSync(path.join(TB, f), 'utf8');
  const blocks = (md.match(/^##### \(\d+\)/gm) || []).length;
  assert.ok(blocks >= 300, '第6章候级小节只有 ' + blocks + ' 个，契约要求覆盖 313 候');
  for (const k of ['**病因病机**', '**方症**', '**摘录**']) {
    assert.ok(md.includes(k), '正文缺整段字段：' + k + '（退回节选了？）');
  }
  // 单条最长段落应远超 110 字（旧节选上限），否则说明 clip 又回来了
  const longest = Math.max(...[...md.matchAll(/^> (.+)$/gm)].map((m) => m[1].length));
  assert.ok(longest > 400, '最长原书段落仅 ' + longest + ' 字，疑似退回节选');
});

test('C7 正文层可复现：OCR 管线脚本全部在仓库里（不在 scratch）', () => {
  const need = ['_paths.py', 'scan_headers.py', 'build_doors.py', 'run_ocr.py',
    'parse_records.py', 'merge_bodies.py', 'recover_missing.py', 'verify_bodies.py',
    'report.py', 'run_ten.sh', 'finish_pipeline.sh', 'README.md'];
  const dir = path.join(ROOT, 'scripts', 'zgh_ocr');
  assert.ok(fs.existsSync(dir), '缺 scripts/zgh_ocr/ —— 管线不能只活在 scratch（.gitignore）里');
  const miss = need.filter((f) => !fs.existsSync(path.join(dir, f)));
  assert.deepStrictEqual(miss, [], '管线脚本缺失，正文层将无法复现');
  // 脚本里不许再引用 scratch 的代码路径（数据在 scratch 可以，代码不行）
  const bad = fs.readdirSync(dir).filter((f) => f.endsWith('.py'))
    .filter((f) => /scratch[\/]zgh_ocr[\/][a-z_]+\.py/.test(fs.readFileSync(path.join(dir, f), 'utf8')));
  assert.deepStrictEqual(bad, [], '脚本仍在引用 scratch 下的旧代码路径');
});

test('C4 课程层 12 章目录与 chapters.json 一致', () => {
  const idx = read(path.join(DEPT, 'chapters.json'));
  assert.strictEqual(idx.chapters.length, 12);
  for (const c of idx.chapters) {
    const dir = path.join(DEPT, 'chapters', c.slug);
    assert.ok(fs.existsSync(dir), '缺章节目录 ' + c.slug);
    for (const f of ['docs/zh.md', 'quiz.json']) assert.ok(fs.existsSync(path.join(dir, f)), c.slug + ' 缺 ' + f);
    assert.strictEqual(c.code, 'M' + String(c.n).padStart(2, '0'));
  }
});

// ── D 校验层（缺口只许变多、不许悄悄变少） ──────────────────

test('D1 校对差异 ≥10 条，且都带 declare/actual', () => {
  const diffs = struct['校对']['差异'];
  assert.ok(diffs.length >= 10, '差异从 10 条变成 ' + diffs.length + ' 条 —— 有人删了校勘记录？');
  for (const d of diffs) {
    assert.ok(d.declare && d.actual && d.code, '差异条目缺字段：' + JSON.stringify(d));
  }
  assert.strictEqual(gap['校对差异'].length, diffs.length);
});

test('D2 证码冲突被显式登记', () => {
  const dup = struct['校对']['证码重复'];
  assert.ok(Object.keys(dup).length >= 1, 'L05-Z13 一号两用的记录不见了');
  assert.ok(dup['L05-Z13']);
  assert.strictEqual(dup['L05-Z13'].length, 2);
});

test('D3 未做事项写清了，不许静默', () => {
  assert.ok((gap['未做'] || []).length >= 3);
  assert.ok(gap['未做'].some((s) => s.includes('OCR')), 'OCR 缺口必须写出来');
});

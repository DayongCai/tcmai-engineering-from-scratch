#!/usr/bin/env node
/**
 * tests/test_porting_map.js —— 全链路账本的守门测试
 *
 * 账本（porting-map.json + PORTING.md）最容易烂在两个地方，各有一条断言钉住：
 *
 *   1. **本仓库侧写了不存在的路径** —— 表"看起来对"，但文件早改了名/删了。
 *      → 逐条在文件系统上验真；`evidence` 还必须是 run_all.js 里**已注册**的套件
 *        （否则就是"有测试"的空话）。
 *   2. **参考侧出了新东西而账本不知道** —— 新脚本被静默忽略，链条断在自己看不见的地方。
 *      → 拿参考 `scripts/` 的**现场清单**与账本清单比对，多出来就报错。
 *        （参考仓库不在本机时跳过这一条，并**明说跳过了** —— 不假装通过。）
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed += 1; console.log(`  ✓ ${name}`); }
  catch (e) { failures.push({ name, msg: e.message }); console.log(`  ✗ ${name}\n    ${e.message}`); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const map = JSON.parse(fs.readFileSync(path.join(ROOT, 'porting-map.json'), 'utf8'));
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const runAll = fs.readFileSync(path.join(ROOT, 'tests/run_all.js'), 'utf8');

// ── 一、本仓库侧：路径必须真实存在 ──────────────────────────

test('工具链映射里每个 ours 路径都真实存在', () => {
  for (const t of map.toolchain) {
    for (const p of t.ours) {
      assert(exists(p), `${t.ref} → \`${p}\` 不存在（账本过期或路径写错）`);
    }
  }
});

test('未移植清单不引用本仓库路径（它是"没有对应物"）', () => {
  for (const d of map.dropped) {
    assert(!d.ref.startsWith('scripts/') || !exists(d.ref),
      `\`${d.ref}\` 标为未移植，但本仓库里存在这个文件 —— 账本自相矛盾`);
  }
});

test('新增清单里每个路径都真实存在，且 why 非空', () => {
  assert(map.ourAdditions.length >= 10, `新增条目太少（${map.ourAdditions.length}），像是漏记`);
  for (const a of map.ourAdditions) {
    assert(exists(a.path), `新增 \`${a.path}\` 不存在`);
    assert(a.why && a.why.length >= 8, `${a.path} 的 why 太短`);
  }
});

// ── 二、evidence 必须是**已注册**的测试套件 ────────────────────

test('每条 evidence 都存在，且已在 run_all.js 里注册（"有测试"不能是空话）', () => {
  const claimed = new Set();
  for (const t of map.toolchain) if (t.evidence) claimed.add(t.evidence);
  for (const g of map.gates) claimed.add(g.evidence);
  assert(claimed.size >= 8, `evidence 条目太少（${claimed.size}）`);
  for (const e of claimed) {
    assert(exists(e), `evidence \`${e}\` 不存在`);
    const base = path.basename(e);
    assert(runAll.includes(base), `\`${e}\` 没在 tests/run_all.js 注册 —— 它不会在 npm test 里跑`);
  }
});

test('质量门引用了参考的「不能省的四条」+ 本仓库的一条', () => {
  const names = map.gates.map((g) => g.name);
  assert(names.length >= 5, `质量门只有 ${names.length} 条`);
  for (const need of ['审计', '计数', '链接', '产物索引']) {
    assert(names.some((n) => n.includes(need)), `缺了「${need}」这道门`);
  }
});

// ── 三、参考侧：清单必须覆盖每一个参考脚本 ───────────────────

test('参考 scripts/ 的每一个都在账本里有交代（映射或显式未移植）', () => {
  const declared = new Set();
  for (const t of map.toolchain) declared.add(t.ref.replace(/^scripts\//, ''));
  for (const d of map.dropped) declared.add(d.ref.replace(/^scripts\//, ''));
  for (const s of map.reference.inventory.scripts) {
    assert(declared.has(s), `参考的 \`${s}\` 在账本里**没有交代**（既没映射也没写未移植）`);
  }
});

test('结构映射覆盖 phases → departments 与课时契约', () => {
  const refs = map.structure.map((s) => s.ref).join(' ');
  assert(refs.includes('phases'), '缺 phases → departments 这条');
  assert(map.structure.some((s) => s.ref.includes('lesson')), '缺 lesson → chapter 这条');
  assert(map.invariants.length === 3, `不变量应为 3 个，实得 ${map.invariants.length}`);
});

// ── 四、新鲜度：参考仓库在线时比对现场 ────────────────────────

test('参考仓库在线时，现场 scripts/ 清单与账本一致；离线则明说跳过', () => {
  const ref = map.reference.measuredPath;
  const dir = path.join(ref, 'scripts');
  if (!fs.existsSync(dir)) {
    console.log(`    ⚠ 跳过新鲜度比对：参考仓库不在此机（${ref}）—— 结构比对照常，但**参考侧可能已更新**`);
    return;
  }
  const now = fs.readdirSync(dir).sort();
  const recorded = [...map.reference.inventory.scripts].sort();
  const added = now.filter((f) => !recorded.includes(f));
  const gone = recorded.filter((f) => !now.includes(f));
  assert(added.length === 0, `参考新增了脚本，账本没跟上：${added.join('、')}`);
  assert(gone.length === 0, `参考删了脚本，账本还记着：${gone.join('、')}`);
});

// ── 五、产物不许漂移 ────────────────────────────────────────

test('PORTING.md 与 porting-map.json 一致（不漂移）', () => {
  const { render } = require('../scripts/build_porting_map.js');
  const want = render(map);
  const got = fs.readFileSync(path.join(ROOT, 'PORTING.md'), 'utf8');
  assert(want === got, 'PORTING.md 漂移了 —— 跑 `node scripts/build_porting_map.js` 重生成');
});

test('PORTING.md 不许被手改（首行有渲染器标记）', () => {
  const md = fs.readFileSync(path.join(ROOT, 'PORTING.md'), 'utf8');
  assert(md.startsWith('<!-- 本文件由 scripts/build_porting_map.js'),
    'PORTING.md 缺少"由脚本渲染"的标记 —— 手写的账本没人会核对，会烂');
});

console.log(`\n  ${passed} 通过 · ${failures.length} 失败`);
if (failures.length) {
  console.log('\n失败明细:');
  for (const f of failures) console.log(`  ✗ ${f.name}\n    ${f.msg}`);
  process.exit(1);
}
console.log('\n✅ 全链路账本通过');

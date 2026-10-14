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
const { execFileSync } = require('child_process');

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

// ── 四、新鲜度：三态，不许"跳过即通过"────────────────────────
//
// 原实现是「参考不在本机 → 打印一行警告 → 算通过」。**一个报"通过"的跳过等于假通过** ——
// 实测后果：上游 already 比快照多了 44 个脚本、13 个顶层目录，而门一路绿灯。
// 现在分三态：缓存在线则比对现场（不快照/不拉网）；离线则**明说**，且严格模式判失败。

function treeFromCache(cacheDir) {
  const { resolveGit } = require('../scripts/build_porting_map.js');
  const gitExe = resolveGit();
  if (!gitExe) return null;
  const run = (args) => execFileSync(gitExe,
    ['-c', 'safe.directory=*', '-c', 'http.sslBackend=schannel', '-C', cacheDir, ...args],
    { encoding: 'utf8' }).trim();
  const scripts = run(['ls-tree', '--name-only', '-r', 'HEAD', 'scripts/'])
    .split('\n').filter(Boolean).map((s) => s.replace(/^scripts\//, '')).sort();
  const head = run(['log', '-1', '--format=%H']).trim();
  return { scripts, head };
}

test('参考侧新鲜度：缓存在线则比对现场；离线则明说（严格模式判失败）', () => {
  const up = map.reference.upstream;
  assert(up, '账本没有 upstream 段 —— 跑 `npm run porting -- --measure`');
  const cacheDir = path.join(ROOT, map.reference.upstreamCacheDir || '.refcache');
  const strict = process.env.PORTING_FRESHNESS_STRICT === '1';

  if (!fs.existsSync(path.join(cacheDir, '.git'))) {
    const msg = `新鲜度未比对：缓存 ${path.relative(ROOT, cacheDir)}/ 不存在（跑 npm run porting -- --measure，约 9 秒）`;
    if (strict) throw new Error(`${msg} —— PORTING_FRESHNESS_STRICT=1 下这是**失败**，不是跳过`);
    console.log(`    ⚠ ${msg}`);
    console.log('      （非严格模式：不假装通过 —— 账本里明确记着未比对，PORTING.md 里也写着）');
    return;
  }
  const live = treeFromCache(cacheDir);
  if (!live) {
    console.log('    ⚠ 找不到 git，无法读缓存现场；已记入未比对');
    return;
  }
  const added = live.scripts.filter((s) => !up.scripts.includes(s));
  const gone = up.scripts.filter((s) => !live.scripts.includes(s));
  assert(added.length === 0 || live.head === up.head,
    `缓存里的树比账本新（新增 ${added.join('、')}）—— 跑 \`npm run porting -- --measure\` 更新账本`);
  assert(gone.length === 0, `缓存里少了账本记着的脚本：${gone.join('、')}`);
  console.log(`    缓存 HEAD ${live.head.slice(0, 7)} 与账本一致 · 上游 scripts/ ${up.scripts.length} 个`);
});

test('快照侧：本机快照在线时，账本里的 scripts 清单要与它一致', () => {
  const snapDir = path.join(map.reference.measuredPath, 'scripts');
  if (!fs.existsSync(snapDir)) {
    console.log(`    ⚠ 快照不在本机（${map.reference.measuredPath}）—— 跳过快照侧比对，但账本已记下这份清单`);
    return;
  }
  const real = fs.readdirSync(snapDir).filter((f) => !f.startsWith('.')).sort();
  const recorded = [...map.reference.inventory.scripts].sort();
  assert(real.join('|') === recorded.join('|'),
    `账本的快照清单与本机不符：\n  实得 ${real.join('、')}\n  账本 ${recorded.join('、')}`);
});

test('漂移必须被记进产物（不许只躺在控制台里）', () => {
  const drift = require('../scripts/build_porting_map.js').computeDrift(map);
  if (!map.reference.upstream) {
    console.log('    ⚠ 未比对 → PORTING.md 里写明「尚未比对」');
    return;
  }
  const md = fs.readFileSync(path.join(ROOT, 'PORTING.md'), 'utf8');
  assert(md.includes('参考侧漂移'), 'PORTING.md 缺「参考侧漂移」段 —— 漂移只躺在控制台里等于没说');
  if (drift.scriptsAdded.length) {
    assert(md.includes(drift.scriptsAdded[0]), `新增脚本 ${drift.scriptsAdded[0]} 没被渲染进 PORTING.md`);
  }
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

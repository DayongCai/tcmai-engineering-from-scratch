#!/usr/bin/env node
/**
 * tests/test_architecture.js —— 逻辑架构的守门测试
 *
 * 架构文档最容易烂的方式，是**它提到的文件与命令已经不存在了**：
 * 读者照着走发现路径是死的，然后就不再信任这份文档。
 * 所以这里不查修辞，只查两件硬事：
 *   ① 每一层列的路径**真的存在**（含 `*` / `**` 通配）；
 *   ② 每道门引的 npm 命令**真的在 package.json 里**，引的测试**真的已注册**。
 * 外加固有两份产物不许漂移（ARCHITECTURE.md 由渲染器生成）。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const a = JSON.parse(fs.readFileSync(path.join(ROOT, 'architecture.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const runAll = fs.readFileSync(path.join(ROOT, 'tests/run_all.js'), 'utf8');

let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed += 1; console.log(`  ✓ ${name}`); }
  catch (e) { failures.push({ name, msg: e.message }); console.log(`  ✗ ${name}\n    ${e.message}`); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

// ── 通配匹配（只支持 * 与 **，够用且能自证）─────────────────

function subdirs(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name !== '.git' && e.name !== 'node_modules')
      .map((e) => path.join(dir, e.name));
  } catch { return []; }
}

function entries(dir) {
  try { return fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; }
}

/**
 * pattern 相对 ROOT；`**` 跨目录，`*` 只在本段内。
 * 用**索引递增**递归：每层要么推进 pattern 索引，要么下降一层目录。
 * （第一版在 `**` 上用同一索引重入，直接爆栈 —— 就是本仓库反复踩的
 * "拿一个看起来对的写法当实现"。）
 */
function anyMatch(pattern) {
  const segs = pattern.split('/').filter(Boolean);
  const match = (i, dir) => {
    if (i === segs.length) return true;          // 段走完即命中
    const seg = segs[i];
    if (seg === '**') {
      if (match(i + 1, dir)) return true;        // ** 吃零段
      for (const sub of subdirs(dir)) if (match(i, sub)) return true;
      return false;
    }
    const re = new RegExp(`^${seg.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')}$`);
    for (const e of entries(dir)) {
      if (re.test(e.name) && match(i + 1, path.join(dir, e.name))) return true;
    }
    return false;
  };
  return match(0, ROOT);
}

// ── 一、路径存在 ────────────────────────────────────────────

test('通配器自证：不存在的路径必须匹配失败（否则这道门是空转）', () => {
  assert(!anyMatch('standards/leijing-tuyi/sources'), '不存在的路径竟然匹配上了 —— 门在空转');
  assert(!anyMatch('standards/**/definitely-no-such-file-xyz'), '不存在的通配竟然匹配上了');
  assert(!anyMatch('no-such-top-dir'), '不存在的顶层目录竟然匹配上了');
  // 正例（存在）也要对，否则门是坏的另一个方向
  assert(anyMatch('departments'), 'departments 竟然没匹配上');
  assert(anyMatch('standards/materials/*/sources'), '真实通配竟然没匹配上');
  assert(anyMatch('standards/**/sources'), '** 跨目录竟然没匹配上');
});

test('每一层列的路径都真实存在（含通配）', () => {
  for (const layer of a.layers) {
    for (const p of layer.ours) {
      const trimmed = p.replace(/\/$/, '');
      const ok = trimmed.includes('*') ? anyMatch(trimmed) : fs.existsSync(path.join(ROOT, trimmed));
      assert(ok, `${layer.id} 列的路径不存在：\`${p}\``);
    }
  }
});

test('分层齐全：L0 事实源 / L1 投影 / L2 内容 / L3 交付物', () => {
  const ids = a.layers.map((l) => l.id);
  assert(ids.join(',') === 'L0,L1,L2,L3', `层序不对：${ids}`);
  for (const l of a.layers) {
    assert(l.gate, `${l.id} 没有门 —— 没有门的层在这套架构里不成立`);
    assert(l.note && l.note.length > 10, `${l.id} 的 note 太短`);
  }
});

test('四条逻辑每条都有主张 / 为什么 / 谁守着 / 证据', () => {
  assert(a.logic.length === 4, `逻辑应为 4 条，实得 ${a.logic.length}`);
  for (const l of a.logic) {
    for (const k of ['claim', 'why', 'evidence']) {
      assert(l[k] && l[k].length > 20, `${l.id} 的 ${k} 太短或缺失`);
    }
    assert(l.enforcedBy.length, `${l.id} 没写"谁守着它"`);
  }
});

// ── 二、命令与测试 ──────────────────────────────────────────

test('每道门引的 npm 命令都在 package.json 里', () => {
  const all = [...a.crossCutting.map((g) => g.cmd), ...a.layers.map((l) => l.gate)];
  for (const cmd of all) {
    const m = cmd.match(/^npm run ([a-zA-Z0-9:_-]+)/) || cmd.match(/^npm (test)$/);
    assert(m, `认不出的命令形式：${cmd}`);
    const name = m[1] === 'test' ? 'test' : m[1];
    assert(pkg.scripts[name], `package.json 里没有这个 script：${name}（来自 ${cmd}）`);
  }
});

test('每道门引的测试都已在 run_all.js 注册（"有测试"不能是空话）', () => {
  const gates = [...a.crossCutting.map((g) => g.gate), ...a.logic.flatMap((l) => l.enforcedBy).filter((f) => f.startsWith('tests/'))];
  for (const g of gates) {
    assert(fs.existsSync(path.join(ROOT, g)), `门引的文件不存在：${g}`);
    const base = path.basename(g);
    assert(runAll.includes(base), `${g} 没在 tests/run_all.js 注册`);
  }
});

// ── 三、数据流与换域对照 ────────────────────────────────────

test('每条数据流至少四段，且首段是事实源、末段是产物', () => {
  assert(a.flows.length >= 4, `数据流只有 ${a.flows.length} 条`);
  for (const f of a.flows) {
    assert(f.chain.length >= 4, `${f.name} 的链太短：${f.chain.join(' → ')}`);
    assert(f.chain[0].startsWith('departments/') || f.chain[0].startsWith('standards/'),
      `${f.name} 的链首不是事实源：${f.chain[0]}`);
    for (const seg of f.chain) {
      assert(!seg.startsWith('scripts/build_embeddings.js') || f.name.includes('检索'),
        `${f.name} 混进了不相干的段：${seg}`);
    }
  }
});

test('换域对照表覆盖"改了哪一层"，且至少含一条运行时的改动', () => {
  assert(a.transposition.length >= 5, `对照表只有 ${a.transposition.length} 条`);
  for (const t of a.transposition) {
    assert(t.layer, `${t.ref} 没写落在哪层`);
    assert(t.change && t.change.length > 4, `${t.ref} 没写改了什么`);
  }
  assert(a.transposition.some((t) => t.change.includes('零第三方依赖') || t.layer === '横切'),
    '对照表里没有运行时/横切层的改动 —— 那样会漏掉"换语言栈"这件最大的事');
});

test('三份文档不重复写同一条事实（不变量只写在 PORTING.md）', () => {
  const md = fs.readFileSync(path.join(ROOT, 'ARCHITECTURE.md'), 'utf8');
  assert(!/产物恰好两个文件：/.test(md) || md.includes('PORTING.md'),
    'ARCHITECTURE.md 复述了不变量的全文 —— 应该只指路，不重复');
  assert(md.includes('PORTING.md') && md.includes('FORKING.md'), 'ARCHITECTURE.md 没有指路另外两份');
});

// ── 四、产物不许漂移 ────────────────────────────────────────

test('ARCHITECTURE.md 与 architecture.json 一致（不漂移）', () => {
  const { render } = require('../scripts/build_architecture.js');
  const want = render(a);
  const got = fs.readFileSync(path.join(ROOT, 'ARCHITECTURE.md'), 'utf8');
  assert(want === got, 'ARCHITECTURE.md 漂移了 —— 跑 `node scripts/build_architecture.js`');
});

test('ARCHITECTURE.md 不许被手改（首行有渲染器标记）', () => {
  const md = fs.readFileSync(path.join(ROOT, 'ARCHITECTURE.md'), 'utf8');
  assert(md.startsWith('<!-- 本文件由 scripts/build_architecture.js'), '缺"由脚本渲染"标记');
});

test('依赖方向图必须写明"反向引用 = bug"（这是单向派生的可见承诺）', () => {
  const { diagram } = require('../scripts/build_architecture.js');
  const d = diagram();
  assert(d.includes('反向引用 = bug'), '图里没写反向引用的后果');
  assert(d.includes('L0') && d.includes('L3'), '图里没有分层');
});

console.log(`\n  ${passed} 通过 · ${failures.length} 失败`);
if (failures.length) {
  console.log('\n失败明细:');
  for (const f of failures) console.log(`  ✗ ${f.name}\n    ${f.msg}`);
  process.exit(1);
}
console.log('\n✅ 逻辑架构通过');

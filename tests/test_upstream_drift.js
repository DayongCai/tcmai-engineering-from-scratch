#!/usr/bin/env node
/**
 * tests/test_upstream_drift.js —— 上游漂移哨兵的**静默契约**
 *
 * 这个哨兵的全部价值在一条契约上：**没变化就一个字都不输出**。
 * 那条契约错了会怎样？
 *   · 该静默时说话 → 每 8 小时一条"上游没变"，人会去关通知 → 哨兵废掉；
 *   · 该说话时静默 → 漂移无声无息地发生（上一版那个"报绿的跳过"就是这么坏的）。
 *
 * 两种都是**静默**的错，所以必须能单测 —— 而网络是不可控输入，不该进测试。
 * 于是判定逻辑被抽成纯函数 `render(recorded, live)`，这里直接喂构造数据。
 */

const D = require('../scripts/check_upstream_drift.js');

let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed += 1; console.log(`  ✓ ${name}`); }
  catch (e) { failures.push({ name, msg: e.message }); console.log(`  ✗ ${name}\n    ${e.message}`); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const rec = (scripts, head = 'aaaaaaa', headDate = '2026-10-14') => ({ scripts, head, headDate });

// ── 静默契约 ────────────────────────────────────────────────

test('**无变化 → 输出为空**（哨兵不许报"一切正常"）', () => {
  const r = rec(['a.py', 'b.py']);
  assert(D.render(r, { scripts: ['b.py', 'a.py'], head: 'aaaaaaa' }) === '',
    '无变化却说活了 —— 这正是会被关掉通知的那种噪音');
});

test('输出为空必须是**空串**，不是空白串（定时任务按空 stdout 判定不发送）', () => {
  const r = rec(['a.py']);
  const out = D.render(r, { scripts: ['a.py'], head: 'aaaaaaa' });
  assert(out === '', `应为空串，实得 ${JSON.stringify(out)}`);
  assert(out.length === 0, '长度必须为 0 —— 一个换行也会被当成有输出');
});

// ── 会说话的那三种情形 ──────────────────────────────────────

test('新增脚本 → 说话，并逐个列出', () => {
  const out = D.render(rec(['a.py']), { scripts: ['a.py', 'new1.py', 'new2.py'], head: 'bbbbbbb' });
  assert(out.includes('new1.py') && out.includes('new2.py'), `新增项没列出：${out}`);
  assert(out.includes('有变化'), '没点明"有变化"');
});

test('上游删脚本 → 说话（少一个也是变化）', () => {
  const out = D.render(rec(['a.py', 'gone.py']), { scripts: ['a.py'], head: 'bbbbbbb' });
  assert(out.includes('gone.py'), `上游已删项没列出：${out}`);
});

test('只有 HEAD 变了（脚本数没变）→ 也要说话', () => {
  const out = D.render(rec(['a.py'], 'oldsha1'), { scripts: ['a.py'], head: 'newsha2' });
  assert(out !== '', 'HEAD 变了却静默 —— 上游改了什么就看不见了');
  assert(out.includes('oldsha1') && out.includes('newsha2'), `没写出 HEAD 变化：${out}`);
});

test('说话时必须给出"怎么吸收"的命令（否则只是抱怨）', () => {
  const out = D.render(rec(['a.py']), { scripts: ['a.py', 'n.py'], head: 'bbb' });
  assert(out.includes('npm run porting -- --measure'), `没给出吸收办法：${out}`);
});

// ── 整条路径可测（含测量环节）─────────────────────────────────
//
// 只测纯函数 render 是不够的：**测量环节自己漏了一句 console.log**（「← fetch 上游最新」），
// 而定时任务把脚本 stdout 原样发出 —— 那等于每 8 小时一条噪音。
// 下面两条就是照这个坑写的。

test('整条路径：注入"无变化"的测量 → run() 返回空串（不是空行）', () => {
  const map = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', 'porting-map.json'), 'utf8'));
  const up = map.reference.upstream;
  const out = D.run({ measure: () => ({ scripts: [...up.scripts], head: up.head, headDate: up.headDate }) });
  assert(out === '', `整条路径应为空串，实得 ${JSON.stringify(out)}`);
});

test('整条路径：注入"有变化"的测量 → run() 返回报告', () => {
  const out = D.run({
    measure: () => ({ scripts: ['brand-new.py'], head: 'zzzzzzz', headDate: '2026-10-15' }),
  });
  assert(out.includes('brand-new.py'), `整条路径没报出新增项：${out}`);
});

test('测量环节**一句话都不许说**（回归：曾经漏出「← fetch 上游最新」）', () => {
  const B = require('../scripts/build_porting_map.js');
  const orig = console.log;
  const captured = [];
  console.log = (...a) => captured.push(a.join(' '));
  try {
    // 缓存目录不存在 → 走 clone 分支（就是当初漏出那句的地方）；git 不存在 → 立刻抛错
    B.measureUpstream({ repoUrl: 'https://example.invalid/x', cacheDir: '.refcache-nonexistent', gitExe: 'definitely-not-git', quiet: true });
  } catch { /* 预期抛错，重点是**抛之前有没有打印** */ } finally {
    console.log = orig;
  }
  assert(captured.length === 0, `quiet:true 下仍然打印了：${JSON.stringify(captured)}`);
});

// ── drift 纯函数本身 ────────────────────────────────────────

test('drift：新增与删除分别算对，且与顺序无关', () => {
  const d = D.drift(['a', 'b', 'c'], ['c', 'b', 'n1', 'n2']);
  assert(d.scriptsAdded.join() === 'n1,n2', `新增算错：${d.scriptsAdded}`);
  assert(d.scriptsRemoved.join() === 'a', `删除算错：${d.scriptsRemoved}`);
  const same = D.drift(['a', 'b'], ['b', 'a']);
  assert(same.scriptsAdded.length === 0 && same.scriptsRemoved.length === 0, '同集合应无差');
});

test('drift：重复项不该被算成两次', () => {
  const d = D.drift(['a', 'a'], ['a']);
  assert(d.scriptsRemoved.length === 0, `重复项被算成删除了：${d.scriptsRemoved}`);
});

// ── 与真实账本的接口 ────────────────────────────────────────

test('账本里的 upstream 段结构齐全（哨兵依赖它做基线）', () => {
  const fs = require('fs');
  const path = require('path');
  const map = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'porting-map.json'), 'utf8'));
  const up = map.reference.upstream;
  assert(up, '缺 reference.upstream —— 哨兵没有基线，跑 npm run porting -- --measure');
  for (const k of ['head', 'headDate', 'scripts', 'measuredAt']) {
    assert(up[k] !== undefined, `reference.upstream 缺 ${k}`);
  }
  assert(up.scripts.length > 0, 'upstream.scripts 为空');
  assert(map.reference.upstreamRepoUrl, '缺 upstreamRepoUrl，哨兵不知道去量哪个仓库');
});

test('哨兵用真实账本跑一次 render 应为静默（本机缓存与账本一致时）', () => {
  const fs = require('fs');
  const path = require('path');
  const map = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'porting-map.json'), 'utf8'));
  const up = map.reference.upstream;
  // 拿账本自己当"上游"喂进去 → 必然无变化 → 必须静默
  const out = D.render(up, { scripts: [...up.scripts], head: up.head });
  assert(out === '', '拿账本自己喂进去竟然说话了 —— 说明比较逻辑有假阳性');
});

console.log(`\n  ${passed} 通过 · ${failures.length} 失败`);
if (failures.length) {
  console.log('\n失败明细:');
  for (const f of failures) console.log(`  ✗ ${f.name}\n    ${f.msg}`);
  process.exit(1);
}
console.log('\n✅ 上游漂移哨兵通过');

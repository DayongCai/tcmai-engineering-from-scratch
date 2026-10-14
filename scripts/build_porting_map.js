#!/usr/bin/env node
/**
 * scripts/build_porting_map.js —— 渲染 PORTING.md（全链路账本）
 *
 * 为什么要有渲染器而不是手写文档：**账本会烂**。
 * 工具链一改（新增脚本、拆分子测试套件），手写的对照表就悄悄过期，而没人会去核对
 * 一张已经"看起来对"的表。所以：`porting-map.json` 是源，本脚本渲染，测试查漂移。
 *
 *   node scripts/build_porting_map.js            # 写出 PORTING.md
 *   node scripts/build_porting_map.js --check    # 只校验是否漂移（CI 用）
 *
 * 与 build_outputs_index.js 同一套做法：**产物不许漂移**。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'porting-map.json');
const OUT = path.join(ROOT, 'PORTING.md');

const STATUS_CN = {
  ported: '移植',
  extended: '移植+扩写',
  split: '拆分',
  merged: '合并',
  'ported+extended': '移植+扩写',
};

function render(map) {
  const r = map.reference;
  const L = [];
  L.push('<!-- 本文件由 scripts/build_porting_map.js 从 porting-map.json 渲染，请勿手改。 -->');
  L.push('');
  L.push('# 全链路账本：参考 ai-engineering-from-scratch → 本仓库');
  L.push('');
  L.push('这份文档回答一个问题：**本仓库的哪一块，是从参考项目的哪一块来的，中途改了什么。**');
  L.push('');
  L.push(`参考快照实测路径：\`${r.measuredPath}\`（量于 ${r.measuredAt}）`);
  L.push('');
  L.push(`> ${r.note}`);
  L.push('');
  L.push('**账本不是散文**：本文每个「本仓库」路径与每条 `evidence` 都由 `tests/test_porting_map.js`');
  L.push('在文件系统上验真，本文自身也由渲染器查漂移。参考仓库不在本机时，新鲜度比对跳过，');
  L.push('结构比对不受影响。');
  L.push('');

  // ── 一、参考侧实测清单 ──
  L.push('## 一、参考侧实测清单（不引用记忆，全部现场列目录）');
  L.push('');
  L.push('| 项 | 内容 |');
  L.push('|---|---|');
  L.push(`| scripts/ | ${r.inventory.scripts.map((s) => `\`${s}\``).join(' · ')} |`);
  L.push(`| 结构 | ${r.inventory.structure} |`);
  L.push(`| 根文档 | ${r.inventory.rootDocs.map((s) => `\`${s}\``).join(' · ')} |`);
  L.push(`| 目录 | ${r.inventory.dirs.map((s) => `\`${s}\``).join(' · ')} |`);
  L.push(`| 运行时 | ${r.inventory.runtime} |`);
  L.push('');

  // ── 二、三个不变量 ──
  L.push('## 二、先定的三个不变量（换域时唯一不能动的东西）');
  L.push('');
  L.push('| 不变量 | 参考 | 本仓库 | 为什么是它 |');
  L.push('|---|---|---|---|');
  for (const iv of map.invariants) {
    L.push(`| **${iv.name}** | ${iv.ref} | ${iv.ours} | ${iv.why} |`);
  }
  L.push('');

  // ── 三、结构映射 ──
  L.push('## 三、结构映射');
  L.push('');
  L.push('| 参考 | 本仓库 | 关系 | 说明 |');
  L.push('|---|---|---|---|');
  for (const s of map.structure) {
    L.push(`| ${s.ref} | ${s.ours} | ${s.relation} | ${s.note} |`);
  }
  L.push('');

  // ── 四、工具链映射 ──
  L.push('## 四、工具链映射（逐个脚本）');
  L.push('');
  L.push('| 参考 | 本仓库 | 状态 | 守它的测试 |');
  L.push('|---|---|---|---|');
  for (const t of map.toolchain) {
    const ours = t.ours.map((o) => `\`${o}\``).join('<br>');
    L.push(`| \`${t.ref}\` | ${ours} | ${STATUS_CN[t.status] || t.status} | ${t.evidence ? `\`${t.evidence}\`` : '—'} |`);
  }
  L.push('');
  L.push('### 逐条说明');
  L.push('');
  for (const t of map.toolchain) {
    L.push(`**\`${t.ref}\` → ${t.ours.map((o) => `\`${o}\``).join(' + ')}**（${STATUS_CN[t.status] || t.status}）`);
    L.push('');
    L.push(t.note);
    L.push('');
  }

  // ── 五、未移植 ──
  L.push('## 五、未移植的（**显式记账，不是遗忘**）');
  L.push('');
  L.push('| 参考 | 为什么没要 |');
  L.push('|---|---|');
  for (const d of map.dropped) L.push(`| \`${d.ref}\` | ${d.why} |`);
  L.push('');

  // ── 六、本仓库新增 ──
  L.push('## 六、本仓库新增（参考里没有对应物）');
  L.push('');
  L.push(`共 ${map.ourAdditions.length} 个。换域之后必然长出来的东西 —— 参考是 AI 工程课，`);
  L.push('本仓库是中医药教育体系，源材料是 xlsx/docx、交付物是平台与教材，工具链自然会分叉。');
  L.push('');
  L.push('| 路径 | 为什么 |');
  L.push('|---|---|');
  for (const a of map.ourAdditions) L.push(`| \`${a.path}\` | ${a.why} |`);
  L.push('');

  // ── 七、质量门 ──
  L.push('## 七、质量门（参考「不能省的四条」+ 本仓库加的一条）');
  L.push('');
  L.push('| 门 | 命令 | 守它的测试 |');
  L.push('|---|---|---|');
  for (const g of map.gates) L.push(`| ${g.name} | \`${g.cmd}\` | \`${g.evidence}\` |`);
  L.push('');
  L.push('`npm run check` 串起前四条；`npm test` 是全套。');
  L.push('');

  // ── 八、怎么用这份账本 ──
  L.push('## 八、怎么用这份账本');
  L.push('');
  L.push('1. **参考项目更新了** → 跑 `tests/test_porting_map.js`：它会把参考 `scripts/` 的现场清单');
  L.push('   与账本里的清单比对，**多出新脚本就报错**（新东西不会被静默忽略）。');
  L.push('2. **本仓库改了工具链** → 改 `porting-map.json` 后跑 `node scripts/build_porting_map.js`，');
  L.push('   再跑测试。删了文件却没改账本，测试会红。');
  L.push('3. **照着参考造第三门课** → 先读 `FORKING.md`（规程），再读这份账本（先例：哪一步实际改了什么、为什么改）。');
  L.push('');
  return `${L.join('\n')}\n`;
}

function main() {
  const check = process.argv.includes('--check');
  const map = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  const md = render(map);
  if (check) {
    const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (cur !== md) {
      console.error('✗ PORTING.md 与 porting-map.json 不一致（漂移）。跑 `node scripts/build_porting_map.js` 重生成。');
      process.exit(1);
    }
    console.log('✅ PORTING.md 与账本一致');
    return;
  }
  fs.writeFileSync(OUT, md, 'utf8');
  console.log(`  → ${path.relative(ROOT, OUT)}（${md.length} 字符）`);
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(`\n✗ ${e.message}`); process.exit(1); }
}

module.exports = { render };

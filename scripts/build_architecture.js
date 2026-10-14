#!/usr/bin/env node
/**
 * scripts/build_architecture.js —— 渲染 ARCHITECTURE.md（逻辑架构）
 *
 * 与 PORTING.md 同一套做法：`architecture.json` 是源，本脚本渲染，测试查漂移。
 * 三份文档分工（别重复写同一件事实）：
 *   FORKING.md      规程 —— 照着参考造一门新课，怎么做
 *   PORTING.md      账本 —— 参考的哪一块对应本仓库的哪一块，逐个列
 *   ARCHITECTURE.md 逻辑 —— 靠哪几条逻辑立住，换域时哪一层动、哪一层不动
 *
 * 用法：
 *   node scripts/build_architecture.js            # 写出 ARCHITECTURE.md
 *   node scripts/build_architecture.js --check    # 只校验是否漂移（CI 用）
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'architecture.json');
const OUT = path.join(ROOT, 'ARCHITECTURE.md');

/** 依赖方向图（ASCII，纯文本 —— 图也要能被 diff） */
function diagram() {
  return [
    '```',
    '  L0 事实源（不可再生）          横切门禁（对每层各一道）',
    '  ┌──────────────────────┐       ┌────────────────────────┐',
    '  │ departments/         │       │ L0 数据  npm run audit  │',
    '  │ standards/**/sources │◄──────┤ L1 结构                 │',
    '  │ data/icd11/          │  只读  │ L2 契约                 │',
    '  └──────────┬───────────┘       │ L3 内容                 │',
    '             │ 派生（单向）        │ 计数 / 链接 / 不漂移     │',
    '             ▼                    └────────────────────────┘',
    '  L1 投影 / 索引（可重跑）                  ▲',
    '  ┌──────────────────────┐                 │ 每层各查一次',
    '  │ curriculum.json      │                 │',
    '  │ catalog.json         │─────────────────┘',
    '  └──────────┬───────────┘',
    '             │ 渲染（单向）',
    '             ▼',
    '  L2 内容（人写）    L3 交付物（两类）',
    '  ┌──────────────┐   ┌──────────────────────┐',
    '  │ docs/zh.md   │──►│ site/     [tcmP] 平台 │',
    '  │ quiz.json    │   │ textbooks/build/ 教材 │',
    '  │ outputs/     │──►│ outputs/  产物索引    │',
    '  └──────────────┘   └──────────────────────┘',
    '',
    '  反向引用 = bug：派生件一旦被当成输入，"重跑一次构建"就不再可预测。',
    '```',
  ].join('\n');
}

function render(a) {
  const L = [];
  L.push('<!-- 本文件由 scripts/build_architecture.js 从 architecture.json 渲染，请勿手改。 -->');
  L.push('');
  L.push('# 逻辑架构：参考 ai-engineering-from-scratch → 本仓库');
  L.push('');
  L.push(a.oneLine);
  L.push('');
  L.push('**三份文档，各管一件事**（同一条事实只写一处）：');
  L.push('');
  L.push('| 文档 | 管什么 |');
  L.push('|---|---|');
  for (const [doc, what] of Object.entries(a.$relation)) L.push(`| \`${doc}\` | ${what} |`);
  L.push('');

  // ── 一、四条逻辑 ──
  L.push('## 一、这套架构靠四条逻辑立住');
  L.push('');
  L.push('参考项目与换域后的本仓库共用这四条 —— **换域换的是词，不是逻辑**。');
  L.push('');
  for (const l of a.logic) {
    L.push(`### ${l.id} · ${l.name}`);
    L.push('');
    L.push(`**主张**：${l.claim}`);
    L.push('');
    L.push(`**为什么**：${l.why}`);
    L.push('');
    L.push(`**谁守着它**：${l.enforcedBy.map((f) => `\`${f}\``).join(' · ')}`);
    L.push('');
    L.push(`**证据**：${l.evidence}`);
    L.push('');
  }

  // ── 二、分层 ──
  L.push('## 二、分层与各层的门');
  L.push('');
  L.push(diagram());
  L.push('');
  L.push('| 层 | 本仓库 | 参考对应 | 门 |');
  L.push('|---|---|---|---|');
  for (const x of a.layers) {
    L.push(`| **${x.id} ${x.name}** | ${x.ours.map((p) => `\`${p}\``).join(' · ')} | ${x.ref} | \`${x.gate}\` |`);
  }
  L.push('');
  for (const x of a.layers) {
    L.push(`- **${x.id} ${x.name}**：${x.note}`);
  }
  L.push('');

  // ── 三、横切门 ──
  L.push('## 三、横切门（不挂在某一层上）');
  L.push('');
  L.push('| 门 | 命令 | 守它的测试 |');
  L.push('|---|---|---|');
  for (const g of a.crossCutting) L.push(`| ${g.name} | \`${g.cmd}\` | \`${g.gate}\` |`);
  L.push('');
  L.push('`npm run check` 串起审计 + 计数 + 链接 + 两条「不漂移」检查。');
  L.push('');

  // ── 四、数据流 ──
  L.push('## 四、四条数据流（架构在运行时的样子）');
  L.push('');
  for (const f of a.flows) {
    L.push(`### ${f.name}`);
    L.push('');
    L.push(`\`${f.chain.join('  →  ')}\``);
    L.push('');
    L.push(f.note);
    L.push('');
  }

  // ── 五、换域对照 ──
  L.push('## 五、换域时动的是哪一层');
  L.push('');
  L.push('这张表是「层不动、词替换」的逐条落地 —— **改动集中在工具层与域词，契约层几乎不动**。');
  L.push('');
  L.push('| 参考 | 本仓库 | 落在哪层 | 改了什么 |');
  L.push('|---|---|---|---|');
  for (const t of a.transposition) {
    L.push(`| ${t.ref} | ${t.ours} | ${t.layer} | ${t.change} |`);
  }
  L.push('');
  L.push(`> ${a.invariantsNote}`);
  L.push('');
  return `${L.join('\n')}\n`;
}

function main() {
  const check = process.argv.includes('--check');
  const a = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  const md = render(a);
  if (check) {
    const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (cur !== md) {
      console.error('✗ ARCHITECTURE.md 与 architecture.json 不一致（漂移）。跑 `node scripts/build_architecture.js` 重生成。');
      process.exit(1);
    }
    console.log('✅ ARCHITECTURE.md 与架构源一致');
    return;
  }
  fs.writeFileSync(OUT, md, 'utf8');
  console.log(`  → ${path.relative(ROOT, OUT)}（${md.length} 字符）`);
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(`\n✗ ${e.message}`); process.exit(1); }
}

module.exports = { render, diagram };

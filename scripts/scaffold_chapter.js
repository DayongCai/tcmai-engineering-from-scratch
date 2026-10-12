#!/usr/bin/env node
/**
 * scaffold_chapter.js — 生成单个章节的契约骨架（docs/zh.md + code + quiz.json + outputs/）
 *
 *   node scripts/scaffold_chapter.js <deptSlug>/<subjectSlug> <NN-slug> "章节标题"
 *
 * 生成后必须手工写内容；脚手架只保证契约形状正确，能通过 audit。
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT, loadCurriculum, writeJson } = require('./lib');

const [target, chapterSlug, ...titleParts] = process.argv.slice(2);

if (!target || !chapterSlug) {
  console.error('用法: node scripts/scaffold_chapter.js <deptSlug>/<subjectSlug> <NN-slug> [章节标题]');
  process.exit(1);
}
if (!/^\d{2}-[a-z0-9-]+$/.test(chapterSlug)) {
  console.error(`✗ 章节目录名必须形如 NN-english-slug，收到: ${chapterSlug}`);
  process.exit(1);
}

const cur = loadCurriculum();
const flat = cur.departments.flatMap((d) => d.subjects);
const [deptSlug, subjectSlug] = target.includes('/') ? target.split('/') : [null, target];
const subject = deptSlug
  ? flat.find((s) => s.deptSlug === deptSlug && s.slug === subjectSlug)
  : flat.find((s) => s.slug === subjectSlug);

if (!subject) {
  console.error(`✗ 未在 curriculum.json 中找到学科: ${target}`);
  process.exit(1);
}

const title = titleParts.join(' ') || chapterSlug.replace(/^\d{2}-/, '').replace(/-/g, ' ');
const n = chapterSlug.slice(0, 2);
const dir = path.join(ROOT, subject.path, 'chapters', chapterSlug);

if (fs.existsSync(dir)) {
  console.error(`✗ 已存在: ${subject.path}/chapters/${chapterSlug}`);
  process.exit(1);
}

fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
fs.mkdirSync(path.join(dir, 'code'), { recursive: true });
fs.mkdirSync(path.join(dir, 'outputs'), { recursive: true });

const stage = cur.stages.find((x) => x.id === subject.stageId);

fs.writeFileSync(
  path.join(dir, 'docs', 'zh.md'),
  `# 第 ${Number(n)} 章 · ${title}

> **MOTTO:** 【一句经典原文或核心箴言】
>
> **PROBLEM:** 【一句话点明学习者的痛点】
>
> **双根因定位:** 环境逼迫(“【具体场景的压力】”) + 知识积累(【知识点 A】×【知识点 B】 = 【涌现能力】)

## 课程信息

| 项目 | 内容 |
|------|------|
| 学科 | ${subject.title} |
| 院系 | ${subject.deptTitle} |
| 章序号 | ${n} / ${subject.chapters} |
| 所属阶段 | ${stage.glyph} ${stage.title}·${stage.sub} |
| 产出类型 | ${stage.artifact} |
| 预估时长 | 【X】 小时 |

## 课程结构

\`\`\`text
MOTTO  →  PROBLEM  →  CONCEPT  →  BUILD IT  →  USE IT  →  SHIP IT
一句话      痛点      原理+图解    从零实现     框架调用    产出工具
\`\`\`

## 学习目标

- 【动词开头，4–6 条】

## 核心概念

### 中医：【核心中医概念】

【3–5 句话，必须引用可核查的经典条文或教材定义】

### AI / 工程：【对应的技术概念】

【3–5 句话，说明数学形式与直觉】

### 对应关系

| 中医概念 | AI/工程概念 | 桥梁（为什么可以这样翻译） |
|---------|------------|--------------------------|
| 【概念 1】 | 【概念 1】 | 【转化逻辑，必须可回指】 |
| 【概念 2】 | 【概念 2】 | 【转化逻辑】 |

> 本学科桥梁：${subject.bridge}

\`\`\`mermaid
graph LR
  A[中医概念] --> B[形式化表示]
  B --> C[算法实现]
  C --> D[可验证结论]
  D -.->|回指校验| A
\`\`\`

## BUILD IT：从零实现

\`\`\`javascript
// 【关键代码，中文注释，只用标准库 / 白名单依赖】
\`\`\`

## USE IT：框架调用

\`\`\`javascript
// 【用成熟库验证同一件事，证明 BUILD IT 的结论正确】
\`\`\`

## SHIP IT：产出物

- [📋 Prompt 模板](outputs/prompt-${chapterSlug.replace(/^\d{2}-/, '')}.md)
- [🛠️ Skill 文件](outputs/skill-${chapterSlug.replace(/^\d{2}-/, '')}.md)

## 验证

\`\`\`bash
node code/main.js
# Expected: 【预期输出，退出码 0】
\`\`\`

## 练习

见 [exercises.md](exercises.md)。

## 进阶思考

1. 如果扩大数据规模会怎样？
2. 这个模型在哪些临床场景会失效？
3. 如何融入更多辨证维度？
`,
  'utf8'
);

fs.writeFileSync(
  path.join(dir, 'code', 'main.js'),
  `#!/usr/bin/env node
/**
 * ${subject.title} · 第 ${Number(n)} 章 ${title}
 * 课程: ${subject.path}/chapters/${chapterSlug}/docs/zh.md
 * 依赖: Node.js 标准库（白名单见 CONTRIBUTING.md）
 */

'use strict';

function main() {
  console.log('═══ ${title} ═══');
  console.log('【TODO: 从零实现本课核心算法，自终止，退出码 0】');
}

if (require.main === module) {
  main();
}

module.exports = { main };
`,
  'utf8'
);

fs.writeFileSync(
  path.join(dir, 'code', 'main.test.js'),
  `#!/usr/bin/env node
/**
 * ${title} — 确定性单元测试（>= 5 项）
 * 运行: node code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const { main } = require('./main');

test('main 可调用且不抛异常', () => { assert.doesNotThrow(() => main()); });
test('TODO-1', () => { assert.ok(true); });
test('TODO-2', () => { assert.ok(true); });
test('TODO-3', () => { assert.ok(true); });
test('TODO-4', () => { assert.ok(true); });
`,
  'utf8'
);

writeJson(path.join(dir, 'quiz.json'), {
  lesson: chapterSlug,
  title,
  subject: subject.slug,
  questions: [
    { stage: 'pre', question: '【前置自测：本课需要你已经会什么？】', options: ['A', 'B', 'C', 'D'], correct: 0, explanation: '' },
    { stage: 'check', question: '【过程检查 1】', options: ['A', 'B', 'C', 'D'], correct: 1, explanation: '' },
    { stage: 'check', question: '【过程检查 2】', options: ['A', 'B', 'C', 'D'], correct: 2, explanation: '' },
    { stage: 'check', question: '【过程检查 3】', options: ['A', 'B', 'C', 'D'], correct: 3, explanation: '' },
    { stage: 'post', question: '【课后检验 1：能否迁移到新场景？】', options: ['A', 'B', 'C', 'D'], correct: 0, explanation: '' },
    { stage: 'post', question: '【课后检验 2：临床/工程边界在哪里？】', options: ['A', 'B', 'C', 'D'], correct: 1, explanation: '' },
  ],
});

fs.writeFileSync(
  path.join(dir, 'exercises.md'),
  `# ${title} · 练习\n\n1. 【基础：复现本课代码，改变一个参数并解释结果】\n2. 【进阶：换一个中医证候/经典条文，重跑同一套方法】\n3. 【挑战：设计一个可以放进临床工作流的产出物】\n`,
  'utf8'
);

fs.writeFileSync(
  path.join(dir, 'outputs', `prompt-${chapterSlug.replace(/^\d{2}-/, '')}.md`),
  `# Prompt · ${title}\n\n> 学科: ${subject.title} · 章节: ${chapterSlug}\n\n## 用途\n\n【一句话】\n\n## 系统提示\n\n\`\`\`text\n【TODO】\n\`\`\`\n\n## 输入 / 输出契约\n\n| 输入 | 类型 | 说明 |\n|---|---|---|\n| 【字段】 | 【类型】 | 【说明】 |\n\n## 校验\n\n- [ ] 输出必须能回指到中医原文或教材定义\n- [ ] 输出包含不确定性说明\n`,
  'utf8'
);

fs.writeFileSync(
  path.join(dir, 'outputs', `skill-${chapterSlug.replace(/^\d{2}-/, '')}.md`),
  `---\nname: ${chapterSlug.replace(/^\d{2}-/, '')}\ndescription: 【何时使用 + 做什么，57 字内触发】\n---\n\n# ${title}\n\n## 何时使用\n\n【触发条件】\n\n## 步骤\n\n1. 【步骤】\n\n## 验证\n\n- [ ] 【可核查的验收条件】\n`,
  'utf8'
);

// 更新学科 chapters.json 索引
const idxPath = path.join(ROOT, subject.path, 'chapters.json');
let idx = { slug: subject.slug, title: subject.title, chapters: [] };
if (fs.existsSync(idxPath)) {
  try { idx = JSON.parse(fs.readFileSync(idxPath, 'utf8')); } catch { /* 重建 */ }
}
if (!idx.chapters.some((c) => c.slug === chapterSlug)) {
  idx.chapters.push({ n: Number(n), slug: chapterSlug, title, status: '🚧' });
  idx.chapters.sort((a, b) => a.n - b.n);
}
writeJson(idxPath, idx);

// 同步 meta.json
const metaPath = path.join(ROOT, subject.path, 'meta.json');
if (fs.existsSync(metaPath)) {
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  meta.chapters = idx.chapters;
  if (meta.textbook) meta.textbook.status = 'wip';
  if (meta.platform && meta.platform.status === 'planned') meta.platform.status = 'wip';
  writeJson(metaPath, meta);
}

console.log(`  ✅ ${subject.path}/chapters/${chapterSlug}`);
console.log(`     docs/zh.md · code/main.js · code/main.test.js · quiz.json · exercises.md · outputs/×2`);
console.log(`     下一步: 填写 docs/zh.md 的 MOTTO/PROBLEM/环境逼迫/知识积累，然后 node scripts/audit_curriculum.js`);

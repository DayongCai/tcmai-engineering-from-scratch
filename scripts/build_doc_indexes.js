#!/usr/bin/env node
/**
 * build_doc_indexes.js — 由 curriculum.json 生成院系索引文件
 *
 *   departments/README.md          九院系总览 + 学期排课视图
 *   departments/NN-slug/README.md  单院系学科清单（含文件系统探测的进度）
 *
 * 生成物，勿手工编辑。CI 在 main 分支上重建。
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT, STATUS, loadCurriculum, semesterPlan, subjectStatus, writeJson } = require('./lib');

const cur = loadCurriculum();
const plan = semesterPlan(cur);

function glyph(u) {
  return u === '✅' ? '✅' : u === '🚧' ? '🚧' : '⬚';
}

// ── departments/README.md ──
let out = `# 九院系 · 院系地图

> 1 领域（中医药）· ${cur.counts.departments} 院系 · ${cur.counts.subjects} 学科 · ${cur.domain.scale.semesters} 学期 · ${cur.stages.length} 阶段

## 生长壮老已 × 学期

\`\`\`mermaid
graph LR
  A["🌱 生<br/>第1-4学期<br/>大一–大二"] --> B["🌿 长<br/>第5-6学期<br/>大三"]
  B --> C["🌳 壮<br/>第7-8学期<br/>大四"]
  C --> D["🍂 老<br/>第9学期<br/>大五上"]
  D --> E["🔄 已<br/>第10学期<br/>大五下"]
\`\`\`

## 院系总览

| # | 院系 | 学科 | 学时 | 章节目标 | 已建章节 | 状态 |
|---|------|------|------|---------|---------|------|
`;

for (const d of cur.departments) {
  const st = d.subjects.map(subjectStatus);
  const built = st.reduce((a, x) => a + x.built, 0);
  const done = st.filter((x) => x.status === 'done').length;
  const s = done === d.subjects.length ? STATUS.DONE : built > 0 ? STATUS.WIP : STATUS.PLANNED;
  out += `| ${d.n} | ${d.icon} [${d.title}](${d.slug}/) | ${d.subjects.length} | ${d.hours} | ${d.chapters} | ${built} | ${s} |\n`;
}

out += `\n## 学期排课视图

| 学期 | 阶段 | 学年 | 学科数 | 学时 | 章节目标 |
|------|------|------|-------|------|---------|
`;
for (const p of plan) {
  out += `| 第 ${p.semester} 学期 | ${p.stage.glyph} ${p.stage.title}·${p.stage.sub} | ${p.stage.years} | ${p.subjects.length} | ${p.hours} | ${p.chapters} |\n`;
}

out += `\n### 各学期学科明细\n`;
for (const p of plan) {
  out += `\n#### 第 ${p.semester} 学期 · ${p.stage.glyph}${p.stage.title}（${p.subjects.length} 门 / ${p.hours} 学时）\n\n`;
  if (!p.subjects.length) {
    out += `_本阶段为临床轮转 / 毕业设计，不安排常规学科_\n`;
    continue;
  }
  out += `| 学科 | 院系 | 类型 | 学时 |\n|------|------|------|------|\n`;
  for (const s of p.subjects) {
    // s.path 是**仓库根相对**的（departments/NN-dept/NN-subject），
    // 但本文件在 departments/ 下，markdown 按文件所在目录解析，
    // 所以必须去掉前导 `departments/`，否则全体指向 departments/departments/…（实测 121 条全断）。
    const rel = s.path.replace(/^departments\//, '');
    out += `| [${s.title}](${rel}/) | ${s.deptTitle} | ${s.type} | ${s.hours} |\n`;
  }
}

out += `\n## 排课负载说明

学期负载在课程表设计中天然不均衡（第 6 学期最高），因为本表按**院系主修**横向切分。
实际教学由 \`learning-paths/*.json\` 中的学分路径与跨院系选修规则再做配平，
详见 [learning-paths/](../learning-paths/README.md)。
`;

fs.writeFileSync(path.join(ROOT, 'departments', 'README.md'), out, 'utf8');
console.log('  ✅ departments/README.md');

// ── per-department README ──
for (const d of cur.departments) {
  const deptDir = path.join(ROOT, d.path);
  fs.mkdirSync(deptDir, { recursive: true });

  const st = d.subjects.map(subjectStatus);
  const built = st.reduce((a, x) => a + x.built, 0);

  let s = `# ${d.icon} ${d.title}\n\n`;
  s += `> **${d.en}** · ${d.focus}\n\n`;
  s += `| 指标 | 数值 |\n|------|------|\n`;
  const electiveN = d.subjects.filter((x) => x.elective).length;
  const requiredN = d.subjects.length - electiveN;
  s += `| 学科数 | ${d.subjects.length}（必修 ${requiredN}${electiveN ? ` + 选修 ${electiveN}` : ''}） |\n| 总学时 | ${d.hours} |\n| 章节目标 | ${d.chapters} |\n`;
  s += `| 已建章节 | ${built} |\n| 涉及学期 | ${[...new Set(d.subjects.map((x) => x.semester))].sort((a, b) => a - b).map((x) => `第${x}`).join(', ')} |\n\n`;

  s += `## 学科清单\n\n`;
  s += `| # | 学科 | 英文名 | 类型 | 学期 | 学时 | 章节 | 中医 → AI 桥梁 | 进度 |\n`;
  s += `|---|------|--------|------|------|------|------|--------------|------|\n`;
  for (let i = 0; i < d.subjects.length; i += 1) {
    const sub = d.subjects[i];
    const x = st[i];
    // 选修课按内容相关性挂在院系下，必须标出来 —— 不标会让读者以为管理系必修有 24 门
    s += `| ${String(sub.n).padStart(2, '0')} | [${sub.title}](${sub.slug}/) | ${sub.en} | ${sub.type}${sub.elective ? '（选修）' : ''} | ${sub.semester} | ${sub.hours} | ${x.built}/${sub.chapters} | ${sub.bridge} | ${x.glyph} |\n`;
  }

  s += `\n## 类型分布\n\n`;
  const byType = {};
  for (const sub of d.subjects) byType[sub.type] = (byType[sub.type] || 0) + 1;
  s += `| 类型 | 数量 | 交付侧重 |\n|------|------|---------|\n`;
  const typeNote = {
    Core: '理论与方法主干，[textbooks] 教材优先',
    Build: '从零构建，[tcmP] 视频 + 可运行代码优先',
    Reference: '术语与脉络，[textbooks] 工具书优先',
    Clinic: '临床能力，[tcmP] 案例视频 + [textbooks] 案例集优先',
  };
  for (const [t, n] of Object.entries(byType)) s += `| ${t} | ${n} | ${typeNote[t] || ''} |\n`;

  s += `\n## 学科创建\n\n\`\`\`bash\nnode scripts/scaffold_subject.js --all\nnode scripts/scaffold_chapter.js ${d.slug}/<subject-slug> 01-<chapter-slug> "章节标题"\n\`\`\`\n\n`;
  s += `← [返回九院系总览](../README.md)\n`;

  fs.writeFileSync(path.join(deptDir, 'README.md'), s, 'utf8');
  console.log(`  ✅ ${d.path}/README.md`);
}

console.log(`\n完成: 1 个总览 + ${cur.departments.length} 个院系索引`);

#!/usr/bin/env node
/**
 * build_roadmap.js — 生成 ROADMAP.md（院系 / 学科 / 章节 三层状态追踪 + 学期视图）
 *
 * 状态字形与 site/ 共用，勿改形状: ✅ 完成 · 🚧 进行中 · ⬚ 计划
 * 生成物，勿手工编辑。
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT, STATUS, loadCurriculum, semesterPlan, subjectStatus } = require('./lib');

const cur = loadCurriculum();
const plan = semesterPlan(cur);
const flat = cur.departments.flatMap((d) => d.subjects);
const st = flat.map(subjectStatus);

const builtTotal = st.reduce((a, x) => a + x.built, 0);
const doneSubjects = st.filter((x) => x.status === 'done').length;
const wipSubjects = st.filter((x) => x.status === 'wip').length;
const totalHours = cur.counts.hours;

let out = `# Roadmap

全部院系、学科、章节的状态追踪。本文件由 \`scripts/build_roadmap.js\` 从
\`curriculum.json\` 与文件系统实测状态生成；**勿手工编辑**。

总计划学时 **${totalHours}** 小时 · 章节目标 **${cur.counts.chapters}** · 已建章节 **${builtTotal}**

**图例:** ${STATUS.DONE} 完成 &nbsp;·&nbsp; ${STATUS.WIP} 进行中 &nbsp;·&nbsp; ${STATUS.PLANNED} 计划

## 全局进度

| 维度 | 已完成 | 总量 | 完成率 |
|------|-------|------|-------|
| 院系 | — | ${cur.counts.departments} | — |
| 学科 | ${doneSubjects} | ${cur.counts.subjects} | ${((doneSubjects / cur.counts.subjects) * 100).toFixed(1)}% |
| 学科（进行中） | ${wipSubjects} | ${cur.counts.subjects} | ${((wipSubjects / cur.counts.subjects) * 100).toFixed(1)}% |
| 章节 | ${builtTotal} | ${cur.counts.chapters} | ${((builtTotal / cur.counts.chapters) * 100).toFixed(2)}% |

## 阶段视图（生长壮老已）

| 阶段 | 学期 | 学年 | 学科 | 学时 | 章节目标 | 已建章节 | 状态 |
|------|------|------|------|------|---------|---------|------|
`;

for (const stage of cur.stages) {
  const sems = new Set(stage.semesters);
  const rows = plan.filter((p) => sems.has(p.semester));
  const subs = rows.flatMap((p) => p.subjects);
  const built = subs.reduce((a, s) => {
    const i = flat.findIndex((x) => x.slug === s.slug);
    return a + st[i].built;
  }, 0);
  const target = subs.reduce((a, s) => a + s.chapters, 0);
  const g = built === target && target > 0 ? STATUS.DONE : built > 0 ? STATUS.WIP : STATUS.PLANNED;
  out += `| ${stage.glyph} ${stage.title}·${stage.sub} | ${stage.semesters.join(', ')} | ${stage.years} | ${subs.length} | ${rows.reduce((a, p) => a + p.hours, 0)} | ${target} | ${built} | ${g} |\n`;
}

out += `\n## 学期排课表\n\n`;
for (const p of plan) {
  const built = p.subjects.reduce((a, s) => {
    const i = flat.findIndex((x) => x.slug === s.slug);
    return a + st[i].built;
  }, 0);
  out += `### 第 ${p.semester} 学期 · ${p.stage.glyph}${p.stage.title}（${p.subjects.length} 门 / ${p.hours} 学时 / ${p.chapters} 章）\n\n`;
  if (!p.subjects.length) {
    out += `_临床轮转 / 毕业设计，不安排常规学科。_\n\n`;
    continue;
  }
  out += `| # | 学科 | 院系 | 类型 | 学时 | 章节 | 状态 |\n|---|---|------|------|------|------|------|\n`;
  for (const s of p.subjects) {
    const i = flat.findIndex((x) => x.slug === s.slug);
    const x = st[i];
    out += `| ${String(s.n).padStart(2, '0')} | [${s.title}](${s.path}/) | ${s.deptTitle} | ${s.type} | ${s.hours} | ${x.built}/${s.chapters} | ${x.glyph} |\n`;
  }
  out += `\n`;
}

out += `## 院系明细\n\n`;
for (const d of cur.departments) {
  const dSt = d.subjects.map(subjectStatus);
  const built = dSt.reduce((a, x) => a + x.built, 0);
  const g = built === d.chapters ? STATUS.DONE : built > 0 ? STATUS.WIP : STATUS.PLANNED;
  out += `### ${d.icon} ${d.title} — ${g}（${built}/${d.chapters} 章 · ${d.hours} 学时）\n\n`;
  out += `| # | 学科 | 学期 | 类型 | 学时 | 章节 | 视频 [tcmP] | 教材 [textbooks] | 状态 |\n`;
  out += `|---|---|------|------|------|------|-----------|---------------|------|\n`;
  for (const sub of d.subjects) {
    const i = flat.findIndex((x) => x.slug === sub.slug);
    const x = st[i];
    const metaPath = path.join(ROOT, sub.path, 'meta.json');
    let vids = 0;
    let words = 0;
    if (fs.existsSync(metaPath)) {
      try {
        const m = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        vids = m.platform?.videosPublished || 0;
        words = m.textbook?.words || 0;
      } catch { /* 忽略损坏的 meta */ }
    }
    out += `| ${String(sub.n).padStart(2, '0')} | [${sub.title}](${sub.path}/) | ${sub.semester} | ${sub.type} | ${sub.hours} | ${x.built}/${sub.chapters} | ${vids} | ${words} 字 | ${x.glyph} |\n`;
  }
  out += `\n`;
}

out += `## 下一步（按学期推进）

优先级 = 学期先后 × 阻塞下游的数量。当前焦点：

| 优先 | 任务 | 位置 |
|------|------|------|
| P0 | 补齐「中医基础理论」剩余章节（${subjectStatus(flat.find((s) => s.slug === '01-zhongyi-jichu-lilun')).built}/10） | \`departments/01-zhongyi/01-zhongyi-jichu-lilun/\` |
| P0 | 打通 [tcmP] 首集视频：讲稿 → TTS → MP4 → 课程页 | \`platform/courses/01-zhongyi/01-zhongyi-jichu-lilun/\` |
| P1 | 第 1 学期其余 2 门学科（医古文、中国医学史）开章 | \`departments/01-zhongyi/\` |
| P1 | 「医学人工智能导论」开章，作为工程线入口 | \`departments/07-zhineng/01-yixue-rengong-zhineng-daolun/\` |
| P2 | [textbooks] 第 1 卷（生·启蒙）教材稿汇总 | \`textbooks/volumes.json\` |

---

_生成时间由 CI 记录；本文件在 push 到 main 时自动重建。_
`;

fs.writeFileSync(path.join(ROOT, 'ROADMAP.md'), out, 'utf8');
console.log(`  ✅ ROADMAP.md — 学科 ${doneSubjects}✅ / ${wipSubjects}🚧 / ${cur.counts.subjects - doneSubjects - wipSubjects}⬚ · 章节 ${builtTotal}/${cur.counts.chapters}`);

#!/usr/bin/env node
/**
 * scaffold_subject.js — 生成单个学科的目录骨架（README + meta.json + 章节索引）
 *
 *   node scripts/scaffold_subject.js 01-zhongyi/01-zhongyi-jichu-lilun
 *   node scripts/scaffold_subject.js --all          # 落盘全部 120 个学科
 *
 * 幂等: 已存在的文件不覆盖，除非加 --force。
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT, loadCurriculum, semesterPlan, writeJson } = require('./lib');

const args = process.argv.slice(2);
const force = args.includes('--force');
const all = args.includes('--all');

const cur = loadCurriculum();
const plan = semesterPlan(cur);
const flat = cur.departments.flatMap((d) => d.subjects);

function subjectReadme(s) {
  const stage = cur.stages.find((x) => x.id === s.stageId);
  const dept = cur.departments.find((d) => d.slug === s.deptSlug);
  return `# ${s.title}

> ${s.bridge}

| 项目 | 内容 |
|------|------|
| 院系 | ${dept.icon} ${dept.title} \`${dept.slug}\` |
| 类型 | ${s.type} |
| 学期 | 第 ${s.semester} 学期（${stage.glyph} ${stage.title}·${stage.sub} / ${stage.years}） |
| 学时 | ${s.hours} |
| 章节目标 | ${s.chapters} |
| 学科编号 | ${String(s.globalN).padStart(3, '0')} / ${cur.domain.scale.subjects} |
| 英文名 | ${s.en} |

## 一、学科定位

${s.title}（${s.en}）是${dept.title}的核心学科，聚焦「${dept.focus}」中的一个完整知识域。

## 二、中医 → AI 桥梁

\`\`\`text
${s.bridge}
\`\`\`

${s.title} 里的每一个传统概念，都被翻译成一个可计算、可验证的工程对象：
中医概念给出**语义与约束**，AI/工程方法给出**表示与算法**。两者必须能互相回指，
否则这个章节就还没有写完。

## 三、章节地图（目标 ${s.chapters} 章）

章节尚未编写。运行脚手架开章：

\`\`\`bash
node scripts/scaffold_chapter.js ${s.deptSlug}/${s.slug} 01-<chapter-slug>
\`\`\`

编写完成后，把章节索引写进 \`chapters.json\`，本表的「状态」列由
\`scripts/build_catalog.js\` 自动填充。

## 四、章节契约（每章必须满足）

\`\`\`text
chapters/NN-<slug>/
├── docs/zh.md      # MOTTO / PROBLEM / 环境逼迫 / 知识积累 / CONCEPT / BUILD IT / USE IT / SHIP IT
├── code/           # 可运行、自终止、退出码 0（Node.js 或 Python，见 CONTRIBUTING.md 依赖白名单）
├── quiz.json       # 恰好 6 题 = 1 pre + 3 check + 2 post
└── outputs/        # 可复用产出物（prompt / skill / agent / mcp / 临床工具）
\`\`\`

## 五、教材交付 [textbooks]

\`\`\`text
输出: textbooks/${s.deptSlug}/${s.slug}/
├── 00-前言.md
├── 01-第1章-<标题>.md   ...
└── figures/                # Mermaid / SVG，禁止 ASCII 框图
\`\`\`

## 六、平台交付 [tcmP]

\`\`\`text
输出: platform/courses/${s.deptSlug}/${s.slug}/
├── course.yaml             # 课程元数据 + 章节 → 视频映射
├── slides/                 # 讲稿 HTML（由 docs/zh.md 派生）
├── narration/              # TTS 旁白文本 + 音频
└── video/                  # 成片 MP4（H.264 / 720p 以上）
\`\`\`

## 七、进度

| 指标 | 当前 | 目标 |
|------|------|------|
| 章节 | 0 | ${s.chapters} |
| 视频 | 0 | ${s.chapters} |
| 教材字数 | 0 | ≈ ${s.chapters * 6000} |

> 状态字形：${cur.stages[0].glyph} 未开始 ⬚ · 🚧 进行中 · ✅ 完成
`;
}

function subjectMeta(s) {
  const stage = cur.stages.find((x) => x.id === s.stageId);
  return {
    slug: s.slug,
    title: s.title,
    en: s.en,
    deptSlug: s.deptSlug,
    deptTitle: s.deptTitle,
    globalN: s.globalN,
    type: s.type,
    semester: s.semester,
    stage: s.stageId,
    stageTitle: stage.title,
    hours: s.hours,
    bridge: s.bridge,
    chaptersTarget: s.chapters,
    chapters: [],
    platform: {
      id: 'tcmP',
      coursePath: `platform/courses/${s.deptSlug}/${s.slug}`,
      videosPublished: 0,
      status: 'planned',
    },
    textbook: {
      id: 'textbooks',
      path: `textbooks/${s.deptSlug}/${s.slug}`,
      chaptersWritten: 0,
      words: 0,
      status: 'planned',
    },
  };
}

function scaffoldSubject(s) {
  const dir = path.join(ROOT, s.path);
  fs.mkdirSync(path.join(dir, 'chapters'), { recursive: true });
  const created = [];

  const readme = path.join(dir, 'README.md');
  if (force || !fs.existsSync(readme)) {
    fs.writeFileSync(readme, subjectReadme(s), 'utf8');
    created.push('README.md');
  }
  const meta = path.join(dir, 'meta.json');
  if (force || !fs.existsSync(meta)) {
    writeJson(meta, subjectMeta(s));
    created.push('meta.json');
  }
  const chaptersJson = path.join(dir, 'chapters.json');
  if (force || !fs.existsSync(chaptersJson)) {
    writeJson(chaptersJson, { slug: s.slug, title: s.title, chapters: [] });
    created.push('chapters.json');
  }
  return created;
}

let targets = [];
if (all) {
  targets = flat;
} else if (args.length === 0) {
  console.error('用法: node scripts/scaffold_subject.js <deptSlug>/<subjectSlug> | --all');
  process.exit(1);
} else {
  for (const a of args.filter((x) => !x.startsWith('--'))) {
    const [deptSlug, subjectSlug] = a.includes('/') ? a.split('/') : [null, a];
    const found = deptSlug
      ? flat.filter((s) => s.deptSlug === deptSlug && s.slug === subjectSlug)
      : flat.filter((s) => s.slug === subjectSlug);
    if (!found.length) {
      console.error(`✗ 未在 curriculum.json 中找到学科: ${a}`);
      process.exit(1);
    }
    targets.push(...found);
  }
}

let n = 0;
for (const s of targets) {
  const created = scaffoldSubject(s);
  n += created.length;
  if (!all) console.log(`  ✅ ${s.path} → ${created.join(', ') || '(已存在，跳过)'}`);
}
console.log(`\n完成: 处理 ${targets.length} 个学科，新建 ${n} 个文件`);

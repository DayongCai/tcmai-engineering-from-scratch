/**
 * tcmai-engineering-from-scratch · 课程数据公共库
 *
 * 单一事实来源: curriculum.json
 * 展开后的结构: domain -> departments[8] -> subjects[120] -> chapters[~1078]
 *
 * 运行环境: Node.js >= 20, CommonJS, 无第三方依赖。
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CURRICULUM_PATH = path.join(ROOT, 'curriculum.json');

/** 状态字形 —— ROADMAP.md 与站点共用，勿改形状 */
const STATUS = {
  DONE: '✅',
  WIP: '🚧',
  PLANNED: '⬚',
};

/** 交付物轨道 */
const TRACKS = {
  platform: {
    id: 'tcmP',
    title: '网络视频教育平台',
    dir: 'platform',
    en: 'Online Video Education Platform',
  },
  textbooks: {
    id: 'textbooks',
    title: '学科编写教材',
    dir: 'textbooks',
    en: 'Subject Textbooks',
  },
};

function loadCurriculum() {
  const raw = fs.readFileSync(CURRICULUM_PATH, 'utf8');
  const data = JSON.parse(raw);
  return expand(data);
}

/** 把紧凑的 subject 数组元组展开成对象 */
function expand(data) {
  const tuple = data.subjectTuple;
  const idx = Object.fromEntries(tuple.map((k, i) => [k, i]));

  let seq = 0;
  const departments = data.departments.map((d) => {
    const subjects = d.subjects.map((row, i) => {
      seq += 1;
      const s = {
        deptN: d.n,
        deptSlug: d.slug,
        deptTitle: d.title,
        n: i + 1,
        globalN: seq,
        path: `departments/${d.slug}/${row[idx.slug]}`,
        stageId: stageOfSemester(data.stages, row[idx.semester]).id,
      };
      for (const k of tuple) s[k] = row[idx[k]];
      // 选修标记在元组第 9 位（elective）。早期写的是「第 tuple 长度之后那位」——
      // 元组一旦加字段（如 prereq），那个位置就飘了，于是所有选修会静默变必修。
      s.elective = row[idx.elective] === true;
      // 先修边：不带「/」= 同院系；带「/」= 跨院系。空数组表示这是一门根课（无前置）。
      s.prereq = Array.isArray(row[idx.prereq]) ? row[idx.prereq].slice() : [];
      s.prereqFull = s.prereq.map((r) => (r.includes('/') ? r : `${d.slug}/${r}`));
      return s;
    });
    return {
      n: d.n,
      slug: d.slug,
      title: d.title,
      en: d.en,
      icon: d.icon,
      focus: d.focus,
      path: `departments/${d.slug}`,
      subjects,
      hours: subjects.reduce((a, s) => a + s.hours, 0),
      chapters: subjects.reduce((a, s) => a + s.chapters, 0),
    };
  });

  return {
    ...data,
    departments,
    counts: {
      departments: departments.length,
      subjects: departments.reduce((a, d) => a + d.subjects.length, 0),
      chapters: departments.reduce((a, d) => a + d.chapters, 0),
      hours: departments.reduce((a, d) => a + d.hours, 0),
      semesters: data.domain.scale.semesters,
      stages: data.stages.length,
    },
  };
}

function stageOfSemester(stages, semester) {
  return (
    stages.find((s) => s.semesters.includes(semester)) ||
    stages[stages.length - 1]
  );
}

/** 按学期聚合全部学科，返回 1..10 的排课表 */
function semesterPlan(cur) {
  const plan = [];
  for (let s = 1; s <= cur.domain.scale.semesters; s += 1) {
    const subjects = [];
    for (const d of cur.departments) {
      for (const sub of d.subjects) {
        if (sub.semester === s) subjects.push(sub);
      }
    }
    const stage = stageOfSemester(cur.stages, s);
    plan.push({
      semester: s,
      stage,
      subjects,
      hours: subjects.reduce((a, x) => a + x.hours, 0),
      chapters: subjects.reduce((a, x) => a + x.chapters, 0),
    });
  }
  return plan;
}

/** 在文件系统上探测某个学科当前进度 */
function subjectStatus(sub) {
  const dir = path.join(ROOT, sub.path);
  if (!fs.existsSync(dir)) return { status: 'planned', built: 0, glyph: STATUS.PLANNED };
  const chaptersDir = path.join(dir, 'chapters');
  let built = 0;
  if (fs.existsSync(chaptersDir)) {
    for (const name of fs.readdirSync(chaptersDir)) {
      const cdir = path.join(chaptersDir, name);
      if (!fs.statSync(cdir).isDirectory()) continue;
      if (
        fs.existsSync(path.join(cdir, 'docs', 'zh.md')) &&
        fs.existsSync(path.join(cdir, 'quiz.json'))
      ) {
        built += 1;
      }
    }
  }
  const status = built === 0 ? 'planned' : built >= sub.chapters ? 'done' : 'wip';
  return {
    status,
    built,
    target: sub.chapters,
    pct: sub.chapters ? Math.round((built / sub.chapters) * 100) : 0,
    glyph: status === 'done' ? STATUS.DONE : status === 'wip' ? STATUS.WIP : STATUS.PLANNED,
  };
}

/** 读取学科目录下的 meta.json（若存在） */
function readMeta(sub) {
  const p = path.join(ROOT, sub.path, 'meta.json');
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function writeJson(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(obj, null, 2)}\n`, 'utf8');
}

/**
 * 扫文件系统统计**真实存在的成片**。
 *
 * 为什么不信 meta.json 里的手工计数器：那个字段靠人记得去改，于是会长期停在 0。
 * 「已发视频 0」看起来诚实，直到有人打开站点发现播放器是好的 —— 数据与事实不符，
 * 而没有任何东西会报错。凡是能从文件系统推出的事实，就不要维护第二份。
 */
function countPublishedVideos(root) {
  const fs = require('fs');
  const base = path.join(root || ROOT, 'platform', 'courses');
  let n = 0;
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (e.name === 'lesson.mp4') n += 1;
    }
  };
  walk(base);
  return n;
}

module.exports = {
  ROOT,
  CURRICULUM_PATH,
  STATUS,
  TRACKS,
  loadCurriculum,
  semesterPlan,
  subjectStatus,
  readMeta,
  stageOfSemester,
  writeJson,
  countPublishedVideos,
};

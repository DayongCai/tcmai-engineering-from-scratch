#!/usr/bin/env node
/**
 * scripts/build_textbook_board.js —— 教材看板（9 院系分布 × 现实映射 × 院系内教学进度）
 *
 * 为什么要这个脚本：
 *   教材这条线上已经有三层事实来源 —— curriculum.json（学科/学期/学时/章节目标）、
 *   standards/materials/textbooks-batch/registry.json（源工作簿 sha256 / 章表 / 源字数）、
 *   以及文件系统（textbooks/<dept>/<subject>/NN-第N章-*.md 与 departments/**\/meta.json）。
 *   三层各自自洽、彼此可能漂移。看板不能"手写一个漂亮的数字"，必须把每个数字的
 *   **口径**和**现实锚点**一起写出来，让人能一条命令复核回原文。
 *
 * 产物（三份，全部由本脚本生成，勿手改）：
 *   data/textbook-board.json   逐学科对账矩阵 + 聚合 + 排课结果（机器可读）
 *   textbooks/SCHEDULE.md      院系内部教学进度（人读，学期 → 课程 → 周学时 → 章推进）
 *   textbook-board.html        看板（单文件 HTML，从上面同一份数据渲染）
 *
 * 口径（改动即口径变更，须同步改 textbooks/README.md 与看板页脚）：
 *   章数      = textbooks/<dept>/<subject>/ 下匹配 ^\d+-第\d+章.*\.md 的文件数（不算 00-前言）
 *   汉字      = 上述文件正文的 [\u4e00-\u9fa5] 字符数（磁盘实算，可复算）
 *   源表字数  = registry.json 的 chars（源工作簿解析出的字数，含标点，口径与汉字不同）
 *   学时      = curriculum.json 的 hours
 *   周学时    = hours / 18（18 教学周 = 16 讲授 + 第17 周复习 + 第18 周考核）
 *   半学期方案= 学时 ≤ 45 的课可前移至第 1–9 周，周学时 = hours / 9
 *   院系内序  = 学期升序 → 类型 Core→Build→Clinic→Reference → 章节目标降序 → slug
 *
 * 用法：
 *   node scripts/build_textbook_board.js            生成三份产物
 *   node scripts/build_textbook_board.js --check    重算并与磁盘比对，漂移则退出码 1
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { loadCurriculum } = require('./lib');

const ROOT = path.resolve(__dirname, '..');
const OUT_JSON = 'data/textbook-board.json';
const OUT_MD = 'textbooks/SCHEDULE.md';
const OUT_HTML = 'textbook-board.html';

const CHECK = process.argv.includes('--check');

// ── 口径常量 ──────────────────────────────────────────────────────────
const WEEKS = 18;          // 一学期教学周（含复习与考核）
const TEACH_WEEKS = 16;    // 净讲授周
const HALF_WEEKS = 9;      // 半学期方案的前九周
const LOAD_WARN = 22;      // 周学时预警线（院系单学期合计）
const TYPE_RANK = { Core: 0, Build: 1, Clinic: 2, Reference: 3 };
const TYPE_LABEL = { Core: '核心', Build: '工程', Clinic: '临床', Reference: '参考' };
const STAGE_GLYPH = { sheng: '🌱', zhang: '🌿', zhuang: '🌳', lao: '🍂', yi: '🔄' };

/**
 * 产物里的「生成日期」不取运行时刻，而取**底本自身的最后修改时间**。
 *
 * 为什么：把 `new Date()` 写进产物，等于每天第一次重跑都报 drift —— 内容一个字没改，
 * 却因为「今天是几号」被判成不一致，久了 everyone 学会无视红叉。
 * 取底本 mtime 后语义变成「这份看板反映的是哪一天的底本」，内容不变则日期不变。
 *
 * 排除自身产物（SCHEDULE.md）：它是本脚本写出的文件，把它算进来会形成回路 ——
 * 每写一次 mtime 就是此刻，下一天又漂。目录里只认 `.md`，卷册 json 另计。
 */
const SELF_OUTPUT = path.join(ROOT, OUT_MD);

function sourceDate(startDirs) {
  let newest = 0;
  const walk = (dir) => {
    let ents;
    try {
      ents = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of ents) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(p);
      } else if (/\.md$/i.test(e.name) && p !== SELF_OUTPUT) {
        try {
          const m = fs.statSync(p).mtimeMs;
          if (m > newest) newest = m;
        } catch {
          /* 读不到就跳过，不因单个文件失败整体退出 */
        }
      }
    }
  };
  for (const d of startDirs) walk(path.join(ROOT, d));
  if (!newest) return '1970-01-01';
  const d = new Date(newest);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const TODAY = sourceDate(['textbooks']);   // 底本最新改动日（不含本脚本产物）

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const abs = (p) => path.join(ROOT, p);
const hanzi = (t) => (t.match(/[\u4e00-\u9fa5]/g) || []).length;
const round1 = (x) => Math.round(x * 10) / 10;
const fmtInt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const fmtWan = (n) => `${round1(n / 10000)} 万`;

// ── 事实收集 ──────────────────────────────────────────────────────────
const cur = loadCurriculum();
const volumes = readJson('textbooks/volumes.json');

// ── 先修图（curriculum.json 第 10 位 prereq）─────────────────────────
// 深度 = 最长先修链长度。院系内排序用它：同一学期里，先讲链上更浅的课。
const subjByFull = new Map();
for (const d of cur.departments) for (const s of d.subjects) subjByFull.set(`${d.slug}/${s.slug}`, { ...s, deptSlug: d.slug });
const depthCache = new Map();
function depthOf(full, guard = new Set()) {
  if (depthCache.has(full)) return depthCache.get(full);
  const s = subjByFull.get(full);
  if (!s) return 0;
  if (guard.has(full)) return 0;
  guard.add(full);
  let v = 0;
  for (const p of s.prereqFull || []) {
    if (!subjByFull.has(p)) continue;
    v = Math.max(v, depthOf(p, guard) + 1);
  }
  depthCache.set(full, v);
  return v;
}
const prereqStats = (() => {
  const all = [...subjByFull.values()];
  const edges = all.reduce((a, s) => a + (s.prereqFull || []).length, 0);
  const cross = all.reduce((a, s) => a + (s.prereqFull || []).filter((f) => !f.startsWith(`${s.deptSlug}/`)).length, 0);
  const roots = all.filter((s) => (s.prereq || []).length === 0).length;
  const maxDepth = all.reduce((m, s) => Math.max(m, depthOf(`${s.deptSlug}/${s.slug}`)), 0);
  const violations = [];
  for (const s of all) {
    for (const f of s.prereqFull || []) {
      const t = subjByFull.get(f);
      if (!t) violations.push(`${s.deptSlug}/${s.slug} → ${f}（不存在）`);
      else if (!(t.semester < s.semester)) violations.push(`${s.deptSlug}/${s.slug}（第 ${s.semester} 学期）← ${f}（第 ${t.semester} 学期）`);
    }
  }
  const rootsDoc = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'prereq-roots.json'), 'utf8')); } catch { return { roots: [] }; } })();
  const rootMap = new Map((rootsDoc.roots || []).map((r) => [r.key, r]));
  const unregistered = all.filter((s) => (s.prereq || []).length === 0 && !rootMap.has(`${s.deptSlug}/${s.slug}`));
  const declared = all.filter((s) => (s.prereq || []).length > 0).length;
  const eligible = all.length - rootMap.size;
  const coverage = eligible ? Math.round((declared / eligible) * 1000) / 10 : 100;
  return { edges, cross, roots, rootsRegistered: rootMap.size, maxDepth, violations, subjects: all.length, declared, unregistered: unregistered.length, coverage };
})();
const registry = readJson('standards/materials/textbooks-batch/registry.json');

/** registry：一个学科可能对应多份源件（正常是 1:1），按学科索引成数组 */
const regBySubject = new Map();
for (const m of registry.materials) {
  if (!m.subject) continue;
  if (!regBySubject.has(m.subject)) regBySubject.set(m.subject, []);
  regBySubject.get(m.subject).push(m);
}

/** 磁盘实测：某学科教材目录的章数、汉字数与正文规模 */
function diskTextbook(deptSlug, slug) {
  const rel = `textbooks/${deptSlug}/${slug}`;
  const dir = abs(rel);
  if (!fs.existsSync(dir)) return { rel, exists: false, chapters: 0, hanzi: 0, nonWs: 0, files: [] };
  const files = fs
    .readdirSync(dir)
    .filter((f) => /^\d+-第\d+章.*\.md$/.test(f))
    .sort((a, b) => a.localeCompare(b, 'zh'));
  let chars = 0;
  let nonWs = 0;
  for (const f of files) {
    const t = fs.readFileSync(path.join(dir, f), 'utf8');
    chars += hanzi(t);
    nonWs += t.replace(/\s/g, '').length;
  }
  return { rel, exists: true, chapters: files.length, hanzi: chars, nonWs, files };
}

function metaOf(subjectPath) {
  const p = abs(path.join(subjectPath, 'meta.json'));
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')).textbook || null;
  } catch {
    return null;
  }
}

const volumeOfSemester = (sem) => volumes.volumes.find((v) => v.semesters.includes(sem)) || null;

// ── 逐学科对账 ────────────────────────────────────────────────────────
const departments = cur.departments.map((dept) => {
  const rows = dept.subjects.map((s) => {
    const disk = diskTextbook(dept.slug, s.slug);
    const meta = metaOf(s.path);
    const regs = regBySubject.get(`${dept.slug}/${s.slug}`) || [];
    const reg = regs[0] || null;
    const weekly = round1(s.hours / WEEKS);
    const row = {
      dept: dept.slug,
      deptTitle: dept.title,
      slug: s.slug,
      title: s.title,
      en: s.en,
      type: s.type,
      typeLabel: TYPE_LABEL[s.type] || s.type,
      elective: !!s.elective,
      semester: s.semester,
      stageId: s.stageId,
      hours: s.hours,
      chaptersTarget: s.chapters,
      bridge: s.bridge || '',
      textbook: {
        dir: disk.rel,
        exists: disk.exists,
        chapters: disk.chapters,
        hanzi: disk.hanzi,
        nonWs: disk.nonWs,
        metaChapters: meta ? meta.chaptersWritten || 0 : 0,
        metaWords: meta ? meta.words || 0 : 0,
        status: meta ? meta.status : 'planned',
        layer: meta ? meta.layer || null : null,
        // 来源分两类：底本（qhzy-*.xlsx 抽取）/ 外源（公有领域古籍补录）。看板分账，不许混计。
        // 来源三类：底本（qhzy-*.xlsx 抽取）/ 外源（公有领域古籍）/ 手册（操作型章）
        origin:
          meta && meta.layer === 'external-source'
            ? 'external'
            : meta && meta.layer === 'handbook'
              ? 'handbook'
              : 'base',
        external: meta && meta.external
          ? {
              id: meta.external.id,
              title: meta.external.title,
              url: meta.external.url,
              sha256: meta.external.sha256,
              baseText: meta.external.baseText || '',
              fetchedAt: meta.external.fetchedAt || '',
              coverage: meta.external.coverage || '',
            }
          : null,
        registry: reg
          ? {
              file: reg.file,
              sha256: reg.sha256,
              chapters: reg.chapters,
              chars: reg.chars,
              status: reg.status,
            }
          : null,
      },
      schedule: {
        weekly,
        weeks: `1–${WEEKS}`,
        teachWeeks: TEACH_WEEKS,
        chaptersPerWeek: s.chapters ? round1(s.chapters / TEACH_WEEKS) : null,
        halfTerm: s.hours <= 45 ? { weeks: `1–${HALF_WEEKS}`, weekly: round1(s.hours / HALF_WEEKS) } : null,
        prereq: s.prereqFull || [],
        prereqCount: (s.prereqFull || []).length,
        depth: depthOf(`${dept.slug}/${s.slug}`),
      },
      flags: [],
    };
    // 不一致只记录、不掩盖：看板与 SCHEDULE.md 都会把它们列成「对账例外」
    if (disk.exists && disk.chapters === 0) row.flags.push('no-body');
    if (!disk.exists) row.flags.push('no-textbook');
    if (disk.exists && disk.chapters > 0 && disk.chapters < s.chapters) row.flags.push('chapters-short');
    if (meta && disk.exists && meta.chaptersWritten !== disk.chapters) row.flags.push('meta-disk-mismatch');
    if (reg && reg.chapters !== disk.chapters) row.flags.push('registry-disk-chapters');
    if (reg && reg.chars !== (meta ? meta.words : 0)) row.flags.push('registry-meta-chars');
    if (reg && reg.status === 'manual') row.flags.push('manual-source');
    if (row.textbook.origin === 'external' && disk.chapters > 0) row.flags.push('external-source');
    return row;
  });

  // 院系内顺序：学期 → 先修链深度 → 类型 → 章节目标降序 → slug
  // 「类型排课」升级为图排课：同一学期里，先修链更浅的课先讲（链深相同再按类型）。
  const ordered = [...rows].sort(
    (a, b) =>
      a.semester - b.semester ||
      a.schedule.depth - b.schedule.depth ||
      (TYPE_RANK[a.type] ?? 9) - (TYPE_RANK[b.type] ?? 9) ||
      b.chaptersTarget - a.chaptersTarget ||
      a.slug.localeCompare(b.slug)
  );
  ordered.forEach((r, i) => {
    r.schedule.order = i + 1;
  });

  // 学期负荷
  const semesters = [];
  for (let n = 1; n <= cur.domain.scale.semesters; n += 1) {
    const inSem = ordered.filter((r) => r.semester === n);
    const stage = cur.stages.find((st) => st.semesters.includes(n));
    if (inSem.length) semesters.push({
      n,
      stageId: stage ? stage.id : null,
      stageTitle: stage ? `${stage.glyph} ${stage.title}·${stage.sub}` : '',
      volume: (() => {
        const v = volumeOfSemester(n);
        return v ? `${v.glyph} ${v.title}` : '';
      })(),
      count: inSem.length,
      hours: inSem.reduce((a, r) => a + r.hours, 0),
      weekly: round1(inSem.reduce((a, r) => a + r.schedule.weekly, 0)),
      textbooks: inSem.filter((r) => r.textbook.chapters > 0).length,
      subjects: inSem.map((r) => ({
        order: r.schedule.order,
        slug: r.slug,
        title: r.title,
        type: r.type,
        elective: r.elective,
        hours: r.hours,
        weekly: r.schedule.weekly,
        halfTerm: r.schedule.halfTerm,
        chaptersTarget: r.chaptersTarget,
        chaptersPerWeek: r.schedule.chaptersPerWeek,
        chapters: r.textbook.chapters,
        status: r.textbook.status,
        origin: r.textbook.origin,
        prereqCount: r.schedule.prereqCount,
        depth: r.schedule.depth,
      })),
    });
  }

  const withBook = rows.filter((r) => r.textbook.chapters > 0);
  const baseRows = rows.filter((r) => r.textbook.chapters > 0 && r.textbook.origin === 'base');
  const extRows = rows.filter((r) => r.textbook.chapters > 0 && r.textbook.origin === 'external');
  const hbRows = rows.filter((r) => r.textbook.chapters > 0 && r.textbook.origin === 'handbook');
  const semNums = [...new Set(rows.map((r) => r.semester))].sort((a, b) => a - b);
  const peak = semesters.reduce((m, s) => (s.weekly > m.weekly ? s : m), { weekly: 0, n: null });

  return {
    n: dept.n,
    slug: dept.slug,
    title: dept.title,
    en: dept.en,
    icon: dept.icon,
    focus: dept.focus,
    subjects: rows,
    ordered,
    semesters,
    stats: {
      subjects: rows.length,
      mandatory: rows.filter((r) => !r.elective).length,
      electives: rows.filter((r) => r.elective).length,
      hours: rows.reduce((a, r) => a + r.hours, 0),
      chaptersTarget: rows.reduce((a, r) => a + r.chaptersTarget, 0),
      textbookSubjects: withBook.length,
      baseSubjects: baseRows.length,
      extSubjects: extRows.length,
      hbSubjects: hbRows.length,
      baseHours: baseRows.reduce((a, r) => a + r.hours, 0),
      extHours: extRows.reduce((a, r) => a + r.hours, 0),
      hbHours: hbRows.reduce((a, r) => a + r.hours, 0),
      baseChapters: baseRows.reduce((a, r) => a + r.textbook.chapters, 0),
      extChapters: extRows.reduce((a, r) => a + r.textbook.chapters, 0),
      hbChapters: hbRows.reduce((a, r) => a + r.textbook.chapters, 0),
      baseNonWs: baseRows.reduce((a, r) => a + r.textbook.nonWs, 0),
      extNonWs: extRows.reduce((a, r) => a + r.textbook.nonWs, 0),
      hbNonWs: hbRows.reduce((a, r) => a + r.textbook.nonWs, 0),
      coverageBaseHours: round1(
        (baseRows.reduce((a, r) => a + r.hours, 0) / rows.reduce((a, r) => a + r.hours, 0)) * 100
      ),
      textbookHours: withBook.reduce((a, r) => a + r.hours, 0),
      chapters: rows.reduce((a, r) => a + r.textbook.chapters, 0),
      hanzi: rows.reduce((a, r) => a + r.textbook.hanzi, 0),
      nonWs: rows.reduce((a, r) => a + r.textbook.nonWs, 0),
      coverageSubjects: round1((withBook.length / rows.length) * 100),
      coverageHours: round1(
        (withBook.reduce((a, r) => a + r.hours, 0) / rows.reduce((a, r) => a + r.hours, 0)) * 100
      ),
      semesterSpan: semNums.length ? `${semNums[0]}–${semNums[semNums.length - 1]}` : '—',
      peakWeekly: peak.weekly,
      peakSemester: peak.n,
    },
  };
});

const allRows = departments.flatMap((d) => d.subjects);

// ── 口径决案：教材章 < 教学章 若已在 standards/口径决案.json 登记为「按设计」，
//    就不再算异常（chapters-short），改记 chapters-short-decided —— 两个数字仍原样显示。
//    决案里的章数若与实测不符，则回退成异常并追加 decision-stale，绝不静默通过。
{
  let decided = [];
  try {
    const dp = abs('standards/口径决案.json');
    if (fs.existsSync(dp)) decided = JSON.parse(fs.readFileSync(dp, 'utf8')).decisions || [];
  } catch (e) {
    console.warn('  ⚠ 口径决案.json 读取失败：' + e.message);
  }
  if (decided.length) {
    for (const r of allRows) {
      const d = decided.find((x) => x.subject === `${r.dept || ''}/${r.slug}`) ||
        decided.find((x) => `${r.deptSlug || ''}/${r.slug}` === x.subject) ||
        decided.find((x) => x.subject.endsWith('/' + r.slug));
      // 两个方向都要能进决案：教材少于教学（chapters-short）与教材多于教学（chapters-over）
      const dir = r.flags.includes('chapters-short') ? 'short'
        : r.flags.includes('chapters-over') ? 'over' : null;
      if (!d || !dir) continue;
      if (d.teachingChapters === r.chaptersTarget && d.textbookChapters === r.textbook.chapters) {
        r.flags = r.flags.filter((f) => f !== `chapters-${dir}`).concat(`chapters-${dir}-decided`);
        r.decision = { decidedAt: d.decidedAt, decision: d.decision, reviewIf: d.reviewIf };
      } else {
        r.flags.push('decision-stale');
      }
    }
  }
}
const withBook = allRows.filter((r) => r.textbook.chapters > 0);
const baseRowsAll = allRows.filter((r) => r.textbook.chapters > 0 && r.textbook.origin === 'base');
const extRowsAll = allRows.filter((r) => r.textbook.chapters > 0 && r.textbook.origin === 'external');
const hbRowsAll = allRows.filter((r) => r.textbook.chapters > 0 && r.textbook.origin === 'handbook');
const totals = {
  departments: departments.length,
  subjects: allRows.length,
  mandatory: allRows.filter((r) => !r.elective).length,
  electives: allRows.filter((r) => r.elective).length,
  hours: allRows.reduce((a, r) => a + r.hours, 0),
  chaptersTarget: allRows.reduce((a, r) => a + r.chaptersTarget, 0),
  textbookSubjects: withBook.length,
  baseSubjects: baseRowsAll.length,
  extSubjects: extRowsAll.length,
  hbSubjects: hbRowsAll.length,
  baseHours: baseRowsAll.reduce((a, r) => a + r.hours, 0),
  extHours: extRowsAll.reduce((a, r) => a + r.hours, 0),
  hbHours: hbRowsAll.reduce((a, r) => a + r.hours, 0),
  baseChapters: baseRowsAll.reduce((a, r) => a + r.textbook.chapters, 0),
  extChapters: extRowsAll.reduce((a, r) => a + r.textbook.chapters, 0),
  hbChapters: hbRowsAll.reduce((a, r) => a + r.textbook.chapters, 0),
  baseNonWs: baseRowsAll.reduce((a, r) => a + r.textbook.nonWs, 0),
  extNonWs: extRowsAll.reduce((a, r) => a + r.textbook.nonWs, 0),
  hbNonWs: hbRowsAll.reduce((a, r) => a + r.textbook.nonWs, 0),
  coverageBaseHours: round1(
    (baseRowsAll.reduce((a, r) => a + r.hours, 0) / allRows.reduce((a, r) => a + r.hours, 0)) * 100
  ),
  coverageBaseSubjects: round1((baseRowsAll.length / allRows.length) * 100),
  textbookHours: withBook.reduce((a, r) => a + r.hours, 0),
  chapters: withBook.reduce((a, r) => a + r.textbook.chapters, 0),
  hanzi: withBook.reduce((a, r) => a + r.textbook.hanzi, 0),
  nonWs: withBook.reduce((a, r) => a + r.textbook.nonWs, 0),
  metaWords: withBook.reduce((a, r) => a + r.textbook.metaWords, 0),
  registryChapters: withBook.reduce((a, r) => a + (r.textbook.registry ? r.textbook.registry.chapters : 0), 0),
  registryChars: withBook.reduce((a, r) => a + (r.textbook.registry ? r.textbook.registry.chars : 0), 0),
  // 源工作簿按文件名去重：经络腧穴学一份源件拆成两门学科（101 条目 / 100 份文件）
  registryFiles: new Set(registry.materials.map((m) => m.file)).size,
  registrySubjects: registry.materials.filter((m) => m.subject).length,
  coverageSubjects: round1((withBook.length / allRows.length) * 100),
  coverageHours: round1(
    (withBook.reduce((a, r) => a + r.hours, 0) / allRows.reduce((a, r) => a + r.hours, 0)) * 100
  ),
  semesters: cur.domain.scale.semesters,
};

/** 例外的具体差额：只写「不一致」等于没说，要写出差多少 */
function detailOf(r) {
  const parts = [];
  const reg = r.textbook.registry;
  if (r.flags.includes('registry-disk-chapters') && reg) {
    const d = r.textbook.chapters - reg.chapters;
    parts.push(`源表 ${reg.chapters} 章 → 磁盘 ${r.textbook.chapters} 章（${d > 0 ? '+' : ''}${d}）`);
  }
  if (r.flags.includes('registry-meta-chars') && reg) {
    const d = r.textbook.metaWords - reg.chars;
    parts.push(`源表 ${fmtInt(reg.chars)} 字 → meta ${fmtInt(r.textbook.metaWords)} 字（${d > 0 ? '+' : ''}${fmtInt(d)}）`);
  }
  if (r.flags.includes('chapters-short')) parts.push(`教材 ${r.textbook.chapters} 章 < 教学计划 ${r.chaptersTarget} 章`);
  if (r.flags.includes('chapters-over')) parts.push(`教材 ${r.textbook.chapters} 章 > 教学计划 ${r.chaptersTarget} 章`);
  if (r.flags.includes('chapters-over-decided')) {
    parts.push(`教材 ${r.textbook.chapters} 章 > 教学计划 ${r.chaptersTarget} 章：已决口径` +
      (r.decision ? `（${r.decision.decidedAt} 决议，两套切分轴并存）` : ''));
  }
  if (r.flags.includes('chapters-short-decided')) {
    parts.push(`教材 ${r.textbook.chapters} 章 < 教学计划 ${r.chaptersTarget} 章：已决口径` +
      (r.decision ? `（${r.decision.decidedAt} 决议，两套切分轴并存）` : ''));
  }
  if (r.flags.includes('decision-stale')) parts.push('决案过期：口径决案.json 记的章数与实测不符，须重议');
  if (r.flags.includes('manual-source')) parts.push('registry status=manual：人工整理层，非纯抽取');
  if (r.flags.includes('no-body')) parts.push('源表只有大纲、无正文');
  if (r.flags.includes('meta-disk-mismatch')) parts.push(`meta ${r.textbook.metaChapters} 章 ≠ 磁盘 ${r.textbook.chapters} 章`);
  return parts.join('；') || r.flags.join('、');
}

const exceptions = allRows
  .filter((r) => r.flags.length && !(r.flags.length === 1 && r.flags[0] === 'no-textbook'))
  // 外源是「另一类来源」，不是对账例外：它自己另有专表（看板「外源补录」节）
  .filter((r) => !(r.flags.length === 1 && r.flags[0] === 'external-source'))
  .map((r) => ({ slug: `${r.dept}/${r.slug}`, title: r.title, flags: r.flags, detail: detailOf(r) }));

// 教学章正文实况：departments/<dept>/<slug>/chapters/*/docs/zh.md 的章数与去空白字数。
// 为什么看板要报这个：教材章数只数 textbooks/，但很多课已在教学章里写了正文——
// 笼统写「未入库」会让人以为「没写」，把 20 万字的课判成零。
function bodyOf(deptSlug, slug) {
  const dir = abs(path.join('departments', deptSlug, slug, 'chapters'));
  if (!fs.existsSync(dir)) return { chapters: 0, chars: 0 };
  let chapters = 0;
  let chars = 0;
  for (const c of fs.readdirSync(dir)) {
    const f = path.join(dir, c, 'docs', 'zh.md');
    if (!fs.existsSync(f)) continue;
    chapters += 1;
    chars += fs.readFileSync(f, 'utf8').replace(/\s/g, '').length;
  }
  return { chapters, chars };
}

const gapsByDept = departments.map((d) => ({
  slug: d.slug,
  title: d.title,
  icon: d.icon,
  missing: d.subjects
    .filter((r) => !(r.textbook.chapters > 0))
    .map((r) => {
      const body = bodyOf(d.slug, r.slug);
      let note = '未入库';
      if (r.flags.includes('no-body')) note = '源表无正文（大纲表）';
      else if (body.chapters > 0) note = `教学章已有正文（${body.chapters} 章 / ${(body.chars / 10000).toFixed(1)} 万字），未接教材出版线`;
      return { slug: r.slug, title: r.title, type: r.type, semester: r.semester, hours: r.hours, body, note };
    }),
}));

const gapAll = gapsByDept.flatMap((d) => d.missing);
const gapWithBody = gapAll.filter((m) => m.body && m.body.chapters > 0);
const gapBodyStats = {
  gapSubjects: gapAll.length,
  gapWithBody: gapWithBody.length,
  gapWithBodyChapters: gapWithBody.reduce((a, m) => a + m.body.chapters, 0),
  gapWithBodyChars: gapWithBody.reduce((a, m) => a + m.body.chars, 0),
  gapNoBody: gapAll.filter((m) => !m.body || !m.body.chapters).length,
};

// ── 排课（五卷 × 学期 的全局负荷）─────────────────────────────────────
const semesterPlan = [];
for (let n = 1; n <= cur.domain.scale.semesters; n += 1) {
  const rows = allRows.filter((r) => r.semester === n);
  const stage = cur.stages.find((st) => st.semesters.includes(n));
  const vol = volumeOfSemester(n);
  semesterPlan.push({
    n,
    stageTitle: stage ? `${stage.glyph} ${stage.title}·${stage.sub}` : '',
    volume: vol ? `${vol.glyph} ${vol.title}` : '',
    subjects: rows.length,
    hours: rows.reduce((a, r) => a + r.hours, 0),
    weekly: round1(rows.reduce((a, r) => a + r.schedule.weekly, 0)),
    // 全部 169 学科若同开，周学时必然爆表；这里给的是「单一院系视角」的峰值
    textbooks: rows.filter((r) => r.textbook.chapters > 0).length,
    depts: new Set(rows.map((r) => r.dept)).size,
  });
}

const payload = {
  $generated: 'node scripts/build_textbook_board.js',
  generatedAt: TODAY,
  rules: {
    weeks: WEEKS,
    teachWeeks: TEACH_WEEKS,
    halfTermWeeks: HALF_WEEKS,
    loadWarn: LOAD_WARN,
    weeklyFormula: 'hours / 18',
    orderRule: 'semester ↑ → prereq depth ↑ → type Core→Build→Clinic→Reference → chaptersTarget ↓ → slug',
    prereqRule: 'prereq 元组第 10 位；裸 slug = 同院系，含「/」= 跨院系；先修学期必须严格早于本课（audit L0 把关）',
    chapterCount: 'textbooks/<dept>/<subject>/NN-第N章-*.md 文件数（不含 00-前言）',
    hanziCount: '上述文件 [\\u4e00-\\u9fa5] 字符数',
  },
  gapBodyStats,
  totals,
  prereqStats,
  semesterPlan,
  departments,
  gaps: gapsByDept,
  exceptions,
  checks: {
    curriculumSubjects: allRows.length,
    curriculumHours: totals.hours,
    diskChapters: totals.chapters,
    diskHanzi: totals.hanzi,
    registryFiles: totals.registryFiles,
    subjectsWithoutTextbook: allRows.length - withBook.length,
    unmatchedRegistrySubjects: [...regBySubject.keys()].filter((k) => !allRows.some((r) => `${r.dept}/${r.slug}` === k)),
  },
};

// ── SCHEDULE.md ───────────────────────────────────────────────────────
function renderMarkdown() {
  const L = [];
  L.push('# 院系内课程教学进度（[textbooks] 教材 × [curriculum] 排课）');
  L.push('');
  L.push('> 本文件由 `node scripts/build_textbook_board.js` 生成，**勿手改**。');
  L.push(`> 生成日期 ${TODAY} · 口径：${WEEKS} 教学周（${TEACH_WEEKS} 讲授 + 1 复习 + 1 考核）· 周学时 = 学时 ÷ ${WEEKS}。`);
  L.push('');
  L.push('## 排课规则（先立规则，再排表）');
  L.push('');
  L.push('| # | 规则 | 依据 |');
  L.push('|---|------|------|');
  L.push('| 1 | 学期归属**不改**，只在学期内部排序 | `curriculum.json` 的 `semester` 是单一事实来源 |');
  L.push(`| 2 | 同学期内按**先修链深度**升序（同深度再按类型 Core→Build→Clinic→Reference） | \`curriculum.json\` 第 10 位 \`prereq\` 的拓扑结构 |`);
  L.push('| 3 | 同类型内按章节目标降序 | 大课先开，避免学期末压课 |');
  L.push(`| 4 | 周学时 = 学时 ÷ ${WEEKS}；学时 ≤ 45 的课另给「前九周」方案 | 36 学时课全程 2 周学时，或前九周 4 周学时 |`);
  L.push('| 5 | 章推进 = 章节目标 ÷ 16 讲授周 | 每章约几周，作为讲课节奏基准 |');
  L.push(`| 6 | 单学期院系周学时合计 > ${LOAD_WARN} 标 ⚠️ | 排课负载预警线（可按院系实际调整） |`);
  L.push('');
  L.push('> 先修图（本文件不掩盖）：`curriculum.json` 学科元组第 10 位是 `prereq` 数组，');
  L.push(`> 共 **${prereqStats.edges} 条边 · 根课 ${prereqStats.roots} 门（登记理由 ${prereqStats.rootsRegistered}）· 最长先修链 ${prereqStats.maxDepth} 层 · 跨院系 ${prereqStats.cross} 条 · 覆盖率 ${prereqStats.coverage}%**；`);
  L.push('> 校验在 `scripts/audit_curriculum.js` L0：引用不存在的课 / 前置排在本课之后 / 成环，三者任一即失败。');
  L.push('');
  L.push('### 五卷 × 十学期（全局骨架）');
  L.push('');
  L.push('| 学期 | 卷 | 阶段 | 开课学科 | 覆盖院系 | 学时 | 周学时合计 | 有教材 |');
  L.push('|------|----|------|----------|----------|------|------------|--------|');
  for (const p of semesterPlan) {
    L.push(`| 第 ${p.n} 学期 | ${p.volume || '—'} | ${p.stageTitle} | ${p.subjects} | ${p.depts} | ${p.hours} | ${p.weekly} | ${p.textbooks}/${p.subjects} |`);
  }
  L.push('');
  L.push('> 「周学时合计」是全部院系同时开课的合计，不是单个学生一学期的负担；学生只修本院系的课。');
  L.push('> 第 9、10 学期已按 9 个院系各补 2 门：轮转 / 专业实践（108 学时）与毕业设计与知识移交（72 学时）；');
  L.push('> 🍂 老·固化 / 🔄 已·转型 两卷不再是空卷。');
  L.push('');

  for (const d of departments) {
    const st = d.stats;
    L.push(
      `## ${d.icon} ${d.title}（${st.subjects} 门 / ${st.hours} 学时 / 教材 ${st.textbookSubjects} 门 = 底本 ${st.baseSubjects} + 外源 ${st.extSubjects} + 手册 ${st.hbSubjects}）`
    );
    L.push('');
    L.push(`聚焦：${d.focus}`);
    L.push('');
    L.push(
      `学时覆盖：底本 ${st.coverageBaseHours}% → 含外源/手册 ${st.coverageHours}% · 章 ${st.chapters}（底本 ${st.baseChapters} + 外源 ${st.extChapters}）· ` +
        `正文 ${fmtWan(st.nonWs)} · 占用学期 ${st.semesterSpan} · 峰值周学时 ${st.peakWeekly}（第 ${st.peakSemester} 学期）`
    );
    L.push('');
    L.push('| 学期 | 序 | 课程 | 类型 | 学时 | 周学时 | 周次 | 先修 | 链深 | 章/周 | 教材章 | 教材状态 |');
    L.push('|------|----|------|------|------|--------|------|------|------|-------|--------|----------|');
    for (const sem of d.semesters) {
      for (const s of sem.subjects) {
        const half = s.halfTerm ? `（或 ${s.halfTerm.weeks} 周 × ${s.halfTerm.weekly}）` : '';
        const stamp = s.origin === 'external' ? '外' : s.origin === 'handbook' ? '手' : '';
        const chapCell = stamp ? `${stamp} ${s.chapters}/${s.chaptersTarget}` : `${s.chapters}/${s.chaptersTarget}`;
        const stateCell = s.origin === 'external' ? 'wip·外源' : s.origin === 'handbook' ? 'wip·手册' : s.status;
        L.push(
          `| 第 ${sem.n} 学期 | ${s.order} | ${s.title}${s.elective ? ' 【选修】' : ''} | ${TYPE_LABEL[s.type] || s.type} | ${s.hours} | ${s.weekly}${half} | 1–${WEEKS} | ${s.prereqCount ?? 0} | ${s.depth ?? 0} | ${s.chaptersPerWeek ?? '—'} | ${chapCell} | ${stateCell} |`
        );
      }
      const warn = sem.weekly > LOAD_WARN ? ' ⚠️' : '';
      L.push(
        `| **小计** |  | **${sem.count} 门** |  | **${sem.hours}** | **${sem.weekly}**${warn} |  |  |  |  |  | 教材 ${sem.textbooks}/${sem.count} |`
      );
    }
    L.push('');
  }

  L.push('## 外源补录（公有领域古籍；与底本分账，不并入 registry.json 的 summary）');
  L.push('');
  L.push('| 学科 | 院系 | 书 | 底本 | 章 | 汉字 | sha256(16) |');
  L.push('|------|------|----|------|----|------|-----------|');
  for (const r of allRows.filter((x) => x.textbook.origin === 'external')) {
    const e = r.textbook.external || {};
    L.push(
      `| ${r.title} \`${r.dept}/${r.slug}\` | ${r.deptTitle} | 《${e.title || '—'}》 | ${r.textbook.registry ? '' : ''}${(e.baseText || '').slice(0, 40) || '见章首'} | ${r.textbook.chapters} | ${fmtInt(r.textbook.hanzi)} | \`${(e.sha256 || '').slice(0, 16)}…\` |`
    );
  }
  L.push('');
  L.push('> 外源只覆盖「古籍能对上的部分」：不含现代检查、手术、评定量表与器械参数。');
  L.push('> 引用须标「外源·笈成·<书名> 第N条」，不得标「底本」。约定见 `standards/materials/textbooks-batch/EXTERNAL-SOURCES.md`。');
  L.push('');
  L.push('## 缺口清单（教材出版线未接；不等于没写）');
  L.push('');
  L.push(`本节 ${gapBodyStats.gapSubjects} 门课里，**${gapBodyStats.gapWithBody} 门已在教学章写了正文**（${gapBodyStats.gapWithBodyChapters} 章 / ${(gapBodyStats.gapWithBodyChars / 10000).toFixed(1)} 万字），`);
  L.push(`只是没进 \`textbooks/\` 出版流水线（无底本逐章对应、无改写层、不进五卷）；真正「源表无正文」的 ${gapBodyStats.gapNoBody} 门。`);
  L.push('');
  L.push('| 判定 | 门数 | 含义 |');
  L.push('|---|--:|---|');
  L.push(`| 教材线已接 | ${totals.textbookSubjects} | \`textbooks/\` 有章，进五卷与看板章数 |`);
  L.push(`| 有正文、未接出版线 | ${gapBodyStats.gapWithBody} | 教学章 ${gapBodyStats.gapWithBodyChapters} 章 / ${(gapBodyStats.gapWithBodyChars / 10000).toFixed(1)} 万字，可直接改写成教材稿 |`);
  L.push(`| 源表无正文 | ${gapBodyStats.gapNoBody} | 只有大纲表，得先补底本 |`);
  L.push('');
  for (const g of gapsByDept) {
    L.push(`### ${g.icon} ${g.title} · 缺 ${g.missing.length} 门`);
    L.push('');
    if (!g.missing.length) {
      L.push('无缺口。');
      L.push('');
      continue;
    }
    L.push('| 学科 | 类型 | 学期 | 学时 | 原因 |');
    L.push('|------|------|------|------|------|');
    for (const m of g.missing) L.push(`| ${m.title} \`${m.slug}\` | ${TYPE_LABEL[m.type] || m.type} | ${m.semester} | ${m.hours} | ${m.note} |`);
    L.push('');
  }

  L.push('## 对账例外（教材 ≠ 源表，逐条说明而不是抹平）');
  L.push('');
  L.push('| 学科 | 标记 | 说明 |');
  L.push('|------|------|------|');
  for (const e of payload.exceptions) {
    L.push(`| ${e.title} \`${e.slug}\` | \`${e.flags.join('`, `')}\` | ${e.detail} |`);
  }
  L.push('');
  L.push('## 复核');
  L.push('');
  L.push('```bash');
  L.push('node scripts/build_textbook_board.js --check   # 重算三份产物，漂移即退出码 1');
  L.push('node scripts/import_textbooks.js --check       # 逐章对账：教材文件 ↔ 源工作簿');
  L.push('node scripts/audit_curriculum.js               # 课程元组合法性与规模自洽');
  L.push('```');
  L.push('');
  return L.join('\n');
}

// ── 看板 HTML ─────────────────────────────────────────────────────────
const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function bar(pct, color) {
  const w = Math.max(0, Math.min(100, pct));
  return `<span class="bar"><span style="width:${w}%;background:${color}"></span></span>`;
}

function renderHtml() {
  const T = totals;
  const H = [];
  H.push('<!DOCTYPE html>');
  H.push('<html lang="zh-CN"><head><meta charset="utf-8">');
  H.push('<meta name="viewport" content="width=device-width,initial-scale=1">');
  H.push('<title>tcmai · 教材看板（9 院系 × 现实映射 × 教学进度）</title>');
  H.push(`<style>
  :root{
    --bg:#0d0a07; --panel:#1a1610; --panel2:#141109; --line:#2a2218; --ink:#e8ddcb;
    --dim:#9a8b74; --gold:#c8a45c; --jade:#6f9e7f; --red:#b4544a; --blue:#6b84b4;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);line-height:1.75;
    font-family:'Noto Serif SC','Source Han Serif CN','Songti SC','SimSun',serif}
  .wrap{max-width:1240px;margin:0 auto;padding:2.2rem 1.4rem 4rem}
  h1{font-size:1.5rem;margin:0 0 .2rem;letter-spacing:.02em}
  .sub{color:var(--dim);font-size:.82rem;margin-bottom:1.6rem}
  .sub code,p code,td code,li code{color:var(--gold);background:var(--panel2);padding:.05rem .3rem;border-radius:3px;font-family:ui-monospace,'Cascadia Code',Consolas,monospace;font-size:.94em}
  h2{font-size:.95rem;color:var(--gold);font-weight:400;letter-spacing:.14em;margin:2.4rem 0 .8rem;padding-bottom:.35rem;border-bottom:1px solid var(--line)}
  h3{font-size:.88rem;color:var(--ink);font-weight:400;margin:1.1rem 0 .4rem}
  .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(126px,1fr));gap:.6rem}
  .kpi{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:.7rem .8rem}
  .kpi .k{color:var(--dim);font-size:.7rem;letter-spacing:.06em}
  .kpi .v{font-size:1.3rem;color:var(--gold);font-variant-numeric:tabular-nums;line-height:1.3}
  .kpi .v small{font-size:.68rem;color:var(--jade);margin-left:.3rem}
  .kpi .n{color:var(--dim);font-size:.68rem}
  table{width:100%;border-collapse:collapse;font-size:.82rem}
  th,td{text-align:left;padding:.45rem .55rem;border-bottom:1px solid var(--line);vertical-align:top}
  th{color:var(--dim);font-weight:400;font-size:.7rem;letter-spacing:.08em;white-space:nowrap}
  tbody tr:hover{background:#15110c}
  td.num{text-align:right;font-variant-numeric:tabular-nums}
  .pill{display:inline-block;font-size:.66rem;padding:.05rem .4rem;border-radius:99px;border:1px solid currentColor;white-space:nowrap}
  .s-done{color:var(--jade)} .s-wip{color:var(--gold)} .s-plan{color:var(--dim)} .s-bad{color:var(--red)}
  .bar{display:inline-block;width:72px;height:5px;background:#241d14;border-radius:3px;overflow:hidden;vertical-align:middle}
  .bar span{display:block;height:100%}
  .map td:first-child{color:var(--ink);white-space:nowrap}
  .map td:nth-child(2){color:var(--dim);font-size:.78rem}
  .map td:nth-child(3){font-size:.76rem}
  .grid9{display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:.9rem;margin-top:.6rem}
  .card{background:var(--panel);border:1px solid var(--line);border-radius:9px;padding:.8rem .95rem}
  .card h4{margin:0 0 .1rem;font-size:.9rem;font-weight:400;color:var(--ink)}
  .card .meta{color:var(--dim);font-size:.72rem;margin-bottom:.5rem}
  .flow{display:flex;flex-direction:column;gap:.3rem}
  .sem{display:grid;grid-template-columns:64px 1fr auto;gap:.5rem;align-items:baseline;
    border-left:2px solid var(--line);padding:.25rem .5rem;font-size:.78rem}
  .sem .sn{color:var(--gold);font-size:.72rem;font-variant-numeric:tabular-nums}
  .sem .cw{color:var(--dim);font-size:.72rem;white-space:nowrap}
  .sem.peak{border-left-color:var(--red)}
  .sem .c{color:var(--ink)}
  .sem .c em{font-style:normal;color:var(--dim);font-size:.7rem;margin-left:.25rem}
  .two{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
  @media(max-width:900px){.two{grid-template-columns:1fr}.grid9{grid-template-columns:1fr}}
  .gap-item{display:flex;justify-content:space-between;gap:.6rem;padding:.3rem 0;border-bottom:1px dashed var(--line);font-size:.78rem}
  .gap-item .why{color:var(--dim);white-space:nowrap}
  ul{padding-left:1.1rem;margin:.4rem 0} li{margin:.15rem 0;font-size:.82rem}
  footer{margin-top:2.6rem;border-top:1px solid var(--line);padding-top:.9rem;color:var(--dim);font-size:.74rem}
  .note{background:var(--panel2);border:1px solid var(--line);border-left:3px solid var(--gold);
    border-radius:6px;padding:.55rem .8rem;font-size:.78rem;color:var(--dim);margin:.6rem 0}
  .note b{color:var(--ink);font-weight:400}
</style></head><body><div class="wrap">`);

  H.push('<h1>tcmai · 教材看板</h1>');
  H.push(
    `<div class="sub">9 院系 × 169 学科 × [textbooks] 教材落盘实况 · 由 <code>node scripts/build_textbook_board.js</code> 从 ` +
      `<code>curriculum.json</code> / <code>standards/materials/textbooks-batch/registry.json</code> / 文件系统 / ` +
      `<code>departments/&#42;&#42;/meta.json</code> 生成 · ${TODAY} · 数据 <code>data/textbook-board.json</code></div>`
  );

  // KPI
  H.push('<h2>规模与覆盖</h2>');
  H.push('<div class="kpis">');
  const kpi = (k, v, n = '') => H.push(`<div class="kpi"><div class="k">${k}</div><div class="v">${v}</div><div class="n">${n}</div></div>`);
  kpi('院系 / 学科', `${T.departments} / ${T.subjects}`, `必修 ${T.mandatory} · 选修 ${T.electives}`);
  kpi('有教材学科', `${T.textbookSubjects}`, `底本 ${T.baseSubjects} + 外源 ${T.extSubjects} + 手册 ${T.hbSubjects}`);
  kpi('学时覆盖', `${T.coverageHours}%`, `底本 ${T.coverageBaseHours}% · ${fmtInt(T.textbookHours)}/${fmtInt(T.hours)} 学时`);
  kpi('教材章数', fmtInt(T.chapters), `底本 ${fmtInt(T.baseChapters)} + 外源 ${fmtInt(T.extChapters)}`);
  kpi('正文规模', fmtWan(T.nonWs), `非空白字符 · 汉字 ${fmtWan(T.hanzi)}`);
  kpi('源工作簿', `${T.registryFiles} 份`, `${T.registrySubjects} 条学科映射 · sha256 已登记`);
  kpi('学期 / 卷', `${T.semesters} / ${volumes.volumes.length}`, '18 教学周制');
  const peakDept = departments.reduce((m, d) => (d.stats.peakWeekly > m.stats.peakWeekly ? d : m), departments[0]);
  kpi('排课峰值', `${peakDept.stats.peakWeekly} 周学时`, `${peakDept.title} · 第 ${peakDept.stats.peakSemester} 学期`);
  kpi('先修图', `${prereqStats.edges} 条边`, `${prereqStats.subjects} 学科 · 根课 ${prereqStats.roots} · 链深 ${prereqStats.maxDepth}`);
  H.push('</div>');

  // 现实映射逻辑
  H.push('<h2>看板 → 现实：每个数字的锚点</h2>');
  H.push('<div class="note">看板上的每个数字都必须能顺着这张表回到<b>仓库里的某个文件</b>或<b>某条命令</b>。' +
    '算不出来的显式标「—」，不猜、不留空；口径不一致的两组数字并列写出（如汉字 vs 源表字数），并说明差在哪。</div>');
  H.push('<table class="map"><thead><tr><th>看板指标</th><th>口径（怎么算）</th><th>现实锚点</th><th>本次实测</th></tr></thead><tbody>');
  const mapRow = (k, how, anchor, val) => H.push(`<tr><td>${k}</td><td>${how}</td><td>${anchor}</td><td class="num">${val}</td></tr>`);
  mapRow('院系 / 学科', '`curriculum.json` 的 `departments[]` 与 `subjects[]` 展开', '`curriculum.json` · `scripts/lib.js#expand`', `${T.departments} / ${T.subjects}`);
  mapRow('学时', '学科元组第 6 位 `hours` 求和', '`curriculum.json`', fmtInt(T.hours));
  mapRow('章节目标', '学科元组第 7 位 `chapters` 求和', '`curriculum.json`', fmtInt(T.chaptersTarget));
  mapRow('有教材学科', '`textbooks/&lt;dept&gt;/&lt;subject&gt;/` 下存在章文件；按 `meta.json` 的 `layer` 分底本 / 外源', '文件系统 + `meta.json`', `${T.textbookSubjects}（底本 ${T.baseSubjects} + 外源 ${T.extSubjects}）`);
  mapRow('外源补录', '`external-registry.json` 中 `status=fetched` 的条数；sha256 = 原始页面字节', '`standards/materials/textbooks-batch/external-registry.json`', `${T.extSubjects} 部 → ${T.extSubjects} 学科 / ${fmtInt(T.extNonWs)} 字符`);
  mapRow('教材章数', '匹配 `^\d+-第\d+章.*\.md` 的文件计数（不含 00-前言），底本 / 外源分列', '`textbooks/**`', `${fmtInt(T.chapters)}（底本 ${fmtInt(T.baseChapters)} + 外源 ${fmtInt(T.extChapters)}）`);
  mapRow('正文汉字', '上述文件 `[\\u4e00-\\u9fa5]` 字符数（纯汉字，不含标点）', '`textbooks/**`（磁盘实算）', fmtInt(T.hanzi));
  mapRow('正文规模', '上述文件去掉空白的字符数（与 `textbooks/README.md` 的「万字」同口径）', '`textbooks/**`（磁盘实算）', fmtInt(T.nonWs));
  mapRow('源表字数', '`registry.json` 每条的 `chars` 求和（解析源工作簿所得，含标点）', '`standards/materials/textbooks-batch/registry.json`', fmtInt(T.registryChars));
  mapRow('meta.words', '`departments/**/meta.json` 的 `textbook.words` 求和（导入时写死）', '`meta.json`', fmtInt(T.metaWords));
  mapRow('源工作簿份数', '`registry.json` 中 `file` 去重计数（经络腧穴学一份源件拆两门）', '`registry.json` · `sourceDir`', String(T.registryFiles));
  mapRow('学科映射条目', '`registry.json` 中带 `subject` 的条目数', '`registry.json`', String(T.registrySubjects));
  mapRow('源表章表数', '同一批条目 `chapters` 求和（手工整理/合并章节会与磁盘不等）', '`registry.json`', fmtInt(T.registryChapters));
  mapRow('教材状态', '`departments/&lt;dept&gt;/&lt;subject&gt;/meta.json` 的 `textbook.status`', '`meta.json`（由导入脚本写）', `wip ${allRows.filter((r) => r.textbook.status === 'wip').length} · planned ${allRows.filter((r) => r.textbook.status === 'planned').length}`);
  mapRow('周学时', '`hours ÷ 18`（18 教学周）', '本脚本 `rules.weeklyFormula`', '逐课见表');
  mapRow('院系内序', '学期 ↑ → 先修链深度 ↑ → 类型 Core→Build→Clinic→Reference → 章节目标 ↓ → slug', '`curriculum.json#prereq` · 本脚本 `rules.orderRule`', '逐课见表（含「先修 / 链深」两列）');
  mapRow('改写层', '章文件里 `## N.x` 五节契约（尤其 N.3）是否成节', '`textbooks/README.md` 章契约', '见下方诚实缺口');
  H.push('</tbody></table>');

  // 先修图（排课的事实基础）
  H.push('<h2>先修图：从「类型排课」到「图排课」</h2>');
  H.push('<div class="note">每个学科在 <code>curriculum.json</code> 元组第 10 位声明 <code>prereq</code>（裸 slug = 同院系，含「/」= 跨院系）。' +
    '院系内顺序不再靠「学期 + 类型」猜：同一学期里先修链更浅的先讲。' +
    '三条硬检查在 <code>audit_curriculum.js</code> L0 —— 引用不存在的课、前置排在本课之后、成环，任一即失败。</div>');
  H.push('<table><thead><tr><th>指标</th><th>实测</th><th>说明</th></tr></thead><tbody>');
  const pRow = (k, v, why) => H.push(`<tr><td>${k}</td><td class="num">${v}</td><td class="meta">${why}</td></tr>`);
  pRow('先修边', prereqStats.edges, '每门课 0–4 条；平均 ' + (prereqStats.edges / prereqStats.subjects).toFixed(1));
  pRow('根课（无前置）', prereqStats.roots, `已登记理由 ${prereqStats.rootsRegistered} 条（data/prereq-roots.json）`);
  pRow('先修覆盖率', prereqStats.coverage + '%', `${prereqStats.declared} / (${prereqStats.subjects} − ${prereqStats.rootsRegistered} 根课) = 每个「非根课」都声明了前置`);
  pRow('未登记的漏声明', prereqStats.unregistered, prereqStats.unregistered ? '审计会报 warn：prereq 为空且不在根课表' : '0 门：空 prereq 的课全部在根课表里，且都写了理由');
  pRow('最长先修链', prereqStats.maxDepth + ' 层', '如 解剖→生理→病理→药理→临床轮转');
  pRow('跨院系边', prereqStats.cross, '临床课 ← 中药/方剂；AI 课 ← 统计；护理 ← 病理');
  pRow('排课违规', prereqStats.violations.length, prereqStats.violations.length ? prereqStats.violations.slice(0, 3).join(' / ') : '0 条：前置学期严格早于本课');
  H.push('</tbody></table>');
  H.push('<div class="note">第 9 学期 = 轮转 / 专业实践（108 学时，前置是第 5–7 学期临床课）；' +
    '第 10 学期 = 毕业设计与知识移交（72 学时，前置是第 9 学期轮转 + 方法类课）。' +
    '两学期各 9 门（9 院系 × 1），🍂 老·固化 / 🔄 已·转型 两卷由此不再是空卷。</div>');

  // 九院系分布
  H.push('<h2>九院系分布</h2>');
  H.push('<table><thead><tr><th>#</th><th>院系</th><th>学科</th><th>学时</th><th>有教材</th><th>学时覆盖</th><th>教材章</th><th>正文</th><th>学期跨度</th><th>峰值周学时</th></tr></thead><tbody>');
  for (const d of departments) {
    const s = d.stats;
    const color = s.coverageHours >= 80 ? 'var(--jade)' : s.coverageHours >= 40 ? 'var(--gold)' : 'var(--red)';
    H.push(
      `<tr><td class="num">${d.n}</td><td>${d.icon} ${esc(d.title)}<br><span class="meta">${esc(d.focus)}</span></td>` +
        `<td class="num">${s.subjects}<br><span class="meta">${s.mandatory}+${s.electives}</span></td>` +
        `<td class="num">${fmtInt(s.hours)}</td><td class="num">${s.textbookSubjects}<br><span class="meta">底${s.baseSubjects}+外${s.extSubjects}+手${s.hbSubjects}</span></td>` +
        `<td class="num">${s.coverageBaseHours}% → ${s.coverageHours}%<br>${bar(s.coverageHours, color)}</td>` +
        `<td class="num">${fmtInt(s.chapters)}</td><td class="num">${fmtWan(s.nonWs)}</td>` +
        `<td class="num">${s.semesterSpan}</td><td class="num">${s.peakWeekly}<br><span class="meta">第 ${s.peakSemester} 学期</span></td></tr>`
    );
  }
  H.push(`<tr><td></td><td><b>合计</b></td><td class="num">${T.subjects}</td><td class="num">${fmtInt(T.hours)}</td>` +
    `<td class="num">${T.textbookSubjects}<br><span class="meta">底${T.baseSubjects}+外${T.extSubjects}+手${T.hbSubjects}</span></td><td class="num">${T.coverageBaseHours}% → ${T.coverageHours}%</td><td class="num">${fmtInt(T.chapters)}</td>` +
    `<td class="num">${fmtWan(T.nonWs)}</td><td class="num">—</td><td class="num">—</td></tr>`);
  H.push('</tbody></table>');

  // 外源补录（与底本分账）
  H.push('<h2>外源补录：公有领域古籍（与底本分账）</h2>');
  H.push('<div class="note">五官口腔系与骨伤系有 25 门学科在底本（桌面 <code>qhzy-*.xlsx</code>）里<b>根本没有源件</b> —— 不是抽取失败。' +
    '其中 7 门有对口的公有领域古籍，按「先立约定、再落正文」补录：源件只读留档 + sha256，章首标「外源·笈成」，<b>不并入底本统计</b>。' +
    '另 18 门是现代学科（口腔正畸/修复、颌面外科、眼科验光、解剖生理…），古籍支撑不了，<b>不补、不编</b>。</div>');
  H.push('<table><thead><tr><th>学科</th><th>院系</th><th>书</th><th>章</th><th>汉字</th><th>sha256(16)</th><th>抓取</th></tr></thead><tbody>');
  for (const r of allRows.filter((x) => x.textbook.origin === 'external')) {
    const e = r.textbook.external || {};
    H.push(
      `<tr><td>${esc(r.title)}<br><span class="meta">${TYPE_LABEL[r.type] || r.type}·第${r.semester}学期·${r.hours}h</span></td>` +
        `<td>${esc(r.deptTitle)}</td><td>《${esc(e.title || '—')}》<br><span class="meta">${esc((e.baseText || '').slice(0, 46) || '底本见章首')}…</span></td>` +
        `<td class="num">${r.textbook.chapters}</td><td class="num">${fmtInt(r.textbook.hanzi)}</td>` +
        `<td class="meta">\`${esc((e.sha256 || '').slice(0, 16))}…\`</td><td class="meta">${esc(e.fetchedAt || '—')}</td></tr>`
    );
  }
  H.push('</tbody></table>');
  H.push('<div class="note">引用须标「<b>外源·笈成·&lt;书名&gt; 第N条</b>」，不得标「底本」；繁→简只做字形转换（opencc t2s），不改字词。' +
    '完整约定与 25 门分级（A 已落 / B 可部分支撑 / C 无源需供件）见 <code>standards/materials/textbooks-batch/EXTERNAL-SOURCES.md</code>。</div>');

  // 操作型章（轮转/毕设手册）
  H.push('<h2>操作型章：18 门轮转/毕设手册（第二套章契约）</h2>');
  H.push('<div class="note">轮转与毕设不是讲授型课程：学生要的是当天能用的流程、清单与模板，不是 6000 字论证。' +
    '所以新增 <b>handbook-v1</b>（H.1 问题 / H.2 目标 / H.3 流程 / H.4 清单 / H.5 模板 / H.6 失效 / H.7 考核），' +
    '与学术型 N.1–N.5 <b>并存</b>；判定不靠猜 —— <code>meta.json</code> 的 <code>textbook.contract</code> 写死是哪一个。' +
    '内容来自 <code>data/handbook/</code>（作者维护），脚本只做渲染。</div>');
  H.push('<table><thead><tr><th>学科</th><th>院系</th><th>学期</th><th>章</th><th>汉字</th><th>契约</th><th>状态</th></tr></thead><tbody>');
  for (const r of allRows.filter((x) => x.textbook.origin === 'handbook')) {
    H.push(
      `<tr><td>${esc(r.title)}</td><td>${esc(r.deptTitle)}</td><td class="num">${r.semester}</td>` +
        `<td class="num">${r.textbook.chapters}</td><td class="num">${fmtInt(r.textbook.hanzi)}</td>` +
        `<td class="meta">handbook-v1</td><td><span class="pill s-wip">手册</span></td></tr>`
    );
  }
  H.push('</tbody></table>');
  H.push('<div class="note">验收：<code>node scripts/check_handbook_contract.js</code> —— 七节齐全、步骤 ≥4、清单 ≥6、失效 ≥3、考核 ≥3、每章 ≥400 汉字、必须带免责/边界声明。' +
    '两套契约混在一个门里，结局只有两种：把手册写成论文，或把论文放水成清单。</div>');

  // 五卷 × 学期
  H.push('<h2>五卷 × 十学期：排课骨架</h2>');
  H.push('<table><thead><tr><th>学期</th><th>卷</th><th>阶段</th><th>开课学科</th><th>覆盖院系</th><th>学时</th><th>周学时合计</th><th>有教材</th></tr></thead><tbody>');
  for (const p of semesterPlan) {
    H.push(`<tr><td>第 ${p.n} 学期</td><td>${p.volume}</td><td>${p.stageTitle}</td><td class="num">${p.subjects}</td>` +
      `<td class="num">${p.depts}</td><td class="num">${fmtInt(p.hours)}</td><td class="num">${p.weekly}</td><td class="num">${p.textbooks}/${p.subjects}</td></tr>`);
  }
  H.push('</tbody></table>');
  H.push('<div class="note">「周学时合计」是<b>全部院系同时开课</b>的合计，不是单个学生一学期的负担；' +
    '单个学生只修本院系的课，单院系峰值见上一节的「峰值周学时」。</div>');

  // 院系内部教学进度
  H.push('<h2>院系内部教学进度</h2>');
  H.push('<div class="note">每条 = 一门课在本学期的落位：<b>周学时 × 周次</b>，括号内为「前九周」备选方案（学时 ≤ 45 的课）。' +
    `红色左框 = 该院系峰值学期（周学时 > ${LOAD_WARN} 会在此标 ⚠️）。</div>`);
  H.push('<div class="grid9">');
  for (const d of departments) {
    H.push('<div class="card">');
    H.push(`<h4>${d.icon} ${esc(d.title)}</h4>`);
    H.push(`<div class="meta">${d.stats.subjects} 门 · ${fmtInt(d.stats.hours)} 学时 · 教材 ${d.stats.textbookSubjects}/${d.stats.subjects}（底本 ${d.stats.baseSubjects} + 外源 ${d.stats.extSubjects} + 手册 ${d.stats.hbSubjects} · 学时覆盖 底本 ${d.stats.coverageBaseHours}% → ${d.stats.coverageHours}%）· 章 ${fmtInt(d.stats.chapters)} · 正文 ${fmtWan(d.stats.nonWs)}</div>`);
    H.push('<div class="flow">');
    for (const sem of d.semesters) {
      const peak = sem.weekly === d.stats.peakWeekly;
      const warn = sem.weekly > LOAD_WARN ? ' ⚠️' : '';
      const courses = sem.subjects
        .map((s) => {
          const half = s.halfTerm ? `（或${s.halfTerm.weeks}周×${s.halfTerm.weekly}）` : '';
          const tb = s.origin === 'external'
            ? '<span class="pill s-wip">外源</span>'
            : s.origin === 'handbook'
              ? '<span class="pill s-wip">手册</span>'
            : s.chapters
              ? ''
              : '<span class="pill s-plan">无教材</span>';
          return `${esc(s.title)}${s.elective ? '<em>选修</em>' : ''} <span class="cw">${s.weekly}×${WEEKS}${half}</span>` +
            `${s.prereqCount ? `<span class="cw">←${s.prereqCount}/d${s.depth}</span>` : ''} ${tb}`;
        })
        .join('<br>');
      H.push(`<div class="sem${peak ? ' peak' : ''}"><span class="sn">第${sem.n}学期</span><span class="c">${courses}</span>` +
        `<span class="cw">${sem.count}门 · ${sem.hours}h · 周${sem.weekly}${warn}</span></div>`);
    }
    H.push('</div></div>');
  }
  H.push('</div>');

  // 缺口
  H.push('<h2>诚实缺口</h2>');
  H.push('<div class="two"><div class="card">');
  H.push(`<h4>无教材学科：${T.subjects - T.textbookSubjects} 门 / ${T.subjects}（${(100 - T.coverageSubjects).toFixed(1)}%）</h4>`);
  H.push(`<div class="meta">已由外源补录 ${T.extSubjects} 门（${fmtInt(T.extHours)} 学时）—— 只覆盖「古籍能对上」的部分，现代学科仍空着，见 <code>EXTERNAL-SOURCES.md</code> 的 B / C 层。</div>`);
  H.push('<div class="meta">按院系列出；`源表无正文` 指源工作簿只有大纲表，不是漏抽。</div>');
  for (const g of gapsByDept) {
    H.push(`<h3>${g.icon} ${esc(g.title)} · 缺 ${g.missing.length}</h3>`);
    if (!g.missing.length) { H.push('<div class="gap-item"><span>无</span><span class="why">—</span></div>'); continue; }
    for (const m of g.missing) {
      H.push(`<div class="gap-item"><span>${esc(m.title)} <span class="pill s-plan">${TYPE_LABEL[m.type] || m.type}·${m.semester}</span></span><span class="why">${m.note}</span></div>`);
    }
  }
  H.push('</div><div class="card">');
  H.push('<h4>其它对账缺口</h4>');
  H.push('<div class="meta">这些不是「没做」，是「做了但口径/形态与契约有差」，逐条登记便于复算。</div><ul>');
  const shortCh = allRows.filter((r) => r.flags.includes('chapters-short'));
  const overCh = allRows.filter((r) => r.flags.includes('chapters-over'));
  H.push(`<li><b>教材章数 &lt; 章节目标</b>：${shortCh.length} 门 —— ${shortCh.map((r) => `${r.title}（${r.textbook.chapters}/${r.chaptersTarget}）`).join('、') || '无'}。教学计划章数没有稿子支撑，排课到这些章只能讲提纲。</li>`);
  const decidedShort = allRows.filter((r) => r.flags.includes('chapters-short-decided'));
  const decidedOver = allRows.filter((r) => r.flags.includes('chapters-over-decided'));
  if (decidedShort.length) {
    H.push(`<li><b>教材章 &lt; 教学章（已决口径，非欠账）</b>：${decidedShort.length} 门 —— ${decidedShort
      .map((r) => `${r.title}（教材 ${r.textbook.chapters} / 教学 ${r.chaptersTarget}${r.decision ? '，' + r.decision.decidedAt + ' 决议' : ''}）`)
      .join('、')}。决案见 <code>standards/口径决案.json</code>：两套切分轴并存（教材按学科体系、教学按法规流程），不拆教材（会破坏底本逐章对应）、不并课程（要删 8 个章目录并重写 13 章契约）。</li>`);
  }
  const stale = allRows.filter((r) => r.flags.includes('decision-stale'));
  if (stale.length) {
    H.push(`<li><b>决案过期</b>：${stale.length} 门 —— ${stale.map((r) => `${r.title}（教材 ${r.textbook.chapters} / 教学 ${r.chaptersTarget}）`).join('、')}。决案里记的章数与实测不符，须重议并改 <code>standards/口径决案.json</code>。</li>`);
  }
  const noBody = allRows.filter((r) => r.flags.includes('no-body'));
  H.push(`<li><b>源表只有大纲</b>：${noBody.length} 门 —— ${noBody.map((r) => r.title).join('、') || '无'}。</li>`);
  const manual = allRows.filter((r) => r.flags.includes('manual-source'));
  H.push(`<li><b>手工整理层（非纯抽取）</b>：${manual.length} 门 —— ${manual.map((r) => r.title).join('、') || '无'}（registry 里 \`status: manual\`，字数与源表不同属正常）。</li>`);
  H.push('<li><b>改写层（N.1–N.5，尤其 N.3「这个翻译丢掉了什么」）</b>：全书层面 <b>未成规模</b>。已落盘的 1622 章是<b>源正文层</b>，章首块自述「改写层尚未撰写」；仅《中医基础理论》13 章属手写改写稿。故「有字」≠「按契约写完」，本看板把两者分开计。</li>');
  H.push(`<li><b>先修图的两类弱点</b>：① 已把「空 prereq」的两种含义分开 —— 真根课须在 <code>data/prereq-roots.json</code> 登记理由（${prereqStats.rootsRegistered} 条），未登记的空 prereq 会被审计报成「漏声明」（现 0 门）；但「登记了理由」仍是作者判断，不是教务处文件。② 改边须同时改 <code>scripts/migrate_prereq.js</code> 的表并重跑（幂等），直接手改 <code>curriculum.json</code> 会在下一次迁移被覆盖。</li>`);
  H.push('<li><b>第 9/10 学期有课、无教材无视频</b>：18 门轮转/毕设课已进 <code>curriculum.json</code> 并落了目录与章节知识结构，但教材（0 章）与课程文档（0 章）都还没写，`textbooks/build_book.js --volume 4/5` 仍是空卷 —— 空的原因是没稿子，不是没课。</li>');
  H.push('<li><b>源件不在仓库</b>：100 份 `qhzy-*.xlsx`（约 51 MB）留在桌面，入库的只有 `sha256` + 章表 + 字数；改源件后必须重跑 `node scripts/import_textbooks.js`。</li>');
  H.push('<li><b>三种字数口径并存</b>：磁盘汉字 ' + fmtInt(T.hanzi) + ' / 去空白字符 ' + fmtInt(T.nonWs) +
    '（= README 的「万字」口径）/ 源表 chars ' + fmtInt(T.registryChars) + '。三者在同一仓库里不矛盾，但引用时须说明用的是哪一个。</li>');
  H.push('</ul></div></div>');

  // 例外表
  H.push('<h2>对账例外（教材 ≠ 源表）</h2>');
  H.push('<table><thead><tr><th>学科</th><th>标记</th><th>说明</th></tr></thead><tbody>');
  for (const e of payload.exceptions) {
    H.push(`<tr><td>${esc(e.title)}<br><span class="meta">\`${esc(e.slug)}\`</span></td><td>${e.flags.map((f) => `<span class="pill s-wip">${f}</span>`).join(' ')}</td><td>${esc(e.detail)}</td></tr>`);
  }
  H.push('</tbody></table>');

  H.push('<footer>');
  H.push('<b>复核命令</b><br>');
  H.push('<code>node scripts/build_textbook_board.js --check</code> 重算三份产物并与磁盘比对（漂移退出码 1）<br>');
  H.push('<code>node scripts/import_textbooks.js --check</code> 教材文件 ↔ 源工作簿逐章对账<br>');
  H.push('<code>node scripts/audit_curriculum.js</code> 课程元组合法性与规模自洽<br>');
  H.push(`口径：${WEEKS} 教学周（${TEACH_WEEKS} 讲授 + 复习 + 考核）· 周学时 = 学时 ÷ ${WEEKS} · ` +
    `汉字口径与源表字数口径不同，两者并列而非取其一。`);
  H.push('</footer></div></body></html>');
  return H.join('\n');
}


// ── 写盘 / 校核 ───────────────────────────────────────────────────────
const outputs = [
  [OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`],
  [OUT_MD, renderMarkdown()],
  [OUT_HTML, renderHtml()],
];

if (CHECK) {
  // 日期戳不参与一致性判定：它取底本 mtime，换机器/重切工作区时 mtime 会变，
  // 但内容没变。若把日期算进判据，CI 上每次全新 checkout 都会红 —— 红线就成了噪音。
  const stripStamp = (s) =>
    s.replace(/("generatedAt"\s*:\s*")[^"]*(")/g, '$1<date>$2')
      .replace(/(生成日期\s*)\d{4}-\d{2}-\d{2}/g, '$1<date>');
  let drift = 0;
  for (const [rel, content] of outputs) {
    const p = abs(rel);
    if (!fs.existsSync(p)) {
      console.error(`✗ 缺失: ${rel}（运行 node scripts/build_textbook_board.js 生成）`);
      drift += 1;
      continue;
    }
    if (stripStamp(fs.readFileSync(p, 'utf8')) !== stripStamp(content)) {
      console.error(`✗ 漂移: ${rel} 与重算结果不一致`);
      drift += 1;
    }
  }
  if (drift) {
    console.error(`\n教材看板：${drift} 份产物与仓库现状不一致。`);
    process.exit(1);
  }
  console.log('✓ 教材看板三份产物与仓库现状一致。');
  process.exit(0);
}

for (const [rel, content] of outputs) {
  fs.mkdirSync(path.dirname(abs(rel)), { recursive: true });
  fs.writeFileSync(abs(rel), content);
}
console.log(`✓ ${OUT_JSON}`);
console.log(`✓ ${OUT_MD}`);
console.log(`✓ ${OUT_HTML}`);
console.log(
  `  院系 ${totals.departments} · 学科 ${totals.subjects} · 有教材 ${totals.textbookSubjects}（${totals.coverageSubjects}%）· ` +
    `章 ${fmtInt(totals.chapters)} · 正文 ${fmtInt(totals.nonWs)} 字符（汉字 ${fmtInt(totals.hanzi)}）· 学时 ${fmtInt(totals.hours)}（覆盖 ${totals.coverageHours}%）`
);

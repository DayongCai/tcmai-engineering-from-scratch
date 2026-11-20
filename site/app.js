/**
 * [tcmP] 站点前端 —— 无框架，纯原生 JS
 *
 * 依赖 window.TCMAI_DATA / window.TCMAI_CONTENT / window.TCMAI_PATHS / window.TCMAI_GLOSSARY
 * （均由 site/build.js 生成）
 *
 * 进度只存在浏览器 localStorage，不上传、不注册。
 */

'use strict';

const DATA = window.TCMAI_DATA;
const CONTENT = window.TCMAI_CONTENT || {};
const PATHS = window.TCMAI_PATHS || [];
const GLOSSARY = window.TCMAI_GLOSSARY || {};
// 语义张量计算核心（site/semtensor.js）。它必须在 app.js 之前加载 ——
// 这里不做兜底实现：缺了它说明页面外壳的脚本顺序错了，应该直接暴露出来。
const S = window.TCMSemTensor;

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const ALL_SUBJECTS = DATA.departments.flatMap((d) => d.subjects.map((s) => ({ ...s, dept: d })));
const SUBJECT_BY_PATH = new Map(ALL_SUBJECTS.map((s) => [`${s.dept.slug}/${s.slug}`, s]));

// ── 进度（接线到 site/progress.js，数据只存本机） ──
const PROG = window.TCMProgress || {
  recordVisit() {}, recordAnswer() {}, markComplete() {}, unmarkComplete() {},
  get: () => ({ answers: {}, completedAt: null }), isComplete: () => false,
  quizScore: () => ({ answered: 0, correct: 0 }), countCompleted: () => 0,
  totalCompleted: () => 0, totalVisited: () => 0, reset() {}, onChange() {},
};

/** 由章节 key 生成每题的稳定 id，与 quiz 渲染器一致 */
const qid = (stage, i) => `${stage}-q${i}`;

// ── 页头 / 页脚 ──
const NAV = [
  ['index.html', '总览'],
  ['catalog.html', '课程目录'],
  ['roadmap.html', '进度'],
  ['paths.html', '学习路径'],
  ['glossary.html', '术语表'],
  ['semtensor.html', '语义张量'],
  ['books.html', '教材'],
  // 证候辞典是独立页（scripts/build_zhenghou_site.js 生成，单文件离线可用），
  // 不放进 site/pages.js 的 PAGES —— 那一套会生成空壳并覆盖它。
  ['zhenghou.html', '证候辞典'],
  ['about.html', '关于'],
];

function shell(page, title, bodyHtml) {
  return `
<header class="site-header"><div class="inner">
  <div class="brand"><span class="zh">中医药 · 从零工程</span><span class="en">tcmai / from scratch</span></div>
  <nav class="site-nav">
    ${NAV.map(([href, label]) => `<a href="${href}" ${href === page ? 'aria-current="page"' : ''}>${label}</a>`).join('')}
  </nav>
</div></header>
<main>${bodyHtml}</main>
<footer class="site-footer"><div class="inner">
  <div>© 2026 tcmai-engineering-from-scratch · MIT</div>
  <div><a href="../README.md">README</a> · <a href="../CONTRIBUTING.md">贡献手册</a> · <a href="../ROADMAP.md">ROADMAP</a></div>
  <div class="small">教育用途，不构成临床诊疗建议。</div>
</div></footer>`;
}

function countsBar() {
  const c = DATA.counts;
  const items = [
    ['院系', c.departments],
    ['学科', c.subjects],
    ['章节', c.chapters],
    ['学时', c.hours],
    ['已建章节', c.chaptersBuilt],
    ['章节视频', c.videos],
  ];
  return `<div class="counts">${items
    .map(([k, v]) => `<div class="count"><b>${v}</b>${k}</div>`)
    .join('')}</div>`;
}

// ── 页面：总览 ──
function renderIndex() {
  const d = DATA.domain;
  const built = Object.values(CONTENT);
  return shell('index.html', d.title, `
<h1>${esc(d.title)} · 从零起步，生长壮老已，终成医圣</h1>
<p class="lede">${esc(d.motto)} —— ${DATA.counts.departments} 院系 · ${DATA.counts.subjects} 学科 · ${DATA.counts.chapters} 章节 · ${DATA.counts.hours} 学时。每个章节都留下一件能塞进工作流的产出物。</p>
${countsBar()}

<h2>生长壮老已 × 10 学期</h2>
<div class="grid cols-4">
  ${DATA.stages.map((s) => `
  <div class="card">
    <div class="card-title">${s.glyph} ${esc(s.title)}·${esc(s.sub)}</div>
    <div class="card-sub">${esc(s.years)} · 第 ${s.semesters.join('、')} 学期</div>
    <div class="card-meta">
      <span class="tag">环境逼迫 ${'★'.repeat(s.pressure)}${'☆'.repeat(5 - s.pressure)}</span>
      <span class="tag">知识积累 ${'★'.repeat(s.knowledge)}${'☆'.repeat(5 - s.knowledge)}</span>
    </div>
    <div class="small muted" style="margin-top:8px">${esc(s.artifact)}</div>
  </div>`).join('')}
</div>

<h2>中医概念的动画图</h2>
<p class="muted">每张图都在讲一个「中医概念 → 可计算对象」的翻译过程。悬停可暂停。</p>
<div class="grid cols-2">
  <div class="card">
    <div class="card-title">阴阳 → 二分类</div>
    <div class="small muted">sigmoid 决策边界扫过，样本归属随阈值翻转</div>
    <div data-figure="yin-yang-sigmoid"></div>
  </div>
  <div class="card">
    <div class="card-title">五行生克 → 带约束的多分类</div>
    <div class="small muted">外圈相生、五角星相克；纯 softmax 会丢掉全部关系</div>
    <div data-figure="wuxing-cycle"></div>
  </div>
  <div class="card">
    <div class="card-title">藏象 → 知识图谱</div>
    <div class="small muted">脏腑 → 官窍 → 情志 的边逐步点亮</div>
    <div data-figure="zangxiang-graph"></div>
  </div>
  <div class="card">
    <div class="card-title">四诊合参 → 多模态融合（含模态缺失）</div>
    <div class="small muted">缺一诊时系统必须显式降级，而不是静默猜测</div>
    <div data-figure="sizhen-fusion"></div>
  </div>
  <div class="card">
    <div class="card-title">经络腧穴 → KD-Tree 空间检索</div>
    <div class="small muted">平面最近邻；真实体表须改用测地距离</div>
    <div data-figure="meridian-lookup"></div>
  </div>
  <div class="card">
    <div class="card-title">君臣佐使 → 注意力权重先验</div>
    <div class="small muted">组方结构作为掩码，防止模型学出「反结构」配伍</div>
    <div data-figure="junchen-attention"></div>
  </div>
</div>

<h2>八院系</h2>
<div class="grid cols-3">
  ${DATA.departments.map((dept) => `
  <a class="card" href="catalog.html?dept=${dept.slug}">
    <div class="card-title">${dept.icon} ${esc(dept.title)}</div>
    <div class="card-sub">${esc(dept.en)}</div>
    <div class="card-meta">
      <span class="tag">${dept.subjects.length} 学科</span>
      <span class="tag">${dept.hours} 学时</span>
      <span class="tag">${dept.chapters} 章</span>
    </div>
  </a>`).join('')}
</div>

<h2>已建章节</h2>
${built.length === 0
  ? `<p class="muted">尚未构建章节。运行 <code>node scripts/scaffold_chapter.js ...</code> 开章。</p>`
  : `<div class="grid cols-2">${built.map((c) => chapterCard(c)).join('')}</div>`}

<h2>两类交付物</h2>
<div class="grid cols-2">
  <div class="card">
    <div class="card-title">🎬 [tcmP] 网络视频教育平台</div>
    <div class="card-sub">静态课程站 + 讲稿派生视频 + 章节内可运行实验台</div>
    <div class="small muted" style="margin-top:10px">当前已建章节 ${DATA.counts.chaptersBuilt} · 已发布视频 ${DATA.counts.videos}</div>
  </div>
  <div class="card">
    <div class="card-title">📚 [textbooks] 120 门学科教材</div>
    <div class="card-sub">每章 ≈6000 字，按生长壮老已汇成五卷</div>
    <div class="small muted" style="margin-top:10px">当前已写教材章节 ${DATA.counts.textbookChapters}</div>
  </div>
</div>

<div class="notice">本平台全部内容仅用于教育，<strong>不构成临床诊疗建议</strong>。任何基于本站代码的临床决策须由执业医师复核。</div>
`);
}

function chapterCard(c) {
  const pct = 0;
  return `<a class="card" href="chapter.html?path=${encodeURIComponent(c.key)}">
    <div class="card-title">${esc(c.title)}</div>
    <div class="card-sub">${esc(c.deptTitle)} · ${esc(c.subjectTitle)}</div>
    ${c.motto ? `<div class="small muted" style="margin-top:8px">${esc(c.motto)}</div>` : ''}
    <div class="card-meta">
      <span class="tag">${Object.keys(c.code).length} 个代码文件</span>
      <span class="tag">6 题小测</span>
      ${c.video ? '<span class="tag core">有视频</span>' : ''}
    </div>
  </a>`;
}

// ── 页面：课程目录 ──
function renderCatalog() {
  const q = new URLSearchParams(location.search);
  const deptFilter = q.get('dept') || '';
  const semFilter = q.get('semester') || '';

  const rows = ALL_SUBJECTS.filter(
    (s) => (!deptFilter || s.dept.slug === deptFilter) && (!semFilter || String(s.semester) === semFilter)
  );

  return shell('catalog.html', '课程目录', `
<h1>课程目录</h1>
<p class="lede">${DATA.counts.subjects} 门学科，按院系与学期筛选。点进去看章节。</p>

<div class="controls">
  <select id="f-dept">
    <option value="">全部院系</option>
    ${DATA.departments.map((d) => `<option value="${d.slug}" ${d.slug === deptFilter ? 'selected' : ''}>${d.icon} ${esc(d.title)}</option>`).join('')}
  </select>
  <select id="f-sem">
    <option value="">全部学期</option>
    ${Array.from({ length: DATA.domain.scale.semesters }, (_, i) => i + 1)
      .map((s) => `<option value="${s}" ${String(s) === semFilter ? 'selected' : ''}>第 ${s} 学期</option>`)
      .join('')}
  </select>
  <button class="btn ghost" id="f-reset">重置</button>
  <span class="muted small" id="f-count">${rows.length} / ${DATA.counts.subjects}</span>
</div>

<div class="table-wrap">
<table>
  <thead><tr><th>#</th><th>学科</th><th>院系</th><th>类型</th><th>学期</th><th>学时</th><th>章节</th><th>中医 → AI 桥梁</th></tr></thead>
  <tbody>
  ${rows.map((s) => `
    <tr>
      <td class="mono">${String(s.globalN).padStart(3, '0')}</td>
      <td><a href="subject.html?path=${encodeURIComponent(`${s.dept.slug}/${s.slug}`)}">${esc(s.title)}</a></td>
      <td class="small">${s.dept.icon} ${esc(s.dept.title)}</td>
      <td><span class="tag ${s.type.toLowerCase()}">${s.type}</span></td>
      <td>${s.semester}</td>
      <td>${s.hours}</td>
      <td>${s.chaptersBuilt}/${s.chaptersTarget}</td>
      <td class="small">${esc(s.bridge)}</td>
    </tr>`).join('')}
  </tbody>
</table>
</div>
`);
}

// ── 页面：学科 ──
function renderSubject() {
  const key = new URLSearchParams(location.search).get('path') || '';
  const s = SUBJECT_BY_PATH.get(key);
  if (!s) return shell('catalog.html', '未找到', `<h1>未找到学科</h1><p class="muted">路径 <code>${esc(key)}</code> 不在课程表中。<a href="catalog.html">返回课程目录</a></p>`);

  const stage = DATA.stages.find((x) => x.id === s.stage) || {};
  const chapters = Object.values(CONTENT)
    .filter((c) => c.deptSlug === s.dept.slug && c.subjectSlug === s.slug)
    .sort((a, b) => (a.n || 0) - (b.n || 0));

  const map = (DATA.chapterIndex || {})[key] || [];
  const bySlug = new Map(chapters.map((c) => [c.chapterSlug, c]));
  // 章节地图 = chapters.json（声明的知识结构）+ CONTENT（磁盘实测的正文）对齐后的结果。
  // 有正文的才渲染成链接；没正文的标「待写」并把 slug 亮出来，绝不把空章节做成能点进去的 404。
  const rows = map.length
    ? map.map((m) => ({ ...m, built: bySlug.get(m.slug) || null }))
    : chapters.map((c) => ({ n: c.n, slug: c.chapterSlug, title: c.title, status: '🚧', built: c }));
  const nextUnbuilt = rows.find((r) => !r.built);

  // ── 先修关系：前置 / 后续 / 根课理由 ──
  // 学生看这一节要能回答两个问题：① 这门课先学什么；② 它如果是根课，凭什么没有前置。
  // 「凭什么」不写在页面里，只从 data/prereq-roots.json 读 —— 页面不许自己编理由。
  const pInfo = (DATA.prereqIndex || {})[key] || null;
  const deptTitleOf = (slug) => (DATA.departments.find((d) => d.slug === slug) || {}).title || slug;
  const depLink = (x) =>
    `<a href="subject.html?path=${encodeURIComponent(x.key)}">${esc(x.title)}</a>` +
    `<span class="small muted"> · 第 ${x.semester == null ? '?' : x.semester} 学期 · ${esc(deptTitleOf(x.dept))}</span>`;
  const prereqBlock = (() => {
    if (!pInfo) return '<p class="muted small">先修数据未生成 —— 跑 <code>node scripts/build_catalog.js</code> 再重建站点。</p>';
    const head = pInfo.prereq.length
      ? `<div class="card-title">先修链第 ${pInfo.depth} 层 · 前置 ${pInfo.prereq.length} 门</div>`
      : '<div class="card-title">根课 <span class="tag core">无前置</span></div>';
    const rootWhy = pInfo.root
      ? `<p class="small" style="margin-top:8px"><b>为什么它是根课：</b>${esc(pInfo.root)}</p>`
      : pInfo.prereq.length
        ? ''
        : '<p class="small" style="margin-top:8px;color:#b45309">这门课没有前置，也没有在 <code>data/prereq-roots.json</code> 登记理由 —— 按漏声明处理，审计会报。</p>';
    const pre = pInfo.prereq.length
      ? `<div class="small" style="margin-top:8px"><b>先学：</b></div><ul class="small">${pInfo.prereq
          .map((x) => `<li>${depLink(x)}${x.cross ? ' <span class="tag">跨院系</span>' : ''}</li>`)
          .join('')}</ul>`
      : '';
    const post = pInfo.dependents.length
      ? `<div class="small" style="margin-top:8px"><b>以这门课为前置（${pInfo.dependents.length} 门）：</b></div><ul class="small">${pInfo.dependents
          .slice(0, 12)
          .map((x) => `<li>${depLink(x)}</li>`)
          .join('')}</ul>${
          pInfo.dependents.length > 12
            ? `<p class="small muted">…… 另有 ${pInfo.dependents.length - 12} 门未列出。</p>`
            : ''
        }`
      : '<p class="small muted" style="margin-top:8px">没有其他课以它为先修（末端课）。</p>';
    return `<div class="card">${head}${rootWhy}${pre}${post}
  <p class="small muted" style="margin-top:10px">口径：先修边是本仓库作者判断，不是教务处文件；根课理由登记在 <code>data/prereq-roots.json</code>，审计（<code>audit_curriculum.js</code> L0）会卡「空前置且未登记」。改边须改 <code>scripts/migrate_prereq.js</code> 后重跑。</p>
</div>`;
  })();

  return shell('catalog.html', s.title, `
<div class="breadcrumb"><a href="index.html">总览</a> / <a href="catalog.html?dept=${s.dept.slug}">${esc(s.dept.title)}</a> / ${esc(s.title)}</div>
<h1>${esc(s.title)}</h1>
<p class="lede">${esc(s.en)} · ${esc(s.bridge)}</p>

<div class="counts">
  <div class="count"><b>${s.type}</b>类型</div>
  <div class="count"><b>第 ${s.semester} 学期</b>${stage.glyph || ''} ${esc(stage.title || '')}</div>
  <div class="count"><b>${s.hours}</b>学时</div>
  <div class="count"><b>${s.chaptersBuilt}/${s.chaptersTarget}</b>章节</div>
  <div class="count"><b>${String(s.globalN).padStart(3, '0')}</b>学科编号</div>
</div>

<h2>先修关系</h2>
${prereqBlock}
<h2>章节地图（已建 ${chapters.length} / 目标 ${s.chaptersTarget}）</h2>
${rows.length === 0
  ? `<p class="muted">该学科尚未定义章节结构。先写 <code>standards/knowledge-structure/${s.dept.slug}.txt</code>，再跑 <code>node scripts/build_knowledge_structure.js</code>。</p>`
  : `<ul class="chapter-list">${rows.map((r) => `
      <li>
        <span class="n">${String(r.n).padStart(2, '0')}</span>
        <span style="flex:1">${r.built
          ? `<a href="chapter.html?path=${encodeURIComponent(r.built.key)}">${esc(r.title)}</a>
        ${r.built.problem ? `<div class="small muted">${esc(r.built.problem)}</div>` : ''}`
          : `${esc(r.title)}<div class="small muted mono">${esc(r.slug)}</div>`}</span>
        ${r.built
          ? `<span class="tag">${Object.keys(r.built.code).length} 代码</span>${r.built.video ? '<span class="tag core">视频</span>' : '<span class="tag">待录制</span>'}`
          : '<span class="tag">待写</span>'}
      </li>`).join('')}</ul>
      ${nextUnbuilt
        ? `<p class="small muted">下一章开章命令：<code>node scripts/scaffold_chapter.js ${s.dept.slug}/${s.slug} ${esc(nextUnbuilt.slug)} "${esc(nextUnbuilt.title)}"</code></p>`
        : ''}`}

<h2>交付轨道</h2>
<div class="grid cols-2">
  <div class="card">
    <div class="card-title">🎬 [tcmP] 视频课程</div>
    <div class="card-sub mono small">platform/courses/${s.dept.slug}/${s.slug}/</div>
    <div class="small muted" style="margin-top:8px">已完成视频 ${chapters.filter((c) => c.video).length} / ${s.chaptersTarget}</div>
  </div>
  <div class="card">
    <div class="card-title">📚 [textbooks] 教材</div>
    <div class="card-sub mono small">textbooks/${s.dept.slug}/${s.slug}/</div>
    <div class="small muted" style="margin-top:8px">已写字数 ${s.textbook ? s.textbook.words : 0}</div>
  </div>
</div>
`);
}

// ── 页面：章节 ──
/** 章节页把标题渲染在页头卡片里，正文再渲染一次 H1 就会连出两个一样的标题 */
function stripLeadingH1(html) {
  return String(html).replace(/^\s*<h1\b[^>]*>[\s\S]*?<\/h1>\s*/, '');
}

function renderChapter() {
  const key = new URLSearchParams(location.search).get('path') || '';
  const c = CONTENT[key];
  if (!c) return shell('catalog.html', '未找到', `<h1>未找到章节</h1><p class="muted">路径 <code>${esc(key)}</code> 未构建。<a href="catalog.html">返回课程目录</a></p>`);

  const siblings = Object.values(CONTENT)
    .filter((x) => x.subjectSlug === c.subjectSlug && x.deptSlug === c.deptSlug)
    .sort((a, b) => (a.n || 0) - (b.n || 0));
  const idx = siblings.findIndex((x) => x.key === c.key);
  const prev = siblings[idx - 1];
  const next = siblings[idx + 1];

  const codeNames = Object.keys(c.code);

  return shell('catalog.html', c.title, `
<div class="breadcrumb">
  <a href="index.html">总览</a> /
  <a href="catalog.html?dept=${c.deptSlug}">${esc(c.deptTitle)}</a> /
  <a href="subject.html?path=${encodeURIComponent(`${c.deptSlug}/${c.subjectSlug}`)}">${esc(c.subjectTitle)}</a> /
  第 ${c.n} 章
</div>

<div class="chapter-head">
  <h1 style="margin:0 0 6px">${esc(c.title)}</h1>
  ${c.motto ? `<div class="motto">MOTTO · ${esc(c.motto)}</div>` : ''}
  ${c.problem ? `<p class="problem"><strong>PROBLEM：</strong>${esc(c.problem)}</p>` : ''}
  ${c.roots ? `<p class="roots"><strong>双根因定位：</strong>${esc(c.roots)}</p>` : ''}
  <div class="card-meta" style="margin-top:12px">
    <span class="tag">${esc(c.deptTitle)}</span>
    <span class="tag">${esc(c.subjectTitle)}</span>
    <span class="tag">${codeNames.length} 个代码文件</span>
    ${c.video ? `<span class="tag core">视频已就绪</span>` : `<span class="tag">视频待录制</span>`}
  </div>
</div>

${c.video ? `<div class="card video-card">
  <div class="card-title">🎬 本讲视频</div>
  <video class="lesson-video" controls preload="metadata" playsinline${c.videoPoster ? ` poster="${encodeURI(c.videoPoster)}"` : ''}>
    <source src="${encodeURI(c.video)}" type="video/mp4">
    你的浏览器不支持 &lt;video&gt;。直接下载：<a href="${encodeURI(c.video)}">${esc(c.video)}</a>
  </video>
  <div class="small muted" style="margin-top:8px">
    <code>${esc(c.video)}</code> · 成片不入库（见 <code>.gitignore</code>），随 release 附件发布；
    本地用 <code>node site/serve.js</code> 预览时会直接提供该文件。
  </div>
</div>` : `<div class="card">
  <div class="card-title">🎬 本讲视频</div>
  <div class="small muted">尚未录制。生成方式见 <code>platform/README.md</code> 的四段流水线：
  <code>check_tools → extract_narration → build_slides → render_frames → synthesize_narration → build_video</code>。</div>
</div>`}

<div class="doc">${stripLeadingH1(c.html)}</div>

${c.exercises ? `<h2>练习</h2><div class="doc">${c.exercises.replace(/^#.*$/m, '').split('\n').filter(Boolean).map((l) => `<p>${esc(l)}</p>`).join('')}</div>` : ''}

${codeNames.length ? `
<h2>实验台</h2>
<p class="muted small">左侧可编辑，右侧是 <code>${esc(codeNames[0])}</code> 在本机应有的行为说明。真正的运行在本机终端：<code>node code/${esc(codeNames.find((n) => n.includes('test')) || codeNames[0])}</code></p>
<div class="lab">
  <div class="lab-head">${esc(codeNames[0])}</div>
  <div class="lab-body">
    <textarea id="lab-src" spellcheck="false">${esc(c.code[codeNames[0]])}</textarea>
    <pre id="lab-out">点击「运算」，在浏览器沙箱内执行纯计算部分。</pre>
  </div>
  <div class="lab-foot">
    <button class="btn" id="lab-run">运算</button>
    <button class="btn ghost" id="lab-reset">还原</button>
    <span class="small muted" id="lab-msg"></span>
  </div>
</div>
` : ''}

${renderOutputs(c.outputs)}

${c.quiz ? renderQuiz(c.quiz, c.key) : ''}

<hr/>
<p>
  ${prev ? `← <a href="chapter.html?path=${encodeURIComponent(prev.key)}">${esc(prev.title)}</a>` : ''}
  ${next ? `<span style="float:right"><a href="chapter.html?path=${encodeURIComponent(next.key)}">${esc(next.title)}</a> →</span>` : ''}
</p>
`);
}

/**
 * 本章产出物：契约要求每章交出 prompt-<base>.md + skill-<base>.md。
 *
 * 为什么要在章节页渲染它们：这两件是「工程化」与「讲课」的分界 ——
 * 代码跑通只证明写对了，**能交出去复用**才算工程化。之前它们只躺在
 * `outputs/` 目录里，页面上看不到，于是「每章都产出提示词与技能」这件事
 * 对读者是不可见的（与 outputs 契约曾是空壳门是同一类问题的两种形态）。
 */
const OUTPUT_LABEL = { prompt: '提示词', skill: '技能', agent: '智能体', mcp: 'MCP 服务' };

function renderOutputs(outputs) {
  const list = outputs || [];
  if (!list.length) {
    return `<h2>带走的东西</h2>
<p class="muted small">本章尚未产出。契约要求每章交出 <code>prompt-&lt;base&gt;.md</code> 与
<code>skill-&lt;base&gt;.md</code> 两件 —— 缺了就是没写完（见 <code>CONTRIBUTING.md</code>）。</p>`;
  }
  const cards = list.map((o) => `
  <div class="output-card">
    <div class="output-kind kind-${esc(o.kind)}">${esc(OUTPUT_LABEL[o.kind] || o.kind)}</div>
    <div class="output-title">${esc(o.title)}</div>
    ${o.description ? `<div class="output-desc">${esc(o.description)}</div>` : ''}
    <div class="output-meta">${o.chars} 字 · <a href="${encodeURI(o.file)}">${esc(o.name)}</a></div>
  </div>`).join('');
  return `<h2>带走的东西</h2>
<p class="muted small">这两件是本章可以被拿走复用的部分 ——
提示词让大模型按本章的判断格式输出，技能把本章的流程固化下来。</p>
<div class="output-grid">${cards}
</div>`;
}

function renderQuiz(quiz, key) {
  return `
<div class="quiz" id="quiz">
  <h2 style="margin-top:0;border:0">小测 · ${esc(quiz.title || '')}</h2>
  <p class="small muted">1 道前置自测 + 3 道过程检查 + 2 道课后检验。选择后立即给解析。</p>
  ${quiz.questions.map((q, qi) => `
    <div class="q" data-q="${qi}" data-stage="${q.stage}">
      <div class="stage">${q.stage === 'pre' ? '前置自测' : q.stage === 'check' ? '过程检查' : '课后检验'}</div>
      <div class="q-head">${qi + 1}. ${esc(q.question)}</div>
      ${q.options.map((o, oi) => `<span class="opt" data-q="${qi}" data-o="${oi}" data-correct="${oi === q.correct ? 1 : 0}">${esc(o)}</span>`).join('')}
      <div class="expl">${esc(q.explanation || '')}</div>
    </div>`).join('')}
  <div class="small muted" id="quiz-score"></div>
</div>`;
}

function bindQuiz(key) {
  const quiz = $('#quiz');
  if (!quiz) return;
  let answered = 0;
  let correct = 0;
  const total = quiz.querySelectorAll('.q').length;

  quiz.querySelectorAll('.opt').forEach((opt) => {
    opt.addEventListener('click', () => {
      const q = opt.closest('.q');
      if (q.classList.contains('answered')) return;
      q.classList.add('answered');
      const qi = Number(opt.dataset.q);
      const stage = q.dataset.stage;
      const isCorrect = opt.dataset.correct === '1';
      opt.classList.add(isCorrect ? 'correct' : 'wrong');
      if (!isCorrect) {
        const right = q.querySelector('.opt[data-correct="1"]');
        if (right) right.classList.add('correct');
      }
      answered += 1;
      if (isCorrect) correct += 1;
      PROG.recordAnswer(key, qid(stage, qi), Number(opt.dataset.o), isCorrect);

      const scoreEl = $('#quiz-score');
      if (answered === total) {
        scoreEl.innerHTML = `得分 <strong>${correct}/${total}</strong> · ${correct === total ? '全部正确 ✅' : '回看解析再试一次'}`;
        if (correct === total) PROG.markComplete(key);
      } else {
        scoreEl.textContent = `已答 ${answered}/${total}`;
      }
    });
  });

  const saved = PROG.quizScore(key);
  if (saved.answered) {
    $('#quiz-score').innerHTML = `本机记录：已答 ${saved.answered}/${total}，正确 ${saved.correct}`
      + (PROG.isComplete(key) ? ' · ✅ 本章已完成' : '');
  }
}

function bindLab() {
  const run = $('#lab-run');
  if (!run) return;
  const src = $('#lab-src');
  const initial = src.value;
  const out = $('#lab-out');
  const msg = $('#lab-msg');

  run.addEventListener('click', () => {
    const logs = [];
    const fakeConsole = {
      log: (...a) => logs.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')),
      error: (...a) => logs.push(`[error] ${a.join(' ')}`),
    };
    try {
      // 只执行纯计算：屏蔽 require / module，捕获 2 秒超时
      const body = src.value
        .replace(/^'use strict';\s*/m, '')
        .replace(/if\s*\(require\.main\s*===\s*module\)\s*\{[\s\S]*?\}/g, '')
        .replace(/module\.exports[\s\S]*$/m, '');
      const fn = new Function('console', `"use strict";\n${body}\nif (typeof main === "function") main();`);
      fn(fakeConsole);
      out.textContent = logs.length ? logs.join('\n') : '（无输出 —— 检查是否定义了 main() 并调用了 console.log）';
      msg.textContent = '已在浏览器沙箱内执行（无文件与网络访问）';
    } catch (e) {
      out.textContent = `执行出错: ${e.message}\n\n提示：需要 Node 专有 API（require/fs/process）的章节，请在本机运行:\n  node code/main.js`;
      msg.textContent = '';
    }
  });
  $('#lab-reset').addEventListener('click', () => {
    src.value = initial;
    out.textContent = '已还原。';
  });
}

// ── 页面：进度 ──
function renderRoadmap() {
  const sem = DATA.semesterPlan;
  return shell('roadmap.html', '进度', `
<h1>进度</h1>
<p class="lede">学科与章节的建设状态。数据来自 <code>catalog.json</code>（由文件系统实测生成）。</p>
${countsBar()}

<h2>全局</h2>
<div class="table-wrap"><table>
  <thead><tr><th>维度</th><th>已完成</th><th>总量</th><th>完成率</th></tr></thead>
  <tbody>
    <tr><td>学科</td><td>${DATA.counts.subjectsDone}</td><td>${DATA.counts.subjects}</td><td>${((DATA.counts.subjectsDone / DATA.counts.subjects) * 100).toFixed(1)}%</td></tr>
    <tr><td>学科（进行中）</td><td>${DATA.counts.subjectsWip}</td><td>${DATA.counts.subjects}</td><td>${((DATA.counts.subjectsWip / DATA.counts.subjects) * 100).toFixed(1)}%</td></tr>
    <tr><td>章节</td><td>${DATA.counts.chaptersBuilt}</td><td>${DATA.counts.chapters}</td><td>${((DATA.counts.chaptersBuilt / DATA.counts.chapters) * 100).toFixed(2)}%</td></tr>
    <tr><td>视频 [tcmP]</td><td>${DATA.counts.videos}</td><td>${DATA.counts.chapters}</td><td>${((DATA.counts.videos / DATA.counts.chapters) * 100).toFixed(2)}%</td></tr>
    <tr><td>教材章节 [textbooks]</td><td>${DATA.counts.textbookChapters}</td><td>${DATA.counts.chapters}</td><td>${((DATA.counts.textbookChapters / DATA.counts.chapters) * 100).toFixed(2)}%</td></tr>
  </tbody>
</table></div>

<h2>学期排课</h2>
${sem.map((p) => `
  <h3>第 ${p.semester} 学期 · ${esc(p.stageTitle)}（${p.subjects.length} 门 / ${p.hours} 学时）</h3>
  ${p.subjects.length === 0
    ? '<p class="muted">临床轮转 / 毕业设计，不安排常规学科。</p>'
    : `<div class="table-wrap"><table>
        <thead><tr><th>学科</th><th>院系</th><th>类型</th><th>学时</th></tr></thead>
        <tbody>${p.subjects.map((s) => `<tr>
          <td><a href="subject.html?path=${encodeURIComponent(s.path.replace(/^departments\//, ''))}">${esc(s.title)}</a></td>
          <td class="small">${esc(s.deptTitle)}</td>
          <td><span class="tag ${s.type.toLowerCase()}">${s.type}</span></td>
          <td>${s.hours}</td></tr>`).join('')}</tbody>
      </table></div>`}
`).join('')}

<h2>院系明细</h2>
${DATA.departments.map((d) => `
  <h3>${d.icon} ${esc(d.title)} <span class="small muted">${d.subjects.filter((s) => s.chaptersBuilt > 0).length}/${d.subjects.length} 学科已开章</span></h3>
  <div class="table-wrap"><table>
    <thead><tr><th>#</th><th>学科</th><th>学期</th><th>类型</th><th>学时</th><th>章节</th><th>进度</th></tr></thead>
    <tbody>${d.subjects.map((s) => `<tr>
      <td class="mono">${String(s.n).padStart(2, '0')}</td>
      <td><a href="subject.html?path=${encodeURIComponent(`${d.slug}/${s.slug}`)}">${esc(s.title)}</a></td>
      <td>${s.semester}</td>
      <td><span class="tag ${s.type.toLowerCase()}">${s.type}</span></td>
      <td>${s.hours}</td>
      <td>${s.chaptersBuilt}/${s.chaptersTarget}</td>
      <td style="min-width:90px"><div class="bar"><span style="width:${s.pct}%"></span></div></td>
    </tr>`).join('')}</tbody>
  </table></div>
`).join('')}
`);
}

// ── 页面：学习路径 ──
function renderPaths() {
  return shell('paths.html', '学习路径', `
<h1>学习路径</h1>
<p class="lede">120 门学科不是让人全修一遍的清单。不同身份走不同的顺序、深度与交付侧重。</p>

${PATHS.map((p) => `
<h2>${esc(p.title)}</h2>
<p class="muted">${esc(p.audience)}</p>
<p><strong>毕业时能：</strong>${esc(p.outcome)}</p>
<div class="counts">
  <div class="count"><b>${p.subjectCount}</b>学科</div>
  <div class="count"><b>${p.hours}</b>学时</div>
  <div class="count"><b>第 ${(p.semesters || [1, 10]).join('–')} 学期</b>跨度</div>
</div>
${(p.route || []).filter((r) => r.subjects.length).map((r) => `
  <h3>第 ${r.semester} 学期 <span class="small muted">${esc(r.reason)}</span></h3>
  <div class="table-wrap"><table>
    <thead><tr><th>学科</th><th>院系</th><th>类型</th><th>学时</th></tr></thead>
    <tbody>${r.subjects.map((ref) => {
      const s = SUBJECT_BY_PATH.get(ref);
      if (!s) return `<tr><td colspan="4" class="muted">引用失效: ${esc(ref)}</td></tr>`;
      return `<tr>
        <td><a href="subject.html?path=${encodeURIComponent(ref)}">${esc(s.title)}</a></td>
        <td class="small">${esc(s.dept.title)}</td>
        <td><span class="tag ${s.type.toLowerCase()}">${s.type}</span></td>
        <td>${s.hours}</td></tr>`;
    }).join('')}</tbody>
  </table></div>
`).join('')}
<div class="card"><div class="card-title">毕业设计 · ${esc(p.capstone.title)}</div>
  <div class="card-sub">${esc(p.capstone.deliverable)}</div>
  <ul class="small">${p.capstone.criteria.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
</div>
`).join('')}
`);
}

// ── 页面：术语表 ──
function renderGlossary() {
  return shell('glossary.html', '术语表', `
<h1>双术语表</h1>
<p class="lede">两套语言必须能互相翻译，否则「中医 × AI」只是一句口号。</p>
<div class="doc">
  <h2>中医 ↔ AI 桥梁对照</h2>
  ${GLOSSARY['bridge-map'] || '<p class="muted">未构建。</p>'}
  <h2>中医术语</h2>
  ${GLOSSARY['tcm-terms'] || '<p class="muted">未构建。</p>'}
  <h2>AI / 工程术语</h2>
  ${GLOSSARY['ai-terms'] || '<p class="muted">未构建。</p>'}
</div>
`);
}

// ── 页面：教材 ──
/**
 * 教材成品页。
 *
 * 数据来自 site/books-data.js（scripts/build_books_data.js 生成）：它把「清单说有什么」
 * 与「盘上真有什么」分开记录 —— 只读 series.json 的话，删掉产物后页面仍会显示可下载，
 * 点开就是 404。
 *
 * 下载链接指向 ../textbooks/build/…：`npm run serve` 会把仓库根映射进来，
 * 所以本地预览即可直接下载；部署时把 textbooks/build/ 一并同步即可（不需要站点内拷贝）。
 */
function renderBooks() {
  const B = window.TCMAI_BOOKS || { available: false, volumes: [], totals: {} };
  const mb = (a) => (a && a.ok ? `${(a.bytes / 1048576).toFixed(1)} MB` : '未构建');
  const link = (a, label, cls = 'btn') => (a && a.ok
    ? `<a class="${cls}" href="../${a.path}" download>${label} · ${mb(a)}</a>`
    : `<span class="tag">${label} 未构建</span>`);

  if (!B.available) {
    return shell('books.html', '教材', `
<h1>教材 · 五卷本</h1>
<p class="lede">教材成品尚未构建 —— ${esc(B.reason || '还没有生成 series.json')}。</p>
<p>构建命令（EPUB 需要 pandoc，PDF 另需 xelatex）：</p>
<pre><code>npm run textbooks:epub     # 五卷 EPUB
npm run textbooks:pdf      # 五卷 PDF
npm run textbooks:publish:check</code></pre>
<p class="small muted">源稿在 <code>textbooks/</code>（随仓库分发），成品在 <code>textbooks/build/</code>（不入库）。
章契约与四层口径见 <a href="../textbooks/README.md">textbooks/README.md</a>。</p>`);
  }

  const cards = B.volumes.map((v) => `
  <div class="card">
    <div class="card-title">${esc(v.glyph)} 第 ${v.n} 卷 · ${esc(v.title)}</div>
    <div class="card-sub">${esc(v.subtitle)}</div>
    <div class="card-meta">
      第 ${v.semesters.join('、')} 学期 · <b>${v.chapters}</b> 章 · <b>${v.words.toLocaleString('en-US')}</b> 字
    </div>
    <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.75rem">
      ${link(v.epub, 'EPUB')}
      ${link(v.pdf, 'PDF')}
      ${link(v.html, '单文件 HTML', 'btn ghost')}
    </div>
  </div>`).join('');

  return shell('books.html', '教材', `
<h1>教材 · 五卷本 · ${B.totals.chapters} 章</h1>
<p class="lede">《${esc(B.series)}》把 189 门学科按「生 · 长 · 壮 · 老 · 已」分成五卷。
每章首块写明底本表 / 外源书名、抽取指纹与该章字数 —— 数字可复算，写错就过不了门。</p>

<div class="counts">
  <div class="count"><b>${B.totals.volumes}</b>卷</div>
  <div class="count"><b>${B.totals.chapters}</b>章</div>
  <div class="count"><b>${(B.totals.words / 1e4).toFixed(1)} 万</b>字</div>
  <div class="count"><b>${B.totals.epubOnDisk ?? B.totals.epub}</b>EPUB</div>
  <div class="count"><b>${B.totals.pdfOnDisk ?? B.totals.pdf}</b>PDF</div>
</div>

<h2>三种形态怎么用</h2>
<div class="table-wrap"><table>
  <thead><tr><th>形态</th><th>适合</th><th>说明</th></tr></thead>
  <tbody>
    <tr><td><b>EPUB</b></td><td>手机 / 平板 / 阅读器</td><td>可重排、可调字号；卷内为「卷首说明 → 院系部页 → 学科页 → 前置 / 章 / 附录」，封面上的章数与字数是出书时实测</td></tr>
    <tr><td><b>PDF</b></td><td>打印 / 引用</td><td>固定版式，单卷体量大（卷一 7,178 页），建议按卷下载</td></tr>
    <tr><td><b>单文件 HTML</b></td><td>桌面 / 离线</td><td>双击即读、零依赖；公式与插图已内联，整本就是一个文件</td></tr>
  </tbody>
</table></div>

<h2>逐卷下载</h2>
<div class="grid cols-2">${cards}</div>

<p class="small muted" style="margin-top:2rem">
数据源：<code>scripts/build_books_data.js</code> 读 <code>textbooks/build/series.json</code> 并逐个核盘上文件；
章契约（N.1–N.5、免责句位置、四层口径）见 <a href="../textbooks/README.md">textbooks/README.md</a>。
对外分发（Release 附件）用 <code>npm run textbooks:publish</code>。教育用途，不构成临床诊疗建议。
</p>`);
}

// ── 页面：关于 ──
function renderAbout() {
  const tracks = DATA.tracks || {};
  return shell('about.html', '关于', `
<h1>关于这个平台</h1>
<p class="lede">${esc(DATA.domain.motto)}</p>

<p>本项目是 <code>tcmai-engineering-from-scratch</code> 的 <strong>[tcmP]</strong> 交付面 —— 网络视频教育平台。
它的姊妹交付物是 <strong>[textbooks]</strong>：120 门学科的编写教材。</p>

<h2>架构继承</h2>
<div class="table-wrap"><table>
  <thead><tr><th>上游</th><th>继承</th><th>改造</th></tr></thead>
  <tbody>
    <tr><td>ai-engineering-from-scratch</td><td>phase→lesson 结构、章节契约、静态站点 + CI 重建、learning-paths、glossary、Build It / Use It</td><td>领域从 AI → 中医药；进度轴从 20 线性 phase → 8 院系 × 10 学期；新增教材轨道</td></tr>
    <tr><td>医圣成长 · tcm-textbooks</td><td>双根因共振模型、七段章节骨架、生长壮老已五阶段、中医↔AI 桥梁表</td><td>22 课 → 120 学科 × ${DATA.counts.chapters} 章节；新增视频平台与教材出版</td></tr>
  </tbody>
</table></div>

<h2>数据管线</h2>
<pre class="mermaid">graph LR
  A["curriculum.json<br/>单一事实来源"] --> B["scripts/build_catalog.js"]
  B --> C["catalog.json"]
  C --> D["site/build.js"]
  A --> E["departments/**/docs/zh.md"]
  E --> D
  D --> F["site/data.js"]
  D --> G["site/content.js"]
  F --> H["本站"]
  G --> H
</pre>

<h2>交付轨道</h2>
<div class="grid cols-2">
  ${Object.values(tracks).map((t) => `
    <div class="card">
      <div class="card-title">${t.id === 'tcmP' ? '🎬' : '📚'} [${esc(t.id)}] ${esc(t.title)}</div>
      <div class="card-sub mono small">${esc(t.dir)}/</div>
      <div class="small muted" style="margin-top:8px">${esc(t.en)}</div>
    </div>`).join('')}
</div>

<h2>免责声明</h2>
<div class="notice">全部内容仅用于教育与科研。本站不构成临床诊疗建议；站内任何模型与算法均未取得医疗器械注册。
任何基于本站内容的临床决策，必须由具备合法执业资格的医师复核。</div>

<h2>本地运行</h2>
<pre><code>node scripts/build_catalog.js   # 课程表
node site/build.js              # 站点数据
node site/serve.js              # http://localhost:7788</code></pre>
`);
}

// ── 路由 ──
// ── 页面：语义张量（三维极坐标球面）────────────────────────────────────
/**
 * 数据集的单位 → 点云。
 * 颜色一律由 build 期的数据集给出（colorDerived），页面**不自己算色** ——
 * 页面重算就会出现「图上的颜色」与「测试断言的颜色」两套来源，
 * 而它们迟早会不一致，且不一致时没有任何东西会报错。
 */
function semtensorUnits(which) {
  const D = window.TCMAI_SEMTENSOR_DATA;
  if (!D) return [];
  // 默认用**源实现的 116 个真实单元**（103 病证 + 13 域级节点）。
  // 自造的域映射只在源数据不可得时才用 —— 真实数据永远优先。
  if (which === 'reference' || (!which && D.reference)) {
    const KIND = { dsu: '病证单元', six_channel: '六经域', system: '四系统', treasure: '精气神' };
    return D.reference.units.map((u) => ({
      key: u.uid,
      name: u.label,
      theta: u.theta,
      phi: u.phi,
      r: u.r,
      u: u.u,
      degenerate: u.x === 0 && u.y === 0 && u.z === 0,
      detail: `${KIND[u.kind] || u.kind}　三分量 (${u.x}, ${u.y}, ${u.z})　源色 ${u.colorSourceHex}` +
        (u.colorMatch ? '' : `　⚠ 与按公理算出的 ${u.colorDerived} 不一致（见规范 §14.1）`),
    }));
  }
  if (which === 'shanghan') {
    return D.shanghan.episodes.map((e) => ({
      key: e.code,
      name: `S${e.juan} ${e.name}`,
      theta: e.theta,
      phi: e.phi,
      r: e.r,
      u: S.sphToCart(1, e.theta, e.phi),
      detail: `域：${e.domain}　条数：${e.tiao}　时长：${(e.durationSec / 60).toFixed(1)} 分`,
    }));
  }
  if (which === 'shanghan-domain') {
    return D.shanghan.domains.map((d) => ({
      key: `D${d.order}`,
      name: `域 ${d.order}　${d.name}`,
      theta: d.theta,
      phi: d.phi,
      r: d.r,
      u: d.u,
      detail: `${d.pianLike} 集　${d.tiao} 条　${(d.durationSec / 60).toFixed(0)} 分`,
    }));
  }
  return D.neijing.domains.map((d) => ({
    key: `N${d.order}`,
    name: `${d.order}. ${d.name}`,
    theta: d.theta,
    phi: d.phi,
    r: d.r,
    u: d.u,
    detail: `篇 ${d.pian} · 章 ${d.zhang} · 节 ${d.jie} · ${d.chars.toLocaleString()} 字（占比 ${d.share}%）`,
  }));
}

function renderSemtensor() {
  const D = window.TCMAI_SEMTENSOR_DATA;
  if (!D) {
    return shell('semtensor.html', '语义张量', `
<h1>三维极坐标语义张量</h1>
<div class="notice">数据集未生成。请先运行 <code>node scripts/build_semtensor_datasets.js</code> 与 <code>node site/build.js</code>。</div>`);
  }

  const anns = window.TCMAI_SEMTENSOR_ANNOTATIONS || {};
  const annKeys = Object.keys(anns);
  const firstAnn = anns['图注-总览.txt'] || window.TCMSphere.DEFAULT_ANNOTATION;

  const axisRows = ['X', 'Y', 'Z'].map((a) => {
    const ax = S.SPEC.axes[a];
    return `<tr>
      <td class="mono">${a}</td>
      <td>${esc(ax.name)}<div class="small muted">${esc(ax.direction)}</div></td>
      <td><span class="swatch" style="background:${ax.i.hex}"></span><span class="mono small">${ax.i.hex}</span><div class="small muted">${esc(ax.i.semantic)} · ${ax.i.nm}nm</div></td>
      <td><span class="swatch" style="background:${ax.o.hex}"></span><span class="mono small">${ax.o.hex}</span><div class="small muted">${esc(ax.o.semantic)} · ${ax.o.nm}nm</div></td>
      <td><span class="swatch" style="background:${ax.t.hex}"></span><span class="mono small">${ax.t.hex}</span><div class="small muted">${esc(ax.t.semantic)} · ${ax.t.nm}nm</div></td>
    </tr>`;
  }).join('');

  const njRows = D.neijing.domains.map((d) => `<tr>
      <td class="mono">${d.order}</td>
      <td>${esc(d.name)}</td>
      <td class="mono">${d.pian}</td>
      <td class="mono">${d.zhang}</td>
      <td class="mono">${d.jie}</td>
      <td class="mono">${d.chars.toLocaleString()}</td>
      <td class="mono">${d.theta.toFixed(1)}°</td>
      <td class="mono">${d.phi}°</td>
      <td class="mono">${d.r.toFixed(2)}</td>
      <td><span class="swatch" style="background:${d.colorDerived}"></span><span class="mono small">${d.colorDerived}</span></td>
    </tr>`).join('');

  const shRows = D.shanghan.domains.map((d) => `<tr>
      <td class="mono">${d.order}</td>
      <td>${esc(d.name)}</td>
      <td class="mono">${d.pianLike}</td>
      <td class="mono">${d.tiao}</td>
      <td class="mono">${(d.durationSec / 60).toFixed(0)}</td>
      <td class="mono">${d.theta.toFixed(1)}°</td>
      <td class="mono">${d.phi.toFixed(1)}°</td>
      <td class="mono">${d.r.toFixed(2)}</td>
      <td><span class="swatch" style="background:${d.colorDerived}"></span><span class="mono small">${d.colorDerived}</span></td>
    </tr>`).join('');

  const mismatch = D.shanghan.episodes.filter((e) => !e.colorMatch).length;

  return shell('semtensor.html', '语义张量', `
<h1>三维极坐标语义张量 · 颜色赋值</h1>
<p class="lede">方向承载语义、尺度承载张量、<strong>颜色即坐标的函数</strong>。同一片色区就是同一类语义 ——
不是装饰，而是可被机器断言的量。规范见 <code>standards/semtensor/</code>，计算核心 <code>site/semtensor.js</code>，
硬证据 <code>tests/test_semtensor.js</code>（44 项）。</p>

<div class="card">
  <div class="card-title">◉ 交互球面：母子父三球同步旋转</div>
  <div class="controls">
    <label class="small muted">数据集
      <select id="st-which">
        <option value="reference">源实现 · 117 个真实语义单元</option>
        <option value="neijing">内经 12 语义域</option>
        <option value="shanghan-domain">伤寒论 9 域</option>
        <option value="shanghan">伤寒论 28 集</option>
      </select>
    </label>
    <button id="st-apply" class="btn">应用图注并重绘</button>
    <label class="small muted">载入图注
      <select id="st-anno">
        ${annKeys.map((k) => `<option value="${esc(k)}">${esc(k)}</option>`).join('')}
      </select>
    </label>
    <button id="st-reset" class="btn">复位视角 (θ 20° / φ −60°)</button>
    <span class="small muted">拖动任一球即可旋转；三球共用一个相机，天然同步。</span>
  </div>

  <div class="st-layout">
    <div id="st-view" style="flex:1 1 620px;min-width:300px"></div>
    <div style="flex:0 1 320px;min-width:250px">
      <div class="card" style="margin:0 0 10px">
        <div class="card-title small">读数（悬停任一点）</div>
        <div id="st-readout" class="small muted">把鼠标移到球面上的语义点上。</div>
      </div>
      <div class="card" style="margin:0">
        <div class="card-title small">图注（可编辑 · 改文本即改图）</div>
        <textarea id="st-anno-text" class="anno-text" spellcheck="false">${esc(firstAnn)}</textarea>
        <div id="st-params" class="small muted mono" style="margin-top:6px"></div>
      </div>
    </div>
  </div>
  <div class="small muted" style="margin-top:10px">
    画布内不出现汉字（规范 §8）：球面图只标 X/Y/Z、I/O/T、θ/φ 数字与圈号 ①②③；
    域名单与口径说明全部下沉到图注与本页表格。
  </div>
</div>

<h2>轴端色表</h2>
<p class="small muted">端色基准 = 可见光波长序段中位数（序段跨度 50nm）。O 点三轴共有，基准色是<strong>绿 <span class="mono">${S.SPEC.origin.hex}</span></strong>（533nm），不是灰。</p>
<table class="data-table">
  <thead><tr><th>轴</th><th>语义</th><th>I (−1)</th><th>O (0)</th><th>T (+1)</th></tr></thead>
  <tbody>${axisRows}</tbody>
</table>

<h2>颜色公理</h2>
<div class="card mono small" style="line-height:1.9">
  单轴渐变 ramp(t, 轴)：在 [−1, 0, +1] 三色间逐通道线性插值<br/>
  w<sub>i</sub> = clip(|v<sub>i</sub>|, 0, 1)　；　k = max(w<sub>i</sub>)<br/>
  C = (1 − k)·绿 + k·( Σ w<sub>i</sub>·c<sub>i</sub> / Σ w<sub>i</sub> )
</div>
<p class="small muted">性质：O 点任意轴都回到基准绿（O 点任意轴都回到基准绿 <span class="mono">comp(0,0,0) = ${S.compHex(0, 0, 0)}</span>）；
三轴同强时趋向三端色的加权混合；镜像不变色；对符号敏感（v 与 −v 必异色）。
<strong>颜色取方向不取尺度</strong> —— 否则「尺度伸缩不改色」不成立，见规范 §4.1。</p>

<h2>源实现 · 117 个真实语义单元（104 病证 + 六经域 6 + 四系统 4 + 精气神 3）</h2>
<p class="small muted">数据取自源实现交付物 <code>standards/semtensor/sources/</code> 内嵌的 <code>DATA.units</code>，
原样入库、不做二次加工。<strong>这是真实数据，站点默认用它</strong>；
下方「内经 12 语义域」的球面映射是本仓库的本地约定，只在源数据不可得时才用。</p>
<table class="data-table">
  <thead><tr><th>序号</th><th>语义单元</th><th>类型</th><th>三分量 (x, y, z)</th><th>r 尺度</th><th>θ 仰角</th><th>φ 方位</th><th>合成色（公理）</th><th>源色</th></tr></thead>
  <tbody>${D.reference.units
    .slice()
    .sort((a, b) => b.r - a.r)
    .slice(0, 24)
    .map((u, i) => `<tr>
      <td class="mono">${i + 1}</td>
      <td>${esc(u.label)}</td>
      <td class="small muted">${esc(({ dsu: '病证', six_channel: '六经域', system: '四系统', treasure: '精气神' })[u.kind] || u.kind)}</td>
      <td class="mono small">${u.x.toFixed(2)}, ${u.y.toFixed(2)}, ${u.z.toFixed(2)}</td>
      <td class="mono">${u.r.toFixed(3)}</td>
      <td class="mono">${u.theta.toFixed(2)}°</td>
      <td class="mono">${u.phi.toFixed(2)}°</td>
      <td><span class="swatch" style="background:${u.colorDerived}"></span><span class="mono small">${u.colorDerived}</span></td>
      <td><span class="swatch" style="background:${u.colorSourceHex}"></span><span class="mono small">${u.colorSourceHex}</span>${u.colorMatch ? '' : ' <span class="small muted">≠</span>'}</td>
    </tr>`).join('')}</tbody>
</table>
<p class="small muted">按 r 降序显示前 24 条（共 ${D.reference.unitCount} 条）。
「合成色」是按本仓库颜色公理算出的值，「源色」是源系统 <code>hex</code> 字段的原值 ——
<strong>实测二者仅 2/${D.reference.unitCount} 一致</strong>，原因见规范 §14.1（源的元数据与源页面本身也不一致）。</p>

<h2>内经 12 语义域（篇／章／节／字数取自《人类生命公理文本》总纲表）</h2>
<table class="data-table">
  <thead><tr><th>内序</th><th>语义域</th><th>篇</th><th>章</th><th>节</th><th>字数</th><th>θ 仰角</th><th>φ 方位</th><th>r 尺度</th><th>合成色</th></tr></thead>
  <tbody>${njRows}</tbody>
  <tfoot><tr><th colspan="2">合计</th><th class="mono">${D.neijing.totals.pian}</th><th class="mono">${D.neijing.totals.zhang}</th><th class="mono">${D.neijing.totals.jie}</th><th class="mono">${D.neijing.totals.chars.toLocaleString()}</th><th colspan="4"></th></tr></tfoot>
</table>
<p class="small muted">球面映射：${esc(D.neijing.mapping.theta)}；${esc(D.neijing.mapping.phi)}；${esc(D.neijing.mapping.r)}。
<strong>这是本仓库的域级本地约定，非规范原文</strong>（§14.2）。</p>

<h2>伤寒论 9 域（28 集 · ${(D.shanghan.episodes.reduce((a, e) => a + (e.durationSec || 0), 0) / 60).toFixed(0)} 分钟）</h2>
<table class="data-table">
  <thead><tr><th>序</th><th>域</th><th>集数</th><th>条数</th><th>分钟</th><th>θ 仰角</th><th>φ 方位</th><th>r 尺度</th><th>合成色</th></tr></thead>
  <tbody>${shRows}</tbody>
</table>

<div class="notice">
  <strong>待裁定项（实测发现，不掩盖）：</strong>
  源目录 <code>SHL_目录.json</code> 里每集自带的「色」<strong>无法用本规范的颜色公理复现</strong> ——
  实测 ${mismatch}/${D.shanghan.episodes.length} 不一致。源系统的配色算法只存在于
  <code>docs/axis_color.py</code>（本机不可得）。因此本仓库<strong>同时保留两列</strong>：
  <code>colorSource</code>（源值，原样）与 <code>colorDerived</code>（按公理算出）；
  本页与测试一律使用 <code>colorDerived</code>，<strong>不声称复现了源系统的配色</strong>。
  详见规范 §14.1。
</div>

<div class="notice">
  免责：本页与全部球面图仅用于教育与科研，<strong>不构成临床诊疗建议</strong>。
  语义域的位置与颜色是工程化的表示约定，不是医学判断。
</div>`);
}

/** 语义张量页接线：挂载球面视图、数据集切换、图注实例化三条通道 */
function bindSemtensor() {
  const view = document.getElementById('st-view');
  if (!view || !window.TCMSphere || !window.TCMAI_SEMTENSOR_DATA) return;

  const readout = document.getElementById('st-readout');
  const annoText = document.getElementById('st-anno-text');
  const paramsBox = document.getElementById('st-params');
  const whichSel = document.getElementById('st-which');
  const annoSel = document.getElementById('st-anno');
  const D = window.TCMAI_SEMTENSOR_DATA;

  let handle = null;

  const showParams = () => {
    if (!paramsBox || !handle) return;
    const p = handle.getParams();
    const cam = handle.getCamera();
    paramsBox.textContent =
      `rings=${p.rings} seg=${p.seg} azimuth_step=${p.azimuth_step_deg}° ` +
      `alpha=${p.cloud_alpha_face}…${p.cloud_alpha_rim} ` +
      `view=θ${cam.elevDeg.toFixed(0)}°/φ${cam.azimDeg.toFixed(0)}°`;
  };

  const mount = (which) => {
    if (handle) {
      // 换数据集只重建点云，保留当前视角与图注参数
      const p = handle.getParams();
      handle = window.TCMSphere.render(view, {
        units: semtensorUnits(which),
        readout,
        annotation: handle.getAnnotation(),
      });
      handle.applyAnnotation(handle.getAnnotation());
      handle.setView(p.view_elev_deg, p.view_azim_deg);
    } else {
      handle = window.TCMSphere.render(view, {
        units: semtensorUnits(which),
        readout,
        annotation: annoText ? annoText.value : undefined,
        onView: showParams,
      });
    }
    showParams();
  };

  mount(whichSel ? whichSel.value : 'reference');

  if (whichSel) {
    whichSel.addEventListener('change', () => mount(whichSel.value));
  }

  if (document.getElementById('st-apply') && annoText) {
    document.getElementById('st-apply').addEventListener('click', () => {
      handle.applyAnnotation(annoText.value);
      showParams();
    });
  }

  // 通道 3：HTTP 环境下先取同目录 图注-*.txt；file:// 或取不到时用构建期注入的文本
  if (annoSel && annoText) {
    annoSel.addEventListener('change', async () => {
      const name = annoSel.value;
      let text = (window.TCMAI_SEMTENSOR_ANNOTATIONS || {})[name] || '';
      if (location.protocol && location.protocol.startsWith('http')) {
        try {
          const r = await fetch(`standards/semtensor/annotations/${encodeURIComponent(name)}`);
          if (r.ok) text = await r.text();
        } catch { /* 取不到就用注入文本，不报错中断 */ }
      }
      if (text) {
        annoText.value = text;
        handle.applyAnnotation(text);
        showParams();
      }
    });
  }

  if (document.getElementById('st-reset')) {
    document.getElementById('st-reset').addEventListener('click', () => {
      handle.setView(20, -60);
      showParams();
    });
  }
}

const ROUTES = {
  index: renderIndex,
  catalog: renderCatalog,
  subject: renderSubject,
  chapter: renderChapter,
  roadmap: renderRoadmap,
  paths: renderPaths,
  glossary: renderGlossary,
  semtensor: renderSemtensor,
  books: renderBooks,
  about: renderAbout,
};

function boot() {
  const page = document.body.dataset.page || 'index';
  const render = ROUTES[page] || renderIndex;
  const app = document.getElementById('app');
  app.innerHTML = render();
  if (page === 'chapter') {
    const key = new URLSearchParams(location.search).get('path') || '';
    PROG.recordVisit(key);
    bindQuiz(key);
    bindLab();
  }
  if (page === 'semtensor') bindSemtensor();
  if (page === 'catalog') {
    const dept = $('#f-dept');
    const sem = $('#f-sem');
    const go = () => {
      const q = new URLSearchParams();
      if (dept.value) q.set('dept', dept.value);
      if (sem.value) q.set('semester', sem.value);
      location.search = q.toString();
    };
    dept.addEventListener('change', go);
    sem.addEventListener('change', go);
    $('#f-reset').addEventListener('click', () => { location.search = ''; });
  }
  // 本章图形（docs/zh.md 里的 <div data-figure="...">）在内容插入后再挂载
  if (window.TCMFigures) window.TCMFigures.mount(app);

  // 页脚进度摘要（仅在有记录时出现）
  const done = PROG.totalCompleted();
  if (done > 0) {
    const f = document.querySelector('.site-footer .inner');
    if (f) {
      const el2 = document.createElement('div');
      el2.className = 'small';
      el2.innerHTML = `本机进度：已完成 <strong>${done}</strong> 章 · 访问过 ${PROG.totalVisited()} 章`;
      f.appendChild(el2);
    }
  }
}

document.addEventListener('DOMContentLoaded', boot);

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

<h2>章节（${chapters.length}/${s.chaptersTarget}）</h2>
${chapters.length === 0
  ? `<p class="muted">该学科尚未开章。脚手架命令：<br/><code>node scripts/scaffold_chapter.js ${s.dept.slug}/${s.slug} 01-&lt;slug&gt; "标题"</code></p>`
  : `<ul class="chapter-list">${chapters.map((c) => `
      <li>
        <span class="n">${String(c.n).padStart(2, '0')}</span>
        <span style="flex:1"><a href="chapter.html?path=${encodeURIComponent(c.key)}">${esc(c.title)}</a>
        ${c.problem ? `<div class="small muted">${esc(c.problem)}</div>` : ''}</span>
        <span class="tag">${Object.keys(c.code).length} 代码</span>
        ${c.video ? '<span class="tag core">视频</span>' : '<span class="tag">待录制</span>'}
      </li>`).join('')}</ul>`}

<h2>交付轨道</h2>
<div class="grid cols-2">
  <div class="card">
    <div class="card-title">🎬 [tcmP] 视频课程</div>
    <div class="card-sub mono small">platform/courses/${s.dept.slug}/${s.slug}/</div>
    <div class="small muted" style="margin-top:8px">已完成视频 ${s.platform ? s.platform.videosPublished : 0} / ${s.chaptersTarget}</div>
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

${c.video ? `<div class="card"><div class="card-title">🎬 本讲视频</div><div class="small muted mono">${esc(c.video)}</div><div class="small muted" style="margin-top:6px">视频文件由 <code>platform/</code> 流水线生成后在此播放（MP4 &lt;video&gt; 标签）。</div></div>` : ''}

<div class="doc">${c.html}</div>

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

${c.quiz ? renderQuiz(c.quiz, c.key) : ''}

<hr/>
<p>
  ${prev ? `← <a href="chapter.html?path=${encodeURIComponent(prev.key)}">${esc(prev.title)}</a>` : ''}
  ${next ? `<span style="float:right"><a href="chapter.html?path=${encodeURIComponent(next.key)}">${esc(next.title)}</a> →</span>` : ''}
</p>
`);
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
const ROUTES = {
  index: renderIndex,
  catalog: renderCatalog,
  subject: renderSubject,
  chapter: renderChapter,
  roadmap: renderRoadmap,
  paths: renderPaths,
  glossary: renderGlossary,
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

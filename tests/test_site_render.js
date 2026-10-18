#!/usr/bin/env node
/**
 * tests/test_site_render.js — 站点渲染烟雾测试
 *
 * site/app.js 是客户端渲染的：8 个 HTML 外壳里只有 <div id="app">，
 * 内容由 app.js 按 body[data-page] 生成。这意味着**光校验文件存在是不够的** ——
 * 一个 render 函数抛异常，页面就是白屏，而文件校验完全看不出来。
 *
 * 做法：用 scripts/dom-shim.js 在 Node 里真实执行 app.js，逐页渲染并断言内容。
 * （该 shim 与 skill `curriculum-repo-engineering` 共用一份实现，不重复维护。）
 *
 * 断言的是「人会注意到的东西」：
 *   - 每页不白屏，页头/导航/页脚齐备
 *   - 章节页含 MOTTO / PROBLEM / 双根因 / 代码 / 小测 24 选项 / 实验台
 *   - 图形挂载点存在，且图形名已在 figures.js 注册，且能真的挂载
 *   - 进度写入 localStorage，且不发起网络请求
 *   - markdown 渲染器转义原始 HTML
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SITE = path.join(ROOT, 'site');
const COURSES_DIR = path.join(ROOT, 'platform', 'courses');
const { makeEnv, loadScript, boot } = require('../scripts/dom-shim');

// 顺序必须与 site/*.html 里的 <script> 顺序一致
const BUNDLE = ['data.js', 'content.js', 'progress.js', 'figures.js', 'app.js'];

/**
 * 渲染一页。
 * 注意：search 必须与页面匹配 —— 例如 chapter 页不传 ?path= 会走「未找到章节」
 * 兜底分支，渲染出的是合法的短页面。烟雾测试若误以为那是渲染失败，
 * 就会去修一个并不存在的 bug。
 */
function render(page, search) {
  const env = makeEnv({ page, search });
  for (const f of BUNDLE) loadScript(env, path.join(SITE, f));
  boot(env);
  return env;
}

const PAGES = ['index', 'catalog', 'roadmap', 'paths', 'glossary', 'about'];

// ── 逐页烟雾测试 ────────────────────────────────────────────

for (const page of PAGES) {
  test(`[${page}] 渲染不抛异常，产出非空 HTML 且含页头页脚`, () => {
    const html = render(page).html();
    assert.ok(html.length > 800, `${page} 渲染结果过短（${html.length} 字符），可能是白屏`);
    assert.ok(html.includes('site-header'), `${page} 缺少页头`);
    assert.ok(html.includes('site-nav'), `${page} 缺少导航`);
    assert.ok(html.includes('site-footer'), `${page} 缺少页脚`);
  });
}

test('[index] 含计数条、五阶段、八院系与 6 张动画图挂载点，并带免责声明', () => {
  const html = render('index').html();
  for (const s of ['生', '长', '壮', '老', '已']) {
    assert.ok(html.includes(s), `首页缺少阶段 ${s}`);
  }
  for (const d of ['中医系', '中药系', '针灸系', '骨伤系', '护理系', '管理系', '智能系', '五官口腔系']) {
    assert.ok(html.includes(d), `首页缺少院系 ${d}`);
  }
  const figs = [...html.matchAll(/data-figure="([a-z0-9-]+)"/g)].map((m) => m[1]);
  assert.ok(figs.length >= 6, `首页图形挂载点只有 ${figs.length} 个，设计基线为 6 个`);
  assert.ok(/不构成临床诊疗建议/.test(html), '首页缺少临床免责声明');
});

test('[catalog] 列出全部 120 门学科，且四类类型标签都渲染', () => {
  const html = render('catalog').html();
  const rows = (html.match(/<tr>/g) || []).length;
  assert.ok(rows >= 120, `课程目录只有 ${rows} 行，应为 120 门学科`);
  for (const t of ['Core', 'Build', 'Reference', 'Clinic']) {
    assert.ok(html.includes(`>${t}<`), `类型标签 ${t} 未渲染`);
  }
});

test('[catalog?dept=] 院系筛选生效', () => {
  const html = render('catalog', '?dept=03-zhenjiu').html();
  assert.ok(html.includes('经络学'), '针灸系筛选后应含经络学');
  assert.ok(!html.includes('中医基础理论'), '针灸系筛选后不应出现中医系的学科');
});

test('[chapter] 完整渲染：MOTTO / PROBLEM / 双根因 / 经典引文 / 代码 / 小测 / 实验台', () => {
  const key = '01-zhongyi/01-zhongyi-jichu-lilun/01-yin-yang-er-fenlei';
  const html = render('chapter', `?path=${encodeURIComponent(key)}`).html();
  assert.ok(html.includes('MOTTO'), '缺 MOTTO 卡');
  assert.ok(html.includes('PROBLEM'), '缺 PROBLEM');
  assert.ok(html.includes('双根因定位'), '缺双根因');
  assert.ok(html.includes('阴阳者'), '缺经典引文');
  assert.ok(html.includes('chapter-head'), '缺章节头卡');
  assert.ok(html.includes('class="doc"'), '缺正文容器');
  assert.ok(html.includes('id="lab-src"'), '缺实验台');
  assert.ok(html.includes('id="quiz"'), '缺小测区');
  assert.ok(
    html.includes('前置自测') && html.includes('过程检查') && html.includes('课后检验'),
    '小测三档阶段标签未渲染'
  );
  const opts = (html.match(/class="opt"/g) || []).length;
  assert.strictEqual(opts, 24, `小测选项应为 6 题 × 4 = 24 项，实得 ${opts}`);
});

test('[chapter] 有视频的章节内嵌真正的 <video> 播放器（不是一句「视频已就绪」的标签）', () => {
  const key = '01-zhongyi/01-zhongyi-jichu-lilun/01-yin-yang-er-fenlei';
  const videoRel = `platform/courses/${key}/video/lesson.mp4`;
  const hasMp4 = fs.existsSync(path.join(ROOT, videoRel));

  const html = render('chapter', `?path=${encodeURIComponent(key)}`).html();
  if (!hasMp4) {
    // 成片不入库，CI 上通常没有 —— 此时只能断言占位卡存在且说明了生成方式
    assert.ok(html.includes('尚未录制') || html.includes('lesson-video'), '无成片时既无播放器也无占位说明');
    return;
  }
  assert.ok(html.includes('<video'), '有视频却未渲染 <video> 播放器');
  assert.ok(html.includes('class="lesson-video"'), '缺播放器样式类');
  assert.ok(html.includes('controls'), '播放器缺 controls 属性（无法播放）');
  assert.ok(html.includes(videoRel), `播放器 src 未指向 ${videoRel}`);
  assert.ok(html.includes('type="video/mp4"'), '缺 MIME 类型声明');
});

test('[chapter] 无视频的章节给出占位说明，且指明生成方式', () => {
  // 不要在测试里"假定"某一章没有成片 —— 那一章随时可能被录出来。
  // 第一版硬编码了 02 章；2026-10-15 把它录成成片后，这条断言当场变成误报。
  // 改成按磁盘挑一个真的没有成片的已建章节（旁边那条有视频的测试就是这么做的）。
  const built = fs.existsSync(COURSES_DIR)
    ? fs.readdirSync(COURSES_DIR, { withFileTypes: true }).flatMap((dept) => {
        if (!dept.isDirectory()) return [];
        return fs.readdirSync(path.join(COURSES_DIR, dept.name), { withFileTypes: true }).flatMap((sub) => {
          if (!sub.isDirectory()) return [];
          return fs.readdirSync(path.join(COURSES_DIR, dept.name, sub.name), { withFileTypes: true })
            .filter((c) => c.isDirectory())
            .map((c) => `${dept.name}/${sub.name}/${c.name}`);
        });
      })
    : [];

  const withoutVideo = built.find(
    (k) => !fs.existsSync(path.join(ROOT, `platform/courses/${k}/video/lesson.mp4`))
  );
  if (!withoutVideo) {
    console.log('    ⚠ 已建章节都有成片 —— 占位分支**未验证**（明说，不是通过）');
    return;
  }

  const html = render('chapter', `?path=${encodeURIComponent(withoutVideo)}`).html();
  assert.ok(!html.includes('<video'), `${withoutVideo} 没有成片，却渲染了播放器（会指向 404）`);
  assert.ok(html.includes('尚未录制'), '缺「尚未录制」提示');
  assert.ok(html.includes('platform/README.md'), '占位说明未指向流水线文档');
});

test('[chapter] 渲染本产出物（prompt / skill）—— 不只是躺在 outputs/ 目录里', () => {
  const key = '01-zhongyi/01-zhongyi-jichu-lilun/01-yin-yang-er-fenlei';
  const html = render('chapter', `?path=${encodeURIComponent(key)}`).html();

  assert.ok(html.includes('带走的东西'), '章节页缺「带走的东西」一节');
  assert.ok(html.includes('output-grid'), '缺产出物网格容器');
  assert.ok(html.includes('kind-prompt'), '未渲染提示词卡（kind-prompt）');
  assert.ok(html.includes('kind-skill'), '未渲染技能卡（kind-skill）');

  // 卡片上的链接必须指向真实文件 —— 只渲染个壳、链接 404 等于没渲染
  const [dept, subject, chapter] = key.split('/');
  const base = chapter.replace(/^\d+-/, '');
  for (const kind of ['prompt', 'skill']) {
    const rel = `departments/${dept}/${subject}/chapters/${chapter}/outputs/${kind}-${base}.md`;
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `产出物文件不存在: ${rel}`);
    assert.ok(html.includes(encodeURI(rel)), `页面未链接到 ${rel}`);
  }
  // 字数来自构建期解析（真实值），不是写死的
  assert.match(html, /output-meta">\s*\d+ 字/, '产出物卡缺字数（构建期解析的真实值）');
});

test('[chapter] 无产出物的章节给出诚实的缺口说明，不装作有', () => {
  // 直接构造：把 outputs 清空后渲染的语义由 renderOutputs 保证；
  // 这里断言渲染器对空列表的输出（读取源码里的那句话，防止被改成静默隐藏）
  const app = fs.readFileSync(path.join(ROOT, 'site', 'app.js'), 'utf8');
  assert.ok(/本章尚未产出/.test(app), 'renderOutputs 缺「尚未产出」分支');
  assert.ok(/缺了就是没写完/.test(app), '缺口说明未点明「没写完」');
});

test('[subject] 视频进度按实际成片统计，不读手工计数器', () => {
  const html = render('subject', `?path=${encodeURIComponent('01-zhongyi/01-zhongyi-jichu-lilun')}`).html();
  // meta.json 里的 videosPublished 是手工字段，实际成片可能多于它；
  // 这里断言页面上的数字与文件系统一致。
  const m = html.match(/已完成视频\s*(\d+)\s*\/\s*\d+/);
  assert.ok(m, '学科页未显示视频进度');
  const ours = fs.existsSync(path.join(ROOT, 'platform', 'courses')) ? countMp4() : 0;
  assert.strictEqual(Number(m[1]), ours, `学科页显示 ${m[1]}，文件系统实有 ${ours}`);
});

/** 统计本学科真实存在的成片 */
function countMp4() {
  let n = 0;
  const walk = (d) => {
    let es = [];
    try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of es) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === 'lesson.mp4' && p.includes('01-zhongyi-jichu-lilun')) n += 1;
    }
  };
  walk(path.join(ROOT, 'platform', 'courses', '01-zhongyi', '01-zhongyi-jichu-lilun'));
  return n;
}

test('[chapter] 图形挂载点在正文里被渲染为可挂载的 div', () => {
  const key = '01-zhongyi/01-zhongyi-jichu-lilun/02-wu-xing-duo-fenlei';
  const html = render('chapter', `?path=${encodeURIComponent(key)}`).html();
  assert.ok(html.includes('data-figure="wuxing-cycle"'), '五行章的图形未渲染进正文');
});

test('[chapter] 未知路径给出提示而非白屏', () => {
  const html = render('chapter', '?path=99-nope/99-nope/99-nope').html();
  assert.ok(html.includes('未找到章节'), '未找到章节时应有提示');
  assert.ok(html.includes('catalog.html'), '提示里应给出返回课程目录的链接');
});

test('[subject] 渲染学科页：章节计数与两条交付轨道', () => {
  const html = render('subject', '?path=01-zhongyi/01-zhongyi-jichu-lilun').html();
  assert.ok(html.includes('中医基础理论'));
  // 章节地图：声明 10 章、已建 3 章 —— 未建的必须显式标「待写」，不许只显示已建的 3 条
  assert.ok(html.includes('章节地图（已建 3 / 目标 10）'), '学科页章节地图计数错误');
  assert.ok((html.match(/待写/g) || []).length >= 7, '未建章节未标「待写」');
  assert.ok(html.includes('[tcmP]') && html.includes('[textbooks]'), '缺两条交付轨道');
  assert.ok(html.includes('platform/courses/01-zhongyi/01-zhongyi-jichu-lilun/'), '缺平台路径');
});

test('[paths] 5 条学习路径全部渲染，且各带毕业设计', () => {
  const html = render('paths').html();
  for (const t of ['临床型', '工程型', '科研型', '教学型', '复合型']) {
    assert.ok(html.includes(t), `缺学习路径 ${t}`);
  }
  const caps = (html.match(/毕业设计/g) || []).length;
  assert.ok(caps >= 5, `毕业设计块只有 ${caps} 个，应为 5 条路径各一`);
});

test('[glossary] 桥梁表与双术语表都渲染出内容，含 D 级误用', () => {
  const html = render('glossary').html();
  assert.ok(html.includes('中医 ↔ AI 桥梁对照'));
  assert.ok(html.includes('中医术语') && html.includes('AI / 工程术语'));
  assert.ok(html.includes('阴阳'), '术语表内容未渲染');
  assert.ok(html.includes('D 级') || html.includes('误导'), '桥梁表的 D 级误用未渲染');
});

test('[roadmap] 含学期排课与院系明细，且进度条宽度全部落在 0..100', () => {
  const html = render('roadmap').html();
  assert.ok(html.includes('学期排课'));
  assert.ok(html.includes('院系明细'));
  const widths = [...html.matchAll(/class="bar"><span style="width:(\d+)%"/g)].map((m) => Number(m[1]));
  assert.ok(widths.length >= 120, `进度条只有 ${widths.length} 个，应覆盖 120 门学科`);
  for (const w of widths) assert.ok(w >= 0 && w <= 100, `进度条宽度越界: ${w}`);
});

test('访问章节会写入本机进度（recordVisit 已接线）', () => {
  const key = '01-zhongyi/01-zhongyi-jichu-lilun/01-yin-yang-er-fenlei';
  const env = render('chapter', `?path=${encodeURIComponent(key)}`);
  const raw = env.stored('tcmai:progress:v1');
  assert.ok(raw, '访问章节后未写入进度（progress.recordVisit 未接线）');
  const state = JSON.parse(raw);
  assert.ok(state.chapters[key], '进度里没有当前章节键');
  assert.ok(state.chapters[key].visitedAt > 0);
});

test('答题与完成状态可写入并读回', () => {
  const key = '01-zhongyi/01-zhongyi-jichu-lilun/01-yin-yang-er-fenlei';
  const env = render('chapter', `?path=${encodeURIComponent(key)}`);
  const P = env.window.TCMProgress;
  assert.ok(P, 'progress.js 未暴露 TCMProgress');
  P.recordAnswer(key, 'pre-q0', 1, true);
  P.recordAnswer(key, 'check-q1', 2, false);
  const s = P.quizScore(key);
  assert.strictEqual(s.answered, 2);
  assert.strictEqual(s.correct, 1);
  assert.strictEqual(P.isComplete(key), false);
  P.markComplete(key);
  assert.strictEqual(P.isComplete(key), true);
});

test('markdown 渲染器：代码块/表格/引用/mermaid/图形占位/公式各就各位', () => {
  const md = require('../site/md');
  const out = md.render([
    '# 标题',
    '',
    '> 引用 `行内码`',
    '',
    '| a | b |',
    '|---|---|',
    '| 1 | 2 |',
    '',
    '```javascript',
    'const x = 1;',
    '```',
    '',
    '<div data-figure="wuxing-cycle"></div>',
    '',
    '$p = \\sigma(z)$',
  ].join('\n'));
  assert.ok(out.includes('<h1'), '标题未渲染');
  assert.ok(out.includes('<blockquote>'), '引用未渲染');
  assert.ok(out.includes('<code>行内码</code>'), '行内代码未渲染');
  assert.ok(out.includes('<table>') && out.includes('<th>a</th>'), '表格未渲染');
  assert.ok(out.includes('class="codeblock"') && out.includes('lang-javascript'), '代码块未渲染');
  assert.ok(out.includes('figure-host') && out.includes('data-figure="wuxing-cycle"'), '图形占位未渲染');
  assert.ok(out.includes('class="math"'), '行内公式未渲染');
});

test('markdown 渲染器转义原始 HTML（防注入）', () => {
  const md = require('../site/md');
  const out = md.render('<script>alert(1)</script>');
  assert.ok(!out.includes('<script>'), '原始 HTML 未被转义');
  assert.ok(out.includes('&lt;script&gt;'), '应转义为实体');
});

test('figures.js 注册的每张图都能真的挂载进宿主元素（不抛异常）', () => {
  const env = makeEnv({ page: 'index' });
  loadScript(env, path.join(SITE, 'figures.js'));
  assert.ok(env.window.TCMFigures, 'figures.js 未暴露 TCMFigures');
  const defined = Object.keys(env.window.TCMFigures.FIGURES);
  assert.ok(defined.length >= 6, `只注册了 ${defined.length} 张图，设计基线为 6 张`);
  for (const name of defined) {
    const host = env.document.createElement('div');
    assert.doesNotThrow(() => env.window.TCMFigures.FIGURES[name](host), `图形 ${name} 挂载抛异常`);
    assert.ok(host.children.length > 0, `图形 ${name} 没有向宿主元素追加任何节点`);
  }
});

test('站点脚本不向外部发起请求（本机数据一律不外发）', () => {
  // 约定要写精确，否则它会被悄悄放宽或被过度执行：
  //   禁止  —— 向任何跨域/外部地址发请求、发送本机数据（fetchSendBeacon/XHR 外呼）、埋点。
  //   允许  —— 同源相对路径 GET 一个静态资源（图注 .txt），这不会把任何数据发出去。
  // 进度仍然只写 localStorage。
  const ALLOWED_SAME_ORIGIN_FETCH = ['app.js'];   // 仅图注按需载入这一处

  for (const f of ['progress.js', 'figures.js', 'md.js', 'semtensor.js', 'sphere.js', 'content.js']) {
    const src = fs.readFileSync(path.join(SITE, f), 'utf8');
    assert.ok(!/\bfetch\s*\(/.test(src), `${f} 含 fetch 调用`);
    assert.ok(!/XMLHttpRequest/.test(src), `${f} 含 XMLHttpRequest`);
  }

  for (const f of fs.readdirSync(SITE).filter((x) => x.endsWith('.js') && !x.endsWith('.test.js'))) {
    const src = fs.readFileSync(path.join(SITE, f), 'utf8');
    assert.ok(!/sendBeacon/.test(src), `${f} 含 sendBeacon`);
    assert.ok(!/new\s+WebSocket/.test(src), `${f} 含 WebSocket`);
    // 任何写死的绝对 URL 都是外呼的信号（相对路径不带协议）
    const abs = src.match(/fetch\s*\(\s*[`'"](https?:)?\/\//g);
    assert.ok(!abs, `${f} 存在指向绝对地址的请求`);
  }

  const app = fs.readFileSync(path.join(SITE, 'app.js'), 'utf8');
  const fetches = app.match(/fetch\s*\(([^)]*)/g) || [];
  for (const call of fetches) {
    assert.ok(
      /standards\/semtensor\/annotations\//.test(call),
      `app.js 出现未被登记的 fetch 目标: ${call}`
    );
    assert.ok(!/https?:/.test(call), '图注 fetch 不得指向外部地址');
    assert.ok(/location\.protocol\s*&&/.test(app), '图注 fetch 未被协议守卫（file:// 下会报错）');
  }
  assert.ok(ALLOWED_SAME_ORIGIN_FETCH.includes('app.js'));
});

test('进度数据不出本机：localStorage 键固定且不含任何网络上报', () => {
  const src = fs.readFileSync(path.join(SITE, 'progress.js'), 'utf8');
  assert.ok(/tcmai:progress:v1/.test(src), '进度键名变了（老用户的进度会丢）');
  assert.ok(!/http/.test(src), 'progress.js 出现 http 字样');
});

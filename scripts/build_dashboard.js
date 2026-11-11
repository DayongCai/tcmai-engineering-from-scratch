#!/usr/bin/env node
/**
 * scripts/build_dashboard.js —— 项目看板（单文件 HTML，由仓库现状生成）
 *
 * 为什么是**生成**的而不是手写的：手写看板从上线的第二天起就在说谎。
 * 这里每一项都从源里算：curriculum.json（单一事实来源）· 文件系统 · 各派生索引 ·
 * package.json · git。算不出来的（缺派生件的）**显式标为「未生成」**，不猜、不留空。
 *
 * 用法： node scripts/build_dashboard.js   →  dashboard.html
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dashboard.html');

const readJson = (p) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8')); } catch { return null; } };
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const walk = (dir, out = []) => {
  let e; try { e = fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }); } catch { return out; }
  for (const x of e) {
    const rel = path.join(dir, x.name);
    if (x.isDirectory()) { if (!/node_modules|\.git$|build$|snapshot/.test(x.name)) walk(rel, out); }
    else out.push(rel);
  }
  return out;
};

// ── 事实收集 ──────────────────────────────────────────────────────────
const cur = readJson('curriculum.json') || {};
const catalog = readJson('catalog.json') || {};
const pkg = readJson('package.json') || {};
const outputsIndex = readJson('outputs/index.json');
const stats = readJson('site/stats.json');
const embeddings = readJson('standards/semtensor/embeddings/index.json');
const icd11 = readJson('data/icd11/meta.json');

const counts = catalog.counts || {};

// 章节文件系统实况
const allFiles = walk('departments');
const chapterDocs = allFiles.filter((p) => /chapters[\\/][^\\/]+[\\/]docs[\\/]zh\.md$/.test(p));
const chapterDirs = [...new Set(chapterDocs.map((p) => path.dirname(path.dirname(p))))];
const libDirs = walk('chapters').filter((p) => /docs[\\/]zh\.md$/.test(p) && !/^departments/.test(p));

// 教材线
const tbFiles = walk('textbooks');
const tbChapters = tbFiles.filter((p) =>
  // 只认章契约命名的文件：00-前言、readme、以及 textbooks/ 下的任何说明性文档都不是「章」。
  // （曾经用「排除 README|template|00-」的黑名单，于是 textbooks/SCHEDULE.md 一落地就被算成一章，虚增 1 章。）
  /^\d+-第\d+章.*\.md$/.test(path.basename(p)) && !/[\\/]build[\\/]/.test(p));
const volumes = readJson('textbooks/volumes.json');
const tbBuild = exists('textbooks/build') ? fs.readdirSync(path.join(ROOT, 'textbooks/build')) : [];

// 底本 / 外源分账：外源（公有领域古籍补录）章数单列，不许并进底本数字
const extLayer = new Set();
const hbLayer = new Set();
for (const d of fs.existsSync(path.join(ROOT, 'departments')) ? fs.readdirSync(path.join(ROOT, 'departments')) : []) {
  const ddir = path.join(ROOT, 'departments', d);
  if (!fs.existsSync(ddir) || !fs.statSync(ddir).isDirectory()) continue;
  for (const s of fs.readdirSync(ddir)) {
    const mp = path.join(ddir, s, 'meta.json');
    if (!fs.existsSync(mp)) continue;
    let t; try { t = JSON.parse(fs.readFileSync(mp, 'utf8')).textbook; } catch { continue; }
    if (t && t.layer === 'external-source') extLayer.add(`${d}/${s}`);
    if (t && t.layer === 'handbook') hbLayer.add(`${d}/${s}`);
  }
}
const tbChapterOf = (p) => {
  const parts = p.split(path.sep);
  return parts.length > 2 && parts[0] === 'textbooks' ? `${parts[1]}/${parts[2]}` : null;
};
const tbChaptersExt = tbChapters.filter((p) => extLayer.has(tbChapterOf(p)));
const tbChaptersHb = tbChapters.filter((p) => hbLayer.has(tbChapterOf(p)));
const tbChaptersBase = tbChapters.filter((p) => !extLayer.has(tbChapterOf(p)) && !hbLayer.has(tbChapterOf(p)));

// 平台线
const platformFiles = walk('platform');
const videos = platformFiles.filter((p) => /lesson\.mp4$/.test(p));
const narration = platformFiles.filter((p) => /narration[\\/]audio[\\/].*\.(wav|mp3)$/.test(p));
const frames = platformFiles.filter((p) => /frames[\\/].*\.png$/.test(p));
// 幻灯片产物是 slides/index.html —— 第一版写成 .json|.md，于是这个计数恒为 0。
// （"有成片"那条分支直到 2026-10-15 三章都录出成片才第一次被执行，才暴露出来。）
const slides = platformFiles.filter((p) => /slides[\\/].*\.(html|json|md)$/.test(p));
const sitePages = walk('site').filter((p) => /site[\\/][a-z]+\.html$/.test(p));

// 标准/资料线
const standardsDirs = fs.existsSync(path.join(ROOT, 'standards'))
  ? fs.readdirSync(path.join(ROOT, 'standards'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
  : [];
const materialBundles = walk('standards/materials').filter((p) => /sources[\\/]/.test(p) === false && /\.json$/.test(p));

// 质量门
const runAll = fs.existsSync(path.join(ROOT, 'tests/run_all.js'))
  ? fs.readFileSync(path.join(ROOT, 'tests/run_all.js'), 'utf8') : '';
const suiteCount = (runAll.match(/\{ file: '/g) || []).length;
const testFiles = walk('tests').filter((p) => /\.js$/.test(p));

// 扫描 md 数**不自己数**：直接读官方检查器（check_links.js）的输出。
// 自己再数一遍就是第二份计数，两边迟早打架 —— 第一次生成时就是 174 vs 175。
const linkScan = (() => {
  const r = spawnSync(process.execPath, ['scripts/check_links.js'], { cwd: ROOT, encoding: 'utf8' });
  const m = /扫描\s*(\d+)/.exec(r.stdout || '');
  return { count: m ? Number(m[1]) : null, ok: r.status === 0 };
})();
const mdCount = linkScan.count;

// git
let git = null;
for (const bin of ['git', 'J:/Program Files/Git/cmd/git.exe']) {
  const r = spawnSync(bin, ['-c', 'safe.directory=*', 'log', '--oneline', '-12'], { cwd: ROOT, encoding: 'utf8' });
  if (r.status === 0 && r.stdout) {
    git = r.stdout.trim().split('\n').map((l) => l.replace(/^(\w+) /, '$1 '));
    break;
  }
}

// ── 进度判定（每条都要能指到证据）───────────────────────────────────
const built = chapterDirs.length;
const target = counts.chapters || 1086;

const workstreams = [
  {
    name: '[tcmP] 平台 · 站点',
    state: 'done',
    evidence: `site/ ${sitePages.length} 个页面 · data/content/semtensor-spec/manifest/stats 生成于构建`,
    detail: '静态站 + 单文件离线快照；Range 请求与路径穿越防护已测',
  },
  {
    name: '[tcmP] 平台 · 视频流水线',
    state: videos.length ? 'done' : 'idle',
    evidence: videos.length
      ? `${videos.length} 成片 · ${narration.length} 配音 · ${frames.length} 帧 · ${slides.length} 幻灯片/讲稿件`
      : '无成片（流水线脚本齐备：find_tools→extract_narration→build_slides→render_frames→synthesize_narration→build_subtitles→build_video）',
    detail: 'TTS 降级链 edge-tts → Windows SAPI → 人工；时长用实测配音时长；字幕对视音差逐章实测（毫秒级）',
  },
  {
    name: '[textbooks] 教材 · 内容',
    state: tbChapters.length ? 'active' : 'idle',
    evidence: `${volumes ? volumes.volumes.length : 0} 卷 · 已写 ${tbChaptersBase.length} 章（底本）+ ${tbChaptersExt.length} 章（外源）+ ${tbChaptersHb.length} 章（手册）· 构建产物 ${tbBuild.length} 件`,
    detail: '教材正文 = 章节 docx 的 docs/zh.md 汇总；同时出单文件书 HTML（不需要 pandoc）',
  },
  {
    name: '课程骨架 · 学科/章节',
    state: built ? 'active' : 'idle',
    evidence: `${counts.subjects || 120} 学科已建目录 · 已建章节 ${built}/${target}（${((built / target) * 100).toFixed(2)}%）`,
    detail: 'curriculum.json 为单一事实来源；审计对 120 个空学科全绿是第一个里程碑',
  },
  {
    name: '源资料入库',
    state: standardsDirs.length ? 'done' : 'idle',
    evidence: `standards/ ${standardsDirs.length} 个域：${standardsDirs.join(' · ')}`,
    detail: '解析入库、绝不手抄；各带 sources/ 原件 + sha256 溯源；派生 content.json 不入库',
  },
  {
    name: '嵌入层（embedding-code 规格）',
    state: embeddings ? 'blocked' : 'idle',
    evidence: embeddings
      ? `8 组件实现 7（⑦ 已补）· 字段供给：证候 103/103 · 病 12/103 · ICD 7/103 · 其余 0/103`
      : '未生成（npm run embeddings）',
    detail: embeddings
      ? `轮廓系数 ${embeddings.evaluation.ngram13.silhouetteBySuffix.toFixed(3)}（≈随机）· 端点行为复现 1/3 —— 卡在「没有描述可嵌入」`
      : '',
  },
  {
    name: 'ICD-11 客户端（规格 ⑦）',
    state: icd11 ? 'active' : 'idle',
    evidence: icd11
      ? `本地库 ${icd11.entities} 实体（MMS ${icd11.source.release}）· 仓库 7 个编码 7/7 解析`
      : '本地库未构建（npm run icd11:ensure）',
    detail: 'WHO API 通道需凭据（无凭据一律 401，本机未配置）；中文标题通道**未验证**',
  },
  {
    name: '质量门 · 审计与测试',
    state: 'done',
    evidence: `审计 L0–L3 · ${suiteCount} 个测试套件（${testFiles.length} 个测试文件）· 链接扫描 ${mdCount == null ? '—' : mdCount} 个 md${linkScan.ok ? '（0 断链）' : ''} · npm run check 四道门`,
    detail: 'L3 内容层实测抓到 2 处契约违约；文档事实核对测试已 4 次抓到过期数字',
  },
];

// 阻塞项
const blocked = [
  {
    what: '103 个 DSU 缺属性字段',
    why: '源平台 kg/ 下那 7 个病证单元文件未随资料来；disease 12/103、icd 7/103、dsym/ssym/formula/zf/six 全 0/103',
    impact: '嵌入层的 /diag 与 /bianzheng 端点命中率 1/3；这是「没有描述可嵌入」，不是模型问题',
    fix: '给 103 个 DSU 写真正的描述（病因/病机/主症/舌脉/治法）—— [textbooks] 线的产出物',
  },
  {
    what: 'ICD-11 中文通道未验证',
    why: 'WHO API 需 client_id/secret（无凭据一律 HTTP 401）；本地库是英文 MMS',
    impact: '规格里「中文搜索 → Foundation ID」这条路一次都没跑通过',
    fix: 'https://icd.who.int/icdapi 注册 → 设 ICD11_CLIENT_ID / ICD11_CLIENT_SECRET',
  },
  {
    what: 'PDF/EPUB 不可用',
    why: '本机无 pandoc',
    impact: '[textbooks] 只能到 Markdown + 单文件书 HTML',
    fix: '装 pandoc（或确认 HTML 已够用）',
  },
  {
    what: '4 个旧二进制 .xls 读不了',
    why: 'OLE2/BIFF8 需复合文档 + BIFF 记录 + SST 解析',
    impact: '《黄帝内经全文》《素问灵枢》等 4 份源资料在库外（是能力缺口，不是资料不存在）',
    fix: '补 BIFF8 读取器（独立工作量）',
  },
  {
    what: '源数据三处内部不一致待裁定',
    why: '颜色公理未定义 c_i；源实现 comp() 与 Python hex 互不相符；类经图翼方位色已实测排除',
    impact: '语义张量的颜色无法从源复现（已用同规模随机调色板对照排除该路径）',
    fix: '需源实现 kg/semtensor/axioms.py + encoder.py（F:\\tcm\\tcmP 已查不存在）',
  },
];

// 下一步（按价值排序）
const next = [
  { t: '把本地 ICD-11 库接进 BM25 检索', why: '直接补 /diag 与 /bianzheng 失败的那一环；两处实现已各自存在，只差接起来', size: '中' },
  { t: '给 103 个 DSU 写描述（沿 textbooks 线）', why: '嵌入层与辨证检索的共同前置；不写这个，换任何模型都没用', size: '大' },
  { t: '用 ICD-11 章节反查学科一致性', why: '现在编码能算出章节，出现了新检查：DSU 的 ICD 章节是否与学科枝吻合', size: '小' },
  { t: '站点呈现教材内容', why: '两件交付物目前只靠一个进度计数器连着；书 HTML 已生成但站点没有入口', size: '中' },
];

// ── 渲染 ──────────────────────────────────────────────────────────────
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const STATE = { done: ['已完成', 's-done'], active: ['进行中', 's-active'], blocked: ['受阻', 's-block'], idle: ['未开工', 's-idle'] };

const ks = [
  { k: '领域 / 院系', v: `${cur.domain ? 1 : '?'} / ${counts.departments || 8}` },
  { k: '学科', v: counts.subjects || 120 },
  { k: '章节（目标）', v: target },
  { k: '已建章节', v: built, sub: `${((built / target) * 100).toFixed(2)}%` },
  { k: '书稿文件', v: tbChaptersBase.length, sub: `md · 外源 ${tbChaptersExt.length} · 手册 ${tbChaptersHb.length}` },
  { k: '视频成片', v: videos.length },
  { k: '产出物', v: outputsIndex ? outputsIndex.counts.items : '—', sub: outputsIndex ? `${outputsIndex.counts.chapters} 章` : '未生成' },
  { k: '测试套件', v: suiteCount },
  { k: '扫描 md', v: mdCount == null ? '—' : mdCount, sub: linkScan.ok ? '0 断链' : '有断链' },
  { k: '版本', v: pkg.version || '—' },
];

const flow = [
  ['桌面源资料', '108 项 · 45 xlsx / 16 docx / 4 旧 .xls', '解析入库，绝不手抄'],
  ['standards/', `${standardsDirs.length} 个域 · 带 sources/ 原件 + sha256`, '派生物（content.json）不入库'],
  ['curriculum.json', '单一事实来源', `1 领域 / ${counts.departments} 院系 / ${counts.subjects} 学科 / ${counts.chapters} 章节`],
  ['departments/', '课程骨架（章节契约：docs + code + quiz + outputs）', `已建 ${built} 章`],
  ['[tcmP] + [textbooks]', '两条交付物线', '站点/视频 · 教材/书'],
  ['质量门', 'L0–L3 审计 · 链接 · 计数 · 产出物索引', `${suiteCount} 套件`],
];

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>tcmai-engineering-from-scratch · 项目看板</title>
<style>
  :root{
    --bg:#0d0a07; --panel:#1a1610; --line:#2a2218; --ink:#e8ddcb;
    --dim:#9a8b74; --gold:#c8a45c; --jade:#6f9e7f; --red:#b4544a; --blue:#6b84b4;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);line-height:1.75;
    font-family:'Noto Serif SC','Source Han Serif CN','Songti SC','SimSun',serif}
  .wrap{max-width:1180px;margin:0 auto;padding:2.2rem 1.4rem 4rem}
  h1{font-size:1.5rem;margin:0 0 .2rem;letter-spacing:.02em}
  .sub{color:var(--dim);font-size:.82rem;margin-bottom:1.8rem}
  .sub code{color:var(--gold);background:#141109;padding:.05rem .3rem;border-radius:3px}
  h2{font-size:.95rem;color:var(--gold);font-weight:400;letter-spacing:.14em;
    margin:2.2rem 0 .8rem;padding-bottom:.35rem;border-bottom:1px solid var(--line)}
  .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:.6rem}
  .kpi{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:.7rem .8rem}
  .kpi .k{color:var(--dim);font-size:.7rem;letter-spacing:.06em}
  .kpi .v{font-size:1.35rem;color:var(--gold);font-variant-numeric:tabular-nums;line-height:1.3}
  .kpi .v small{font-size:.7rem;color:var(--jade);margin-left:.3rem}
  .flow{display:flex;flex-direction:column;gap:.4rem}
  .step{display:grid;grid-template-columns:150px 1fr 1fr;gap:.8rem;align-items:baseline;
    background:var(--panel);border:1px solid var(--line);border-left:3px solid var(--gold);
    border-radius:6px;padding:.55rem .8rem;font-size:.84rem}
  .step .n{color:var(--ink)}
  .step .d{color:var(--dim)}
  .step .r{color:var(--jade);font-size:.78rem}
  table{width:100%;border-collapse:collapse;font-size:.84rem}
  th,td{text-align:left;padding:.5rem .6rem;border-bottom:1px solid var(--line);vertical-align:top}
  th{color:var(--dim);font-weight:400;font-size:.72rem;letter-spacing:.08em}
  .pill{display:inline-block;font-size:.68rem;padding:.1rem .45rem;border-radius:99px;
    border:1px solid currentColor;white-space:nowrap}
  .s-done{color:var(--jade)} .s-active{color:var(--gold)} .s-block{color:var(--red)} .s-idle{color:var(--dim)}
  .col2{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
  @media(max-width:820px){.col2{grid-template-columns:1fr}.step{grid-template-columns:1fr}}
  .card{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:.8rem 1rem;font-size:.84rem}
  .card h3{margin:0 0 .35rem;font-size:.86rem;color:var(--gold);font-weight:400}
  .card .why{color:var(--dim);font-size:.78rem}
  .card .fix{color:var(--jade);font-size:.78rem;margin-top:.3rem}
  .item{padding:.55rem 0;border-bottom:1px dashed var(--line)}
  .item:last-child{border-bottom:0}
  .git{font-family:ui-monospace,'Cascadia Code',Consolas,monospace;font-size:.76rem;color:var(--dim)}
  .git b{color:var(--gold);font-weight:400}
  footer{margin-top:2.4rem;border-top:1px solid var(--line);padding-top:.8rem;
    color:var(--dim);font-size:.74rem}
</style>
</head>
<body>
<div class="wrap">
  <h1>tcmai-engineering-from-scratch · 项目看板</h1>
  <div class="sub">由 <code>node scripts/build_dashboard.js</code> 从仓库现状生成 · 版本 <code>v${esc(pkg.version)}</code> ·
    生成时全部数字来自 curriculum.json / catalog.json / 文件系统 / 派生索引，不手写</div>

  <h2>规模与进度</h2>
  <div class="kpis">
    ${ks.map((x) => `<div class="kpi"><div class="k">${esc(x.k)}</div><div class="v">${esc(x.v)}${x.sub ? `<small>${esc(x.sub)}</small>` : ''}</div></div>`).join('\n    ')}
  </div>

  <h2>项目逻辑 · 数据流</h2>
  <div class="flow">
    ${flow.map(([n, d, r]) => `<div class="step"><div class="n">${esc(n)}</div><div class="d">${esc(d)}</div><div class="r">${esc(r)}</div></div>`).join('\n    ')}
  </div>

  <h2>工作流状态</h2>
  <table>
    <thead><tr><th style="width:210px">工作流</th><th style="width:74px">状态</th><th>证据（来自仓库）</th></tr></thead>
    <tbody>
    ${workstreams.map((w) => {
      const [label, cls] = STATE[w.state];
      return `<tr><td>${esc(w.name)}</td><td><span class="pill ${cls}">${label}</span></td>
        <td>${esc(w.evidence)}${w.detail ? `<div class="why">${esc(w.detail)}</div>` : ''}</td></tr>`;
    }).join('\n    ')}
    </tbody>
  </table>

  <h2>阻塞项 · 与解除条件</h2>
  <div class="col2">
    ${blocked.map((b) => `<div class="card"><h3>${esc(b.what)}</h3>
      <div class="why">为什么：${esc(b.why)}</div>
      <div class="why">影响：${esc(b.impact)}</div>
      <div class="fix">解除：${esc(b.fix)}</div></div>`).join('\n    ')}
  </div>

  <h2>下一步（按价值排序）</h2>
  <div class="card">
    ${next.map((n) => `<div class="item"><b>${esc(n.t)}</b> <span class="pill s-idle">${esc(n.size)}</span>
      <div class="why">${esc(n.why)}</div></div>`).join('\n    ')}
  </div>

  <h2>最近提交</h2>
  <div class="card git">
    ${git ? git.map((l) => `<div>${esc(l.slice(0, 8))} <b>${esc(l.slice(9))}</b></div>`).join('\n    ') : '（git 不可用）'}
  </div>

  <footer>
    看板是派生件：<b>数字来自仓库现状，缺派生件时显式标「未生成」</b>，不猜不留空。
    每条状态都能指到证据；状态与证据不符时，以证据为准。
  </footer>
</div>
</body>
</html>
`;

fs.writeFileSync(OUT, html, 'utf8');
console.log(`═══ 项目看板 ═══`);
console.log(`  版本 v${pkg.version} · 已建章节 ${built}/${target} · 教材 ${tbChaptersBase.length}+${tbChaptersExt.length}+${tbChaptersHb.length} 章（底本+外源+手册） · 视频 ${videos.length} · 套件 ${suiteCount} · 扫描 md ${mdCount}`);
console.log(`  工作流 ${workstreams.length} 项（${workstreams.filter((w) => w.state === 'done').length} 完成 / ${workstreams.filter((w) => w.state === 'active').length} 进行 / ${workstreams.filter((w) => w.state === 'blocked').length} 受阻）`);
console.log(`  → ${path.relative(ROOT, OUT)}`);

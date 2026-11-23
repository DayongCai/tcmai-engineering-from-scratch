#!/usr/bin/env node
/**
 * stage_release.js —— 不用任何令牌，把媒体包「按 release 方式」装成一个版本目录
 *
 *   node platform/pipeline/stage_release.js                 # → D:/tcm-release/media-v1/
 *   node platform/pipeline/stage_release.js --tag media-v1 --out D:/tcm-release
 *
 * 产出（一个自包含的 release 目录，拷到哪儿都能发）：
 *   media-v1/
 *     ├── index.html          下载页（列出全部附件、大小、sha256；点即下）
 *     ├── RELEASE-NOTES.md    这一版发了什么、怎么验、怎么解压
 *     ├── SHA256SUMS          逐文件校验（sha256sum -c 直接用）
 *     ├── index.json          课程总清单（APP 读这个）
 *     ├── publish.json ...    每门课的章清单
 *     └── *.tar               8 个分卷
 *
 * 为什么「不依赖令牌」也能叫发布：
 *   发布 = ①版本化目录 ②清单 ③校验和 ④给人看的下载页。四样齐了就是一个可分发的 release。
 *   传到 GitHub（或对象存储）只是**换个地址**，不改变这份产物。
 *   有令牌时 `npm run media:publish` 会把这同一批文件原样上传，不必重新打包。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

const HLS_ROOT = process.env.HLS_ROOT || 'D:/tcm-media';
const RELEASE_ROOT = arg('--out', process.env.RELEASE_ROOT || 'D:/tcm-release');
const TAG = arg('--tag', 'media-v1');
const OUT = path.join(RELEASE_ROOT, TAG);

const read = (p) => fs.readFileSync(p, 'utf8');
const readJson = (p) => JSON.parse(read(p));

function sha256(file) {
  const h = crypto.createHash('sha256');
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.allocUnsafe(4 << 20);
  let n;
  while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) h.update(buf.subarray(0, n));
  fs.closeSync(fd);
  return h.digest('hex');
}

const human = (b) => (b >= 1073741824 ? `${(b / 1073741824).toFixed(2)} GB` : `${(b / 1048576).toFixed(1)} MB`);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function main() {
  const bundle = readJson(path.join(RELEASE_ROOT, 'bundle-index.json'));
  const mediaIndex = readJson(path.join(HLS_ROOT, 'index.json'));

  // 1) 目标目录重建（幂等：同名同大小的 tar 直接硬链接，省一次 7.3 GB 拷贝）
  fs.mkdirSync(OUT, { recursive: true });
  const assets = [];
  for (const b of bundle.bundles) {
    const dir = path.join(RELEASE_ROOT, b.course.replace(/\//g, '__'));
    for (const p of b.parts) {
      const src = path.join(dir, p.file);
      if (!fs.existsSync(src)) throw new Error(`缺分卷：${src}`);
      const dst = path.join(OUT, p.file);
      if (fs.existsSync(dst) && fs.statSync(dst).size === fs.statSync(src).size) {
        // 已就位，不动（避免重复写 1.6 GB）
      } else if (fs.existsSync(dst)) {
        fs.rmSync(dst);
      }
      if (!fs.existsSync(dst)) {
        try { fs.linkSync(src, dst); } catch { fs.copyFileSync(src, dst); }
      }
      assets.push({ name: p.file, bytes: fs.statSync(dst).size, course: b.course, chapters: p.chapters.length, sha256: p.sha256 });
    }
  }

  // 2) 清单原样带过去（APP 只读这些）
  const manifests = [];
  for (const b of bundle.bundles) {
    const pj = path.join(HLS_ROOT, b.course, 'publish.json');
    if (!fs.existsSync(pj)) continue;
    const name = `${b.course.split('/')[1]}-publish.json`;
    fs.copyFileSync(pj, path.join(OUT, name));
    manifests.push({ name, bytes: fs.statSync(path.join(OUT, name)).size });
  }
  fs.copyFileSync(path.join(HLS_ROOT, 'index.json'), path.join(OUT, 'index.json'));
  fs.copyFileSync(path.join(RELEASE_ROOT, 'bundle-index.json'), path.join(OUT, 'bundle-index.json'));
  manifests.push({ name: 'index.json', bytes: fs.statSync(path.join(OUT, 'index.json')).size });
  manifests.push({ name: 'bundle-index.json', bytes: fs.statSync(path.join(OUT, 'bundle-index.json')).size });

  // 3) SHA256SUMS（逐文件重算，不信清单里的旧值）
  const lines = [];
  for (const a of assets) {
    const real = sha256(path.join(OUT, a.name));
    if (a.sha256 && real !== a.sha256) throw new Error(`${a.name} 校验和与 bundle-index 不一致（文件被改过）`);
    a.sha256 = real;
    lines.push(`${real}  ${a.name}`);
  }
  for (const m of manifests) {
    const real = sha256(path.join(OUT, m.name));
    lines.push(`${real}  ${m.name}`);
    m.sha256 = real;
  }
  fs.writeFileSync(path.join(OUT, 'SHA256SUMS'), lines.join('\n') + '\n', 'utf8');

  // 4) 发布说明
  const totalBytes = assets.reduce((a, x) => a + x.bytes, 0);
  const totalChapters = bundle.bundles.reduce((a, b) => a + b.chapterCount, 0);
  const courseRows = bundle.bundles.map((b) =>
    `| ${b.course} | ${b.chapterCount} | ${b.parts.map((p) => p.file).join('<br>')} | ${human(b.parts.reduce((a, p) => a + p.bytes, 0))} |`).join('\n');

  const notes = `# ${TAG} · 课程视频发布

- 版本：\`${TAG}\`
- 生成：${new Date().toISOString()}
- 规模：**${bundle.bundles.length} 门课 / ${totalChapters} 章 / ${assets.length} 个分卷 / ${human(totalBytes)}**
- 时长：${(mediaIndex.totalDurationSec / 3600).toFixed(1)} 小时

## 分卷

| 课程 | 章 | 分卷 | 体积 |
|---|--:|---|---:|
${courseRows}

分卷按**章**切分，互不重叠，单卷 ≤1.6 GB（GitHub Release 单附件上限 2 GB）。
解压后路径形如 \`<dept>/<subject>/<slug>/\`，与 \`index.json\` 里的相对路径一致。

## 校验

\`\`\`bash
sha256sum -c SHA256SUMS      # Linux
shasum -a 256 -c SHA256SUMS  # macOS
\`\`\`

## 解压

\`\`\`bash
mkdir -p ./media && for f in *.tar; do tar -xf "$f" -C ./media; done
\`\`\`

Windows 10+ 自带 tar，命令同上。

## 在线播放（不给 APP 拷整包时）

这 8 个 tar 只是**离线包**；在线播放读的是 HLS 清单：
\`index.json\` → 每门课 \`publish.json\` → 每章 \`master.m3u8\`（两档 + 纯音频 + 字幕）。
HLS 媒体包本身在 \`D:/tcm-media\`，用 \`npm run media:serve\` 或
\`platform/deploy/deploy.sh\`（nginx）对外提供即可。

## 三个头（部署时必须）

| 文件 | Content-Type | 备注 |
|---|---|---|
| \`.m3u8\` | \`application/vnd.apple.mpegurl\` | 清单不按 Range 切（204/200 整份） |
| \`.m4s\` | \`video/iso.segment\` | 必须支持 Range（206） |
| \`.vtt\` | \`text/vtt; charset=utf-8\` | — |

另需 \`Access-Control-Allow-Origin\` 与（本地 ffmpeg 类客户端）关闭 keep-alive。
`;
  fs.writeFileSync(path.join(OUT, 'RELEASE-NOTES.md'), notes, 'utf8');

  // 5) 下载页
  const rows = assets.map((a) => `
      <tr>
        <td><a href="${esc(a.name)}">${esc(a.name)}</a></td>
        <td class="num">${human(a.bytes)}</td>
        <td class="num">${a.chapters}</td>
        <td class="num">${esc(a.course)}</td>
        <td class="mono">${esc(a.sha256.slice(0, 16))}…</td>
      </tr>`).join('');
  const mrows = manifests.map((m) => `
      <tr><td><a href="${esc(m.name)}">${esc(m.name)}</a></td><td class="num">${(m.bytes / 1024).toFixed(0)} KB</td>
      <td colspan="3" class="mono">${esc(m.sha256.slice(0, 16))}…</td></tr>`).join('');

  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>${esc(TAG)} · 课程视频</title>
<style>
  :root { --bg:#0d0a07; --panel:#1a1610; --line:#2a2218; --fg:#e8e0d2; --dim:#a89a86; --accent:#c9a25a; }
  body { margin:0; background:var(--bg); color:var(--fg);
         font-family:"Noto Serif SC","Source Han Serif CN","Songti SC",SimSun,serif;
         line-height:1.75; padding:48px 6vw 96px; }
  h1 { font-size:30px; margin:0 0 6px; letter-spacing:.02em; }
  .lede { color:var(--dim); margin:0 0 32px; }
  .kpi { display:flex; gap:40px; flex-wrap:wrap; margin:0 0 36px; padding:18px 22px;
         background:var(--panel); border:1px solid var(--line); border-radius:10px; }
  .kpi div span { display:block; color:var(--dim); font-size:13px; }
  .kpi div b { font-size:20px; font-weight:600; color:var(--accent); }
  table { width:100%; border-collapse:collapse; margin:0 0 34px; font-size:15px; }
  th,td { text-align:left; padding:9px 10px; border-bottom:1px solid var(--line); }
  th { color:var(--dim); font-weight:500; font-size:13px; letter-spacing:.06em; }
  td.num { text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }
  td.mono { color:var(--dim); font-family:ui-monospace,Consolas,monospace; font-size:12px; }
  a { color:var(--accent); text-decoration:none; border-bottom:1px dotted var(--line); }
  a:hover { border-bottom-color:var(--accent); }
  h2 { font-size:19px; margin:38px 0 12px; }
  pre { background:var(--panel); border:1px solid var(--line); border-radius:8px;
        padding:14px 16px; overflow:auto; font-size:13px; }
  .note { color:var(--dim); font-size:14px; }
</style>
</head>
<body>
  <h1>${esc(TAG)} · 课程视频发布</h1>
  <p class="lede">${esc(String(bundle.bundles.length))} 门课 · ${totalChapters} 章 · ${esc(human(totalBytes))} · ${(mediaIndex.totalDurationSec / 3600).toFixed(1)} 小时</p>

  <div class="kpi">
    <div><span>分卷</span><b>${assets.length}</b></div>
    <div><span>清单</span><b>${manifests.length}</b></div>
    <div><span>总时长</span><b>${(mediaIndex.totalDurationSec / 3600).toFixed(1)} h</b></div>
    <div><span>生成</span><b>${esc(new Date().toISOString().slice(0, 10))}</b></div>
  </div>

  <h2>分卷（离线包）</h2>
  <table>
    <thead><tr><th>文件</th><th class="num">大小</th><th class="num">章</th><th class="num">课程</th><th>sha256</th></tr></thead>
    <tbody>${rows}
    </tbody>
  </table>

  <h2>清单（APP 读这些）</h2>
  <table>
    <thead><tr><th>文件</th><th class="num">大小</th><th>sha256</th></tr></thead>
    <tbody>${mrows}
    </tbody>
  </table>

  <h2>校验与解压</h2>
  <pre>sha256sum -c SHA256SUMS
mkdir -p ./media && for f in *.tar; do tar -xf "$f" -C ./media; done</pre>
  <p class="note">完整说明见 <a href="RELEASE-NOTES.md">RELEASE-NOTES.md</a>；在线播放走 HLS（<a href="index.json">index.json</a> → publish.json → master.m3u8）。</p>
</body>
</html>
`;
  fs.writeFileSync(path.join(OUT, 'index.html'), html, 'utf8');

  // 说明与下载页也是发布物，一并进校验清单（SHA256SUMS 自身除外）
  const more = ['RELEASE-NOTES.md', 'index.html']
    .map((f) => `${sha256(path.join(OUT, f))}  ${f}`);
  fs.appendFileSync(path.join(OUT, 'SHA256SUMS'), more.join('\n') + '\n', 'utf8');

  console.log(`✅ ${TAG} → ${OUT.replace(/\\/g, '/')}`);
  console.log(`   ${assets.length} 个分卷 + ${manifests.length} 个清单 · ${human(totalBytes)}`);
  console.log('   index.html · RELEASE-NOTES.md · SHA256SUMS');
  console.log('   校核：cd ' + OUT.replace(/\\/g, '/') + ' && sha256sum -c SHA256SUMS');
}

if (require.main === module) main();
module.exports = { main };

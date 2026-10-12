#!/usr/bin/env node
/**
 * site/serve.js — [tcmP] 本地预览服务器（零依赖）
 *
 *   node site/serve.js            # http://localhost:7788
 *   node site/serve.js --port 9000
 *
 * 只服务仓库内的静态文件；默认站点根为 site/，同时把仓库根映射到 /repo/ 方便
 * 在浏览器里直接看 Markdown / 代码原文。不做任何写操作。
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const ROOT = path.resolve(__dirname, '..');
const SITE = __dirname;

const args = process.argv.slice(2);
const portArg = args.indexOf('--port');
const PORT = portArg >= 0 ? Number(args[portArg + 1]) : Number(process.env.PORT || 7788);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.md': 'text/markdown; charset=utf-8',
  '.py': 'text/plain; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
};

function resolveSafe(base, rel) {
  const p = path.normalize(path.join(base, decodeURIComponent(rel)));
  if (!p.startsWith(base)) return null; // 目录穿越防护
  return p;
}

const server = http.createServer((req, res) => {
  const pathname = url.parse(req.url).pathname;

  let base = SITE;
  let rel = pathname;
  if (pathname.startsWith('/repo/')) {
    base = ROOT;
    rel = pathname.slice('/repo'.length);
  }

  let file = resolveSafe(base, rel === '/' ? '/index.html' : rel);
  if (!file) {
    res.writeHead(403).end('403');
    return;
  }

  // 站点页里引用的成片（platform/…）与教材产物（textbooks/…）都在 site/ 之外。
  // 静态部署时它们是 release 附件或 CDN 资源；本地预览也必须能直接打开，
  // 否则章节页上的 <video> 只会永远停在黑框 —— 看起来像播放器坏了，实际是路径 404。
  if (!pathname.startsWith('/repo/') && !fs.existsSync(file)) {
    const alt = resolveSafe(ROOT, rel);
    if (alt && fs.existsSync(alt)) file = alt;
  }

  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    file = path.join(file, 'index.html');
  }
  if (!fs.existsSync(file)) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404</h1><p>未找到。<a href="/">回到站点首页</a></p>');
    return;
  }

  const ext = path.extname(file).toLowerCase();
  const size = fs.statSync(file).size;
  const mime = MIME[ext] || 'application/octet-stream';
  const range = req.headers.range;

  // 视频要支持 Range 请求：浏览器拖动进度条、以及 Safari 的元数据探测都依赖它。
  // 不支持 Range 时大文件只能整体下载，<video> 在部分浏览器里会完全不播放。
  if (range && /^bytes=\d*-\d*$/.test(range)) {
    const [startRaw, endRaw] = range.replace('bytes=', '').split('-');
    const start = startRaw === '' ? Math.max(0, size - Number(endRaw)) : Number(startRaw);
    const end = endRaw === '' || startRaw === '' ? size - 1 : Math.min(Number(endRaw), size - 1);
    if (start > end || start >= size) {
      res.writeHead(416, { 'Content-Range': `bytes */${size}` }).end();
      return;
    }
    res.writeHead(206, {
      'Content-Type': mime,
      'Content-Length': end - start + 1,
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(file, { start, end }).pipe(res);
    return;
  }

  res.writeHead(200, {
    'Content-Type': mime,
    'Content-Length': size,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-cache',
  });
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, () => {
  console.log('═══ [tcmP] 本地预览 ═══');
  console.log(`  站点   http://localhost:${PORT}/`);
  console.log(`  仓库   http://localhost:${PORT}/repo/README.md`);
  console.log('  Ctrl+C 停止');
});

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
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    file = path.join(file, 'index.html');
  }
  if (!fs.existsSync(file)) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404</h1><p>未找到。<a href="/">回到站点首页</a></p>');
    return;
  }

  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
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

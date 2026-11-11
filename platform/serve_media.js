#!/usr/bin/env node
/**
 * serve_media.js —— 本地把媒体包当 CDN 一样服务（Range + CORS + 正确 MIME）
 *
 *   node platform/serve_media.js                 # http://127.0.0.1:7788
 *   node platform/serve_media.js --port 8080
 *   node platform/serve_media.js --root D:/tcm-media
 *
 * 为什么需要它：
 *   HLS 只有在「HTTP + Range + 正确 MIME + CORS」齐了之后才等于可播放。
 *   文件系统里 ffprobe 读得通，不代表 APP 拉得动——首屏、拖动、切档全依赖这三个头。
 *   这个服务器同时也是**部署清单的活样板**：真上 nginx / 对象存储时，
 *   照它打的那几个头配即可（platform/MEDIA-DELIVERY.md 第三节）。
 *
 * 不做的：不做鉴权、不做压缩、不做 TLS。它是本地联调工具，不是生产服务器。
 */

'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const argv = process.argv.slice(2);
const getArg = (name, def) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};

const ROOT = path.resolve(getArg('--root', process.env.HLS_ROOT || 'D:/tcm-media'));
const PORT = Number(getArg('--port', '7788'));
const HOST = getArg('--host', '127.0.0.1');

// MIME 必须对：m3u8 用 application/vnd.apple.mpegurl、fMP4 分片用 video/iso.segment。
// 配错的表现是「播放器能下载、但报 manifest 解析失败」，很难查。
const MIME = {
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.m4s': 'video/iso.segment',
  '.mp4': 'video/mp4',
  '.ts': 'video/mp2t',
  '.vtt': 'text/vtt; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

function send(res, code, body, headers = {}) {
  res.writeHead(code, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
    ...headers,
  });
  res.end(body);
}

function cacheHeader(ext) {
  // 分片不可变 → 一年；清单（m3u8/json/vtt）要短，否则改了不生效
  if (ext === '.m4s' || ext === '.ts' || ext === '.mp4' || ext === '.jpg' || ext === '.png') {
    return 'public, max-age=31536000, immutable';
  }
  return 'public, max-age=60';
}

/** 解析并夹紧路径，禁止 ../ 逃逸 */
function resolveSafe(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]).replace(/\/+$/, '');
  const abs = path.resolve(ROOT, '.' + clean);
  if (!abs.startsWith(ROOT)) return null;
  return abs;
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, '');
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'method not allowed');

  let u;
  try { u = new URL(req.url, `http://${req.headers.host || 'localhost'}`); }
  catch { return send(res, 400, 'bad url'); }

  let file = resolveSafe(u.pathname === '/' ? '/index.json' : u.pathname);
  if (!file) return send(res, 403, 'forbidden');

  // 目录 → 尝试 index.json（方便 /09-jichu/12-yaoli-xue/ 直接看清单）
  try {
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.json');
  } catch { return send(res, 404, `not found: ${u.pathname}`); }

  let st;
  try { st = fs.statSync(file); } catch { return send(res, 404, `not found: ${u.pathname}`); }
  if (!st.isFile()) return send(res, 404, 'not a file');

  const ext = path.extname(file).toLowerCase();
  const headers = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Accept-Ranges': 'bytes',
    'Cache-Control': cacheHeader(ext),
    // CORS 必须在这条路径上也发：200/206 走的是 writeHead，不经过 send()
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
    // ffmpeg 的 http 协议在 keep-alive 上会复用连接取变体清单，拿到 200 后误判为分片；
    // 关闭长连接后与 python -m http.server 行为一致，直接可播。
    Connection: 'close',
  };

  // Range：HLS 拖动与部分下载都靠它；没有它 Safari 会直接把整段拒掉。
  // 但**清单文件**（m3u8/vtt/json）不按 Range 处理：它们只有几 KB，
  // 而 ffmpeg 在取变体清单时会带 Range，拿到 206 后反而判定「不是合法播放列表」。
  const range = ext === '.m3u8' || ext === '.vtt' || ext === '.json' ? null : req.headers.range;
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!m) return send(res, 416, 'bad range', { 'Content-Range': `bytes */${st.size}` });
    let start = m[1] === '' ? null : Number(m[1]);
    let end = m[2] === '' ? null : Number(m[2]);
    if (start === null && end === null) return send(res, 416, 'bad range');
    if (start === null) { start = Math.max(0, st.size - end); end = st.size - 1; }
    else if (end === null || end >= st.size) end = st.size - 1;
    if (start > end) return send(res, 416, 'bad range', { 'Content-Range': `bytes */${st.size}` });

    const len = end - start + 1;
    res.writeHead(206, {
      ...headers,
      'Content-Range': `bytes ${start}-${end}/${st.size}`,
      'Content-Length': len,
    });
    if (req.method === 'HEAD') return res.end();
    return fs.createReadStream(file, { start, end }).pipe(res);
  }

  res.writeHead(200, { ...headers, 'Content-Length': st.size });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
});

if (!fs.existsSync(ROOT)) {
  console.error(`媒体目录不存在：${ROOT}（先跑 npm run media:hls）`);
  process.exit(2);
}
server.listen(PORT, HOST, () => {
  console.log(`媒体服务器：http://${HOST}:${PORT}/  → ${ROOT.replace(/\\/g, '/')}`);
  console.log(`  课程总清单：http://${HOST}:${PORT}/index.json`);
  console.log(`  单章入口  ：http://${HOST}:${PORT}/09-jichu/12-yaoli-xue/01-introduction/master.m3u8`);
  console.log('  Range / CORS / MIME 均已开；Ctrl+C 停止。');
});

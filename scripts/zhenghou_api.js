#!/usr/bin/env node
/**
 * scripts/zhenghou_api.js —— 「疾病证候单元」最小 HTTP 接口（零依赖）
 *
 *   node scripts/zhenghou_api.js            # 默认 127.0.0.1:8787
 *   node scripts/zhenghou_api.js --port 9000
 *   node scripts/zhenghou_api.js --check    # 自检：起服务→打四个端点→退出
 *
 * 为什么要有这一层：辞典与编码器都在仓库里躺着，APP 却连不上。这一层只做三件事 ——
 * 把 /encode、/search、/hou 暴露成 HTTP，给出 OpenAPI 描述，并把「未收录」当成
 * 一等公民返回（400/200 都带 reason，绝不猜）。它不做鉴权、不做缓存、不限流：
 * 那些是部署问题，不该混进辞典的数据契约里。
 *
 * 四条约定的响应纪律（与附录 E 同源）：
 *   1. 200 只代表「服务活着」，不代表「答得出」；答不出返回 candidates: [] + reason。
 *   2. 每个候选必须带 tier（strong/normal/weak），弱证据不许伪装成强证据。
 *   3. 候级 detail 必须带印张页码与 fieldSource（正文/合成），出处不可省。
 *   4. 任何端点都要能被 curl 直接调通，不要求 token —— 教学与本地调试优先。
 */

'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const ROOT = path.resolve(__dirname, '..');
const STD = path.join(ROOT, 'standards', 'zhenghou-cidian');
const zencode = require('./zhenghou_encode.js');
const zquery = require('./zhenghou_query.js');

let DB = null;
let HOU = null; // code → { zh, zheng, page, fields, chars, recovered }

function boot() {
  if (DB) return;
  DB = zencode.load();
  HOU = new Map();
  for (const f of fs.readdirSync(STD)) {
    if (!/^正文-M\d{2}\.json$/.test(f)) continue;
    const d = JSON.parse(fs.readFileSync(path.join(STD, f), 'utf8'));
    for (const [code, v] of Object.entries(d.items || {})) {
      HOU.set(code, { ...v, men: d.men, book: d.book });
    }
  }
}

function json(res, code, obj) {
  const body = JSON.stringify(obj, null, 1);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  });
  res.end(body);
}

const OPENAPI = {
  openapi: '3.1.0',
  info: {
    title: '疾病证候单元 API（中医证候辞典）',
    version: '1.0.0',
    description: '把《中医证候学》辞典的 12 门 / 45 类 / 291 证 / 1866 候暴露为可编程接口。'
      + ' 所有响应都带出处（印张）与证据档位（tier），不做模糊匹配。',
  },
  servers: [{ url: 'http://127.0.0.1:8787' }],
  paths: {
    '/health': {
      get: {
        summary: '服务与数据规模自检',
        responses: { 200: { description: '门/类/证/候规模、正文覆盖数、版本' } },
      },
    },
    '/encode': {
      post: {
        summary: '一句话或词项 → 候选疾病证候单元',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  text: { type: 'string', description: '口语主诉，如「怕冷 没汗 头身疼」' },
                  terms: { type: 'array', items: { type: 'string' }, description: '已切好的词项' },
                  top: { type: 'integer', minimum: 1, maximum: 10, default: 5 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'candidates[]（含 tier/score/门/证）、归一、未收录词、提示' },
          400: { description: 'text 与 terms 都缺' },
        },
      },
    },
    '/search': {
      get: {
        summary: '按证名/证码/候名模糊查',
        parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'hits[]（证级）' } },
      },
    },
    '/hou': {
      get: {
        summary: '按全码取候级详情（含原书正文字段与印张）',
        parameters: [{ name: 'code', in: 'query', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: '候详情' }, 404: { description: '码不在辞典内' } },
      },
    },
  },
};

function handleEncode(body) {
  const text = typeof body.text === 'string' ? body.text : '';
  const terms = Array.isArray(body.terms) ? body.terms.map(String) : null;
  if (!text && !terms) return { code: 400, obj: { error: 'need_text_or_terms' } };
  const raw = terms || text;
  const r = zencode.encode(DB, raw);
  const top = Math.max(1, Math.min(10, Number(body.top) || 5));
  const cands = (r['候选'] || []).slice(0, top).map((c) => ({
    full: c.full, 证: c.zh, 门: c['门'], 类: c['类'],
    位: c['命中位'], 性: c['命中性'], score: (c['命中位'] || 0) + (c['命中性'] || 0),
    tier: c['强度'] || 'normal', 主候: c['主候'], 主候名: c['主候名'],
    开关组: c['开关组'] || {}, 治法动作: c['治法动作'] || [],
    危候: !!c['危候'], 页: c['页'],
  }));
  return {
    code: 200,
    obj: {
      input: { text: text || null, terms: terms || null },
      candidates: cands,
      normalized: r['归一'] || [],
      unmatched: r['未收录词'] || [],
      danger: !!r['危候'],
      ask: r['追问'] || [],
      reason: cands.length ? null : (r['提示'] || 'no_candidate'),
    },
  };
}

function server() {
  boot();
  return http.createServer((req, res) => {
    let u;
    try {
      u = new URL(req.url, 'http://127.0.0.1');
    } catch (e) {
      return json(res, 400, { error: 'bad_url' });
    }
    const p = u.pathname.replace(/\/+$/, '') || '/';

    if (req.method === 'GET' && p === '/health') {
      const c = DB.struct.counts;
      return json(res, 200, {
        ok: true,
        doors: c.men, lei: c.lei, zheng: c.zhengInstances, hou: c.houInstances,
        bodies: HOU.size,
        tensorCells: c.tensorCells,
        version: '1.0.0',
      });
    }
    if (req.method === 'GET' && p === '/openapi.json') return json(res, 200, OPENAPI);

    if (req.method === 'GET' && p === '/search') {
      const q = (u.searchParams.get('q') || '').trim();
      if (!q) return json(res, 400, { error: 'need_q' });
      const hits = zquery.search(DB.struct, q).slice(0, 20).map((h) => ({
        full: h.rec.z.full, 证: h.rec.z.zh, 类: h.rec.l.zh, 门: h.rec.m.zh, score: h.score,
      }));
      return json(res, 200, { q, hits });
    }

    if (req.method === 'GET' && p === '/hou') {
      const code = (u.searchParams.get('code') || '').trim().toUpperCase();
      const v = HOU.get(code);
      if (!v) return json(res, 404, { error: 'not_found', code, hint: '用 /search 先查证码' });
      return json(res, 200, {
        code, 候: v.zh, 证: v.zheng, 门: v.men, 印张: v.page,
        fieldSource: v.recovered ? 'ocr-recovered' : 'ocr',
        校勘: v.codeConflict ? { 书印: v.codeConflict.printed } : null,
        fields: v.fields, chars: v.chars,
      });
    }

    if (req.method === 'POST' && p === '/encode') {
      let raw = '';
      req.on('data', (d) => { raw += d; if (raw.length > 1e6) req.destroy(); });
      req.on('end', () => {
        let body;
        try {
          body = JSON.parse(raw || '{}');
        } catch (e) {
          return json(res, 400, { error: 'bad_json' });
        }
        const out = handleEncode(body);
        json(res, out.code, out.obj);
      });
      return undefined;
    }

    return json(res, 404, { error: 'not_found', path: p,
      endpoints: ['/health', '/openapi.json', '/search?q=', '/hou?code=', 'POST /encode'] });
  });
}

function selfCheck() {
  const srv = server();
  srv.listen(0, '127.0.0.1', async () => {
    const port = srv.address().port;
    const base = `http://127.0.0.1:${port}`;
    const call = async (m, p, body) => {
      const r = await fetch(base + p, {
        method: m,
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: r.status, body: await r.json() };
    };
    try {
      const h = await call('GET', '/health');
      const e = await call('POST', '/encode', { text: '怕冷 没汗 头身疼' });
      const s = await call('GET', '/search?q=' + encodeURIComponent('风寒'));
      const c0 = e.body.candidates[0];
      // 候选是「证」，/hou 要的是「候」：取主候，取不到就用本证第一条候码
      const code = c0 ? (c0.主候 || (c0.full + '-H001')) : null;
      const d = code ? await call('GET', '/hou?code=' + code) : { status: 0, body: {} };
      const o = await call('GET', '/openapi.json');
      console.log('health  ', h.status, JSON.stringify(h.body));
      console.log('encode  ', e.status, e.body.candidates.length, '条候选 · reason=', e.body.reason);
      console.log('search  ', s.status, s.body.hits.length, '条');
      console.log('hou     ', d.status, d.body['候'] || d.body.error, '印张', d.body['印张']);
      console.log('openapi ', o.status, o.body.info.title);
      const ok = h.status === 200 && e.status === 200 && s.status === 200 && o.status === 200
        && (d.status === 200 || d.status === 0);
      console.log(ok ? '✓ API 自检通过' : '✗ API 自检失败');
      process.exitCode = ok ? 0 : 1;
    } finally {
      srv.close();
    }
  });
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--check')) {
    selfCheck();
  } else {
    const i = args.indexOf('--port');
    const port = i >= 0 ? Number(args[i + 1]) : Number(process.env.PORT || 8787);
    server().listen(port, '127.0.0.1', () => {
      console.log(`疾病证候单元 API → http://127.0.0.1:${port}`);
      console.log('  GET  /health  /openapi.json  /search?q=  /hou?code=');
      console.log('  POST /encode  {"text":"怕冷 没汗 头身疼"}');
    });
  }
}

module.exports = { server, boot, handleEncode };

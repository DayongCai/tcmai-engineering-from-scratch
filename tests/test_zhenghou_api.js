#!/usr/bin/env node
/**
 * tests/test_zhenghou_api.js —— 接口层与百姓入口的回归
 *
 * 为什么单开一个测试文件：/encode 的黄金样例（test_zhenghou_encode.js）测的是**算法**，
 * 这里测的是**接口契约**与**口语入口**——
 *   ① 四个端点真的能用 curl/fetch 调通，响应字段不许改名；
 *   ② 问答样例.json 里 12 条百姓问句：期望门对得上、危候项必须置真；
 *   ③ 三条 known_gap 必须是「零候选」而不是「乱给一个门」——缺口不许被悄悄填平。
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const STD = path.join(ROOT, 'standards', 'zhenghou-cidian');
const api = require(path.join(ROOT, 'scripts', 'zhenghou_api.js'));
const zencode = require(path.join(ROOT, 'scripts', 'zhenghou_encode.js'));

const CASES = JSON.parse(fs.readFileSync(path.join(STD, '问答样例.json'), 'utf8'))['用例'];

let srv;
let base;

test.before(async () => {
  srv = api.server();
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${srv.address().port}`;
});

test.after(() => srv && srv.close());

const get = async (p) => {
  const r = await fetch(base + p);
  return { status: r.status, body: await r.json() };
};
const post = async (p, body) => {
  const r = await fetch(base + p, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json() };
};

test('A1 /health 报的规模与结构.json 一致', async () => {
  const { status, body } = await get('/health');
  assert.strictEqual(status, 200);
  const st = JSON.parse(fs.readFileSync(path.join(STD, '结构.json'), 'utf8'));
  assert.strictEqual(body.doors, st.counts.men);
  assert.strictEqual(body.hou, st.counts.houInstances);
  assert.strictEqual(body.tensorCells, st.counts.tensorCells);
  assert.ok(body.bodies > 1800, '正文层条数应 > 1800');
});

test('A2 /encode 缺参数给 400，不猜', async () => {
  const { status, body } = await post('/encode', {});
  assert.strictEqual(status, 400);
  assert.strictEqual(body.error, 'need_text_or_terms');
});

test('A3 /encode 候选字段齐全且带证据档位', async () => {
  const { status, body } = await post('/encode', { text: '怕冷 没汗 头身疼', top: 3 });
  assert.strictEqual(status, 200);
  assert.ok(body.candidates.length >= 1);
  const c = body.candidates[0];
  for (const k of ['full', '证', '门', '位', '性', 'score', 'tier', '危候']) {
    assert.ok(k in c, '候选缺字段 ' + k);
  }
  assert.ok(['strong', 'normal', 'weak'].includes(c.tier));
});

test('A4 零候选时必须给 reason，不许静默空', async () => {
  const { status, body } = await post('/encode', { text: '完全不通的词 另一个怪词' });
  assert.strictEqual(status, 200);
  assert.deepStrictEqual(body.candidates, []);
  assert.ok(body.reason, '空结果必须带 reason');
  assert.ok(body.unmatched.length >= 1);
});

test('A5 /hou 命中带印张与字段，未命中 404', async () => {
  const ok = await get('/hou?code=M06-L18-Z12-H042');
  assert.strictEqual(ok.status, 200);
  assert.ok(ok.body['印张'], '候详情必须带印张');
  assert.ok(Object.keys(ok.body.fields).length >= 3);
  const miss = await get('/hou?code=M99-L99-Z99-H999');
  assert.strictEqual(miss.status, 404);
  assert.strictEqual(miss.body.error, 'not_found');
});

test('A6 /search 能按证名查到，空 query 给 400', async () => {
  const hit = await get('/search?q=' + encodeURIComponent('风寒'));
  assert.strictEqual(hit.status, 200);
  assert.ok(hit.body.hits.length >= 3);
  const bad = await get('/search');
  assert.strictEqual(bad.status, 400);
});

test('A7 openapi.json 是 3.1 且四条路径都在', async () => {
  const { status, body } = await get('/openapi.json');
  assert.strictEqual(status, 200);
  assert.ok(String(body.openapi).startsWith('3.'));
  for (const p of ['/health', '/encode', '/search', '/hou']) assert.ok(body.paths[p], '缺路径 ' + p);
});

test('A8 十二条百姓问句：期望门对得上、危候项置真', () => {
  const db = zencode.load();
  const bad = [];
  for (const c of CASES) {
    const r = zencode.encode(db, c.text);
    const top = (r['候选'] || [])[0] || null;
    if (c['期望危候']) {
      assert.ok(r['危候'], c.id + ' 危象词应置危候=true');
      continue;
    }
    if (c.known_gap) {
      if (top) bad.push(`${c.id} 已知缺口却被填上了：${top.zh}（要么补位词、要么删缺口，不要悄悄变好）`);
      continue;
    }
    if (!top) { bad.push(`${c.id} 零候选：${c.text}`); continue; }
    const men = String(top['门']).slice(0, 3);
    if (men !== c['期望门']) bad.push(`${c.id} 门错：期望 ${c['期望门']}，实际 ${men}（${top.zh}）`);
  }
  assert.deepStrictEqual(bad, []);
});

test('A10 追问策略：弱证据必须给「补哪一问」，强证据不许啰嗦', async () => {
  const weak = await post('/encode', { text: '干咳 嗓子干' });
  assert.strictEqual(weak.status, 200);
  const wc = weak.body.candidates[0];
  assert.ok(wc, '这两句应能给出候选');
  assert.ok(['weak', 'normal'].includes(wc.tier), '档位应落在弱/常规：' + wc.tier);
  assert.ok(weak.body.ask.length >= 1, '弱证据必须带追问');
  assert.ok(weak.body.ask.every((a) => a['维度'] && a['问']), '追问要写清补哪一维');
  const strong = await post('/encode', { text: '拉肚子 没胃口 没劲' });
  assert.strictEqual(strong.body.candidates[0].tier, 'strong');
  assert.deepStrictEqual(strong.body.ask, [], 'strong 时不该再问');
});

test('A9 危象词走「包含」而非精确：裹着状语也要认', () => {
  const db = zencode.load();
  for (const q of ['突然昏倒', '刚才晕过去一次', '人叫不应']) {
    const r = zencode.encode(db, q);
    assert.ok(r['危候'], q + ' 应触发危候');
  }
});

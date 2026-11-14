#!/usr/bin/env node
/**
 * tests/test_zhenghou_site.js —— 百姓入口页与 Node 编码器的同源对齐
 *
 * 为什么必须有这条测试：页面里有一套**独立的**匹配内核（site/zhenghou-core.js），
 * 浏览器跑不了 Node。两套实现一旦分叉，「网页上查到的」和「接口返回的」就会不一致，
 * 而这是数据产品最难发现、最伤信任的 bug。本测试拿 12 条百姓问句当合同：
 * 页面内核跑出的门/危候，必须与问答样例.json 的期望一致（那份期望由 Node 编码器验收）。
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PAGE = path.join(ROOT, 'site', 'zhenghou.html');
const CORE = require(path.join(ROOT, 'site', 'zhenghou-core.js'));
const { buildData, html } = require(path.join(ROOT, 'scripts', 'build_zhenghou_site.js'));

test('S1 页面存在、单文件、不依赖任何外部资源', () => {
  assert.ok(fs.existsSync(PAGE), '缺 site/zhenghou.html —— 跑 node scripts/build_zhenghou_site.js');
  const t = fs.readFileSync(PAGE, 'utf8');
  assert.ok(t.length > 50000, '页面过小，疑似只生成了空壳');
  assert.ok(!/https?:\/\/(?!127\.0\.0\.1)/.test(t.replace(/<footer[\s\S]*$/, '')), '页面不应引用外部 URL');
  for (const k of ['疾病证候单元', '十二门 × 六族', '验收问句', 'ZhenghouCore']) {
    assert.ok(t.includes(k), '页面缺区块：' + k);
  }
});

test('S2 页面内核与问答样例逐条一致（门 / 危候）', () => {
  const D = buildData();
  const bad = [];
  for (const c of D.qa) {
    const r = CORE.encode(D, c.text);
    if (c.危) {
      if (!r.danger) bad.push(`${c.id} 应为危候，页面内核没命中危象词`);
      continue;
    }
    if (!r.candidates.length) { bad.push(`${c.id} 零候选：${c.text}`); continue; }
    const men = String(r.candidates[0].门).slice(0, 3);
    if (men !== c.期望门) bad.push(`${c.id} 门错：期望 ${c.期望门}，页面给了 ${men}`);
  }
  assert.deepStrictEqual(bad, []);
});

test('S3 生成器幂等：--check 应与磁盘一致（页面不许手工改）', () => {
  const fresh = html(buildData());
  const disk = fs.readFileSync(PAGE, 'utf8');
  assert.strictEqual(disk, fresh,
    'site/zhenghou.html 与数据源不一致：请跑 node scripts/build_zhenghou_site.js，别手改生成物');
});

test('S4 规模与结构.json 一致，且 1866 条候全部可搜', () => {
  const D = buildData();
  const st = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards', 'zhenghou-cidian', '结构.json'), 'utf8'));
  assert.strictEqual(D.counts.hou, st.counts.houInstances);
  assert.strictEqual(D.hou.length, st.counts.houInstances, '可搜候条数不等于 1866');
  assert.strictEqual(D.zheng.length, st.counts.zhengInstances);
});

test('S5 追问策略在页面内核里同样生效（弱证据不判空）', () => {
  const D = buildData();
  const r = CORE.encode(D, '干咳 嗓子干');
  assert.ok(r.candidates.length >= 1, '两句主诉应给候选');
  assert.ok(r.ask.length >= 1, '证据不足应给追问');
  const strong = CORE.encode(D, '拉肚子 没胃口 没劲');
  assert.deepStrictEqual(strong.ask, [], 'strong 时不该追问');
});

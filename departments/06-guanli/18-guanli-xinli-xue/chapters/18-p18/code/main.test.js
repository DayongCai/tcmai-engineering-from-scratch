'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { DOC, CHAPTER, TITLE, read, sections, decomposition, overlap, gate, reviewIntegrity, anonymity, chain, concepts, CHAIN, GATES } = require('./main.js');

const TEXT = read();

test('正文文件就在本章目录下', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '18-p18', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 18);
  assert.strictEqual(TITLE, '平台算得出相关，算不出该由谁负责');
  assert.strictEqual(sections(TEXT).length, 8);
});

test('PBU、责任链、门禁与两部法律都在正文里', () => {
  const c = concepts(TEXT);
  assert.deepStrictEqual(c.chain, CHAIN);
  assert.deepStrictEqual(c.gates, ['G1', 'G2', 'G3', 'E1']);
  assert.strictEqual(c.hasPBU, true);
  assert.strictEqual(c.hasPIPL, true);
  assert.strictEqual(c.hasDSL, true);
});

test('0.41 的相关解释 16.81%，跨科室 0.9 分让情境占 44.75%', () => {
  const d = decomposition({ r: 0.41, settingDiff: 0.9 });
  assert.strictEqual(d.explained, 16.81);
  assert.strictEqual(d.settingShare, 44.75);
  assert.strictEqual(d.personShare, 55.25);
  assert.match(d.verdict, /哪个场景/);
  // 情境差为 0 时，分数全部归个人
  assert.strictEqual(decomposition({ r: 0.41, settingDiff: 0 }).settingShare, 0);
});

test('能力项重叠：Jaccard ≥ 0.7 判为同一项，举不出区分性例子', () => {
  const dup = overlap(['主动提问', '复述要点', '确认理解'], ['主动提问', '复述要点', '确认理解', '记录反馈']);
  assert.strictEqual(dup.jaccard, 0.75);
  assert.strictEqual(dup.distinguishable, false);
  assert.match(dup.note, /两项本是一项/);
  const diff = overlap(['主动提问'], ['书写病历']);
  assert.strictEqual(diff.jaccard, 0);
  assert.strictEqual(diff.distinguishable, true);
});

test('闸门：影响决定时，不可解释或无依据一律不得作为依据', () => {
  assert.strictEqual(gate({ tier: '不可解释', hasRecords: true, reviewed: true, affectsDecision: true }).allowed, false);
  assert.match(gate({ tier: '不可解释', hasRecords: true, reviewed: true, affectsDecision: true }).reason, /不可解释/);
  assert.strictEqual(gate({ tier: '部分可解释', hasRecords: true, reviewed: true, affectsDecision: true }).allowed, true);
  assert.strictEqual(gate({ tier: '部分可解释', hasRecords: false, reviewed: true, affectsDecision: true }).allowed, false);
  assert.strictEqual(gate({ tier: '部分可解释', hasRecords: true, reviewed: false, affectsDecision: true }).allowed, false);
  const internal = gate({ tier: '不可解释', hasRecords: false, reviewed: false, affectsDecision: false });
  assert.strictEqual(internal.allowed, true);
  assert.match(internal.use, /内部提示/);
});

test('复核零推翻 = 复核不存在', () => {
  const ri = reviewIntegrity({ reviews: 120, overrides: 0 });
  assert.strictEqual(ri.exists, false);
  assert.match(ri.verdict, /复核不存在/);
  assert.strictEqual(reviewIntegrity({ reviews: 120, overrides: 7 }).exists, true);
  assert.strictEqual(reviewIntegrity({ reviews: 120, overrides: 7 }).rate, 5.83);
});

test('去标识化：最小单元格 < 5 人即可重识别', () => {
  assert.match(anonymity([{ n: 3 }, { n: 23 }]).risk, /可重识别/);
  assert.strictEqual(anonymity([{ n: 3 }, { n: 23 }]).k, 3);
  assert.match(anonymity([{ n: 8 }, { n: 40 }]).risk, /可控/);
});

test('责任链缺一环就落在空隙里', () => {
  assert.strictEqual(chain({ '谁训练模型': '甲', '谁部署上线': '乙', '谁日常复核': '丙', '谁向学员解释': '丁', '谁承担后果': '戊' }).ok, true);
  const bad = chain({ '谁训练模型': '甲', '谁部署上线': '乙', '谁日常复核': '丙', '谁向学员解释': '丁' });
  assert.deepStrictEqual(bad.missing, ['谁承担后果']);
  assert.match(bad.verdict, /空隙/);
});

test('脚本可运行，输出情境占比与边界声明', () => {
  const r = require('node:child_process').spawnSync(process.execPath, [path.join(__dirname, 'main.js')], {
    encoding: 'utf8',
    timeout: 60000,
  });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /情境占 44\.75%/);
  assert.match(out, /复核不存在/);
  assert.match(out, /个人信息保护法/);
});

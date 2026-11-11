'use strict';
/**
 * 本章单测：核 code/main.js 的 CLI 输出（main.js 读 standards/yaoli/底本.json 现算）。
 * 只断言语义，不锁死具体数字——底本改版后重跑即可，不必改测试。
 */
const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const MAIN = path.join(__dirname, 'main.js');
const run = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
const OUT = String(run.stdout || '');

test('退出码为 0', () => {
  assert.strictEqual(run.status, 0, run.stderr);
});

test('输出认对了本章（第 12 章）', () => {
  assert.match(OUT, /第\s?12\s?章/);
});

test('教材规模行给出 4 节 12 小节', () => {
  assert.match(OUT, /4 节 · 12 小节/);
});

test('输出有实质内容（>300 字）', () => {
  assert.ok(OUT.length > 300, '输出只有 ' + OUT.length + ' 字符');
});

test('量值与分布都打印出来', () => {
  assert.match(OUT, /量值|底本/);
  assert.match(OUT, /分布|小节/);
});

test('末行是教学边界声明', () => {
  const last = OUT.trim().split('\n').filter(Boolean).pop() || '';
  assert.match(last, /教学边界/);
  assert.match(last, /不构成/);
});

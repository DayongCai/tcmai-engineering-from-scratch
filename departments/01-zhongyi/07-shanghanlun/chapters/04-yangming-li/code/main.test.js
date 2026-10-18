'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { grade, stats, variants } = require('./main.js');

test('大便硬 + 潮热 + 腹满 → 大承气汤', () => {
  const r = grade({ 大便硬: true, 潮热: true, 腹满: true });
  assert.strictEqual(r.tier, '大承气汤');
  assert.deepStrictEqual(r.hit.sort(), ['大便硬', '潮热', '腹满'].sort());
  assert.deepStrictEqual(r.missing, []);
});

test('腹大满不通 + 潮热（无大便硬）→ 小承气汤：症状更「满」而方更轻', () => {
  const r = grade({ 腹大满不通: true, 潮热: true });
  assert.strictEqual(r.tier, '小承气汤');
  assert.ok(r.notExcluded.some((x) => x.includes('大承气')));
});

test('但热不恶寒、无腹满硬满 → 调胃承气汤，并提示玉函异文', () => {
  const r = grade({ 不恶寒但热: true });
  assert.strictEqual(r.tier, '调胃承气汤');
  assert.ok(r.notExcluded.join('').includes('玉函'));
});

test('信息不足时不硬定档，且列出缺项', () => {
  const r = grade({});
  assert.strictEqual(r.tier, '不足以定档');
  assert.ok(r.missing.length >= 3);
});

test('同时有腹大满不通与大便硬时走大承气，但必须提示分叉', () => {
  const r = grade({ 腹大满不通: true, 大便硬: true, 潮热: true, 腹满: true });
  assert.strictEqual(r.tier, '大承气汤');
  assert.ok(r.notExcluded.length >= 1);
});

test('规模与频次：134 条 / 2 篇；大承气 79 · 调胃 33 · 小承气 31', () => {
  const s = stats();
  assert.deepStrictEqual([s.条, s.篇], [134, 2]);
  assert.deepStrictEqual([s.大承气汤, s.调胃承气汤, s.小承气汤], [79, 33, 31]);
  assert.deepStrictEqual([s.潮热, s.燥屎], [16, 25]);
});

test('异文标注可取出，且不覆盖主文（只记录）', () => {
  const v = variants();
  assert.ok(v.length >= 20, `异文标注应不少，实得 ${v.length}`);
  assert.ok(v.some((x) => x.note.includes('玉函')));
  assert.ok(v.every((x) => typeof x.text === 'string' && x.note.length >= 2));
});

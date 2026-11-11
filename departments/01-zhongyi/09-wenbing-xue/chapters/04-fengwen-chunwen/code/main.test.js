'use strict';
const assert = require('node:assert');
const test = require('node:test');
const {
  BOOK, TIAOBIAN, PIAN_NAME, pians, fangByStage, xingan, progression, totals, formulaIndex,
} = require('./main.js');

/** 「中焦篇·第一」→ 该条原文 */
function articleAt(at) {
  const [pian, raw] = at.split('·');
  const no = raw.replace(/^第/, '');
  const stage = pian.replace('篇', '');
  for (const p of pians()) {
    if (p.stage !== stage) continue;
    const a = p.articles.find((x) => x.no === no);
    if (a) return { ...a, stage };
  }
  return null;
}

/** 引文必须能在原文里逐字找到；「……」分段，各段都须命中 */
function quoteLands(ev) {
  const a = articleAt(ev.at);
  assert.ok(a, `条号不存在：${ev.at}`);
  // src=note 指方后注：该条的方剂 method/comment 文本（不是条文本身）
  const noteHay = ev.src === 'note'
    ? pians().find((p) => p.stage === a.stage).formulas
        .filter((f) => f.tiao === a.no)
        .map((f) => (f.methodSimp || '') + (f.comment || '') + (f.noteSimp || ''))
        .join('')
    : '';
  const hay = ev.src === 'note' ? noteHay : a.zhHans || '';
  for (const frag of ev.quote.split('……')) {
    const f = frag.trim();
    if (!f) continue;
    assert.ok(hay.includes(f), `${ev.at} 引文对不上原文：「${f}」`);
  }
  return true;
}

test('三篇规模：上焦 21 · 中焦 37 · 下焦 35 = 93 条（卷一/二/三 连续条号）', () => {
  const rows = fangByStage();
  assert.strictEqual(rows.length, 3);
  assert.deepStrictEqual(rows.map((r) => r.stage), ['上焦', '中焦', '下焦']);
  assert.deepStrictEqual(rows.map((r) => r.tiao), [21, 37, 35]);
  assert.strictEqual(totals().tiao, 93);
  assert.strictEqual(rows[0].firstNo, '一');
  assert.strictEqual(rows[0].lastNo, '二一');
  assert.strictEqual(rows[1].lastNo, '三七');
  assert.strictEqual(rows[2].lastNo, '三十五');
});

test('方条 84 = 有方文 52 + 互见 32（逐焦 24 / 32 / 28）', () => {
  const t = totals();
  assert.strictEqual(t.fang, 84);
  assert.strictEqual(t.youFang, 52);
  assert.strictEqual(t.hujian, 32);
  assert.strictEqual(t.youFang + t.hujian, t.fang, '方条必须等于两类之和');
  const rows = fangByStage();
  assert.deepStrictEqual(rows.map((r) => r.fang), [24, 32, 28]);
  assert.deepStrictEqual(rows.map((r) => r.youFang), [15, 17, 20]);
  assert.deepStrictEqual(rows.map((r) => r.hujian), [9, 15, 8]);
});

test('药味：出现 266 次 · 不同药 120 味（互见无药味，不进统计）', () => {
  const t = totals();
  assert.strictEqual(t.herbTokens, 266);
  assert.strictEqual(t.distinctHerbs, 120);
  assert.deepStrictEqual(fangByStage().map((r) => r.herbTokens), [99, 84, 83]);
});

test('上焦三阶梯：银翘散（第四）→ 桑菊饮（第六）→ 白虎汤（第七）', () => {
  const ix = formulaIndex();
  const tiao = (name) => {
    const hit = (ix.get(name) || []).find((x) => x.stage === '上焦');
    assert.ok(hit, `上焦缺方：${name}`);
    return hit.tiao;
  };
  assert.strictEqual(tiao('辛凉平剂银翘散方'), '四');
  assert.strictEqual(tiao('辛凉轻剂桑菊饮方'), '六');
  assert.strictEqual(tiao('辛凉重剂白虎汤方'), '七');
});

test('中焦承气类：大承气汤有方文，且中焦 37 条里 17 方有方文', () => {
  const ix = formulaIndex();
  const dc = (ix.get('大承气汤方') || [])[0];
  assert.ok(dc && dc.stage === '中焦' && dc.herbs > 0, '大承气汤方应在上焦篇之外的有方文方中');
  const zhong = fangByStage().find((r) => r.stage === '中焦');
  assert.strictEqual(zhong.youFang, 17);
  assert.ok(zhong.names.includes('增液汤方'), '中焦应有增液汤（润下而非峻下）');
  assert.ok(zhong.names.includes('新加黄龙汤'), '中焦应有新加黄龙汤（下之不通五证之一）');
});

test('下焦复脉阶梯：加减复脉（八）→ 一甲（九）→ 二甲（十三）→ 三甲（十四）条号递增', () => {
  const ix = formulaIndex();
  const seq = ['加减复脉汤方', '一甲煎', '二甲复脉汤方', '三甲复脉汤方'].map((n) => {
    const hit = (ix.get(n) || []).find((x) => x.stage === '下焦');
    assert.ok(hit, `下焦缺方：${n}`);
    return hit;
  });
  assert.deepStrictEqual(seq.map((x) => x.tiao), ['八', '九', '十三', '十四']);
  assert.ok(seq[0].herbs > 0);
  assert.ok(!seq[1].refOnly, '一甲煎自有方文（生牡蛎一味）');
  assert.ok(seq[2].refOnly && seq[3].refOnly, '二甲以上皆互见（在前方内加减）');
});

test('新感/伏邪：可按词表判者 14 / 93，其余 79 条不含时间词（不判）', () => {
  const x = xingan();
  assert.strictEqual(x.totals.tiao, 93);
  assert.strictEqual(x.totals.新感, 8);
  assert.strictEqual(x.totals.伏邪, 7);
  assert.strictEqual(x.totals.交叉, 1);
  assert.strictEqual(x.totals.未标, 79);
  assert.strictEqual(totals().kePan, 14);
  const shang = x.rows.find((r) => r.stage === '上焦');
  assert.deepStrictEqual(shang.新感, ['二', '三', '四', '五', '十三', '十四', '十八']);
  const xia = x.rows.find((r) => r.stage === '下焦');
  assert.deepStrictEqual(xia.伏邪, ['一', '四', '五', '七', '十六', '十九']);
});

test('二字范畴在原文本三篇里 0 见：「新感」全 0，「伏邪」仅 1 见且不在本三篇', () => {
  const all = TIAOBIAN.sections.flatMap((s) => s.articles.map((a) => a.zhHans || ''));
  const count = (kw) => all.filter((t) => t.includes(kw)).length;
  assert.strictEqual(count('新感'), 0);
  assert.strictEqual(count('伏邪'), 1, '全书「伏邪」只出现 1 次');
  for (const p of pians()) {
    for (const a of p.articles) {
      assert.ok(!(a.zhHans || '').includes('新感'), `${p.stage}·${a.no} 出现「新感」`);
      assert.ok(!(a.zhHans || '').includes('伏邪'), `${p.stage}·${a.no} 出现「伏邪」`);
    }
  }
});

test('三焦转归链：两跳四证据，每条引文都能回到原文逐字命中', () => {
  const p = progression();
  assert.deepStrictEqual(p.nodes.map((n) => n.stage), ['上焦', '中焦', '下焦']);
  assert.strictEqual(p.hops.length, 2);
  assert.deepStrictEqual([p.hops[0].from, p.hops[0].to], ['上焦', '中焦']);
  assert.deepStrictEqual([p.hops[1].from, p.hops[1].to], ['中焦', '下焦']);
  for (const h of p.hops) {
    assert.ok(h.evidence.length >= 1, `${h.from}→${h.to} 无证据`);
    assert.ok(h.evidence.some((e) => e.src === 'tiao'), `${h.from}→${h.to} 只靠方后注，不算条文证据`);
    for (const e of h.evidence) quoteLands(e);
  }
  for (const n of p.nodes) quoteLands(n.evidence);
  // 上→中 的方后注必须标明 src，不能混作条文
  const note = p.hops[0].evidence.find((e) => e.src === 'note');
  assert.strictEqual(note.at, '上焦篇·第四');
});

test('闸（原文明写的不可与）：四道，引文逐字可回原文', () => {
  const p = progression();
  assert.strictEqual(p.gates.length, 4);
  assert.deepStrictEqual(p.gates.map((g) => g.at), ['上焦篇·第九', '中焦篇·第三十', '中焦篇·第三一', '下焦篇·第十七']);
  for (const g of p.gates) quoteLands({ ...g, src: 'tiao' });
});

test('必读两条：上焦篇·第二「始于上焦」与下焦篇·第一「邪在阳明久羁」逐字在原文', () => {
  const a2 = articleAt('上焦篇·第二');
  assert.strictEqual(a2.zhHans, '凡病温者，始于上焦，在手太隂。');
  const a1 = articleAt('下焦篇·第一');
  assert.ok(a1.zhHans.startsWith('风温、温热、温疫、温毒、冬温，邪在阳明久羁'));
  const yuan = TIAOBIAN.sections.find((s) => s.juan === '原病篇');
  assert.ok(yuan.articles[1].zhHans.includes('冬伤于寒，春必病温'));
  assert.ok(yuan.articles[2].zhHans.includes('藏于精者，春不病温'));
});

test('每条都有繁/简两栏，简体非空；篇名为原文繁体（風温…）', () => {
  for (const p of pians()) {
    for (const a of p.articles) {
      assert.ok(a.zhHant && a.zhHant.length > 0, `${p.stage}·${a.no} 缺繁文`);
      assert.ok(a.zhHans && a.zhHans.length > 0, `${p.stage}·${a.no} 缺简文`);
    }
  }
  assert.strictEqual(PIAN_NAME, '風温、温熱、温疫、温毒、冬温');
});

test('数据源可复算：底本 tiaobian 的 sha256 与源页字节数已留档', () => {
  assert.ok(TIAOBIAN.source && TIAOBIAN.source.sha256, '缺 sha256');
  assert.strictEqual(TIAOBIAN.source.sha256.length, 64);
  assert.ok(TIAOBIAN.source.bytes > 0);
  assert.strictEqual(TIAOBIAN.source.provider, 'jicheng');
});

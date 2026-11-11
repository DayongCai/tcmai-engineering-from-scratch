'use strict';
/**
 * 第 14 章 · 内科分型（病名／证型）与 ICD-11 第 26 章（TM1）的映射：对得上的、对不上的
 *
 *   node code/main.js
 *
 * 数据（全部在版本库内，可复算）：
 *   standards/neike/底本.json                     教材 12 章，病名取自第 4–11 章节标题
 *   standards/icd11/zh-names.json                 WHO 官方中译本第 26 章 1,120 条（TM1 472 条有中文名）
 *   standards/semtensor/descriptions/term-alignment.json   7 条 ICD-11 合称证名的对齐结论
 *
 * 三条口径（改任何一条都要同步改 docs/zh.md）：
 *   1. 对齐只做**逐字同名**。教材病名「咳嗽」与 TM1「咳嗽」同名才算命中；
 *      不做同义、近义、拼音、繁简归并。所以命中率是**下界**。
 *   2. 分层判定：码末位为 Y/Z（other specified / unspecified）的算**残类**。
 *      落在残类上不算「对上了」——那只是「被收进了一个筐」。
 *   3. 本章不声称任何编码「已注册／已由 WHO 确认」。本仓库无 OAuth 凭据，
 *      id.who.int 实测 401；本地只有中译本条目表（无定义、无索引词），
 *      能核的只有「这个中文名在这一版里存在」，不能核「这个映射被官方接受」。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const BASE = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/neike/底本.json'), 'utf8'));
const ZN = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/icd11/zh-names.json'), 'utf8'));
const ALIGN = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/semtensor/descriptions/term-alignment.json'), 'utf8'));

const NAMES = ZN.names;
const IS_RESIDUAL = (code) => /[YZ]$/.test(code);

/**
 * 匹配用的键：NFKC 归一化 + 去空白。
 *
 * 这不是洁癖。WHO 中译本里有 **7 条中文名带兼容汉字**（CJK Compatibility Ideograph），
 * 例如 SA9Y 的「淋」写作 U+F9F5 而不是 U+6DCB，SF5J 的「肝脾不和证」里「不」也是兼容码位。
 * 不做 NFKC，这两条就永远匹配不上教材的「淋证」「肝脾不和证」——
 * 一个字符串比对问题被伪装成了「标准里没有这个概念」。
 * NFKC 副作用是把全角括号（U+FF08/FF09）折成半角，两边同时折，仍可比。
 */
const key = (s) => String(s == null ? '' : s).normalize('NFKC').replace(/\s/g, '');

/** NFKC 前后不同的条目 —— 逐条报出，不让它悄悄生效 */
function nfkcDrift() {
  return NAMES.filter((n) => n.zh && n.zh.normalize('NFKC') !== n.zh).map((n) => ({
    code: n.code,
    raw: n.zh,
    norm: n.zh.normalize('NFKC'),
  }));
}

/** 中文名 → 条目（同名取第一条；重名情况在 report 里单独报） */
const BY_ZH = new Map();
for (const n of NAMES) {
  if (!n.zh) continue;
  const k = key(n.zh);
  if (!BY_ZH.has(k)) BY_ZH.set(k, []);
  BY_ZH.get(k).push(n);
}

// ─────────── 一、TM1 这一层的形状 ───────────

/**
 * 第 26 章 1,120 条 = TM1 472 + TM2 648。TM2 在 WHO 中译本里整章无中文名（源头缺，只能标注不能编）。
 * TM1 内部按英文题名后缀分两类：
 *   … disorder (TM1)  → 病类目（对应教材的「病名」）
 *   … pattern (TM1)   → 证类目（对应教材的「证型」）
 * 这个二分不是官方标签，是本仓库按题名后缀算出来的；官方原文只把它们并列在「disorders and patterns」下。
 */
function tm1() {
  const withZh = NAMES.filter((n) => n.zh);
  const isDisorder = (n) => /disorders?\s*\(TM1\)(,\s*unspecified)?$/i.test(n.en || '');
  const isPattern = (n) => /patterns?\s*\(TM1\)(,\s*unspecified)?$/i.test(n.en || '');
  const disorder = withZh.filter(isDisorder);
  const pattern = withZh.filter(isPattern);
  const other = withZh.filter((n) => !isDisorder(n) && !isPattern(n));
  const residual = withZh.filter((n) => IS_RESIDUAL(n.code));
  return {
    rows: NAMES.length,
    withZh: withZh.length,
    tm1: ZN.meta.counts.byModule.TM1,
    tm2: ZN.meta.counts.byModule.TM2,
    disorder: disorder.length,
    pattern: pattern.length,
    other: other.length,
    residual: residual.length,
    residualDisorder: disorder.filter((n) => IS_RESIDUAL(n.code)).length,
    residualPattern: pattern.filter((n) => IS_RESIDUAL(n.code)).length,
    release: ZN.meta.source.release,
    sha256: ZN.meta.source.sha256,
  };
}

// ─────────── 二、教材的 63 个病名落在哪 ───────────

/** 第 4–11 章的节标题 = 教材的病名层（63 个） */
function diseaseNames() {
  const out = [];
  for (const c of BASE.chapters) {
    if (c.no < 4 || c.no > 11) continue;
    for (const s of c.secs) out.push({ ch: c.no, name: s.title.replace(/^\d+\.\d+\s*/, '') });
  }
  return out;
}

/**
 * 四类落点：
 *   exact   逐字同名，且不是残类  → 真对上了
 *   residual 只在残类上出现（其他特指的X / 未特指的X）→ 被收进筐里
 *   absent  完全没有同名条目      → 无落点
 * 「残类」这一类的存在本身就是结论：TM1 给「心悸」「胸痹」「血证」留了 Y/Z 两个筐，
 * 却没有给它们正条，说明这一层的切分与教材的切分不是同一把刀。
 */
function diseaseAlign() {
  const rows = diseaseNames().map((d) => {
    const k = key(d.name);
    const exact = (BY_ZH.get(k) || []).filter((n) => !IS_RESIDUAL(n.code));
    const residual = (BY_ZH.get(k) || []).filter((n) => IS_RESIDUAL(n.code));
    // 残类也可能以「X」为词根（教材「胸痹心痛」，条目「胸痹」）
    let residualByStem = [];
    if (!exact.length && !residual.length) {
      for (const [zh, arr] of BY_ZH) {
        if (!IS_RESIDUAL(arr[0].code)) continue;
        const stem = zh.replace(/^(其他特指的|未特指的)/, '');
        if (stem && stem.length >= 2 && k.includes(stem)) residualByStem.push(...arr);
      }
    }
    const kind = exact.length ? 'exact' : residual.length || residualByStem.length ? 'residual' : 'absent';
    const hit = exact[0] || residual[0] || residualByStem[0] || null;
    return { ...d, kind, code: hit ? hit.code : null, en: hit ? hit.en : null };
  });
  const by = (k) => rows.filter((r) => r.kind === k);
  return {
    rows,
    total: rows.length,
    exact: by('exact'),
    residual: by('residual'),
    absent: by('absent'),
  };
}

// ─────────── 三、教材的证型落在哪 ───────────

/**
 * 证型名取自各论「辨证论治」小节（与第 13 章同一个解析）。
 * 这里要报的不是「有多少证型」，而是「有多少能在 TM1 里逐字找到」——
 * 答案是很少：TM1 的证类目按八纲／病邪／脏腑轴命名（阳证、热证、风淫证、心气虚证…），
 * 教材的证型是「病 + 病位 + 病性」的复合名（风寒束表证、痰热郁肺证），两者轴线不同。
 */
function patternAlign() {
  const rows = [];
  for (const c of BASE.chapters) {
    if (c.no < 4 || c.no > 11) continue;
    for (const s of c.secs) {
      for (const u of s.subs) {
        if (u.title !== '辨证论治') continue;
        for (const it of u.items) {
          for (const p of it.body.split(/\n+/).filter(Boolean)) {
            if (!/治法[：:]/.test(p) || !/代表方[：:]/.test(p)) continue;
            const head = p.split('。')[0].replace(/（[^）]*）/g, '').trim();
            if (head.length < 2 || head.length > 14) continue;
            rows.push({ ch: c.no, disease: s.title.replace(/^\d+\.\d+\s*/, ''), zheng: head });
          }
        }
      }
    }
  }
  const uniq = [...new Set(rows.map((r) => r.zheng))];
  const hit = uniq.filter((z) => BY_ZH.has(key(z)));
  // 证型名的形态：以「证／型」收尾的算规范证名，其余是病名式或阶段式
  const canonical = uniq.filter((z) => /(证|型)$/.test(z));
  const nonCanonical = uniq.filter((z) => !/(证|型)$/.test(z));
  return {
    rows: rows.length,
    unique: uniq.length,
    hit,
    hitCount: hit.length,
    canonical: canonical.length,
    nonCanonical,
    nonCanonicalCount: nonCanonical.length,
  };
}

// ─────────── 四、现有对齐表：7 条合称 ───────────

/**
 * term-alignment.json 是「ICD-11 合称 → 国家证名表」的对齐结论，口径是取主构件。
 * 7 条合称在国家证名表里一条正名都没有；被丢弃的构件分两种状态：
 *   standard    表里有独立证名（可引用）
 *   nonstandard 全表 0 命中（文献无证名，不是没取到）
 * 这张表是本章唯一一处「已经有人做过对齐判断」的现成成果，所以拿它当参照系：
 * 它证明即便在术语层，合称也不能整体映射，只能取主构件。
 */
function alignmentTable() {
  const rows = Object.entries(ALIGN.entries).map(([k, v]) => ({
    label: v.label,
    primary: v.primary,
    standardName: v.standardName,
    code: v.standardCode,
    whole: v.wholeStandardName,
    dropped: v.dropped.map((d) => ({ part: d.part, status: d.status, standardName: d.standardName })),
  }));
  const dropped = rows.flatMap((r) => r.dropped);
  return {
    rows,
    total: rows.length,
    wholeNull: rows.filter((r) => r.whole === null).length,
    dropped: dropped.length,
    droppedStandard: dropped.filter((d) => d.status === 'standard').length,
    droppedNonstandard: dropped.filter((d) => d.status === 'nonstandard').length,
  };
}

// ─────────── 五、两个不可对齐的标本 ───────────

/**
 * 标本一：痹证。教材在同一个病名下先分层（痹证 → 行痹／痛痹／着痹），
 * TM1 里「痹证」只有残类（SC5Y/SC5Z），而「行痹」「痛痹」「着痹」是三个独立的病类目。
 * 也就是说：教材的「病名 → 分型」在 TM1 里被压平成了同层的三个病名。
 *
 * 标本二：消渴。教材写「消渴相当于西医学之糖尿病」，
 * 但 ICD-11 里消渴是 TM1 的 SD71（第 26 章），糖尿病是第 5 章的 5A11（内分泌章）。
 * 两个编码并列而不等价：一个是传统医学病类目，一个是西医疾病实体。
 * 「相当于」在临床语境里成立，在编码层面不成立 —— 这句话不能直接搬进映射表。
 */
function specimens() {
  const bi = diseaseAlign().rows.find((r) => r.name === '痹证');
  const bCodes = ['SC50', 'SC51', 'SC52', 'SC5Y', 'SC5Z'].map((code) => {
    const n = NAMES.find((x) => x.code === code);
    return { code, zh: n ? n.zh : null, en: n ? n.en : null };
  });
  const xk = BY_ZH.get(key('消渴')) || [];
  return {
    bi,
    bCodes,
    xiaoke: xk.map((n) => ({ code: n.code, en: n.en })),
    // 5A11 不在第 26 章条目表里（那是西医章），只能引仓库已核记录，不现编
    note: '糖尿病（5A11）不在第 26 章条目表内，故本函数不返回它的标题；教材原话见第 9 章 9.4.1。',
  };
}

// ─────────── 输出 ───────────

function report() {
  const t = tm1();
  const d = diseaseAlign();
  const p = patternAlign();
  const a = alignmentTable();
  const s = specimens();
  const pad = (x, n) => String(x).padEnd(n, ' ');

  console.log('');
  console.log('═══ 一、第 26 章这一层（TM1）═══');
  console.log(`  版本 ${t.release} · 条目表 ${t.rows} 行 = TM1 ${t.tm1} + TM2 ${t.tm2}`);
  console.log(`  有中文名 ${t.withZh} 条；按题名后缀分：病类目 ${t.disorder} · 证类目 ${t.pattern} · 其他 ${t.other}`);
  console.log(`  残类（码末 Y/Z）${t.residual} 条：病类目里 ${t.residualDisorder} · 证类目里 ${t.residualPattern}`);
  const drift = nfkcDrift();
  console.log(`  NFKC 归一化前后不同的中文名 ${drift.length} 条（不做这一步，它们永远匹配不上）：`);
  for (const x of drift) console.log(`   ${x.code} ${x.raw} → ${x.norm}`);
  console.log(`  源 sha256 ${String(t.sha256).slice(0, 12)}…`);

  console.log('\n═══ 二、教材 63 个病名的落点 ═══');
  console.log(`  逐字同名（非残类）${d.exact.length} · 只在残类上 ${d.residual.length} · 无落点 ${d.absent.length} · 合计 ${d.total}`);
  console.log('  —— 对上的：');
  for (const r of d.exact) console.log(`   第${pad(r.ch, 2)}章 ${pad(r.name, 6)} → ${r.code} ${r.en}`);
  console.log('  —— 只在残类上（被收进筐，不是正条）：');
  for (const r of d.residual) console.log(`   第${pad(r.ch, 2)}章 ${pad(r.name, 6)} → ${r.code} ${r.en}`);
  console.log('  —— 无落点：');
  console.log(`   ${d.absent.map((r) => r.name).join('、')}`);

  console.log('\n═══ 三、教材证型的落点 ═══');
  console.log(`  链条证型 ${p.rows} 条 · 去重 ${p.unique} 个 · 逐字命中 ${p.hitCount} 个`);
  console.log(`  其中以「证／型」收尾的规范证名 ${p.canonical} · 非规范（病名式/阶段式）${p.nonCanonicalCount}`);
  console.log(`  逐字命中的：${p.hit.join('、')}`);
  console.log(`  非规范样例：${p.nonCanonical.slice(0, 10).join('、')}`);

  console.log('\n═══ 四、现有对齐表（7 条合称）═══');
  console.log(`  合称 ${a.total} 条 · 合称本身有正名的 ${a.total - a.wholeNull} 条 · 被丢弃构件 ${a.dropped} 个`);
  console.log(`  丢弃构件里：国家表有独立证名 ${a.droppedStandard} 个 · 全表 0 命中 ${a.droppedNonstandard} 个`);
  for (const r of a.rows) {
    console.log(`   ${pad(r.label.slice(0, 18), 20)} → 主构件「${r.standardName}」｜丢弃 ${r.dropped.map((x) => x.part + (x.status === 'nonstandard' ? '(无证名)' : '')).join('、')}`);
  }

  console.log('\n═══ 五、两个标本 ═══');
  console.log(`  痹证 → ${s.bi.code ? s.bi.code + ' ' + s.bi.en : 'TM1 里没有「痹证」这个条目'}（${s.bi.kind}）`);
  for (const c of s.bCodes) console.log(`   ${c.code} ${c.zh || '—'} / ${c.en || '—'}`);
  console.log(`  消渴 → ${s.xiaoke.map((x) => x.code + ' ' + x.en).join(' · ')}`);
  console.log(`  ${s.note}`);

  console.log('\n═══ 六、能做 / 不能做 ═══');
  console.log('  能做：同命中率（病名 32/63、证型 21/287）· 残类识别 · 层级压缩的标本 · 对齐表的复核');
  console.log('  不能做：声称某条映射「已注册/已确认」· 用 WHO 中文 API 复核（无凭据，401）· 由同名推等价');
  console.log('');
  console.log('  教学边界：本输出为教材病证名与 ICD-11 中译本条目表的同名统计，可复算；不构成编码建议，不构成诊断或注册声明。');
  console.log('');
}

if (require.main === module) report();

module.exports = { BASE, ZN, ALIGN, NAMES, BY_ZH, IS_RESIDUAL, key, nfkcDrift, tm1, diseaseNames, diseaseAlign, patternAlign, alignmentTable, specimens };

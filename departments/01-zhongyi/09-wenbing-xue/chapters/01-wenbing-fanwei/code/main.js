'use strict';
/**
 * 第 1 章 · 温病的范围与伤寒的边界
 *
 *   node code/main.js
 *
 * 数据：standards/wenbing/底本.json（外源·笈成，三书：溫病條辨 / 溫熱論 / 溫疫論）
 * 唯一来源，不引任何二手转述。所有数字均由本文件从 JSON 现算，docs/zh.md 抄的就是这里的结果。
 *
 * 口径（改任何一条都要同步改 docs 与 main.test.js）：
 *   · 条 = articles[] 的条（溫疫論无条号，是段）；节 = sections[] 的篇/节。
 *     三书合计 630 条，不是某一刊本的分条数。
 *   · 「九种温病」不手抄名单，从「上焦篇·一」原文现切（温病者：有A、有B…）。
 *     手抄的名单会不知不觉跟原文分家 —— 切出来的才能跟原文同源。
 *   · 「篇内分布」按上焦篇各节标题的**逐个病名**精确匹配（不做子串匹配），
 *     否则「補秋燥勝氣論」会被「秋燥」误命中，凭空多出一节。
 *   · 寒温边界的两句关键话不写死在注释里，而是从「上焦篇·二」自注里**定位**，
 *     定位不到就抛错。这样原文一改字，本章立刻失败，而不是继续输出旧说法。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const SOURCE = path.join(ROOT, 'standards/wenbing/底本.json');
const BOOK = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));

/** 源页只有繁体标题（pian 字段无简体版），逐字对照，只做这一层转换 */
const SIMP = {
  風温: '风温',
  温熱: '温热',
  濕温: '湿温',
  寒濕: '寒湿',
  温瘧: '温疟',
  補秋燥勝氣論: '补秋燥胜气论',
};
const simp = (s) =>
  String(s)
    .split('、')
    .map((t) => SIMP[t] || t)
    .join('、');

const byId = (id) => BOOK.books.find((b) => b.id === id);
const TB = byId('tiaobian');
const section = (book, juan) => {
  const s = book.sections.find((x) => x.juan === juan);
  if (!s) throw new Error(`底本里没有「${juan}」这一篇`);
  return s;
};
const yuanbing = () => section(TB, '原病篇');
const shangjiao = () => TB.sections.filter((s) => s.juan === '卷一·上焦篇');
/** 上焦篇第一条所在的节（风温/温热/温疫/温毒/冬温） */
const shangjiaoHead = () => shangjiao()[0];
const article = (sec, no) => {
  const a = sec.articles.find((x) => x.no === no);
  if (!a) throw new Error(`「${sec.juan}」没有第 ${no} 条`);
  return a;
};

/** 三书规模：节 / 条（段）/ 方 */
function books() {
  return BOOK.books.map((b) => ({
    id: b.id,
    title: b.titleSimp,
    sections: b.sections.length,
    articles: b.sections.reduce((n, s) => n + s.articles.length, 0),
    formulas: b.sections.reduce((n, s) => n + s.formulas.length, 0),
  }));
}

/** 上焦篇逐节：病名 / 条 / 方 */
function shangjiaoProfile() {
  return shangjiao().map((s) => ({
    pian: simp(s.pian),
    tokens: String(s.pian).split('、').map(simp),
    articles: s.articles.length,
    formulas: s.formulas.length,
    first: s.articles[0] ? s.articles[0].no : '—',
    last: s.articles.length ? s.articles[s.articles.length - 1].no : '—',
  }));
}

/**
 * 九种温病：名单从原文切，分布按节标题精确匹配。
 * 返回 { names, count, covered, headings, extra, sectionCount }
 *   covered  = 九种里在标题上出现过的
 *   extra    = 标题里有、却不在九种名单里的（伏暑 / 寒湿 / 补秋燥胜气论）
 */
function jiuZhong() {
  const head = shangjiaoHead();
  const first = article(head, '一');
  const m = /温病者[：:]([^。]+)。/.exec(first.zhHans);
  if (!m) throw new Error('「上焦篇·一」没有找到「温病者：有…」句式，名单无法从原文切出');
  const names = m[1]
    .split('、')
    .map((x) => x.replace(/^有/, '').trim())
    .filter(Boolean);

  const rows = shangjiaoProfile();
  const hitOf = new Map(names.map((n) => [n, []]));
  const extra = [];
  for (const r of rows) {
    const own = r.tokens.filter((t) => names.includes(t));
    for (const t of own) hitOf.get(t).push(r.pian);
    for (const t of r.tokens) if (!names.includes(t)) extra.push(t);
  }
  return {
    names,
    count: names.length,
    covered: [...hitOf.values()].filter((v) => v.length).length,
    headings: names.map((n) => ({ name: n, in: hitOf.get(n) })),
    extra,
    sectionCount: rows.length,
  };
}

/**
 * 寒温边界：四个维度，两侧原文都从「上焦篇·二」自注里定位。
 * 不用 `includes` 静默通过 —— 定位失败要炸，否则会安静地输出旧说法。
 */
function boundary() {
  const note = article(shangjiaoHead(), '二').notes.join('\n');
  const pick = (re, what) => {
    const m = re.exec(note);
    if (!m) throw new Error(`「上焦篇·二」自注里定位不到${what}，原文可能已改`);
    return m[0];
  };
  const coldIn = pick(/伤寒由毛窍而入，自下而上。始足太阳。/, '寒邪入口与传变方向');
  const warmIn = pick(/温病由口鼻而入，自上而下，鼻通于肺，始手太隂。/, '温邪入口与传变方向');
  const coldRule = pick(/治法必以仲景六经次传为祖法。/, '寒邪治法');
  const warmRule = pick(/必从河间三焦定论。/, '温邪治法');

  return {
    citations: { coldIn, warmIn, coldRule, warmRule },
    rows: [
      { dim: '入口', cold: '毛窍', warm: '口鼻' },
      { dim: '方向', cold: '自下而上', warm: '自上而下' },
      { dim: '首犯', cold: '足太阳（膀胱，寒水之腑）', warm: '手太阴（肺，鼻通于肺）' },
      { dim: '治法', cold: '仲景六经次传为祖法', warm: '河间三焦定论' },
    ],
  };
}

/**
 * 原病篇 19 条的引文来源：《内经》篇名统计。
 * 承上条（无《篇名》）归它前面最近的一个篇名 —— 刺热篇统辖第十至十五条。
 */
function sourceTrace() {
  const arts = yuanbing().articles;
  const rows = [];
  let last = null;
  for (const a of arts) {
    const m = /《([^》]+)》/.exec(a.zhHans);
    const named = m ? m[1] : null;
    if (named) last = named;
    rows.push({ no: a.no, named, governed: named ? named : last, chars: a.zhHans.length });
  }
  const namedRows = rows.filter((r) => r.named);
  const freq = {};
  for (const r of namedRows) freq[r.governed] = (freq[r.governed] || 0) + 1;
  return {
    total: rows.length,
    explicit: namedRows.length,
    continuation: rows.length - namedRows.length,
    distinct: Object.keys(freq).length,
    // 被引用两次以上的篇名（热论篇：条四讲温暑分界、条十六讲食复）
    repeated: Object.entries(freq).filter(([, n]) => n > 1).map(([k, n]) => `${k}×${n}`),
    rows,
    named: namedRows.map((r) => r.named),
  };
}

/** 上焦篇首四条：条文 + 该条名下的方（方以 formulas[].tiao 归属，不按字数猜） */
function shouTiao() {
  const sec = shangjiaoHead();
  return ['一', '二', '三', '四'].map((no) => {
    const a = article(sec, no);
    return {
      no,
      text: a.zhHans,
      notes: a.notes.length,
      formulas: sec.formulas.filter((f) => f.tiao === no).map((f) => f.nameSimp),
    };
  });
}

/**
 * 「以伤寒法治温病」的批评对象在自注里出现几次。
 * 只数條辨全书自注，不数正文 —— 正文里吴鞠通不点人名。
 */
function critics() {
  const notes = TB.sections.flatMap((s) => s.articles.flatMap((a) => a.notes || []));
  const text = notes.join('\n');
  const count = (w) => (text.match(new RegExp(w, 'g')) || []).length;
  return { 叔和: count('叔和'), 又可: count('又可'), 嘉言: count('嘉言'), 喻氏: count('喻氏'), 景岳: count('景岳') };
}

/**
 * 条号在篇内唯一吗？凡例 14 条全标「一」；补秋燥胜气论 22 条只有 8 个号码。
 * 这正是引用必须带篇名的原因 —— 只写「第N条」在條辨里指不到唯一一条。
 */
function noCollision() {
  return TB.sections
    .map((s) => {
      const nos = s.articles.map((a) => a.no);
      return { juan: s.juan, pian: s.pian ? simp(s.pian) : '', n: nos.length, distinct: new Set(nos).size };
    })
    .filter((r) => r.distinct < r.n);
}

function totals() {
  const bs = books();
  return {
    books: bs.length,
    sections: bs.reduce((n, b) => n + b.sections, 0),
    articles: bs.reduce((n, b) => n + b.articles, 0),
    formulas: bs.reduce((n, b) => n + b.formulas, 0),
    yuanbingTiao: yuanbing().articles.length,
    shangjiaoTiao: shangjiao().reduce((n, s) => n + s.articles.length, 0),
    shangjiaoFang: shangjiao().reduce((n, s) => n + s.formulas.length, 0),
  };
}

if (require.main === module) {
  const t = totals();
  console.log('');
  console.log('═══ 温病学 · 第 1 章数据（外源·笈成 三书）═══');
  console.log(`  三书 ${t.books} · 节 ${t.sections} · 条（段）${t.articles} · 方 ${t.formulas}`);
  for (const b of books()) console.log(`   ${b.title}：节 ${b.sections} · 条 ${b.articles} · 方 ${b.formulas}`);
  console.log(`   本篇：原病篇 ${t.yuanbingTiao} 条 · 上焦篇 ${t.shangjiaoTiao} 条 / ${t.shangjiaoFang} 方`);

  const j = jiuZhong();
  console.log(`\n── 九种温病（上焦篇·一，原文切出 ${j.count} 种）──`);
  console.log(`  ${j.names.join('、')}`);
  console.log(`  上焦篇共 ${j.sectionCount} 节，标题覆盖其中 ${j.covered} 种：`);
  for (const h of j.headings) console.log(`   ${h.name} → ${h.in.join('、') || '（无专节，并入首节）'}`);
  console.log(`  标题里有、名单里没有：${j.extra.join('、')}`);

  console.log('\n── 上焦篇逐节 ──');
  for (const r of shangjiaoProfile()) {
    console.log(`  ${r.pian} | 条 ${r.first}–${r.last}（${r.articles}）| 方 ${r.formulas}`);
  }

  const b = boundary();
  console.log('\n── 寒温边界（上焦篇·二 自注）──');
  console.log(`  寒：${b.citations.coldIn}${b.citations.coldRule}`);
  console.log(`  温：${b.citations.warmIn}${b.citations.warmRule}`);
  for (const r of b.rows) console.log(`  ${r.dim} | 伤寒 ${r.cold} | 温病 ${r.warm}`);

  const s = sourceTrace();
  console.log('\n── 原病篇 19 条的《内经》来源 ──');
  console.log(`  条 ${s.total} · 明标篇名 ${s.explicit} 条 · 承上条 ${s.continuation} 条 · 不同篇名 ${s.distinct} 个`);
  console.log(`  重出：${s.repeated.join('、') || '无'}`);

  console.log('\n── 上焦篇首四条 ──');
  for (const a of shouTiao()) {
    console.log(`  第${a.no}条（自注 ${a.notes} 段）${a.text.slice(0, 34)}…`);
    if (a.formulas.length) console.log(`      方：${a.formulas.join(' / ')}`);
  }

  const c = critics();
  console.log('\n── 「以伤寒法治温病」的批评对象（條辨自注出现次数）──');
  console.log(`  叔和 ${c['叔和']} · 又可 ${c['又可']} · 嘉言 ${c['嘉言']} · 喻氏 ${c['喻氏']} · 景岳 ${c['景岳']}`);

  const dup = noCollision();
  console.log('\n── 条号不唯一的节（引用必须带篇名）──');
  for (const r of dup) console.log(`  ${r.juan}${r.pian ? '·' + r.pian : ''}：${r.n} 条只有 ${r.distinct} 个号码`);
  console.log('');
  console.log('  教学边界：本输出为《温病条辨》文本结构与条文归属统计，逐条可回查底本.json，不构成诊疗依据。');
}

module.exports = {
  BOOK,
  SIMP,
  books,
  totals,
  shangjiaoProfile,
  jiuZhong,
  boundary,
  sourceTrace,
  shouTiao,
  critics,
  noCollision,
  yuanbing,
  shangjiao,
  shangjiaoHead,
  article,
};

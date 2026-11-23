#!/usr/bin/env node
/**
 * scripts/lib_jingui_diben.js —— 金匮底本方表库（从第 10 章 code/main.js 抽出）
 *
 * 为什么抽出来：第 10 章的 main.js 已改为「只读 docs/zh.md 现算」的正文自测脚本，
 * 不再导出 formulas()；而 scripts/build_jingui_fangzu.js 需要的是底本层（方 + 药味 + 剂量）。
 * 让下游脚本依赖底本库、而不是依赖某一章的正文脚本，才不会因为正文改写而断链。
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/jingui/底本.json'), 'utf8'));

/** 篇 N → 大类。跨篇比较只用「内伤」「妇人」两类（第 1 章已定，本章不另立分类）。 */
const CLASS_OF = {
  1: '总论', 11: '总论',
  2: '外感', 4: '外感', 5: '外感',
  3: '少见病',
  6: '内伤', 7: '内伤', 8: '内伤', 9: '内伤', 10: '内伤',
  12: '内伤', 13: '内伤', 14: '内伤', 15: '内伤', 16: '内伤',
  17: '内伤', 18: '内伤', 19: '内伤',
  20: '妇人', 21: '妇人', 22: '妇人',
};

// ─────────────────────────── 药名清洗 ───────────────────────────
/**
 * 为什么必须清洗：底本的「药名」列不是纯药名。
 * v2 底本已在解析层把 ⟨…⟩ 双行夹注（校勘异文、一法几两）与剂量拆出单元格，
 * 所以 v1 那批「茯苓⟨三两⟩⟨一法四两。⟩」「半夏大者洗⟨八枚⟩⟨一法半升⟩」不再出现
 * （实测带 ⟨⟩ 的行 0）；但同一味药仍留下 13 种带炮制/规格尾巴的写法，
 * 165 个不同「药名」因此收敛到 154 味：
 *   甘草如指大、半夏大者洗、枳实大者、甘遂大者、大附子 / 用大附子、
 *   白术各等分、茵陈蒿末、水蛭百枚、生姜汁、生地黄汁.、鸡子黄.、滑石.
 * 不清洗直接 count，会把「甘草」和「甘草如指大」算成两味药，
 * 高频药的排名随之失真（附子 16 → 18、枳实 12 → 13）—— 这就是本章第一个可复现的发现。
 *
 * 规则按顺序执行（顺序不能换，换了会切错）：
 *   A 去 ⟨…⟩ 夹注。v1 留档把双行夹注并进了单元格，它们是「关于这味药的注」，
 *     不是药名的一部分；v2 已在数据层拆开，这道规则实测不再触发，保留作旧留档兼容。
 *     允许嵌套，故循环剥。
 *   B 去尾部句读（. 。 、 ， ： ； —— 底本个别单元格带句号）。
 *   C 去尾部剂量串（数字/汉字数目 + 量词）。剂量要单独成列；
 *     剂量列本身在 doseSimp 里，洗药名时把它从名字尾巴上剥掉。
 *     例外：剥完会变空串时保留原样 —— 「百合」= 百 + 合（合是容量单位），
 *     不设这道闸，百合会被量词规则吃成空串。
 *   D 循环去尾部炮制法/修治词（炮、炙、洗、去皮、去节、去皮尖、去心、切、碎、擘、熬、
 *     烧、末、汁、大者、如指大、各、各等分、等分）。循环是因为会出现「各等分」「去皮尖」叠加。
 *     只剥尾部不剥头部：「干姜」「生姜」「干地黄」「大生地」这类首字是药名的一部分，
 *     剥了就把两味药并成一味。
 *   E 去头部「用」（「用大附子」=「附子」；底本用它承接上方的炮制法）。
 *   F 少量显式别名（见 ALIAS）：只收「大小/生干」这类规格词造成的重复写法。
 *     不做薯蓣→山药、黄耆→黄芪这种异名归并（见口径 3）。
 *
 * 清洗结果分三类：
 *   ok        —— 得到药名，进频次/药对/规模统计（v2 实测 728 行全部落这一类）
 *   note      —— 校勘残行（整格只有 ⟨…⟩ 注，或「一法」残字），不是药味，直接丢弃，不罚该方
 *                （v2 实测 0 行）
 *   misplaced —— 底本单元格错位（方名当成药名、煎法整句当成药名、整行药文挤在一格）。
 *                这类行会让该方的「药味数」失真，所以该方退出规模分布与君臣分析，
 *                但它的其余正常药味照常计入频次（频次是「出现次数」，不依赖方内完整性）。
 *                v1 有 3 方落这一类（橘皮竹茹汤、越婢加术汤、百合洗方），v2 拆列后
 *                判定规则实测命中 0 方；但 百合洗方 的煎法句被拆成 7 个短格（每格 ≤5 字、
 *                无句读），逃过下面那条长度/句读判定，仍被当成 7 味药 —— 这是数据侧的
 *                残留缺陷，已在 docs「代价与边界」点名，本章不替底本改数据。
 */
const PROC_TAIL = [
  '去皮尖', '去皮', '去节', '去心', '去核', '去毛', '去芦', '去翅足', '去咸', '去腥',
  '炮', '炙', '洗', '炒', '熬', '烧', '切', '碎', '擘', '末',
  '各等分', '等分', '各', '大者', '如指大', '汁',
];
const NUM = '一二三四五六七八九十百千半零';
const UNIT = '两|斤|分|铢|升|合|斗|枚|个|尺|寸|把|片|钱|字|具';
const DOSE_TAIL = new RegExp(`[${NUM}\\d]+(?:${UNIT})$`);
/** 规格词造成的重复写法；键是清洗到这一步的残串，值是正名 */
const ALIAS = { 大附子: '附子' };
/** 不是药味的残行（校勘字、章节小标题碎片） */
const RESIDUE = new Set(['', '一法', '等分', '各']);

function cleanHerb(raw) {
  if (typeof raw !== 'string') return { name: '', kind: 'note' };
  const original = raw;
  // A 夹注
  let s = raw.replace(/⟨[^⟨⟩]*⟩/g, '');
  while (/⟨[^⟨⟩]*⟩/.test(s)) s = s.replace(/⟨[^⟨⟩]*⟩/g, '');
  // 整格就是一条夹注 → 校勘残行
  if (!s.trim()) return { name: '', kind: 'note' };
  // B 尾部句读
  s = s.replace(/[\s.。、，,：:；;]+$/, '').trim();
  // C 尾部剂量（剥空则回退，见「百合」）
  const afterDose = s.replace(DOSE_TAIL, '');
  if (afterDose) s = afterDose;
  // D 炮制/修治尾巴，循环
  let changed = true;
  while (changed) {
    changed = false;
    for (const t of PROC_TAIL) {
      if (s.endsWith(t) && s.length > t.length) {
        s = s.slice(0, -t.length);
        changed = true;
      }
    }
  }
  // E 头部「用」
  s = s.replace(/^用/, '');
  // 再剥一次尾部剂量（「水蛭百枚」去『百枚』已在 C 完成；这一道接 D 之后新露出的尾巴）
  const again = s.replace(DOSE_TAIL, '');
  if (again) s = again;
  s = s.replace(/^[\s.。、，,：:；;]+|[\s.。、，,：:；;]+$/g, '');

  if (RESIDUE.has(s)) return { name: '', kind: 'note', raw: original };
  // 错位判定：药名格出现句读、或整格是方名/煎法
  const bad = /[，。、；]/.test(s) || /汤方$/.test(s) || s.length > 8;
  if (bad) return { name: s, kind: 'misplaced', raw: original };
  if (ALIAS[s]) return { name: ALIAS[s], kind: 'ok', raw: original };
  return { name: s, kind: 'ok', raw: original };
}

// ─────────────────────────── 剂量解析 ───────────────────────────
/**
 * 君药代理要比较剂量，而原书剂量有三大族：重量（两/斤/分/铢）、容量（升/合/斗）、
 * 计数（枚/个）。族内可折算，族间**不可折算**（一升水与一升半夏不是一回事）。
 * 所以这里只做族内归一，并把「跨族」如实标成不可判 —— 不发明换算率。
 */
const NUM_VALUE = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 半: 0.5 };
function cnNumber(t) {
  if (t === '半') return 0.5;
  if (/^\d+$/.test(t)) return Number(t);
  if (t in NUM_VALUE) return NUM_VALUE[t];
  if (t.includes('十')) {
    const [a, b] = t.split('十');
    return (a ? NUM_VALUE[a] || 1 : 1) * 10 + (b ? NUM_VALUE[b] || 0 : 0);
  }
  return null;
}
const DOSE_RE = new RegExp(`([${NUM}\\d]+)(${UNIT})`);
const FAMILY = { 两: 'w', 斤: 'w', 分: 'w', 铢: 'w', 升: 'v', 合: 'v', 斗: 'v', 枚: 'c', 个: 'c' };
/** → { fam, val } | { fam: 'equal' } | null */
function parseDose(dose) {
  if (!dose) return null;
  if (dose.includes('等分')) return { fam: 'equal' };
  const m = DOSE_RE.exec(dose);
  if (!m) return null;
  const v = cnNumber(m[1]);
  if (v == null) return null;
  const u = m[2];
  // 族内归一：重量折「两」（1 斤 = 16 两，1 两 = 24 铢 = 4 分）
  if (u === '斤') return { fam: 'w', val: v * 16 };
  if (u === '铢') return { fam: 'w', val: v / 24 };
  if (u === '分') return { fam: 'w', val: v / 4 };
  // 容量折「合」（1 斗 = 10 升 = 100 合）
  if (u === '斗') return { fam: 'v', val: v * 100 };
  if (u === '升') return { fam: 'v', val: v * 10 };
  if (u === '枚' || u === '个') return { fam: 'c', val: v };
  return { fam: FAMILY[u] || 'x', val: v };
}

// ─────────────────────────── 总体与方表 ───────────────────────────
/** 全部方（含 9 个互见方），带清洗后的药味 */
function formulas() {
  const out = [];
  for (const p of BOOK.pian) {
    for (const a of p.articles) {
      for (const f of a.formulas || []) {
        const ing = (f.ingredients || []).map((i) => {
          const c = cleanHerb(i.herbSimp || i.herb);
          return { raw: i.herbSimp || i.herb, name: c.name, kind: c.kind, dose: i.doseSimp || '', parsed: parseDose(i.doseSimp) };
        });
        out.push({
          pianNo: p.no,
          pianName: p.nameSimp,
          tiao: a.tiao,
          name: (f.nameSimp || f.name).replace(/方$/, ''),
          refOnly: !!f.refOnly,
          cls: CLASS_OF[p.no] || '附',
          method: f.methodSimp || '',
          ingredients: ing,
        });
      }
    }
  }
  return out;
}

module.exports = { formulas, cleanHerb, parseDose, cnNumber, BOOK };

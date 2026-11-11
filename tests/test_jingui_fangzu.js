// tests/test_jingui_fangzu.js —— 方族比较表：一族一归属、统计自洽、门槛不注水、图与表同源
//
// 方族是本项目自己划的分类（古籍没有方族表），所以四道门都是「防我自己写嗨」：
//   1) 归属完整：168 个唯一方名各归一次，不重不漏，也不许出现底本里没有的方名；
//   2) 统计自洽：族内药味合计 = 第 10 章 728 行「可用」药味；每族 ≥2 方，不许把单方凑成族；
//   3) 门槛不注水：标志药必须真满足「族内≥50%、族外<10%」；共见药必须真在全族每一方里；
//   4) 图表同源：md 表行数 = 族数、svg 的成员圆点数 = 168，且都注明「本项目分类」。
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const STD = path.join(ROOT, "standards", "jingui");
const read = (p) => fs.readFileSync(p, "utf8");
const NL = String.fromCharCode(10);

const data = JSON.parse(read(path.join(STD, "fangzu.json")));
const ben = JSON.parse(read(path.join(STD, "底本.json")));
const md = read(path.join(STD, "fangzu.md"));
const svg = read(path.join(STD, "fangzu.svg"));

const allNames = new Set();
for (const p of ben.pian) for (const a of p.articles || []) for (const f of a.formulas || []) {
  allNames.add(f.nameSimp.replace(/方$/, ""));
}

test("归属完整：168 个唯一方名各归一次，不重不漏", () => {
  assert.equal(allNames.size, 168, `底本唯一方名数变了（${allNames.size}）`);
  const seen = new Map();
  const dup = [];
  for (const f of data.families) for (const m of f.members) {
    if (seen.has(m.name)) dup.push(`${m.name}（${seen.get(m.name)} / ${f.family}）`);
    seen.set(m.name, f.family);
  }
  assert.deepEqual(dup, [], `重复归属：${dup.join("、")}`);
  const miss = [...allNames].filter((n) => !seen.has(n));
  const extra = [...seen.keys()].filter((n) => !allNames.has(n));
  assert.deepEqual(miss, [], `未归属：${miss.join("、")}`);
  assert.deepEqual(extra, [], `底本没有的方名：${extra.join("、")}`);
  assert.equal(seen.size, 168, `归属总数应为 168，实为 ${seen.size}`);
});

test("统计自洽：每族 ≥2 方，族内药味合计 = 728 行可用药味", () => {
  let herbs = 0;
  let withText = 0;
  for (const f of data.families) {
    assert.ok(f.count >= 2, `${f.family} 只有 ${f.count} 方，单方不许成族`);
    assert.equal(f.members.length, f.count, `${f.family} count 与成员数不符`);
    for (const m of f.members) {
      herbs += m.size;
      if (!m.refOnly) withText += 1;
      assert.ok(m.size >= 0 && m.size <= 25, `${m.name} 药味数异常（${m.size}）`);
      assert.equal(new Set(m.herbs).size, m.herbs.length, `${m.name} 药味有重复`);
    }
  }
  assert.equal(data.counts.formulas, 168);
  // 728 是「165 个有方文方实例」的药味行数；方族按唯一方名去重，同名方（大承气汤、桂枝汤、四逆汤、
  // 当归生姜羊肉汤、当归芍药散、小建中汤）重复计入的那几行不重复算，故为 723 = 728 − 5。
  assert.equal(herbs, 723, `族内药味合计应为 723（= 728 行 − 5 行同名重复），实为 ${herbs}`);
  assert.equal(withText, 164, `有方文的唯一方名应为 164，实为 ${withText}`);
});

test("门槛不注水：标志药与共见药按定义复核", () => {
  // 全库各族「某药的方数」
  const famCount = new Map();
  for (const f of data.families) {
    const n = f.members.filter((m) => m.herbs.length).length;
    famCount.set(f.family, n);
  }
  const herbIn = new Map(); // herb → Map(family → 方数)
  for (const f of data.families) for (const m of f.members) for (const h of m.herbs) {
    if (!herbIn.has(h)) herbIn.set(h, new Map());
    const mm = herbIn.get(h);
    mm.set(f.family, (mm.get(f.family) || 0) + 1);
  }
  const totalWithText = [...famCount.values()].reduce((a, b) => a + b, 0);
  for (const f of data.families) {
    const n = famCount.get(f.family);
    // 共见药：只有 sharedKind === "all" 才是真共见（交集为空时退成族内前三，不算共见药）
    if (f.sharedKind === "all" && f.members.every((m) => m.herbs.length)) {
      for (const h of f.shared) {
        const all = f.members.every((m) => m.herbs.includes(h));
        assert.ok(all, `${f.family} 的共见药「${h}」并非全族都有`);
      }
    }
    // 标志药：族内 ≥50%，族外 <10%
    for (const mk of f.markers) {
      const inFam = herbIn.get(mk.herb).get(f.family) || 0;
      assert.ok(inFam / n >= 0.5, `${f.family} 标志药「${mk.herb}」族内率 ${(inFam / n * 100).toFixed(1)}% < 50%`);
      const total = [...herbIn.get(mk.herb).values()].reduce((a, b) => a + b, 0);
      const outRate = (total - inFam) / Math.max(1, totalWithText - n);
      assert.ok(outRate < 0.1, `${f.family} 标志药「${mk.herb}」族外率 ${(outRate * 100).toFixed(1)}% ≥ 10%`);
    }
    // 族内前三：必须是该族出现最多的三味（不含排他性，只核频次序）
    if (f.topIn.length) {
      const rate = (h) => (herbIn.get(h).get(f.family) || 0) / n;
      const rates = f.topIn.map((t) => rate(t.herb));
      assert.deepEqual(rates.slice(), [...rates].sort((a, b) => b - a), `${f.family} 族内前三未按频次排序`);
    }
  }
});

test("图表同源：md 行数 = 族数，svg 圆点 = 168，且均注明「本项目分类」", () => {
  const rows = md.split("\n").filter((l) => /^\| \*\*.+\*\* \| /.test(l));
  assert.equal(rows.length, data.families.length, `md 表行数 ${rows.length} ≠ 族数 ${data.families.length}`);
  assert.ok(md.includes("本项目的分类，不是古人的分类"), "md 未声明「本项目分类」");
  assert.ok(md.includes("一族一归属"), "md 未声明一族一归属");
  const circles = (svg.match(/<circle /g) || []).length;
  assert.equal(circles, 168, `svg 圆点 ${circles} ≠ 168 方`);
  assert.ok(svg.includes("本项目自撰分类"), "svg 未声明分类来源");
  assert.ok(svg.includes("空心点＝互见方"), "svg 缺图例");
  for (const f of data.families) {
    assert.ok(svg.includes(f.family), `svg 缺族名「${f.family}」`);
  }
});

test("类方鉴别：30 对全部有文、点到真差异药、不写第三方没有的药", () => {
  // 药名表：用方族数据里的**清洗后药名**（第 10 章口径），不加两字前缀——
  // 加了前缀「生地」「鸡子」就会把「生地黄」「鸡子黄」的命中误报成别味药（踩过）
  const VOCAB = new Set();
  for (const f of data.families) for (const m of f.members) for (const h of m.herbs) VOCAB.add(h);
  const pairs = data.families.flatMap((f) => f.pairs.map((p) => ({ ...p, family: f.family })));
  assert.equal(pairs.length, data.counts.pairs, "pairs 计数与明细不符");
  assert.equal(pairs.length, 30, `相邻成对应为 30，实为 ${pairs.length}`);
  assert.equal(data.counts.pairsAuthored, pairs.length, `未撰的鉴别：${pairs.filter((p) => !p.text).map((p) => p.a + "→" + p.b).join("、")}`);

  const bad = [];
  for (const p of pairs) {
    const own = new Set([...p.add, ...p.del, ...p.doseDiff.map((d) => d.herb)]);
    // 1) 必须点到真差异药
    if (![...own].some((h) => p.text.includes(h) || (h.length > 2 && p.text.includes(h.slice(0, 2))))) {
      bad.push(`${p.a}→${p.b}：未点到差异药（${[...own].join("/")}）`);
    }
    // 2) 不许提到这对两方都没有的药
    const inA = new Set(); const inB = new Set();
    for (const fam of data.families) for (const m of fam.members) {
      if (m.name === p.a) m.herbs.forEach((h) => inA.add(h));
      if (m.name === p.b) m.herbs.forEach((h) => inB.add(h));
    }
    // 长词优先并把命中处抹掉：「栝蒌根」命中后，「栝蒌」这个两字前缀就不会再误报
    let rest = p.text;
    for (const h of [...VOCAB].sort((x, y) => y.length - x.length)) {
      if (!rest.includes(h)) continue;
      if (!inA.has(h) && !inB.has(h)) bad.push(`${p.a}→${p.b}：提到两方都没有的「${h}」`);
      rest = rest.split(h).join("　");
    }
    // 3) 类型判定要与差异一致
    const diff = p.add.length + p.del.length;
    const want = diff ? (p.add.length && p.del.length ? "易味" : "加减味") : "同药异量";
    if (p.kind !== want) bad.push(`${p.a}→${p.b}：类型 ${p.kind} 应为 ${want}`);
    if (!diff && !p.doseDiff.length) bad.push(`${p.a}→${p.b}：药味与剂量都无差异，不构成鉴别`);
  }
  assert.deepEqual(bad.slice(0, 10), [], `共 ${bad.length} 处类方鉴别问题`);
});

test("类方鉴别已进 md：表行数 = 对数，且注明差异由底本现算", () => {
  const sec = md.split("## 类方鉴别")[1] || "";
  assert.ok(sec, "md 缺「类方鉴别」小节");
  const rows = sec.split(NL).filter((l) => /^\| .+ \| (加减味|易味|同药异量) \|/.test(l));
  assert.equal(rows.length, 30, `md 鉴别表行数 ${rows.length} ≠ 30`);
  assert.ok(md.includes("差异由底本现算，文字是**本项目自撰**"), "md 未声明自撰与现算");
  assert.ok(!md.includes("**（未撰）**"), "md 里有未撰的鉴别");
});

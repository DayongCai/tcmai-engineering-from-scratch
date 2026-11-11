// tests/test_jingui_fangjie.js —— 【方解】层：一方的解只能用一方的药
//
// 这一层没有外源可对（方义是本项目自撰），最怕「按印象写」：把别方的药写进这一方。
// 但粗暴的字符串比对会误伤三类情况，所以规则要写清楚：
//   · 方解里提到**别的方名**（「即桂枝汤加栝蒌根」）不是药名越界 → 扫药前先抹掉方名；
//   · 底本简称（五味 / 牡丹 / 术）与方解写法（五味子 / 牡丹皮 / 白术）是同一味 → 归一；
//   · 底本标 refOnly 的方（越婢加术汤、杏子汤、膏发煎等只存方名、无组成），无从比对 → 跳过药名核对，
//     只核「有方解、有声明」。
// 有三处**底本解析缺陷**是这道门逼出来的（百合洗、大建中汤、十枣汤），已在解析层修完（见下）。
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const BOOK = path.join(ROOT, "textbooks", "01-zhongyi", "08-jingui-yaolue");
const read = (p) => fs.readFileSync(p, "utf8");

const ben = JSON.parse(read(path.join(ROOT, "standards", "jingui", "底本.json")));
const formulas = [];
for (const p of ben.pian) for (const a of p.articles || []) for (const f of a.formulas || []) {
  formulas.push({
    tiao: a.tiao,
    name: f.nameSimp.replace(/方$/, ""),
    // 药味行 + 服法用药（胶饴烊化、大枣先煮、蜜煎）——底本 2026-11-11 起单列 methodHerbs
    herbs: (f.ingredients || []).map((x) => x.herbSimp).concat((f.methodHerbs || []).map((x) => x.herbSimp)),
    refOnly: !!f.refOnly,
  });
}

// 2026-11-11 起：三处缺陷已在底本解析层修好，白名单已撤
//   ① 百合洗方：洗方无药味行，2 段即用法 —— 规则改为「段落以『右』起头则视为服法」，并从中提单味药
//   ② 大建中汤「內膠飴一升」、③ 十枣汤「先煮肥大棗十枚」：服法用药不入药味行，新增 methodHerbs 单列
// 因此这里不再需要 KNOWN_LACK / BAD_INGREDIENTS 之类的豁免。

// 方解：与生成器同一份（两份源码）
const FJ = (() => {
  const out = {};
  for (const f of ["jingui_fangjie.py", "jingui_fangjie2.py"]) {
    const src = read(path.join(ROOT, "scripts", f));
    const re = /^\s{4}"([^"]+)":\s*\(\s*\n?\s*"([^"]*)",\s*\n?\s*"([^"]*)"/gm;
    let m;
    while ((m = re.exec(src))) out[m[1]] = [m[2], m[3]];
  }
  return out;
})();

const ALIAS = { 五味: "五味子", 牡丹: "牡丹皮", 术: "白术", 柏皮: "黄柏", 耆: "黄耆" };
const norm = (h) => ALIAS[h] || h;

const SUFFIX = /(大者洗|如指大|各等分|弹丸大|百枚|去皮心|熬外研如脂|细叶|东南根白皮|去皮|去节|炙|切|洗|汁|末|者)/g;
const cleanHerb = (h) => h.replace(/[（(].*?[）)]/g, "").replace(SUFFIX, "").replace(/[^\u4e00-\u9fff]/g, "");

const VOCAB = new Set();
for (const f of formulas) {
  for (const h of f.herbs) {
    const c = cleanHerb(h);
    if (c.length >= 2) {
      VOCAB.add(norm(c));
      if (c.length > 2) VOCAB.add(norm(c.slice(0, 2)));
    }
  }
}
const VOCAB_SORTED = [...VOCAB].sort((a, b) => b.length - a.length);

// 方名（含全称），用于在扫药前抹掉
const NAMES = [...new Set(formulas.map((f) => f.name))].sort((a, b) => b.length - a.length);
// 方名之外，病名里也含药名（「百合病」不是用百合），一并抹掉
const NOT_HERB = ["百合病", "狐惑病", "脏躁", "霍乱", "疟母"];
function stripNames(text) {
  let t = text;
  for (const n of NAMES) t = t.split(n).join("　");
  for (const w of NOT_HERB) t = t.split(w).join("　");
  return t;
}

function herbsIn(text) {
  const found = new Set();
  let rest = stripNames(text);
  for (const w of VOCAB_SORTED) {
    if (rest.includes(w)) {
      found.add(norm(w));
      rest = rest.split(w).join("　");
    }
  }
  return found;
}

function ownHerbs(name) {
  const s = new Set();
  for (const f of formulas.filter((x) => x.name === name)) {
    for (const h of f.herbs) {
      s.add(norm(h));
      const c = cleanHerb(h);
      if (c) {
        s.add(norm(c));
        if (c.length > 2) s.add(norm(c.slice(0, 2)));  // 「蛇床子仁」→ 蛇床，方解常写简称
      }
    }
  }
  return s;
}

test("覆盖：168 个唯一方名都有方解，且没有多余条目", () => {
  const names = new Set(formulas.map((f) => f.name));
  assert.equal(formulas.length, 174, `底本方数变了（${formulas.length}）`);
  assert.equal(names.size, 168, `唯一方名数变了（${names.size}）`);
  const missing = [...names].filter((n) => !FJ[n]);
  const extra = Object.keys(FJ).filter((n) => !names.has(n));
  assert.deepEqual(missing, [], `缺方解：${missing.join("、")}`);
  assert.deepEqual(extra, [], `方解里有底本不存在的方名：${extra.join("、")}`);
});

test("药名越界：方解不得写本方的药以外的药（refOnly 者跳过）", () => {
  const skip = new Set(formulas.filter((f) => f.refOnly || !f.herbs.length).map((f) => f.name));
  const bad = [];
  for (const [name, [gong, fangyi]] of Object.entries(FJ)) {
    if (skip.has(name)) continue;
    const mine = ownHerbs(name);
    for (const h of herbsIn(gong + fangyi)) {
      if (!mine.has(h)) bad.push(`${name} → ${h}`);
    }
  }
  assert.deepEqual(bad.slice(0, 20), [], `共 ${bad.length} 处药名越界`);
});

test("具体性：每首方解至少提到一味本方之药", () => {
  const skip = new Set(formulas.filter((f) => f.refOnly || !f.herbs.length).map((f) => f.name));
  const vague = [];
  for (const [name, [gong, fangyi]] of Object.entries(FJ)) {
    if (skip.has(name)) continue;
    const mine = ownHerbs(name);
    const hit = herbsIn(gong + fangyi);
    const ok = [...hit].some((h) => mine.has(h));
    if (!ok) vague.push(name);
  }
  assert.deepEqual(vague, [], `方解未落到本方药味：${vague.join("、")}`);
});

test("落文：教材里的【方解·X】带自撰声明，X 是底本方名且覆盖 174 方", () => {
  const names = new Set(formulas.map((f) => f.name));
  let n = 0;
  const bad = [];
  for (const f of fs.readdirSync(BOOK).filter((x) => x.endsWith(".md") && /^\d\d-/.test(x))) {
    const ls = read(path.join(BOOK, f)).split("\n");
    for (let i = 0; i < ls.length; i++) {
      if (!ls[i].startsWith("**【方解·")) continue;
      n += 1;
      const name = ls[i].slice(6, ls[i].indexOf("】**"));  // "**【方解·" = 6 字符
      if (!names.has(name)) bad.push(`${f}:${i + 1} 方名「${name}」不在底本`);
      let j = i + 1;
      while (j < ls.length && ls[j].trim() === "") j++;
      const nx = ls[j] || "";
      if (!nx.startsWith("<sub>本项目自撰方解")) bad.push(`${f}:${i + 1} 缺自撰声明`);
      if (/外源/.test(nx)) bad.push(`${f}:${i + 1} 自撰方解被标成外源`);
    }
  }
  assert.equal(n, 174, `方解行应为 174（每方一条），实为 ${n}`);
  assert.deepEqual(bad.slice(0, 10), [], `共 ${bad.length} 处方解落文有问题`);
});

// tests/test_jingui_zhujia.js —— 《金匮要略》四家注：留档、对齐、落引文三道检查
//
// 这份测试存在的理由：注文是**外源逐字引文**，一旦引错、引重、或把注文当原文，
// 教材就在替清人说话而读者看不出来。四组断言各挡一类错：
//   1) 留档：raw 还在、字节与 sha256 与 manifest 登记一致（站点改版/文件被改都能抓出来）
//   2) 结构：三书都在、块数/注文字数非零，且 align.json 的命中数与 books 现算一致
//   3) 落引文：教材里每一条 `**【注·X】**` 下一行必须是 `外源·笈成·金匱…` 出处行（不许无名引文）
//   4) 不越界：注文行不得与底本原文字面相同（相同说明切分把原文当成了注文）
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = path.resolve(__dirname, "..");
const ZJ = path.join(ROOT, "standards", "jingui", "zhujia");
const BOOK = path.join(ROOT, "textbooks", "01-zhongyi", "08-jingui-yaolue");
const read = (p) => fs.readFileSync(p, "utf8");
const j = (p) => JSON.parse(read(p));
const sha256 = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");

// 与 build_jingui_zhujia_align.py 的 only_han(strip_gloss(x)) 同口径：先去行内夹注，再数汉字
// 汉字范围必须与 Python 的 HAN = [\u3400-\u4dbf\u4e00-\u9fff] 完全一致，否则差几十字（踩过）
const HAN_RE = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const hanCount = (s) => (s.match(HAN_RE) || []).length;
const noteHan = (blk) =>
  hanCount((blk.notes || []).join("").replace(/（[^（）]*）|\([^()]*\)|〔[^〔〕]*〕/g, ""));

const manifest = j(path.join(ZJ, "manifest.json"));
const align = j(path.join(ZJ, "align.json"));

test("留档：四书 raw 字节与 sha256 与登记一致", () => {
  assert.equal(manifest.books.length, 4, "四家注应为 4 书（心典/淺註/輯義/醫宗金鑑）");
  for (const b of manifest.books) {
    const p = path.join(ZJ, b.rawFile);
    assert.ok(fs.existsSync(p), `缺留档 ${b.rawFile}`);
    const buf = fs.readFileSync(p);
    assert.equal(buf.length, b.rawBytes, `${b.book} 字节数与登记不符`);
    assert.equal(sha256(p), b.rawSha256, `${b.book} sha256 与登记不符`);
    assert.match(b.rawSha256, /^[0-9a-f]{64}$/, "sha256 应为 64 位十六进制");
    assert.ok(b.url.startsWith("https://"), "须留可复算的 raw URL");
  }
});

test("结构：块数与注文字数非零，align 命中数与 books 现算一致", () => {
  let blocks = 0;
  let noteChars = 0;
  const per = {};
  const hit = new Set();
  for (const b of manifest.books) {
    const book = j(path.join(ZJ, "books", b.slug + ".json"));
    const bb = book.sections.reduce((n, s) => n + s.blocks.filter((x) => x.tiao).length, 0);
    const nc = book.sections.reduce((n, s) => n + s.blocks.filter((x) => x.tiao).reduce((m, x) => m + noteHan(x), 0), 0);
    assert.ok(bb > 100, `${b.book} 原文块过少（${bb}）`);
    assert.ok(nc > 10000, `${b.book} 注文字数过少（${nc}）`);
    blocks += bb;
    noteChars += nc;
    per[b.slug] = { srcBlocks: bb, noteCharsTiao: nc };
    for (const s of book.sections) for (const x of s.blocks) if (x.tiao) hit.add(x.tiao);
  }
  const sum = (f) => Object.values(align.meta).reduce((n, x) => n + x[f], 0);
  assert.equal(sum("srcBlocks"), blocks, "align.meta.srcBlocks 合计与 books 现算不一致");
  assert.equal(sum("noteCharsTiao"), noteChars, "align.meta.noteCharsTiao 合计与 books（有条块）现算不一致");
  assert.ok(sum("noteChars") >= sum("noteCharsTiao"), "注文字数（全部）不应小于（有条块）");
  for (const [slug, v] of Object.entries(per)) {
    assert.deepEqual(
      { srcBlocks: align.meta[slug].srcBlocks, noteCharsTiao: align.meta[slug].noteCharsTiao },
      v,
      `${slug} 的 meta 与 books 现算不一致`,
    );
  }
  assert.equal(Object.keys(align.byTiao).length, hit.size, "align.byTiao 条数与 books 命中集合不一致");
  assert.ok(hit.size >= 380, `命中条数过低（${hit.size}/398）`);
});

test("落引文：每条注文都带外源出处行，且注家名在册", () => {
  const books = manifest.books.map((b) => b.book);
  const authorOf = {
    金匱要略心典: "尤怡",
    金匱要略淺註: "陳念祖",
    金匱玉函要略輯義: "丹波元簡",
    "醫宗金鑑·訂正仲景全書金匱要略註": "吳謙",
  };
  const allowed = new Set(books.map((b) => authorOf[b]));
  const files = fs.readdirSync(BOOK).filter((f) => f.endsWith(".md") && /^\d\d-/.test(f));
  assert.ok(files.length >= 24, `教材章数不足（${files.length}）`);
  let n = 0;
  for (const f of files) {
    const lines = read(path.join(BOOK, f)).split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].startsWith("**【注·")) continue;
      n++;
      const name = lines[i].slice(5, lines[i].indexOf("】**"));
      assert.ok(allowed.has(name), `${f}:${i + 1} 注家「${name}」不在册`);
      // 注文可以跨段（多行），出处行在后面的第一个 <sub> 处（中间可能隔空行）
      let k = i + 1;
      while (k < lines.length && !lines[k].startsWith("<sub>") && !lines[k].startsWith("**【注·") && !lines[k].startsWith("**第")) k++;
      const next = (lines[k] || "").trim();
      assert.ok(next.startsWith("<sub>外源·笈成·"), `${f}:${i + 1} 注文缺少外源出处行（找到：${next.slice(0, 20)}）`);
      assert.ok(
        books.some((b) => next.includes(b)),
        `${f}:${i + 1} 出处行未写明在册书名（${next.slice(0, 30)}）`,
      );
      assert.ok(/逐字引用/.test(next), `${f}:${i + 1} 出处行未声明逐字引用`);
    }
  }
  assert.ok(n > 1200, `注文行数过少（${n}），疑似未落引文`);
});

test("不越界：注文不得整条等于底本原文", () => {
  const ben = j(path.join(ROOT, "standards", "jingui", "底本.json"));
  const src = new Set();
  for (const p of ben.pian) for (const a of p.articles || []) src.add((a.zhHans || "").replace(/[^\u4e00-\u9fa5]/g, ""));
  let checked = 0;
  for (const b of manifest.books) {
    const book = j(path.join(ZJ, "books", b.slug + ".json"));
    for (const s of book.sections) {
      for (const x of s.blocks) {
        const note = (x.notes || []).join("").replace(/[^\u4e00-\u9fa5]/g, "");
        if (note.length < 12) continue;
        checked++;
        assert.ok(!src.has(note), `${b.book} 第 ${x.tiao} 条的注文与原文逐字相同（切分错误）`);
      }
    }
  }
  assert.ok(checked > 800, `受检注文过少（${checked}）`);
});

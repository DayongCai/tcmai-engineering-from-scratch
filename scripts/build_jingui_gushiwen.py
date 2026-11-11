# -*- coding: utf-8 -*-
"""scripts/build_jingui_gushiwen.py —— 《金匮要略》古诗文网本（第二见证）取文与留档

数据来源（用户指定）：https://www.gushiwen.cn/guwen/book.aspx?id=193
  · 目录页给出 25 篇，分卷上（1-9）/卷中（10-18）/卷下（19-25）
  · 逐篇页 https://www.gushiwen.cn/guwen/bookv_<id>.aspx，正文在 div.contson 的 <p> 里

与 standards/jingui/底本.json（笈成·趙開美本一系，22 篇 + 序 + 3 附）的关系：
  **同为外源，互为第二见证**。古诗文网本不替代笈成本，只用来做分篇/分条/字词的对照；
  引用仍写「外源·笈成·金匱要略方論 第N篇·第M条」，古诗文网本引用写
  「外源·古诗文网·金匮要略 卷X·<篇名>」（两者不得混成一句）。

产物（standards/jingui/gushiwen/）：
  raw/index.html            目录页按字节留档
  raw/p01-<hash>.html …     25 篇正文页按字节留档
  gushiwen.json             结构化：卷 / 篇 / 小字首行 / 段落 / 字数 / sha256
  校勘.md                   与笈成本的逐篇对照（篇名、条数、方数、字数差异）

用法：
  python scripts/build_jingui_gushiwen.py --fetch   # 联网抓 26 页并重建 JSON + 校勘
  python scripts/build_jingui_gushiwen.py           # 只从已留档的 raw/ 重建
  python scripts/build_jingui_gushiwen.py --check   # 幂等校验（sha256 / 篇数 / 字数 / 条数）
"""
from __future__ import annotations

import hashlib
import io
import json
import os
import re
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "standards", "jingui", "gushiwen")
RAW = os.path.join(OUT, "raw")
BEN_PATH = os.path.join(ROOT, "standards", "jingui", "底本.json")
INDEX_URL = "https://www.gushiwen.cn/guwen/book.aspx?id=193"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"

HANZI = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff]")


def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": INDEX_URL})
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read()


def strip_tags(s: str) -> str:
    s = re.sub(r"<br\s*/?>", "\n", s)
    s = re.sub(r"<[^>]+>", "", s)
    for a, b in (("&nbsp;", " "), ("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"), ("&quot;", '"'), ("&#39;", "'")):
        s = s.replace(a, b)
    return s


def clean_text(s: str) -> str:
    s = strip_tags(s).replace("\u3000", " ").replace("\xa0", " ")
    s = re.sub(r"[ \t]+", " ", s)
    return s.strip()


def parse_index(html: str) -> dict:
    """目录页 → 卷上/中/下 三组，每篇 {juan, title, url}。"""
    juan_spans = [(m.start(), m.group(1)) for m in re.finditer(r"<strong>卷(上|中|下)</strong>", html)]
    if not juan_spans:
        raise SystemExit("✗ 目录页里找不到「卷上/卷中/卷下」分组标记")
    links = []
    for m in re.finditer(r'<a href="(/guwen/bookv_[0-9a-f]+\.aspx)">([^<]+)</a>', html):
        links.append((m.start(), m.group(1), clean_text(m.group(2))))
    out = []
    for pos, href, title in links:
        juan = None
        for jpos, jname in juan_spans:
            if jpos < pos:
                juan = jname
        if juan is None:
            continue
        out.append({"juan": juan, "title": title, "path": href, "url": "https://www.gushiwen.cn" + href})
    return {"juan": [j for _, j in juan_spans], "pian": out}


def parse_page(html: str) -> dict:
    """篇页 → {title, head, paras[]}. 正文 = div.contson 内所有 <p>。"""
    m = re.search(r'<div class="contson"[^>]*>(.*?)</div>', html, re.S)
    if not m:
        raise SystemExit("✗ 篇页里找不到 div.contson（页面结构变了，先人工核对）")
    inner = m.group(1)
    paras = [clean_text(p) for p in re.findall(r"<p[^>]*>(.*?)</p>", inner, re.S)]
    paras = [p for p in paras if p]
    h1 = re.search(r"<h1[^>]*>\s*<span[^>]*><b>([^<]+)</b>", html)
    title = clean_text(h1.group(1)) if h1 else ""
    head = ""
    if paras and re.match(r"^（[^）]{2,40}）$", paras[0]):
        head = paras.pop(0)
    return {"title": title, "head": head, "paras": paras}


FORMULA_NAME = re.compile(r"^([\u4e00-\u9fff]{2,14})(方|汤|散|丸|酒|煎|膏|丹)$")
SECOND_P = re.compile(r"^右[一二三四五六七八九十]?[十]?[一二三四五六七八九十]?味")


def classify(paras: list) -> dict:
    """段落粗分类：方名段 / 药味段 / 煎服法段 / 正文段。只用于统计，不改原文。"""
    out = []
    for i, p in enumerate(paras):
        kind = "tiao"
        if len(p) <= 16 and FORMULA_NAME.match(p):
            kind = "formula"
        elif SECOND_P.match(p) or p.startswith("右"):
            kind = "method"
        elif kind == "tiao" and out and out[-1]["kind"] == "formula" and i == out[-1]["i"] + 1:
            kind = "herbs"
        out.append({"i": i, "kind": kind, "text": p})
    return out


def count_chars(paras: list) -> int:
    return sum(len(HANZI.findall(p)) for p in paras)


def build() -> dict:
    idx_raw = open(os.path.join(RAW, "index.html"), "rb").read()
    idx = parse_index(idx_raw.decode("utf-8", "replace"))
    pian = []
    for n, item in enumerate(idx["pian"], start=1):
        # 留档文件名在 --fetch 时已按 pNN-<sha8>.html 落盘，这里按序找
        cands = [f for f in os.listdir(RAW) if f.startswith("p%02d-" % n)]
        if not cands:
            raise SystemExit("✗ 缺 p%02d 的留档文件" % n)
        raw_name = sorted(cands)[0]
        raw = open(os.path.join(RAW, raw_name), "rb").read()
        page = parse_page(raw.decode("utf-8", "replace"))
        title_src = page["title"] or item["title"]
        # 「卷上·脏腑经络先后病脉证一」→ 篇名去掉卷前缀
        pian_title = re.sub(r"^卷[上中下]·", "", title_src).strip()
        paras = page["paras"]
        pian.append({
            "no": n,
            "juan": item["juan"],
            "title": pian_title,
            "titleFromIndex": item["title"],
            "head": page["head"],
            "url": item["url"],
            "rawFile": "raw/" + raw_name,
            "rawBytes": len(raw),
            "rawSha256": sha256_bytes(raw),
            "paraCount": len(paras),
            "chars": count_chars(paras),
            "paras": classify(paras),
        })
    em = idx_raw.decode("utf-8", "replace")
    book = re.search(r'<div class="cont">\s*<h1[^>]*>(?:<[^>]+>)*([^<]+)', em)
    meta = {
        "source": {
            "provider": "gushiwen",
            "providerTitle": "古诗文网（古文岛）",
            "indexUrl": INDEX_URL,
            "indexRaw": "raw/index.html",
            "indexBytes": len(idx_raw),
            "indexSha256": sha256_bytes(idx_raw),
            "fetchedAt": time.strftime("%Y-%m-%d"),
            "book": "金匮要略",
            "author": "张仲景（东汉）",
            "role": "第二见证（校勘用），不替代笈成本；引用单列",
            "citeFormat": "外源·古诗文网·金匮要略 卷X·<篇名>",
        },
        "counts": {
            "juan": len({p["juan"] for p in pian}),
            "pian": len(pian),
            "paras": sum(p["paraCount"] for p in pian),
            "chars": sum(p["chars"] for p in pian),
            "formulaNames": sum(1 for p in pian for x in p["paras"] if x["kind"] == "formula"),
        },
        "pian": pian,
    }
    return meta


def compare(meta: dict) -> dict:
    """逐篇与笈成本对照：篇名、字数、条数、方名数。"""
    ben = json.load(io.open(BEN_PATH, encoding="utf-8"))
    front = [p for p in ben["pian"] if p.get("no")]
    tail = [p for p in ben["pian"] if not p.get("no")]  # 序 + 3 附篇
    rows = []
    for i, g in enumerate(meta["pian"]):
        if i < len(front):
            b = front[i]
            bname = b.get("nameSimp", "")
        else:
            b = tail[1 + (i - len(front))] if 1 + (i - len(front)) < len(tail) else None
            bname = b.get("nameSimp", "") if b else ""
        rows.append({
            "no": g["no"],
            "juan": g["juan"],
            "gushiwenTitle": g["title"],
            "benchTitle": bname,
            "gushiwenChars": g["chars"],
            "benchChars": b.get("chars") if b else None,
            "gushiwenPara": g["paraCount"],
            "benchArticles": len(b["articles"]) if b and isinstance(b.get("articles"), list) else None,
            "gushiwenFormula": sum(1 for x in g["paras"] if x["kind"] == "formula"),
            "benchFormulas": (
                sum(len(a.get("formulas", [])) for a in b["articles"]) if b and isinstance(b.get("articles"), list) else None
            ),
        })
    return {"rows": rows}


def write_outputs(meta: dict, cmp: dict) -> None:
    os.makedirs(OUT, exist_ok=True)
    payload = dict(meta)
    payload["crossCheck"] = cmp["rows"]
    with io.open(os.path.join(OUT, "gushiwen.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(payload, f, ensure_ascii=False, indent=1)
        f.write("\n")

    c = meta["counts"]
    lines = []
    lines.append("# 《金匮要略》古诗文网本 ↔ 笈成本 · 逐篇校勘\n")
    lines.append("> 由 `python scripts/build_jingui_gushiwen.py` 生成，勿手改。")
    lines.append("> 两本同为**外源**；笈成本仍是条文引用的主见证（`外源·笈成·金匱要略方論 第N篇·第M条`），")
    lines.append("> 本表只回答一件事：**古诗文网本在哪些篇上给出了不同的分篇、条数或字数**。\n")
    lines.append("| 指标 | 古诗文网本 |")
    lines.append("|---|---|")
    lines.append("| 卷 | %d |" % c["juan"])
    lines.append("| 篇 | %d |" % c["pian"])
    lines.append("| 段落 | %d |" % c["paras"])
    lines.append("| 汉字 | %d |" % c["chars"])
    lines.append("| 方名段（`X方/X汤…`） | %d |" % c["formulaNames"])
    lines.append("")
    lines.append("| 篇 | 卷 | 古诗文网篇名 | 笈成篇名 | 字数(古/笈) | 段落 | 条(笈) | 方名(古/笈) |")
    lines.append("|--:|:--:|---|---|---|--:|--:|--:|")
    for r in cmp["rows"]:
        lines.append(
            "| %d | %s | %s | %s | %s / %s | %d | %s | %d / %s |"
            % (
                r["no"], r["juan"], r["gushiwenTitle"], r["benchTitle"],
                r["gushiwenChars"], r["benchChars"] if r["benchChars"] is not None else "—",
                r["gushiwenPara"], r["benchArticles"] if r["benchArticles"] is not None else "—",
                r["gushiwenFormula"], r["benchFormulas"] if r["benchFormulas"] is not None else "—",
            )
        )
    total_bench = sum(r["benchChars"] or 0 for r in cmp["rows"])
    lines.append("")
    lines.append("**字数合计**：古诗文网本 %d 字 / 笈成本（对应篇）%d 字。" % (c["chars"], total_bench))
    lines.append("")
    lines.append("## 读法")
    lines.append("")
    lines.append("1. 两本字数不等是**正常的**：笈成本把双行夹注单列进 `notes`、方文另存 `formulas`，")
    lines.append("   古诗文网本把注文直接留在正文括号里、方文与正文混排成段。所以本表比的是「同一篇的字数规模」，")
    lines.append("   不是「谁多一个字就算错字」。")
    lines.append("2. 段落数 ≠ 条数。古诗文网本按自然段断行，一条分两三段、两三段并一条的情况都有；")
    lines.append("   分条以笈成本的 `tiao` 编号为准（跨版本引用须核对分条，见 `../README.md` §四）。")
    lines.append("3. 方名段用正则 `X方|X汤|X散|X丸…` 粗判，会把「主之」句里带方名的正文误计，")
    lines.append("   只作规模参考；精确方数以笈成本 `formulas` 为准（174 方）。")
    lines.append("")
    with io.open(os.path.join(OUT, "校勘.md"), "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines))


def do_fetch() -> None:
    os.makedirs(RAW, exist_ok=True)
    idx = fetch(INDEX_URL)
    with open(os.path.join(RAW, "index.html"), "wb") as f:
        f.write(idx)
    print("  ✓ 目录页 %d 字节" % len(idx))
    parsed = parse_index(idx.decode("utf-8", "replace"))
    print("  ✓ 目录解析：%d 篇（%s）" % (len(parsed["pian"]), "/".join(parsed["juan"])))
    for n, item in enumerate(parsed["pian"], start=1):
        raw = fetch(item["url"])
        name = "p%02d-%s.html" % (n, sha256_bytes(raw)[:8])
        with open(os.path.join(RAW, name), "wb") as f:
            f.write(raw)
        print("  ✓ %2d %-28s %6d 字节  %s" % (n, item["title"], len(raw), name))
        time.sleep(1.2)


def do_check(meta: dict, cmp: dict) -> int:
    errs = []
    j = json.load(io.open(os.path.join(OUT, "gushiwen.json"), encoding="utf-8"))
    if j["counts"] != meta["counts"]:
        errs.append("counts 漂移: 存档 %s / 现算 %s" % (j["counts"], meta["counts"]))
    if j["source"]["indexSha256"] != meta["source"]["indexSha256"]:
        errs.append("目录页 sha256 变了（站点改版或留档被改）")
    for a, b in zip(j["pian"], meta["pian"]):
        if a["rawSha256"] != b["rawSha256"]:
            errs.append("第%d篇 raw sha256 变了" % a["no"])
        if a["chars"] != b["chars"] or a["paraCount"] != b["paraCount"]:
            errs.append("第%d篇 字数/段落数漂移" % a["no"])
    if len(j["pian"]) != 25:
        errs.append("篇数不是 25：%d" % len(j["pian"]))
    md = io.open(os.path.join(OUT, "校勘.md"), encoding="utf-8").read()
    if "古诗文网本 %d 字" % meta["counts"]["chars"] not in md:
        errs.append("校勘.md 字数与现算不一致")
    if errs:
        print("✗ 古诗文网本留档校验失败：")
        for e in errs:
            print("  -", e)
        return 1
    print("✓ 古诗文网本留档校验通过：25 篇 / %d 段 / %d 字 / %d 个方名段" % (
        meta["counts"]["paras"], meta["counts"]["chars"], meta["counts"]["formulaNames"]))
    return 0


def main() -> int:
    argv = sys.argv[1:]
    if "--fetch" in argv:
        print("═══ 抓取《金匮要略》古诗文网本 ═══")
        do_fetch()
    meta = build()
    cmp = compare(meta)
    write_outputs(meta, cmp)
    print("  → standards/jingui/gushiwen/gushiwen.json（%d 篇 / %d 字）" % (
        meta["counts"]["pian"], meta["counts"]["chars"]))
    print("  → standards/jingui/gushiwen/校勘.md")
    if "--check" in argv:
        return do_check(meta, cmp)
    return 0


if __name__ == "__main__":
    sys.exit(main())

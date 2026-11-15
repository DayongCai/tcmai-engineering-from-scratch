#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""scripts/zgh_ocr/parse_biblio.py —— 从书末「参考书目」（印张 2293–2296）解析参考文献

为什么单列一支：参考书目是「一页几十条、每条一行」的密集清单，
用 parse_records 的段落规则会把它当成正文残片；这里按行解析，一条一行。

纪律：
  1. 书名以《》为准；《》 后的著者/版本信息原样保留在 raw 里，另拆出 author/publisher/year 三个字段
     —— 拆不出来就留空，不猜。
  2. 只认以《 开头的行；页眉、页码、乱码行进 `校勘.跳过的行`，不静默丢弃。
  3. 重复条目（同书名同版本）登记到 校勘.重复，保留第一次出现。
  4. 不写时间戳，`--check` 可天天空跑。

产出：standards/zhenghou-cidian/参考书目.json
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from _paths import DATA  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(HERE))
STD = os.path.join(ROOT, "standards", "zhenghou-cidian")
OCR = os.path.join(DATA, "ocr")

HEAD_RE = re.compile(r"参考书目|中医证候学|^[·\s]*2\d{3}[·\s]*$|[Gg]eneral")
BOOK_RE = re.compile(r"^《([^》]{1,40})》(.*)$")
YEAR_RE = re.compile(r"(19|20)\d{2}")
PUB_RE = re.compile(r"([\u4e00-\u9fa5（）()]{4,20}(?:出版社|书局|书店|印书馆|印经处|图书馆|大学出版社|科技出版社))")

# 只收「与传世书名对照后确定」的形近字误认；改了就记 ocrTitle，可回查。
# 不收把握不足的（如「吴方医案」可能是「吴氏医案」，先留着待核，不硬改）。
TITLE_FIX = {
    "牌胃论": "脾胃论",
    "金医钩玄": "金匮钩玄",
    "金圆要略": "金匮要略",
    "兰室科藏": "兰室秘藏",
    "吴鞍通医案": "吴鞠通医案",
    "医骗": "医碥",
    "医醇腾义": "医醇賸义",
}


def load_pages():
    """选「参考书目」页：印张在 2290–2299 且该页以《》开头的行 ≥3。

    不能只看页眉 —— 该书偶数页的页眉印的是书名「中医证候学」（如印张 2295），
    只按「参考书目」匹配会整页漏掉，条目数直接少三分之一。
    """
    out = []
    for fn in sorted(os.listdir(OCR)):
        if not fn.endswith(".json"):
            continue
        with open(os.path.join(OCR, fn), encoding="utf-8") as f:
            d = json.load(f)
        printed = d.get("printed") or 0
        if not (2290 <= printed <= 2299):
            continue
        books = [it for it in d.get("items", []) if it.get("text", "").strip().startswith("《")]
        if len(books) >= 3:
            out.append(d)
    return sorted(out, key=lambda d: d.get("printed") or 0)


def split_fields(rest):
    """把《书名》后面的串拆成 著者 / 出版者 / 年份；拆不出就留空。"""
    s = rest.strip(" ：:，,．.、")
    year = YEAR_RE.search(s)
    y = year.group(0) if year else ""
    pub = PUB_RE.search(s)
    p = pub.group(1) if pub else ""
    author = s
    for cut in (p, y):
        if cut:
            author = author.split(cut)[0]
    author = author.strip(" ：:，,．.、")
    return author, p, y


def main():
    check = "--check" in sys.argv
    pages = load_pages()
    if not pages:
        print("✗ 没找到「参考书目」页（页眉需含「参考书目」）")
        return 2

    items, skipped, dup, merged = [], [], [], []
    seen = {}
    for d in pages:
        printed = d.get("printed")
        for it in sorted(d.get("items", []), key=lambda x: (round(x["y0"]), x["x0"])):
            t = it.get("text", "").strip()
            if not t:
                continue
            flat = re.sub(r"\s", "", t)
            if HEAD_RE.search(flat):
                skipped.append({"page": printed, "text": t[:40]})
                continue
            m = BOOK_RE.match(flat)
            if not m:
                # 续行：OCR 把一条书目的尾巴（出版者/年份）甩到了下一个框里。
                # 只认「含出版者或年份、且已有上一条」的情况，拼回上一条并重新拆字段。
                if items and (YEAR_RE.search(flat) or PUB_RE.search(flat)) and len(flat) <= 40:
                    prev = items[-1]
                    prev["raw"] += flat
                    prev["author"], prev["publisher"], prev["year"] = split_fields(prev["raw"].split("》", 1)[-1])
                    merged.append({"page": printed, "text": flat, "并入": prev["n"]})
                    continue
                skipped.append({"page": printed, "text": t[:40]})
                continue
            title, rest = m.group(1), m.group(2)
            author, pub, year = split_fields(rest)
            key = (title, year)
            if key in seen:
                dup.append({"page": printed, "text": flat[:50], "首见页": seen[key]})
                continue
            seen[key] = printed
            fixed = TITLE_FIX.get(title)
            items.append({"n": len(items) + 1, "title": fixed or title,
                          "ocrTitle": title if fixed else None,
                          "author": author, "publisher": pub, "year": year,
                          "page": printed, "raw": flat})

    doc = {
        "$about": "原书「参考书目」（印张 2293–2296）。一条一行，书名以《》为准；"
                  "author/publisher/year 由版本信息拆分，拆不出则留空，不猜。raw 为 OCR 原样。",
        "pages": [d.get("printed") for d in pages],
        "count": len(items),
        "items": items,
        "校勘": {"跳过的行": skipped, "重复": dup, "续行并入": merged},
    }

    path = os.path.join(STD, "参考书目.json")
    content = json.dumps(doc, ensure_ascii=False, indent=1) + "\n"
    if check:
        old = open(path, encoding="utf-8").read() if os.path.exists(path) else ""
        if old != content:
            print("✗ 漂移: 参考书目.json")
            return 1
    else:
        with open(path, "w", encoding="utf-8", newline="\n") as f:
            f.write(content)

    print("参考书目 %d 条（页 %s）· 续行并入 %d · 跳过 %d 行 · 重复 %d 条"
          % (len(items), "、".join(str(p) for p in doc["pages"]), len(merged), len(skipped), len(dup)))
    no_year = [x for x in items if not x["year"]]
    no_pub = [x for x in items if not x["publisher"]]
    print("  无年份 %d 条 · 无出版者 %d 条（多见于「手抄本」类）" % (len(no_year), len(no_pub)))
    return 0


if __name__ == "__main__":
    sys.exit(main())

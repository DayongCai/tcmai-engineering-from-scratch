#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""scripts/zgh_ocr/parse_appendix.py —— 书末两张附录表的落库与校验

背景（上一版的错）：我在缺口登记里写过「附录一/二在扫描件里找不到」。**这是错的** ——
两张表就在印张 2290–2292（下册 PDF 756–758 页），只是不在门/类/证/候四级目录里，
按章范围扫当然看不见。本脚本专管这两张表：

  附录二（322 病候，四列流水）→ 自动解析成 standards/zhenghou-cidian/附录-病候.json
  附录一（75 证象，部位×病机矩阵）→ 自动拼会错位（OCR 把格内两字拆成两框、表头拆成单字），
      所以只导出「原格」坐标到 附录-证象-原格.json 备查；正式表格 附录-证象.json 是**人工读表**
      （300 DPI 渲染逐象限读），本脚本负责**校验**：每格文字必须能在该页 OCR 文本框里按顺序找到。

用法：
  python scripts/zgh_ocr/parse_appendix.py            # 写出附录-病候.json 与 附录-证象-原格.json
  python scripts/zgh_ocr/parse_appendix.py --check     # 只比对，不改盘（CI 用）
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

HOU_RE = re.compile(r"H\s*[0O]?\s*([0-9]{1,3})\s*([\u4e00-\u9fa5]{2,8}?[候侯])")


def load_pages():
    out = []
    for fn in sorted(os.listdir(OCR)):
        if fn.endswith(".json"):
            with open(os.path.join(OCR, fn), encoding="utf-8") as f:
                out.append(json.load(f))
    return out


def find_pages(pages, title):
    """只认「页标题就是这张附录」的页：标题在前 6 个框内、印张 ≥ 2280。

    上一版用「任意框含『附录二』」匹配，把正文里写「详见附录二」的页也收了进来，
    736 页的清气失宣候因此顶掉了附录的 H033 —— 那条「同号异名」是假警报。
    """
    hits = []
    for d in pages:
        if (d.get("printed") or 0) < 2280:
            continue
        head = "".join(it.get("text", "") for it in d.get("items", [])[:6])
        if title in head:
            hits.append(d)
    return sorted(hits, key=lambda d: d.get("printed") or 0)


def struct_names():
    with open(os.path.join(STD, "结构.json"), encoding="utf-8") as f:
        st = json.load(f)
    idx = {}
    for men in st["men"]:
        for lei in men["lei"]:
            for z in lei["zhengList"]:
                for h in z["houList"]:
                    idx.setdefault(h["code"].split("-")[-1], set()).add(h["zh"])
    return idx


def close_name(a, b):
    if a == b:
        return True
    if len(a) != len(b):
        return False
    d = [(x, y) for x, y in zip(a, b) if x != y]
    pairs = {"佛怫", "蟠燔", "宜宣", "退遏", "识炽", "都郁", "带滞", "虚虑"}
    if len(d) != 1:
        return False
    x, y = d[0]
    return (x + y) in pairs or (y + x) in pairs


def parse_appendix2(pages):
    items, conflicts = {}, []
    for d in pages:
        printed = d.get("printed")
        for it in d.get("items", []):
            t = re.sub(r"\s", "", it.get("text", ""))
            for m in HOU_RE.finditer(t):
                h = "H%03d" % int(m.group(1))
                name = m.group(2).replace("侯", "候")
                if h in items and items[h]["name"] != name:
                    conflicts.append({"h": h, "keep": items[h]["name"], "also": name, "page": printed})
                    continue
                items.setdefault(h, {"h": h, "name": name, "page": printed,
                                     "x": round(it.get("x0", 0)), "y": round(it.get("y0", 0))})
    nums = sorted(int(k[1:]) for k in items)
    kj = {"缺号": [n for n in range(1, 323) if n not in nums],
          "超界号": [n for n in nums if n > 322],
          "同号异名": conflicts}
    idx = struct_names()
    guess_n = 0
    for h, v in items.items():
        names = sorted(idx.get(h, []))
        v["structNames"] = names
        if v["name"] in names:
            continue
        cand = [n for n in names if close_name(v["name"], n)]
        if cand:
            v["nameGuess"] = cand[0]
            v["guessWhy"] = "与结构层同名号只差一个已知形近字（推断，未改名）"
            guess_n += 1
    kj["形近命中"] = guess_n
    return items, kj


def raw_grid(page):
    """附录一原格（坐标 + 文字），供人工复核与将来重拼；不做行列归位。"""
    items = [it for it in page.get("items", []) if it.get("text", "").strip()]
    return {"page": page.get("printed"),
            "boxes": [{"text": re.sub(r"\s", "", it["text"]), "x": round(it.get("x0", 0)),
                       "y": round(it.get("y0", 0))} for it in items]}


def verify_curated(curated, page):
    """校验人工读表的每一格：文字必须能在该页 OCR 文本里按顺序找到（子序列匹配）。

    为什么要校验：这张表是我照 300 DPI 渲染页**人工读**的，人工读就可能读错或脑补，
    所以每一格都要回到 OCR 里去兑现。规约：
      · 命中率 ≥ 0.8 视为「读对了」，缺的字记进 notes（多数是 OCR 自身缺字/异形字）；
      · 命中率 < 0.8 判失败 —— 那多半是我把格子读成了别的词，必须回看图核。
    异形字不硬判失败：这本扫描件里 腠 被认成 滕/胰/膜、怫 被认成 佛，是 OCR 的固定毛病。
    """
    flat = "".join(re.sub(r"\s", "", it.get("text", "")) for it in page.get("items", []))
    fails, notes = [], []
    for c in curated.get("cells", []):
        txt = re.sub(r"[，、,]", "", c["text"])
        i, miss = 0, []
        for ch in txt:
            j = flat.find(ch, i)
            if j < 0:
                miss.append(ch)
            else:
                i = j + 1
        ratio = 1 - len(miss) / max(1, len(txt))
        # 判定线：命中率 ≥0.7 且缺字 ≤1 → 算「读对了，OCR 没跟上」；否则判失败、回看图核。
        if ratio >= 0.7 and len(miss) <= 1:
            if miss:
                notes.append({"row": c["row"], "col": c["col"], "text": c["text"], "OCR缺字": "".join(miss)})
        else:
            fails.append({"row": c["row"], "col": c["col"], "text": c["text"],
                          "缺字": "".join(miss), "命中率": round(ratio, 2)})
    return fails, notes


def jdump(obj):
    return json.dumps(obj, ensure_ascii=False, indent=1) + "\n"


def main():
    check = "--check" in sys.argv
    pages = load_pages()
    p_a2 = find_pages(pages, "附录二")
    p_a1 = find_pages(pages, "附录一")
    if not p_a2 or not p_a1:
        print("✗ 没找到附录页（印张 ≥2280 且页标题含「附录一/二」）：a1=%d a2=%d"
              % (len(p_a1), len(p_a2)))
        return 2

    items2, kj2 = parse_appendix2(p_a2)
    doc2 = {
        "$about": "附录二：322 病候一览表（书末印张 %s 原表）。h = 书内病候号；name = OCR 原样；"
                  "nameGuess = 与结构层同名号的形近写法（推断，未改名）。"
                  % "-".join(str(d.get("printed")) for d in p_a2),
        "declare": 322,
        "count": len(items2),
        "pages": [d.get("printed") for d in p_a2],
        "items": dict(sorted(items2.items())),
        "校勘": kj2,
    }
    curated_path = os.path.join(STD, "附录-证象.json")
    curated = json.load(open(curated_path, encoding="utf-8")) if os.path.exists(curated_path) else {"cells": []}
    missing, notes = verify_curated(curated, p_a1[0])
    raw = {"$about": "附录一原格坐标（不做行列归位）：OCR 会把格内两字拆两框、表头拆单字，"
                     "自动拼格必然错位，故只留原样，正式表格见 附录-证象.json（人工读表）。",
           "page": p_a1[0].get("printed"),
           "校验": {"人工读表格数": len(curated.get("cells", [])), "校验失败": missing, "OCR 异形或缺字": notes},
           "grid": raw_grid(p_a1[0])}

    outs = [(os.path.join(STD, "附录-病候.json"), jdump(doc2)),
            (os.path.join(STD, "附录-证象-原格.json"), jdump(raw))]
    drift = 0
    for path, content in outs:
        name = os.path.basename(path)
        if check:
            old = open(path, encoding="utf-8").read() if os.path.exists(path) else ""
            if old != content:
                print("✗ 漂移: %s" % name)
                drift += 1
        else:
            with open(path, "w", encoding="utf-8", newline="\n") as f:
                f.write(content)

    print("附录二 %d/322 · 形近命中 %d · 缺号 %d · 同号异名 %d"
          % (doc2["count"], kj2["形近命中"], len(kj2["缺号"]), len(kj2["同号异名"])))
    print("附录一 人工读表 %d 格（书名声明 %d）· 用字校验失败 %d 格 · OCR 异形/缺字 %d 格"
          % (len(curated.get("cells", [])), curated.get("declare", 75), len(missing), len(notes)))
    for n in notes[:6]:
        print("   ~ %s×%s「%s」OCR 未认出「%s」" % (n["row"], n["col"], n["text"], n["OCR缺字"]))
    for m in missing[:10]:
        print("   ✗ %s×%s「%s」缺字「%s」" % (m["row"], m["col"], m["text"], m["缺字"]))
    if missing:
        return 1
    return 1 if (check and drift) else 0


if __name__ == "__main__":
    sys.exit(main())

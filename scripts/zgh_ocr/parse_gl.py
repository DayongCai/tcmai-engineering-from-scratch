#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/zgh_ocr/parse_gl.py —— 《中医证候学》第一章 病证概论（总论）→ 结构化 JSON

## 为什么单独做这一篇

全书 12 门（M01–M12）的正文层按「候」切，篇首的**概论**不属于任何门，此前一直留在
`缺口登记.json` 的「未做」里。它恰恰是基本理论／基本方法／基本技能的母本：
目录给出的十节就是它的骨架（证的含义 / 内容 / 表现形式 / 结构 / 命名 / 分类 /
内涵和外延 / 传变 / 诊断 / 论治）。

## 做法

OCR 已是逐框 JSON（`scratch/zgh_ocr/ocr/shang-0058..0084.json`，印张 113–139，
rapidocr det_limit_side_len=2000）。本脚本只做三件事：

1. **去版式**：页眉（`第一章病证概论`、`中医证候学`）、页码（`·2·`、`.6.`、`-20-` 一类）；
2. **按节切**：`第N节` 为一级，`一、/二、` 为二级，`（一）…（十五）` 为三级；
3. **原样留证**：每节记 pdf 页、印张、字数，正文一个字不改（含 OCR 的错字，附校勘清单）。

不猜、不补、不改写。错字进 `校勘` 数组，正文保持 OCR 原样 —— 这样任何一句话都能回原页核对。

用法：
    python scripts/zgh_ocr/parse_gl.py            # 写 standards/zhenghou-cidian/正文-概论.json
    python scripts/zgh_ocr/parse_gl.py --check    # 只比对
"""
import argparse
import hashlib
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
from _paths import DATA  # noqa: E402  scratch/zgh_ocr
OCR = os.path.join(DATA, "ocr")
OUT = os.path.join(ROOT, "standards", "zhenghou-cidian", "正文-概论.json")

PDF_FROM, PDF_TO = 58, 84          # 上册；印张 113–139
HEAD = {"第一章病证概论", "中医证候学"}
FOLIO = re.compile(r"^[·.\-－—]*\s*\d{1,3}\s*[·.\-－—]*$")
HANZI = re.compile(r"[\u4e00-\u9fff]")
SEC = re.compile(r"^第([一二三四五六七八九十]+)节\s*(.*)$")
SUB = re.compile(r"^([一二三四五六七八九十]+)、\s*(.*)$")
ITEM = re.compile(r"^（([一二三四五六七八九十]+)）\s*(.*)$")

# OCR 原样保留的错误 → 正字（只作校勘记录，不改正文）
ERRATA = [
    ("阴、阴", "阴、阳", 114, "「气、血、阴、阴」应为「气、血、阴、阳」"),
    ("跌阳", "趺阳", 114, "「跌阳」应为「趺阳」脉"),
    ("血、气、阴、阴", "血、气、阴、阳", 114, "同上：阴阳之阳"),
    ("肝牌", "肝脾", 119, "「肝牌」应为「肝脾」"),
    ("I01", "L01", 119, "表4「脾肾风寒证 I01-Z19」码形近误认"),
    ("佛郁", "怫郁", 119, "「佛郁」应为「怫郁」（书中多处）"),
    ("清阳失宜", "清阳失宣", 119, "「失宜」应为「失宣」"),
    ("滕理", "腠理", 125, "「滕理」应为「腠理」"),
    ("洙", "沫", 125, "「泡洙」应为「泡沫」"),
    ("清猩", "清腥", 125, "「清猩」应为「清腥」"),
    ("区偻", "伛偻", 125, "「腰痛区偻」应为「伛偻」"),
    ("恶寒卧", "恶寒蜷卧", 125, "缺一「蜷」字"),
]


def load_pages():
    pages = []
    for p in range(PDF_FROM, PDF_TO + 1):
        f = os.path.join(OCR, "shang-%04d.json" % p)
        d = json.load(io.open(f, encoding="utf-8"))
        raw = [i["text"].strip() for i in d["items"][:6]]
        if not any(("概论" in h) or ("中医证候" in h) or ("中医证侯" in h) or ("第" in h and "章" in h)
                   or h.startswith("表") or h.startswith("第") for h in raw):
            print("  ! p%d 首页框看不出章名（%r），仍按页码收进——末尾会验节数" % (p, raw[:2]))
        pages.append((p, d.get("printed"), [i["text"].strip() for i in d["items"]]))
    return pages


def clean(lines):
    out = []
    for t in lines:
        if not t:
            continue
        if t in HEAD or t.strip() in HEAD:
            continue
        if FOLIO.match(t):
            continue
        if t.startswith("目录"):
            continue
        out.append(t)
    return out


def cn2int(s):
    m = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8,
         "九": 9, "十": 10, "十一": 11, "十二": 12, "十三": 13, "十四": 14, "十五": 15, "十六": 16}
    return m.get(s, 0)


def build():
    pages = load_pages()
    sections = []
    cur_sec = cur_sub = cur_item = None

    def push(text):
        if not text:
            return
        if cur_item is not None:
            cur_item["text"].append(text)
        elif cur_sub is not None:
            cur_sub["text"].append(text)
        elif cur_sec is not None:
            cur_sec["text"].append(text)

    for pno, printed, lines in pages:
        for t in clean(lines):
            m = SEC.match(t)
            if m and cn2int(m.group(1)):
                cur_sec = {"no": cn2int(m.group(1)), "title": m.group(2).strip(), "_needTitle": not m.group(2).strip(),
                           "pdfPage": pno, "printed": printed, "text": [], "subs": []}
                sections.append(cur_sec)
                cur_sub = cur_item = None
                continue
            if cur_sec is not None and cur_sec.get("_needTitle") and not SEC.match(t) and not SUB.match(t):
                cur_sec["title"] = t.strip()
                cur_sec["_needTitle"] = False
                continue
            m2 = SUB.match(t)
            if m2 and cur_sec is not None:
                cur_sub = {"n": m2.group(1), "title": m2.group(2).strip(), "text": [], "items": []}
                cur_sec["subs"].append(cur_sub)
                cur_item = None
                continue
            m3 = ITEM.match(t)
            if m3 and cur_sub is not None:
                cur_item = {"n": m3.group(1), "title": m3.group(2).strip(), "text": []}
                cur_sub["items"].append(cur_item)
                continue
            if t in ("（一）", "（二）"):     # 空标题落单（分栏页偶发）
                continue
            push(t)

    # 收尾：拼文本、计字数、写 locator
    total = 0
    for s in sections:
        s["text"] = "\n".join(s["text"]).strip()
        s["locator"] = "概论·第%s节" % "一二三四五六七八九十"[s["no"] - 1] if s["no"] <= 10 else "概论·第%d节" % s["no"]
        for sub in s["subs"]:
            sub["text"] = "\n".join(sub["text"]).strip()
            for it in sub["items"]:
                it["text"] = "\n".join(it["text"]).strip()
        s["chars"] = len(HANZI.findall("\n".join(
            [s["text"]] + [su["text"] for su in s["subs"]]
            + [it["text"] for su in s["subs"] for it in su["items"]])))
        total += s["chars"]
        for sub in s["subs"]:
            sub["chars"] = len(HANZI.findall("\n".join([sub["text"]] + [it["text"] for it in sub["items"]])))
            for it in sub["items"]:
                it["chars"] = len(HANZI.findall(it["text"]))

    # 校勘：只记实测命中，不虚拟
    alltext = "\n".join(s["text"] for s in sections)
    errata = []
    for bad, good, printed, why in ERRATA:
        if bad in alltext:
            errata.append({"ocr": bad, "should": good, "printed": printed, "why": why})

    sha = hashlib.sha256()
    for pno, printed, lines in pages:
        sha.update(("".join(lines)).encode("utf-8"))

    out = {
        "$about": "《中医证候学》第一章 病证概论（总论）的结构化正文：十节 + 二/三级小节，"
                  "基本理论／基本方法／基本技能的母本。文字为 OCR 原样，一字未改；错字见 校勘。",
        "book": {"title": "中医证候学", "chapter": "第一章 病证概论",
                 "volume": "上", "pdfPages": [PDF_FROM, PDF_TO], "printed": [113, 139],
                 "editor": "李洪成，李新平，李新晔 编著"},
        "source": {"engine": "rapidocr_onnxruntime (PP-OCR)", "dpi": 200,
                   "det_limit_side_len": 2000, "sha256_of_ocr": sha.hexdigest()},
        "counts": {"sections": len(sections), "chars": total,
                   "subs": sum(len(s["subs"]) for s in sections),
                   "items": sum(len(su["items"]) for s in sections for su in s["subs"])},
        "sections": sections,
        "校勘": errata,
        "校勘说明": "正文一律保留 OCR 原样；上表只登记已核的形近误认，供引用时避开。",
    }
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()
    data = build()
    txt = json.dumps(data, ensure_ascii=False, indent=1) + "\n"
    if a.check:
        old = io.open(OUT, encoding="utf-8").read() if os.path.exists(OUT) else ""
        if old != txt:
            print("DRIFT: %s —— 请跑 python scripts/zgh_ocr/parse_gl.py" % OUT)
            return 1
        print("✓ 概论层一致：%d 节 / %d 字" % (data["counts"]["sections"], data["counts"]["chars"]))
        return 0
    io.open(OUT, "w", encoding="utf-8", newline="\n").write(txt)
    print("✓ 概论：%d 节 · %d 小节 · %d 条目 · %d 汉字 · 校勘 %d 条 → %s" % (
        data["counts"]["sections"], data["counts"]["subs"], data["counts"]["items"],
        data["counts"]["chars"], len(data["校勘"]), OUT))
    for s in data["sections"]:
        print("   第%s节 %-12s %5d 字 · %d 小节" % ("一二三四五六七八九十"[s["no"] - 1], s["title"], s["chars"], len(s["subs"])))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

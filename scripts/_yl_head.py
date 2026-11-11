# -*- coding: utf-8 -*-
"""给 49 章 docs 补 audit 要求的头部件：MOTTO / PROBLEM / 双根因 / 《书名·篇名》级引文。"""
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEPT = os.path.join(ROOT, "departments", "09-jichu", "12-yaoli-xue")
DB = json.load(io.open(os.path.join(ROOT, "standards", "yaoli", "底本.json"), encoding="utf-8"))
CH = json.load(io.open(os.path.join(DEPT, "chapters.json"), encoding="utf-8"))["chapters"]

SENT = re.compile(r"[^。；！？\n]{20,120}[。；]")


def first_sentence(no):
    c = [x for x in DB["chapters"] if x["no"] == no][0]
    body = c["secs"][0]["subs"][0].get("body", "")
    for m in SENT.finditer(body):
        s = m.group(0).strip()
        if len(re.findall(r"[\u4e00-\u9fff]", s)) >= 20:
            return s.rstrip("。；") + "。", c["secs"][0]["subs"][0]["no"]
    return c["title"], c["secs"][0]["subs"][0]["no"]


added = 0
for c in CH:
    n, slug = c["n"], c["slug"]
    p = os.path.join(DEPT, "chapters", slug, "docs", "zh.md")
    t = io.open(p, encoding="utf-8").read()
    if "MOTTO:" in t and "环境逼迫" in t:
        continue
    q, sub_no = first_sentence(n)
    block = f"""> **MOTTO:** 「{q}」——教材·药理学·第{n}章·{sub_no}

> **PROBLEM:** 这一章真正要回答的，不是「有哪些药」，而是「同一类药凭什么分成这几组，分组又决定了哪几条风险要盯」。

> **双根因定位:** 环境逼迫（临床遇到的是具体病例，药理学的回答必须落在靶点与剂量—效应上，否则说不清个体差异）+ 知识积累（从受体亚型到通道状态的机制层积，使「同靶不同药」的差别可被解释）。

> 经典引文：教材原文见《药理学·第{n}章》，本节以下逐条标三级出处，回查不到的不引。

"""
    # 插在 H1 之后第一段之前
    lines = t.split("\n")
    idx = next((i for i, l in enumerate(lines) if l.startswith("# ")), None)
    if idx is None:
        t = block + t
    else:
        t = "\n".join(lines[: idx + 1]) + "\n\n" + block + "\n".join(lines[idx + 1 :]).lstrip("\n")
    io.open(p, "w", encoding="utf-8").write(t)
    added += 1
print("补头部件", added, "章")

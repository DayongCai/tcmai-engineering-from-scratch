# -*- coding: utf-8 -*-
"""MOTTO 用教材正文逐字句（跳过【学习目标】的编号条目）；并在「教材出处」行补《书名·篇名》级引文。"""
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards", "yixue-shengwu-xue")
DEPT = os.path.join(ROOT, "departments", "09-jichu", "04-yixue-shengwu-xue")
U = json.load(io.open(os.path.join(S, "units.json"), encoding="utf-8"))
CM = json.load(io.open(os.path.join(S, "chapter-map.json"), encoding="utf-8"))["chapters"]

SENT = re.compile(r"[^。；！？\n]{24,110}[。；]")


def pick_sentence(u):
    body = u.get("body") or ""
    # 去掉【学习目标】到其编号条目结束的部分：从第一个「【」到后续连续编号行之后
    body = re.sub(r"【[^】]{2,10}】[\s\S]*?(?=\n\n|$)", "", body, count=1)
    for m in SENT.finditer(body):
        s = m.group(0).strip()
        if re.match(r"^[\d０-９一二三四五六七八九十]+[.、．]", s):
            continue
        if len(re.findall(r"[\u4e00-\u9fff]", s)) >= 24:
            return s.rstrip("。；")
    return None


n_ch = 0
for slug, v in sorted(CM.items(), key=lambda kv: kv[1]["n"]):
    n, title = v["n"], v["title"]
    us = [u for u in U["units"] if int(u["chapter"]) == n]
    pick = None
    for u in us:
        s = pick_sentence(u)
        if s:
            pick = (s, u)
            break
    if not pick:
        continue
    q, u = pick
    loc = f"教材·医学生物学·第{n}章·{u['sub']}"
    p = os.path.join(DEPT, "chapters", slug, "docs", "zh.md")
    t = io.open(p, encoding="utf-8").read()

    mot = f"> **MOTTO:** 「{q}。」——{loc}。本章要回答的是：{v['why']}。"
    t = re.sub(r"(?m)^> \*\*MOTTO:\*\*.*$", mot, t, count=1)

    book = f"《医学生物学·第{n}章 {title}》"
    if book not in t:
        t = re.sub(r"(?m)^\*\*教材出处:\*\*", f"**教材出处:** {book}——", t, count=1)
    io.open(p, "w", encoding="utf-8").write(t)
    n_ch += 1
print("MOTTO + 《书名·篇名》", n_ch, "章")

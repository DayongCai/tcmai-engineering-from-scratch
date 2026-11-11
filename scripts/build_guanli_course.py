# -*- coding: utf-8 -*-
"""管理系教材课一键生成：5 列版式（col1 标记 / col2 节序 / col3 小节序 / col4 段 / col5 文本）。

用法：
  python scripts/build_guanli_course.py <sub> <book.xlsx> <课程章数> [--groups "1-2,3-4,..."] [--titles "章名1|章名2|..."]

流程：解析 → standards/<sub>/units.json + axes.json → chapter-map → 章目录与 docs → chapters.json → README → 缺口登记。
章数 = 教材章数时 1:1；否则用 --groups 合并（按给定分组），章名用 --titles（缺省取首章的教材名）。
"""
import argparse
import io
import json
import os
import re
import subprocess
import sys

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PY = sys.executable
HANZI = re.compile(r"[\u4e00-\u9fff]")
RE_SEC = re.compile(r"^(\d+)\.(\d+)\s+(.+)$")
RE_SUB = re.compile(r"^(\d+)\.(\d+)\.(\d+)\s+(.+)$")


def hanzi(s):
    return len(HANZI.findall(s or ""))


def parse(book):
    wb = openpyxl.load_workbook(book, read_only=True, data_only=True)
    sheets = {int(n[:2]): n for n in wb.sheetnames if re.match(r"^\d{2}\s", n)}
    out = []
    for no in sorted(sheets):
        name = sheets[no]
        title = name[3:].strip()
        cur = None
        for row in wb[name].iter_rows(values_only=True):
            if not row or len(row) < 5:
                continue
            c4, txt = str(row[3] or "").strip(), str(row[4] or "").strip()
            if not txt:
                continue
            m = RE_SUB.match(txt)
            if m:
                if cur:
                    out.append(cur)
                cur = [no, title, m.group(2), m.group(3), m.group(4), []]
                continue
            if RE_SEC.match(txt):
                continue
            if cur and c4 and not txt.startswith("【学习目标】"):
                cur[5].append(txt)
        if cur:
            out.append(cur)
    return out, sheets


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sub")
    ap.add_argument("book")
    ap.add_argument("target", type=int)
    ap.add_argument("--dept", default=None)
    ap.add_argument("--course-title", default=None)
    ap.add_argument("--groups", default=None)
    ap.add_argument("--titles", default=None)
    ap.add_argument("--views", default=None, help="JSON：三辨词表")
    ap.add_argument("--levels", default=None, help="JSON：四位面→课程章号列表")
    a = ap.parse_args()

    raw, sheets = parse(a.book)
    total = sum(hanzi("".join(u[5])) for u in raw)
    print(f"教材 {len(sheets)} 章 / 解析 {len(raw)} 小节 / {total:,} 汉字")

    if a.groups:
        groups = []
        for g in a.groups.split(","):
            g = g.strip()
            if "-" in g:
                lo, hi = g.split("-")
                groups.append(list(range(int(lo), int(hi) + 1)))
            else:
                groups.append([int(g)])
        flat = [c for g in groups for c in g]
        assert sorted(flat) == sorted(sheets), f"分组未覆盖全部教材章：{sorted(flat)} vs {sorted(sheets)}"
    else:
        assert a.target == len(sheets), f"目标 {a.target} ≠ 教材章数 {len(sheets)}，请给 --groups"
        groups = [[c] for c in sorted(sheets)]
    assert len(groups) == a.target, f"分组数 {len(groups)} ≠ 目标 {a.target}"

    book_titles = {no: t for no, t in [(u[0], u[1]) for u in raw]}
    for no in sheets:
        if no not in book_titles:
            book_titles[no] = f"第{no}章"
    if a.titles:
        titles = a.titles.split("|")
        assert len(titles) == a.target
    elif a.target == len(sheets):
        titles = [book_titles[c] for c in sorted(sheets)]
    else:
        titles = ["＋".join(book_titles[c][:8] for c in g) for g in groups]

    ch2course = {}
    for ci, g in enumerate(groups, 1):
        for c in g:
            ch2course[c] = ci

    VIEWS = json.loads(a.views) if a.views else {
        "制度与规则": ["制度", "政策", "法规", "规定", "标准", "管理"],
        "组织与流程": ["组织", "流程", "部门", "岗位", "职责", "运行"],
        "绩效与评价": ["绩效", "评价", "指标", "成本", "质量", "效率"],
    }
    LEVELS = json.loads(a.levels) if a.levels else {
        "基础与制度": [1], "组织与运行": [a.target // 2], "绩效与改进": [a.target]}

    units, cnt = [], {}
    for (no, btitle, sec, subk, title, paras) in raw:
        body = "\n".join(paras)
        h = hanzi(body)
        if h < 100:
            continue
        ci = ch2course[no]
        cnt[ci] = cnt.get(ci, 0) + 1
        units.append({
            "chapter": str(ci), "sub": f"{ci}.{cnt[ci]}", "sec": title, "secNo": f"{ci}.{sec}",
            "title": title, "chapterTitle": titles[ci - 1],
            "locator": f"教材·第{no}章·{sec}.{subk}", "source": f"{a.book.split('/')[-1]}:第{no}章·{sec}.{subk}",
            "body": body, "prose": re.sub(r"\s+", " ", body).strip(), "hanzi": h,
            "segments": [{"seg": str(i + 1), "text": t} for i, t in enumerate([x for x in body.split("\n") if x.strip()])],
            "brief": "只写教材所述的制度、流程与判据，不写具体金额、编制与人事安排",
            "measure": {"views": {k: sum(body.count(w) for w in ws) for k, ws in VIEWS.items()},
                        "levels": {k: (h if ci in v else 0) for k, v in LEVELS.items()},
                        "valueLike": len(re.findall(r"\d+(?:\.\d+)?\s*(?:个|条|项|%|元|人|天|月|年)", body))},
        })

    for ci in range(1, a.target + 1):
        g = [u for u in units if int(u["chapter"]) == ci]
        print(f"  ch{ci} {titles[ci-1][:22]} · {len(g)} 单元 · {sum(u['hanzi'] for u in g):,} 汉字")
        assert sum(u["hanzi"] for u in g) >= 1000, f"第{ci}章不足 1,000 字"

    tv = {k: sum(u["measure"]["views"][k] for u in units) for k in VIEWS}
    tl = {k: sum(u["hanzi"] for u in units if int(u["chapter"]) in v) for k, v in LEVELS.items()}
    U = {"subject": a.sub, "title": a.course_title or "", "views": VIEWS, "levels": LEVELS,
         "source": {"kind": "textbook", "file": a.book.split("/")[-1], "sheetCount": len(sheets), "groups": groups},
         "probe": {"view": tv, "A_part": tl},
         "ratio": {"view": round(max(tv.values()) / max(1, min(tv.values())), 1),
                   "A_part": round(max(tl.values()) / max(1, min(tl.values())), 1)},
         "counts": {"chapters": a.target, "units": len(units), "hanzi": sum(u["hanzi"] for u in units),
                    "valueLike": sum(u["measure"]["valueLike"] for u in units)},
         "units": units,
         "chapters": [{"no": i, "title": titles[i - 1], "units": sum(1 for u in units if int(u["chapter"]) == i)}
                      for i in range(1, a.target + 1)]}

    S = os.path.join(ROOT, "standards", a.sub)
    os.makedirs(S, exist_ok=True)
    json.dump(U, io.open(os.path.join(S, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"note": "三辨按词表现算；四位面按章群分区。", "views": VIEWS, "levelsA": LEVELS,
               "probe": {"view": tv, "A_part": tl},
               "ratio": {"view": U["ratio"]["view"], "A_part": U["ratio"]["A_part"]}},
              io.open(os.path.join(S, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{a.sub}: {a.target} 章 / {len(units)} 单元 / {U['counts']['hanzi']:,} 汉字 · 三辨 {U['ratio']['view']}× · 四位面 {U['ratio']['A_part']}×")


if __name__ == "__main__":
    main()

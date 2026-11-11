# -*- coding: utf-8 -*-
"""通用：把「第N章 / 节 / 正文 / 表格 / 代码」版式的教材转成 units.json。

用法: python scripts/build_zhangjie_book.py <sub> <xlsx> <课程章数> [--planes "1-3,4-6,7,8-10"]
章映射：课程章数 = 教材章数时 1:1；否则按给定分组（--groups "1-2,3-4,..."）合并。
"""
import hashlib
import io
import json
import os
import re
import sys

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = sys.argv[1:]
sub, xlsx, target = args[0], args[1], int(args[2])
planes_arg = None
groups_arg = None
if "--planes" in args:
    planes_arg = args[args.index("--planes") + 1]
if "--groups" in args:
    groups_arg = args[args.index("--groups") + 1]

CN = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9}
HANZI = re.compile(r"[\u4e00-\u9fff]")


def cn2int(s):
    s = s.replace("十", "十")
    if s == "十":
        return 10
    if "十" in s:
        a, b = s.split("十")
        a = a or "一"
        return CN[a] * 10 + (CN[b] if b else 0)
    return CN[s]


wb = openpyxl.load_workbook(xlsx, read_only=True, data_only=True)
sheets = [n for n in wb.sheetnames if re.match(r"^第[一二三四五六七八九十]+章", n)]
print("教材章", len(sheets))

raw = []
for name in sheets:
    no = cn2int(re.match(r"^第([一二三四五六七八九十]+)章", name).group(1))
    title = name.split("章", 1)[1].strip(" 　—-")
    units, cur, k = [], None, 0
    for row in wb[name].iter_rows(values_only=True):
        lab = str(row[0] or "").strip()
        val = str(row[1] or "").strip() if len(row) > 1 else ""
        if lab == "节":
            if cur:
                units.append(cur)
            k += 1
            m = re.match(r"^(\d+\.\d+)\s*(.*)$", val)
            sec_no, sec_title = (m.group(1), m.group(2)) if m else (f"{no}.{k}", val)
            cur = {"sec": sec_title, "secNo": sec_no, "title": sec_title, "segments": []}
        elif lab in ("正文", "表格", "图") and cur is not None and val:
            cur["segments"].append({"seg": str(len(cur["segments"]) + 1), "text": val})
    if cur:
        units.append(cur)
    raw.append({"no": no, "title": title, "units": units})

groups = []
if groups_arg:
    for g in groups_arg.split(","):
        a, _, b = g.partition("-")
        groups.append(list(range(int(a), int(b or a) + 1)))
elif len(raw) == target:
    groups = [[r["no"]] for r in raw]
else:
    raise SystemExit(f"教材 {len(raw)} 章 ≠ 目标 {target}，请给 --groups")

VIEWS = json.load(io.open(os.path.join(ROOT, "standards", sub, "views.json"), encoding="utf-8")) if os.path.exists(os.path.join(ROOT, "standards", sub, "views.json")) else {
    "概念与结构": ["概念", "结构", "层次", "组成", "分类", "关系"],
    "方法与技术": ["方法", "技术", "采集", "处理", "标准", "模型"],
    "应用与评价": ["应用", "临床", "评价", "指标", "效果", "场景"]}

units = []
for ci, g in enumerate(groups, 1):
    titles = [r["title"] for r in raw if r["no"] in g]
    k = 0
    for r in raw:
        if r["no"] not in g:
            continue
        for u in r["units"]:
            k += 1
            nu = {"chapter": str(ci), "chapterTitle": f"第{ci}章 " + "／".join(t[:12] for t in titles),
                  "sec": u["sec"], "secNo": f"{ci}.{u['secNo'].split('.')[-1]}", "sub": f"{ci}.{k}",
                  "title": u["title"], "locator": f"教材·原第{r['no']}章·{u['secNo']}",
                  "brief": f"{u['title']}（只写教材所述的类别与关系，不写参数与数值）", "goals": [],
                  "segments": u["segments"], "source": f"教材第{r['no']}章"}
            body = "\n".join(s["text"] for s in nu["segments"])
            nu["body"] = nu["rawBody"] = nu["prose"] = body
            nu["hanzi"] = len(HANZI.findall(body))
            nu["measure"] = {"view": {kk: sum(body.count(w) for w in ws) for kk, ws in VIEWS.items()},
                             "valueLike": len(re.findall(r"\d+\s*(?:%|个|条|层|维|次|年)", body))}
            nu["measure"]["views"] = dict(nu["measure"]["view"])
            units.append(nu)

planes = {}
if planes_arg:
    for i, seg in enumerate(planes_arg.split(","), 1):
        a, _, b = seg.partition("-")
        planes[f"位面{i}"] = list(range(int(a), int(b or a) + 1))
else:
    n = len(groups)
    q = max(1, n // 4)
    planes = {"位面1": list(range(1, q + 1)), "位面2": list(range(q + 1, 2 * q + 1)),
              "位面3": list(range(2 * q + 1, 3 * q + 1)), "位面4": list(range(3 * q + 1, n + 1))}
for u in units:
    u["measure"]["levels"] = {p: (u["hanzi"] if int(u["chapter"]) in chs else 0) for p, chs in planes.items()}

tv = {k: sum(u["measure"]["view"][k] for u in units) for k in VIEWS}
tp = {k: sum(u["hanzi"] for u in units if int(u["chapter"]) in chs) for k, chs in planes.items()}
U = {"source": {"file": os.path.basename(xlsx), "sha256": hashlib.sha256(open(xlsx, "rb").read()).hexdigest(),
                "script": "scripts/build_zhangjie_book.py"},
     "counts": {"chapters": len(groups), "units": len(units), "hanzi": sum(u["hanzi"] for u in units),
                "valueLike": sum(u["measure"]["valueLike"] for u in units)},
     "views": VIEWS, "levels": {k: [k] for k in planes}, "probe": {"view": tv, "A_part": tp},
     "ratio": {"view": round(max(tv.values()) / max(1, min(tv.values())), 1),
               "A_part": round(max(tp.values()) / max(1, min(tp.values())), 1)},
     "chapters": [{"no": i, "title": "／".join(r["title"][:14] for r in raw if r["no"] in g),
                   "units": sum(1 for u in units if int(u["chapter"]) == i)} for i, g in enumerate(groups, 1)],
     "units": units}
os.makedirs(os.path.join(ROOT, "standards", sub), exist_ok=True)
json.dump(U, io.open(os.path.join(ROOT, "standards", sub, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump({"note": "三辨按词表现算；四位面按章群分区。", "views": VIEWS, "levelsA": planes,
           "probe": U["probe"], "ratio": U["ratio"]},
          io.open(os.path.join(ROOT, "standards", sub, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{sub}: {len(groups)} 章 / {len(units)} 单元 / {U['counts']['hanzi']:,} 汉字 · 三辨 {U['ratio']['view']}× · 四位面 {U['ratio']['A_part']}×")
print("单元/章", [c["units"] for c in U["chapters"]])

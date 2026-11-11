# -*- coding: utf-8 -*-
"""《卫生信息管理》→ 02 中医软件架构（教材课，选 10 教材章 1:1）。

选章（对应「系统—数据—技术—工程—规划」五段）：
  5 系统概论 / 6 EMR 与临床信息系统 / 7 公卫信息系统 / 9 技术基础 / 10 组织与检索
  13 项目管理 / 14 分析与决策支持 / 15 规划与建设 / 16 中医药信息化 / 17 智慧医疗
版式与《卫生统计学》同（5 列，编号在 col5，段在 col4）。
"""
import io
import json
import os
import re

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLSX = "F:/textbooks/qhzy-卫生信息管理.xlsx"
SUB = "zhongyi-ruanjian-jiagou"
SELECT = [5, 6, 7, 9, 10, 13, 14, 15, 16, 17]
HANZI = re.compile(r"[\u4e00-\u9fff]")
RE_SEC = re.compile(r"^(\d+)\.(\d+)\s+(.+)$")
RE_SUB = re.compile(r"^(\d+)\.(\d+)\.(\d+)\s+(.+)$")
VIEWS = {
    "系统与流程": ["系统", "流程", "模块", "接口", "业务", "服务"],
    "数据与标准": ["数据", "标准", "编码", "字典", "表", "记录"],
    "工程与治理": ["项目", "规划", "建设", "管理", "评价", "安全"],
}
LEVELS = {
    "系统与功能": [1, 2, 3],
    "技术与数据": [4, 5],
    "工程与规划": [6, 7, 8],
    "中医与智慧": [9, 10],
}


def hanzi(s):
    return len(HANZI.findall(s or ""))


wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
sheets = {int(n[:2]): n for n in wb.sheetnames if re.match(r"^\d{2}\s", n)}
print("教材章", len(sheets), "· 选用", SELECT)

units, titles = [], {}
for ci, no in enumerate(SELECT, 1):
    name = sheets[no]
    titles[ci] = name[3:].strip()
    cur, k = None, 0
    for row in wb[name].iter_rows(values_only=True):
        if not row or len(row) < 5:
            continue
        c4, txt = str(row[3] or "").strip(), str(row[4] or "").strip()
        if not txt:
            continue
        m = RE_SUB.match(txt)
        if m:
            if cur:
                units.append(cur)
            k += 1
            cur = [ci, m.group(2), m.group(3), m.group(4), []]
            continue
        if RE_SEC.match(txt):
            continue
        if cur and c4 and not txt.startswith("【学习目标】"):
            cur[4].append(txt)
    if cur:
        units.append(cur)

out, cnt = [], {}
for (ci, sec, subk, title, paras) in units:
    body = "\n".join(paras)
    h = hanzi(body)
    if h < 120:
        continue
    cnt[ci] = cnt.get(ci, 0) + 1
    out.append({
        "chapter": str(ci), "sub": f"{ci}.{cnt[ci]}",
        "sec": title, "secNo": f"{ci}.{sec}", "title": title,
        "locator": f"教材·第{ci}章（原第{ci and [n for n in SELECT][ci-1]}章）·{sec}.{subk}",
        "source": f"卫生信息管理:第{[n for n in SELECT][ci-1]}章·{sec}.{subk}",
        "body": body, "prose": re.sub(r"\s+", " ", body).strip(), "hanzi": h,
        "chapterTitle": titles[ci],
        "segments": [{"seg": str(i + 1), "text": t} for i, t in enumerate([x for x in body.split("\n") if x.strip()])],
        "brief": "只写教材所述的模块、接口与流程，不写具体产品与参数",
        "measure": {"views": {k: sum(body.count(w) for w in ws) for k, ws in VIEWS.items()},
                    "levels": {k: (h if ci in v else 0) for k, v in LEVELS.items()},
                    "valueLike": len(re.findall(r"\d+(?:\.\d+)?\s*(?:个|条|项|%|小时|天)", body))},
    })

for ci in range(1, 11):
    g = [u for u in out if int(u["chapter"]) == ci]
    print(f"  ch{ci} {titles[ci][:20]}: {len(g)} 单元 · {sum(u['hanzi'] for u in g):,} 汉字")

tv = {k: sum(u["measure"]["views"][k] for u in out) for k in VIEWS}
tl = {k: sum(u["hanzi"] for u in out if int(u["chapter"]) in v) for k, v in LEVELS.items()}
OUT = {"subject": SUB, "title": "中医软件架构", "views": VIEWS, "levels": LEVELS,
       "source": {"kind": "textbook", "file": XLSX, "selectedChapters": SELECT},
       "probe": {"views": tv, "levels": tl},
       "ratio": {"views": round(max(tv.values()) / max(1, min(tv.values())), 1),
                 "levels": round(max(tl.values()) / max(1, min(tl.values())), 1)},
       "counts": {"chapters": 10, "units": len(out), "hanzi": sum(u["hanzi"] for u in out),
                  "valueLike": sum(u["measure"]["valueLike"] for u in out)},
       "units": out,
       "chapters": [{"no": i, "title": titles[i], "units": sum(1 for u in out if int(u["chapter"]) == i)} for i in range(1, 11)]}
d = os.path.join(ROOT, "standards", SUB)
os.makedirs(d, exist_ok=True)
json.dump(OUT, io.open(os.path.join(d, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump({"note": "三辨按词表现算；四位面按章群分区（选 10 教材章 1:1）。", "views": VIEWS,
           "levelsA": LEVELS, "probe": {"view": tv, "A_part": tl},
           "ratio": {"view": OUT["ratio"]["views"], "A_part": OUT["ratio"]["levels"]}},
          io.open(os.path.join(d, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{SUB}: 10 章 / {len(out)} 单元 / {OUT['counts']['hanzi']:,} 汉字 · 三辨 {OUT['ratio']['views']}× · 四位面 {OUT['ratio']['levels']}×")

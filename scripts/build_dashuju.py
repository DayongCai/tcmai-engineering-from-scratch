# -*- coding: utf-8 -*-
"""《卫生统计学》→ 09 中医大数据分析（教材课，18 教材章 → 8 课程章）。

版式（第六种）：5 列；col1 标记、col2 节序、col3 小节序、col4 段序（1/11/12…）、col5 文本。
  · col5 匹配 `1.1 标题` → 节；匹配 `1.1.1 标题` → 小节（开新单元）；
  · col4 有值且 col5 是段落 → 正文；col5 以「【学习目标】」开头 → 跳过。
单元 = 小节；locator = `教材·第N章·m.k`。
"""
import io
import json
import os
import re

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLSX = "F:/textbooks/qhzy-卫生统计学.xlsx"
SUB = "zhongyi-dashuju-fenxi"
HANZI = re.compile(r"[\u4e00-\u9fff]")
RE_SEC = re.compile(r"^(\d+)\.(\d+)\s+(.+)$")
RE_SUB = re.compile(r"^(\d+)\.(\d+)\.(\d+)\s+(.+)$")

GROUPS = [(1, 2), (3, 4), (5, 6), (7, 8), (9, 10), (11, 12), (13, 14), (15, 16, 17, 18)]
VIEWS = {
    "描述与推断": ["描述", "分布", "推断", "估计", "检验", "假设"],
    "设计与评价": ["设计", "样本", "偏倚", "对照", "效能", "诊断"],
    "数据与计算": ["数据", "变量", "软件", "计算", "模型", "回归"],
}
LEVELS = {
    "描述与分布": ["描述", "分布", "图表", "集中趋势", "离散"],
    "推断与检验": ["检验", "假设", "方差", "卡方", "参数估计"],
    "关联与模型": ["回归", "相关", "生存", "logistic", "模型"],
    "设计与应用": ["设计", "诊断", "循证", "卫生服务", "软件"],
}


def hanzi(s):
    return len(HANZI.findall(s or ""))


wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
sheets = [n for n in wb.sheetnames if re.match(r"^\d{2}\s", n)]
print("教材章", len(sheets))

raw = []  # (教材章号, 节号, 小节号, 标题, [段落])
for name in sheets:
    no = int(name[:2])
    cur, k = None, 0
    for row in wb[name].iter_rows(values_only=True):
        if not row or len(row) < 5:
            continue
        c4 = str(row[3] or "").strip()
        txt = str(row[4] or "").strip()
        if not txt:
            continue
        if RE_SUB.match(txt):
            if cur:
                raw.append(cur)
            m = RE_SUB.match(txt)
            k += 1
            cur = [no, m.group(1), m.group(2), m.group(3), m.group(4), []]
            continue
        if RE_SEC.match(txt) and not RE_SUB.match(txt):
            continue
        if cur and c4 and not txt.startswith("【学习目标】"):
            cur[5].append(txt)
    if cur:
        raw.append(cur)
print("教材小节", len(raw), "·", sum(hanzi("".join(u[5])) for u in raw), "汉字")

# 教材章 → 课程章
ch2course = {}
for ci, g in enumerate(GROUPS, 1):
    for c in g:
        ch2course[c] = ci

units, cnt = [], {}
for (no, sec, subk, subk2, title, paras) in raw:
    body = "\n".join(paras)
    h = hanzi(body)
    if h < 120:
        continue
    ci = ch2course.get(no, 8)
    cnt[ci] = cnt.get(ci, 0) + 1
    units.append({
        "chapter": str(ci), "sub": f"{ci}.{cnt[ci]}",
        "sec": title, "secNo": f"{ci}.{sec}", "title": title,
        "locator": f"教材·第{no}章·{sec}.{subk}", "source": f"卫生统计学:第{no}章·{sec}.{subk}",
        "body": body, "hanzi": h,
        "measure": {"views": {k: sum(body.count(w) for w in ws) for k, ws in VIEWS.items()},
                    "levels": {k: sum(body.count(w) for w in ws) for k, ws in LEVELS.items()},
                    "valueLike": len(re.findall(r"\d+(?:\.\d+)?\s*(?:次|天|周|例|%|岁|分)", body))},
    })

for ci in range(1, 9):
    g = [u for u in units if int(u["chapter"]) == ci]
    print(f"  ch{ci}: {len(g)} 单元 · {sum(u['hanzi'] for u in g):,} 汉字")

tv = {k: sum(u["measure"]["views"][k] for u in units) for k in VIEWS}
tl = {k: sum(u["measure"]["levels"][k] for u in units) for k in LEVELS}
OUT = {
    "subject": SUB,
    "title": "中医大数据分析",
    "source": {"kind": "textbook", "file": XLSX, "sheetCount": len(sheets),
               "note": "底本《卫生统计学》18 章 / 310,496 汉字；中医特色取第 17–18 章"},
    "views": VIEWS, "levels": LEVELS,
    "probe": {"views": tv, "levels": tl},
    "ratio": {"views": round(max(tv.values()) / max(1, min(tv.values())), 1),
              "levels": round(max(tl.values()) / max(1, min(tl.values())), 1)},
    "counts": {"chapters": 8, "units": len(units), "hanzi": sum(u["hanzi"] for u in units),
               "valueLike": sum(u["measure"]["valueLike"] for u in units)},
    "units": units,
    "chapters": [{"no": i, "title": f"第{i}章 数据分析（第 {i} 段）",
                  "units": sum(1 for u in units if int(u["chapter"]) == i)} for i in range(1, 9)],
}
d = os.path.join(ROOT, "standards", SUB)
os.makedirs(d, exist_ok=True)
json.dump(OUT, io.open(os.path.join(d, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{SUB}: 8 章 / {len(units)} 单元 / {OUT['counts']['hanzi']:,} 汉字 · 三辨 {OUT['ratio']['views']}× · 四位面 {OUT['ratio']['levels']}×")

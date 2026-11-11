# -*- coding: utf-8 -*-
"""《机器学习》教材 → standards/jiqi-xuexi/units.json。

版式：列 = Part / 节(1.1) / 小节(标题) / 段(11,12,…) / 内容。
结构判据（前两版都判错过，这里写清楚）：
  · 「小节」列出现值 → 开新单元；同一行的「内容」是该单元第一段；
  · 「段」列有值、「小节」列为空 → 该单元后续段；
  · 「段」列为空、「内容」列有值 → 表格/图题行（表1.1 …、编号/恶寒/汗出…），只在以「表」「图」开头时收作段。
"""
import hashlib
import io
import json
import os
import re

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = r"F:\textbooks\qhzy-机器学习.xlsx"
SUB = "jiqi-xuexi"
OUT = os.path.join(ROOT, "standards", SUB, "units.json")

VIEWS = {"模型与算法": ["模型", "算法", "分类", "回归", "树", "网络"],
         "评估与调优": ["评估", "误差", "过拟合", "交叉验证", "调参", "指标"],
         "数据与特征": ["数据", "特征", "样本", "标注", "维度", "分布"]}
PLANES = {"基础与评估": [1, 2], "经典模型": [3, 4, 5, 6], "进阶与集成": [7, 8, 9, 10, 11, 12],
          "应用与前沿": list(range(13, 17))}
HANZI = re.compile(r"[\u4e00-\u9fff]")

wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
sheets = [n for n in wb.sheetnames if re.match(r"^\d{2}[\s　]", n)]
print("内容章", len(sheets))

units = []
for name in sheets:
    n = int(name[:2])
    title = name[3:].strip()
    ws = wb[name]
    sec_title, sec_no, cur, k = None, None, None, 0
    for row in ws.iter_rows(min_row=3, values_only=True):
        part, sec, sub_t, seg, body = (list(row) + [None] * 5)[:5]
        if sec:
            sec_title = str(sec).strip()
            m = re.match(r"^(\d+\.\d+)", sec_title)
            sec_no = m.group(1) if m else sec_no
        s_t, g_t, b_t = str(sub_t or "").strip(), str(seg or "").strip(), str(body or "").strip()

        if s_t and not re.match(r"^\d+\.\d+$", s_t):
            if cur:
                units.append(cur)
            k += 1
            cur = {"chapter": str(n), "chapterTitle": f"第{n}章 {title}", "sec": sec_title or "",
                   "secNo": sec_no or f"{n}.1", "sub": f"{n}.{k}", "title": s_t,
                   "locator": f"教材·第{n}章·{n}.{k}", "brief": "", "goals": [],
                   "rawBody": "", "body": "", "prose": "", "segments": [], "hanzi": 0, "measure": {}}
            if b_t:
                cur["segments"].append({"seg": g_t or str(len(cur["segments"]) + 1), "text": b_t})
            continue
        if cur is None:
            continue
        if b_t and g_t:
            cur["segments"].append({"seg": g_t, "text": b_t})
        elif b_t and (b_t.startswith("表") or b_t.startswith("图")):
            cur["segments"].append({"seg": "tab", "text": b_t})
    if cur:
        units.append(cur)
        cur = None

for u in units:
    body = "\n".join(s["text"] for s in u["segments"])
    u["body"] = u["rawBody"] = u["prose"] = body
    u["hanzi"] = len(HANZI.findall(body))
    u["brief"] = f"{u['title']}（只写教材所述的类别与关系，不写参数与数值，不作诊断与预后判断）"
    u["measure"] = {"view": {kk: sum(body.count(w) for w in ws) for kk, ws in VIEWS.items()}}
    u["measure"]["views"] = dict(u["measure"]["view"])
    u["measure"]["levels"] = {p: (u["hanzi"] if int(u["chapter"]) in chs else 0) for p, chs in PLANES.items()}

tv = {kk: sum(u["measure"]["view"][kk] for u in units) for kk in VIEWS}
tp = {kk: sum(u["hanzi"] for u in units if int(u["chapter"]) in chs) for kk, chs in PLANES.items()}
U = {"source": {"file": os.path.basename(SRC), "sha256": hashlib.sha256(open(SRC, "rb").read()).hexdigest(),
                "script": "scripts/build_jiqixuexi.py"},
     "counts": {"chapters": len(sheets), "units": len(units), "hanzi": sum(u["hanzi"] for u in units), "valueLike": 0},
     "views": VIEWS, "levels": {kk: [kk] for kk in PLANES}, "probe": {"view": tv, "A_part": tp},
     "ratio": {"view": round(max(tv.values()) / max(1, min(tv.values())), 1),
               "A_part": round(max(tp.values()) / max(1, min(tp.values())), 1)},
     "chapters": [{"no": int(c[:2]), "title": c[3:].strip(),
                   "units": sum(1 for u in units if int(u["chapter"]) == int(c[:2]))} for c in sheets],
     "units": units}

os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(U, io.open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump({"note": "三辨按词表现算；四位面按教材章群结构分区。", "views": VIEWS, "levelsA": PLANES,
           "probe": U["probe"], "ratio": U["ratio"]},
          io.open(os.path.join(ROOT, "standards", SUB, "axes.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)
print(f"{len(sheets)} 章 / {len(units)} 单元 / {U['counts']['hanzi']:,} 汉字 · "
      f"三辨 {U['ratio']['view']}× · 四位面 {U['ratio']['A_part']}× · sha {U['source']['sha256'][:16]}")
print("单元数/章:", [c["units"] for c in U["chapters"]])

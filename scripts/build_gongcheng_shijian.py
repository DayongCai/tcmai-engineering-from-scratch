# -*- coding: utf-8 -*-
"""18 智能工程实践（6 章，sem910）：从既有单元层取材料，章名与 scaffold 的章节知识结构一致。

课程章（slug 前缀 x）：
  x1 环境与数据准备 ← 机器学习·特征选择与降维
  x2 训练与调参     ← 机器学习·线性模型
  x3 评测与回归     ← 机器学习·模型评估
  x4 集成与稳健     ← 机器学习·集成学习
  x5 部署与运维     ← 中医软件架构·卫生信息系统概论
  x6 合规与交付     ← 医学数据安全·安全体系 / 数据治理
"""
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")
SUB = "zhineng-gongcheng-shijian"

SRC = {
    "jiqi": "jiqi-xuexi",
    "ruanjian": "zhongyi-ruanjian-jiagou",
    "anquan": "yixue-shuju-anquan-yinsi",
}
LOAD = {k: json.load(io.open(os.path.join(S, v, "units.json"), encoding="utf-8")) for k, v in SRC.items()}

PLAN = [
    (1, "需求与数据合规评估", "anquan", [5, 8]),
    (2, "系统架构与接口实现", "ruanjian", [1]),
    (3, "模型训练与评测流水线", "jiqi", [3, 2]),
    (4, "临床部署与灰度验证", "ruanjian", [2]),
    (5, "运维、监控与事故复盘", "ruanjian", [4]),
    (6, "交付验收与文档", "ruanjian", [8]),
]
VIEWS = {"工程流程": ["流程", "步骤", "准备", "交付", "部署", "运维"],
         "质量与评测": ["评测", "误差", "指标", "验证", "回归", "稳健"],
         "风险与合规": ["风险", "合规", "安全", "权限", "责任", "审计"]}
LEVELS = {"需求与架构": [1, 2], "训练与部署": [3, 4], "运维与交付": [5, 6]}

units, meta, idx = [], [], 0
for ci, title, src, chs in PLAN:
    h = 0
    for ch in chs:
        for u in LOAD[src]["units"]:
            if int(u["chapter"]) != ch:
                continue
            body = u.get("body") or u.get("prose") or ""
            hh = u.get("hanzi") or 0
            if hh < 120:
                continue
            idx += 1
            units.append({
                "chapter": str(ci), "sub": f"{ci}.{idx}", "sec": u["title"],
                "secNo": f"{ci}.{u.get('sub', idx)}", "title": u["title"], "chapterTitle": title,
                "locator": u.get("locator", ""), "source": u.get("source", ""),
                "body": body, "prose": re.sub(r"\s+", " ", body).strip(), "hanzi": hh,
                "segments": u.get("segments") or [{"seg": "1", "text": body}],
                "brief": "只写流程、判据与交付物，不写具体参数与厂商产品",
                "measure": {"views": {k: sum(body.count(w) for w in ws) for k, ws in VIEWS.items()},
                            "levels": {k: (hh if ci in v else 0) for k, v in LEVELS.items()},
                            "valueLike": len(re.findall(r"\d+(?:\.\d+)?\s*(?:次|轮|小时|天|%|条)", body))},
            })
            h += hh
    meta.append((ci, title, h))
    print(f"  ch{ci} {title} ← {src} {chs} · {h:,} 汉字")

tv = {k: sum(u["measure"]["views"][k] for u in units) for k in VIEWS}
tl = {k: sum(u["hanzi"] for u in units if int(u["chapter"]) in v) for k, v in LEVELS.items()}
OUT = {"subject": SUB, "title": "智能工程实践", "views": VIEWS, "levels": LEVELS,
       "source": {"kind": "derived", "file": "F:/textbooks/qhzy-机器学习.xlsx",
                  "note": "sem910 实践课：材料取自既有单元层（机器学习 / 中医软件架构 / 医学数据安全）"},
       "probe": {"view": tv, "A_part": tl},
       "ratio": {"view": round(max(tv.values()) / max(1, min(tv.values())), 1),
                 "A_part": round(max(tl.values()) / max(1, min(tl.values())), 1)},
       "counts": {"chapters": 6, "units": len(units), "hanzi": sum(u["hanzi"] for u in units),
                  "valueLike": sum(u["measure"]["valueLike"] for u in units)},
       "units": units,
       "chapters": [{"no": ci, "title": t, "units": sum(1 for u in units if int(u["chapter"]) == ci)}
                    for ci, t, _ in meta]}
d = os.path.join(S, SUB)
os.makedirs(d, exist_ok=True)
json.dump(OUT, io.open(os.path.join(d, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump({"note": "sem910 实践课；四位面按章群分区。", "views": VIEWS, "levelsA": LEVELS,
           "probe": {"view": tv, "A_part": tl},
           "ratio": {"view": OUT["ratio"]["view"], "A_part": OUT["ratio"]["A_part"]}},
          io.open(os.path.join(d, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{SUB}: 6 章 / {len(units)} 单元 / {OUT['counts']['hanzi']:,} 汉字 · 三辨 {OUT['ratio']['view']}× · 四位面 {OUT['ratio']['A_part']}×")
